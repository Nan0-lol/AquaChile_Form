import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaFileExcel, FaTimes, FaUserCheck } from 'react-icons/fa';
import { listarSolicitudes, obtenerCatalogos, obtenerEvaluadores, ErrorApi } from '../services/api';
import {
  ORDEN_ETAPAS,
  filtrarSolicitudes,
  contarPorEtapa,
  formatearFecha,
  hace,
  iniciales,
  construirCsvSolicitudes,
} from '../utils/proceso';
import { puede, obtenerUsuario } from '../auth';
import { EtapaBadge, Cargando, ErrorCarga, Vacio } from '../components/Proceso';
import './NuevaSolicitud.css'; // botones, campos y tarjetas (ns-*)

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

  if (carga === 'cargando') return <main className="pr-main"><Cargando texto="Cargando solicitudes…" /></main>;
  if (carga === 'error') return <main className="pr-main"><ErrorCarga mensaje={error} onReintentar={cargar} /></main>;

  const enProceso = conteo.agendada + conteo.realizada;

  return (
    <main className="pr-main">
      <div className="pr-titlebar">
        <div>
          <h1>Solicitudes de evaluación</h1>
          <p>
            {solicitudes.length} en total · {enProceso} en proceso · {conteo.recibida}{' '}
            {conteo.recibida === 1 ? 'pendiente' : 'pendientes'} de agendar
          </p>
        </div>
        <div className="pr-titlebar-actions">
          <button type="button" className="ns-btn ns-btn--outline" onClick={exportar} disabled={!visibles.length}>
            <FaFileExcel aria-hidden="true" /> Exportar a Excel
          </button>
          {puede('solicitud:crear') && (
            <Link to="/solicitudes/nueva" className="ns-btn ns-btn--primary">
              <FaPlus aria-hidden="true" /> Nueva solicitud
            </Link>
          )}
        </div>
      </div>

      <section className="ns-card pr-lista" aria-label="Listado de solicitudes">
        {/* ---------- Filtros ---------- */}
        <div className="pr-filtros">
          <div className="ns-search pr-filtro-q">
            <FaSearch aria-hidden="true" />
            <label htmlFor="filtro-q" className="visually-hidden">Buscar</label>
            <input
              id="filtro-q"
              type="search"
              value={filtros.q}
              onChange={(e) => cambiar('q', e.target.value)}
              placeholder="Buscar candidato, cargo o ubicación"
              autoComplete="off"
            />
          </div>

          <div className="ns-field pr-filtro">
            <label htmlFor="filtro-familia" className="pr-filtro-label">Familia</label>
            <select id="filtro-familia" value={filtros.familiaCargo} onChange={(e) => cambiar('familiaCargo', e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(catalogos.familiasCargo).map(([clave, texto]) => (
                <option key={clave} value={clave}>{texto}</option>
              ))}
            </select>
          </div>

          <div className="ns-field pr-filtro">
            <label htmlFor="filtro-responsable" className="pr-filtro-label">Responsable</label>
            <select id="filtro-responsable" value={filtros.responsable} onChange={(e) => cambiar('responsable', e.target.value)}>
              <option value="">Todos</option>
              <option value="sin">Sin asignar</option>
              {evaluadores.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.nombre}</option>
              ))}
            </select>
          </div>

          <div className="ns-field pr-filtro pr-filtro--fecha">
            <label htmlFor="filtro-desde" className="pr-filtro-label">Desde</label>
            <input id="filtro-desde" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiar('desde', e.target.value)} />
          </div>

          <div className="ns-field pr-filtro pr-filtro--fecha">
            <label htmlFor="filtro-hasta" className="pr-filtro-label">Hasta</label>
            <input id="filtro-hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar('hasta', e.target.value)} />
          </div>
        </div>

        {(esEvaluador || hayFiltros) && (
          <div className="pr-filtros-extra">
            {esEvaluador && (
              <button
                type="button"
                className={`pr-chip${filtros.responsable === usuario.id ? ' is-active' : ''}`}
                aria-pressed={filtros.responsable === usuario.id}
                onClick={() => cambiar('responsable', filtros.responsable === usuario.id ? '' : usuario.id)}
              >
                <FaUserCheck aria-hidden="true" /> Asignadas a mí
              </button>
            )}
            {hayFiltros && (
              <button type="button" className="pr-link-btn" onClick={limpiar}>
                <FaTimes aria-hidden="true" /> Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ---------- Pestañas por etapa ---------- */}
        <div className="pr-tabs" role="group" aria-label="Filtrar por etapa">
          {['', ...ORDEN_ETAPAS].map((etapa) => (
            <button
              key={etapa || 'todas'}
              type="button"
              className={`pr-tab${filtros.etapa === etapa ? ' is-active' : ''}`}
              aria-pressed={filtros.etapa === etapa}
              onClick={() => cambiar('etapa', etapa)}
            >
              {etapa ? catalogos.etapas[etapa] : 'Todas'}
              <span className="pr-tab-count">{etapa ? conteo[etapa] : conteo.todas}</span>
            </button>
          ))}
        </div>

        {/* ---------- Tabla ---------- */}
        {visibles.length === 0 ? (
          <Vacio
            titulo={solicitudes.length ? 'No hay solicitudes con estos filtros' : 'Todavía no hay solicitudes'}
            texto={solicitudes.length ? 'Prueba quitando algún filtro.' : 'Cuando el analista cree una, aparecerá aquí.'}
          >
            {hayFiltros && (
              <button type="button" className="ns-btn ns-btn--outline ns-btn--sm" onClick={limpiar}>
                Limpiar filtros
              </button>
            )}
          </Vacio>
        ) : (
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th scope="col">Candidato</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">Responsable</th>
                  <th scope="col">Solicitada</th>
                  <th scope="col">Etapa</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)}>
                    <td data-label="Candidato">
                      <div className="pr-persona">
                        <span className="ns-avatar" aria-hidden="true">{iniciales(s.candidato.nombre)}</span>
                        <div>
                          {/* El enlace permite llegar con teclado; la fila entera también es clicable */}
                          <Link to={`/solicitudes/${s.id}`} className="pr-row-link" onClick={(e) => e.stopPropagation()}>
                            {s.candidato.nombre}
                          </Link>
                          <span className="pr-sub">{catalogos.origenes[s.candidato.origen] ?? s.candidato.origen}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Cargo">
                      <span className="pr-strong">{s.nombreCargo}</span>
                      <span className="pr-sub">
                        {catalogos.familiasCargo[s.familiaCargo] ?? s.familiaCargo} · {s.ubicacion}
                      </span>
                    </td>
                    <td data-label="Responsable">
                      {s.evaluador ? s.evaluador.nombre : <span className="pr-sin">Sin asignar</span>}
                    </td>
                    <td data-label="Solicitada">
                      <span className="pr-strong pr-nowrap">{formatearFecha(s.fechaSolicitud)}</span>
                      <span className="pr-sub">{hace(s.fechaSolicitud)}</span>
                    </td>
                    <td data-label="Etapa">
                      <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} />
                      {s.timingDias !== null && (
                        <span className="pr-sub">{s.timingDias} {s.timingDias === 1 ? 'día' : 'días'} de proceso</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {visibles.length > 0 && (
          <p className="pr-pie" aria-live="polite">
            Mostrando {visibles.length} de {solicitudes.length} solicitudes
          </p>
        )}
      </section>
    </main>
  );
};

export default Solicitudes;
