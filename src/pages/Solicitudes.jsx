import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaFileExcel, FaTimes, FaUserCheck } from 'react-icons/fa';
import { listarSolicitudes, obtenerCatalogos, obtenerEvaluadores, ErrorApi } from '../services/api';
import {
  ORDEN_ETAPAS,
  ETAPAS_EN_PROCESO,
  filtrarSolicitudes,
  contarPorEtapa,
  formatearFecha,
  hace,
  construirCsvSolicitudes,
} from '../utils/proceso';
import { puede, obtenerUsuario } from '../auth';
import { EtapaBadge } from '../components/Proceso';
import {
  cx,
  FOCO,
  Boton,
  Selector,
  Avatar,
  Pagina,
  Titulo,
  Cargando,
  ErrorCarga,
  Vacio,
  SinDato,
  claseEntrada,
  claseTarjeta,
} from '../components/ui';

const FILTROS_INICIALES = { etapa: '', familiaCargo: '', responsable: '', q: '', desde: '', hasta: '' };
const CLAVE_FILTROS = 'aquachile_filtros_solicitudes';

// Los filtros se recuerdan durante la visita: al volver del detalle siguen igual
const filtrosGuardados = () => {
  try {
    return { ...FILTROS_INICIALES, ...JSON.parse(sessionStorage.getItem(CLAVE_FILTROS) || '{}') };
  } catch {
    return FILTROS_INICIALES;
  }
};

const descargar = (contenido, nombre) => {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const ETIQUETA_FILTRO = 'mb-[5px] block text-xs font-semibold text-tenue';
const ENLACE_FILA = 'font-semibold text-texto no-underline hover:text-acento hover:underline rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento';

const Solicitudes = () => {
  const navigate = useNavigate();
  const usuario = obtenerUsuario();
  const esEvaluador = usuario?.rol === 'evaluador';

  const [solicitudes, setSolicitudes] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [evaluadores, setEvaluadores] = useState([]);
  const [carga, setCarga] = useState('cargando'); // cargando | lista | error
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState(filtrosGuardados);

  const cargar = () => {
    setCarga('cargando');
    Promise.all([listarSolicitudes(), obtenerCatalogos(), obtenerEvaluadores()])
      .then(([lista, cat, evs]) => {
        setSolicitudes(lista);
        setCatalogos(cat);
        setEvaluadores(evs);
        setCarga('lista');
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) return;
        setError(err.message);
        setCarga('error');
      });
  };
  useEffect(cargar, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(filtros));
    } catch {
      /* sin almacenamiento: los filtros se pierden al salir, nada más */
    }
  }, [filtros]);

  const cambiar = (campo, valor) => setFiltros((prev) => ({ ...prev, [campo]: valor }));
  const limpiar = () => setFiltros(FILTROS_INICIALES);

  // Primero todos los filtros menos la etapa (para contar por pestaña), después la etapa
  const sinEtapa = useMemo(() => filtrarSolicitudes(solicitudes, { ...filtros, etapa: '' }), [solicitudes, filtros]);
  const conteo = useMemo(() => contarPorEtapa(sinEtapa), [sinEtapa]);
  const visibles = useMemo(() => filtrarSolicitudes(sinEtapa, { etapa: filtros.etapa }), [sinEtapa, filtros.etapa]);
  const hayFiltros = Object.entries(filtros).some(([k, v]) => k !== 'etapa' && v);

  const exportar = () => {
    descargar(construirCsvSolicitudes(visibles, catalogos), `solicitudes-${new Date().toLocaleDateString('sv-SE')}.csv`);
  };

  if (carga === 'cargando') return <Pagina><Cargando texto="Cargando solicitudes…" /></Pagina>;
  if (carga === 'error') return <Pagina><ErrorCarga mensaje={error} onReintentar={cargar} /></Pagina>;

  const enProceso = conteo.agendada + conteo.realizada;
  const familia = (s) => catalogos.familiasCargo[s.familiaCargo] ?? s.familiaCargo;
  const origen = (s) => catalogos.origenes[s.candidato.origen] ?? s.candidato.origen;
  const timing = (s) =>
    s.timingDias !== null && (
      <span className="mt-0.5 block text-[12.5px] text-tenue">
        {s.timingDias} {s.timingDias === 1 ? 'día' : 'días'} de proceso
      </span>
    );

  return (
    <Pagina>
      <Titulo
        titulo="Solicitudes de evaluación"
        acciones={
          <>
            <Boton variante="contorno" onClick={exportar} disabled={!visibles.length}>
              <FaFileExcel aria-hidden="true" /> Exportar a Excel
            </Boton>
            {puede('solicitud:crear') && (
              <Boton as={Link} to="/solicitudes/nueva">
                <FaPlus aria-hidden="true" /> Nueva solicitud
              </Boton>
            )}
          </>
        }
      >
        {solicitudes.length} en total · {enProceso} en proceso · {conteo.recibida}{' '}
        {conteo.recibida === 1 ? 'pendiente' : 'pendientes'} de agendar
      </Titulo>

      <section className={cx(claseTarjeta, 'overflow-hidden')} aria-label="Listado de solicitudes">
        {/* ---------- Filtros ---------- */}
        <div className="grid grid-cols-2 items-end gap-3 px-3.5 pt-3.5 sm:px-5 sm:pt-[18px] lg:grid-cols-[minmax(0,1fr)_190px_190px_160px_160px]">
          <div className="col-span-2 flex h-11 items-center gap-2.5 rounded-lg border border-borde-fuerte bg-superficie px-3 transition-[border-color,box-shadow] focus-within:border-acento focus-within:ring-3 focus-within:ring-anillo lg:col-span-1">
            <FaSearch aria-hidden="true" className="shrink-0 text-sutil" />
            <label htmlFor="filtro-q" className="sr-only">
              Buscar
            </label>
            <input
              id="filtro-q"
              type="search"
              value={filtros.q}
              onChange={(e) => cambiar('q', e.target.value)}
              placeholder="Buscar candidato, cargo o ubicación"
              autoComplete="off"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14.5px] text-texto outline-none placeholder:text-sutil"
            />
          </div>

          <div>
            <label htmlFor="filtro-familia" className={ETIQUETA_FILTRO}>
              Familia
            </label>
            <Selector id="filtro-familia" value={filtros.familiaCargo} onChange={(e) => cambiar('familiaCargo', e.target.value)} alto="h-11">
              <option value="">Todas</option>
              {Object.entries(catalogos.familiasCargo).map(([clave, texto]) => (
                <option key={clave} value={clave}>
                  {texto}
                </option>
              ))}
            </Selector>
          </div>

          <div>
            <label htmlFor="filtro-responsable" className={ETIQUETA_FILTRO}>
              Responsable
            </label>
            <Selector id="filtro-responsable" value={filtros.responsable} onChange={(e) => cambiar('responsable', e.target.value)} alto="h-11">
              <option value="">Todos</option>
              <option value="sin">Sin asignar</option>
              {evaluadores.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.nombre}
                </option>
              ))}
            </Selector>
          </div>

          <div>
            <label htmlFor="filtro-desde" className={ETIQUETA_FILTRO}>
              Desde
            </label>
            <input
              id="filtro-desde"
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => cambiar('desde', e.target.value)}
              className={claseEntrada(false, 'h-11 px-2.5 text-sm')}
            />
          </div>

          <div>
            <label htmlFor="filtro-hasta" className={ETIQUETA_FILTRO}>
              Hasta
            </label>
            <input
              id="filtro-hasta"
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => cambiar('hasta', e.target.value)}
              className={claseEntrada(false, 'h-11 px-2.5 text-sm')}
            />
          </div>
        </div>

        {(esEvaluador || hayFiltros) && (
          <div className="flex flex-wrap items-center gap-3 px-3.5 pt-3 sm:px-5">
            {esEvaluador && (
              <button
                type="button"
                aria-pressed={filtros.responsable === usuario.id}
                onClick={() => cambiar('responsable', filtros.responsable === usuario.id ? '' : usuario.id)}
                className={cx(
                  'inline-flex h-8 cursor-pointer items-center gap-[7px] rounded-full border px-3 text-[13px] font-semibold transition-colors',
                  FOCO,
                  filtros.responsable === usuario.id
                    ? 'border-acento bg-acento-suave text-acento'
                    : 'border-borde-fuerte bg-superficie text-tenue hover:border-acento hover:text-texto'
                )}
              >
                <FaUserCheck aria-hidden="true" /> Asignadas a mí
              </button>
            )}
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiar}
                className={cx('inline-flex cursor-pointer items-center gap-1.5 rounded px-0.5 py-1 text-[13px] font-semibold text-acento hover:underline', FOCO)}
              >
                <FaTimes aria-hidden="true" /> Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ---------- Pestañas por etapa (se deslizan en pantallas chicas) ---------- */}
        <div role="group" aria-label="Filtrar por etapa" className="mt-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-borde px-3.5 [scrollbar-width:thin]">
          {['', ...ORDEN_ETAPAS].map((etapa) => {
            // Desde el Panel, "En proceso" marca a la vez "agendada" y "realizada"
            const activa = filtros.etapa === etapa || (filtros.etapa === 'en_proceso' && ETAPAS_EN_PROCESO.includes(etapa));
            return (
              <button
                key={etapa || 'todas'}
                type="button"
                aria-pressed={activa}
                onClick={() => cambiar('etapa', etapa)}
                className={cx(
                  '-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-2.5 py-3 text-sm font-semibold whitespace-nowrap',
                  'outline-none focus-visible:ring-3 focus-visible:ring-anillo',
                  activa ? 'border-acento text-acento' : 'border-transparent text-tenue hover:text-texto'
                )}
              >
                {etapa ? catalogos.etapas[etapa] : 'Todas'}
                <span
                  className={cx(
                    'min-w-[22px] rounded-full px-[7px] py-px text-center text-xs',
                    activa ? 'bg-acento-suave text-acento' : 'bg-superficie-3 text-tenue'
                  )}
                >
                  {etapa ? conteo[etapa] : conteo.todas}
                </span>
              </button>
            );
          })}
        </div>

        {visibles.length === 0 ? (
          <Vacio
            titulo={solicitudes.length ? 'No hay solicitudes con estos filtros' : 'Todavía no hay solicitudes'}
            texto={solicitudes.length ? 'Prueba quitando algún filtro.' : 'Cuando el analista cree una, aparecerá aquí.'}
          >
            {hayFiltros && (
              <Boton variante="contorno" tamano="sm" onClick={limpiar}>
                Limpiar filtros
              </Boton>
            )}
          </Vacio>
        ) : (
          <>
            {/* ---------- Tabla (pantallas medianas y grandes) ---------- */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-superficie-2 text-left text-xs font-bold tracking-[0.04em] text-sutil uppercase">
                    {['Candidato', 'Cargo', 'Responsable', 'Solicitada', 'Etapa'].map((col) => (
                      <th key={col} scope="col" className="border-b border-borde px-4 py-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {visibles.map((s) => (
                    <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)} className="cursor-pointer transition-colors hover:bg-acento-suave">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar nombre={s.candidato.nombre} />
                          <div>
                            {/* El enlace permite llegar con teclado; la fila entera también es clicable */}
                            <Link to={`/solicitudes/${s.id}`} onClick={(e) => e.stopPropagation()} className={ENLACE_FILA}>
                              {s.candidato.nombre}
                            </Link>
                            <span className="mt-0.5 block text-[12.5px] text-tenue">{origen(s)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-texto">{s.nombreCargo}</span>
                        <span className="mt-0.5 block text-[12.5px] text-tenue">
                          {familia(s)} · {s.ubicacion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-texto">{s.evaluador ? s.evaluador.nombre : <SinDato>Sin asignar</SinDato>}</td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold whitespace-nowrap text-texto">{formatearFecha(s.fechaSolicitud)}</span>
                        <span className="mt-0.5 block text-[12.5px] text-tenue">{hace(s.fechaSolicitud)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} />
                        {timing(s)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---------- Tarjetas (celulares) ---------- */}
            <ul className="m-0 list-none divide-y divide-borde p-0 md:hidden">
              {visibles.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/solicitudes/${s.id}`}
                    className="flex flex-col gap-2.5 px-3.5 py-3.5 text-texto no-underline outline-none hover:bg-acento-suave focus-visible:bg-acento-suave"
                  >
                    <span className="flex items-center gap-3">
                      <Avatar nombre={s.candidato.nombre} />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate">{s.candidato.nombre}</strong>
                        <span className="block text-[12.5px] text-tenue">{origen(s)}</span>
                      </span>
                      <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} />
                    </span>
                    <span className="text-[13.5px]">
                      <strong className="font-semibold">{s.nombreCargo}</strong>
                      <span className="block text-[12.5px] text-tenue">
                        {familia(s)} · {s.ubicacion}
                      </span>
                    </span>
                    <span className="flex justify-between gap-3 text-[12.5px] text-tenue">
                      <span>{s.evaluador ? s.evaluador.nombre : 'Sin asignar'}</span>
                      <span>
                        {formatearFecha(s.fechaSolicitud)} · {hace(s.fechaSolicitud)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p aria-live="polite" className="m-0 border-t border-borde px-5 py-3 text-[13px] text-sutil">
              Mostrando {visibles.length} de {solicitudes.length} solicitudes
            </p>
          </>
        )}
      </section>
    </Pagina>
  );
};

export default Solicitudes;
