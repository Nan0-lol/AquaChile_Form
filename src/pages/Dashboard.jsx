import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUsers,
  FaInbox,
  FaSpinner,
  FaCheckCircle,
  FaStopwatch,
  FaSyncAlt,
  FaExclamationCircle,
  FaThumbsUp,
  FaExclamationTriangle,
  FaTimesCircle,
  FaChevronRight,
  FaEnvelopeOpenText,
} from 'react-icons/fa';
import { obtenerIndicadores, listarSolicitudes, obtenerCatalogos, ErrorApi } from '../services/api';
import { estadoGeneral, formatearFecha } from '../utils/proceso';
import { puede } from '../auth';
import { EtapaBadge } from '../components/Proceso';
import { cx, FOCO, Boton, Avatar, Pagina, Titulo, Cargando, ErrorCarga, claseTarjeta } from '../components/ui';

// =====================================================================
// Colores de los gráficos (definidos en index.css, validados para
// daltonismo y contraste en ambos temas):
//   viz-1 azul = solicitudes recibidas · viz-2 naranjo = informes enviados
//   Las barras de una sola serie usan viz-barra (el acento de la marca).
//   Los resultados usan colores de estado y SIEMPRE van con ícono y texto.
// =====================================================================

const CLAVE_FILTROS = 'aquachile_filtros_solicitudes';
const DIA_MS = 86_400_000;

const TONO_RESULTADO = {
  recomendado: { Icono: FaThumbsUp, icono: 'text-estado-bueno', barra: 'bg-estado-bueno' },
  recomendado_obs: { Icono: FaExclamationTriangle, icono: 'text-estado-alerta', barra: 'bg-estado-alerta' },
  no_recomendado: { Icono: FaTimesCircle, icono: 'text-estado-critico', barra: 'bg-estado-critico' },
};

const TONO_KPI = {
  neutro: 'bg-acento-suave text-acento',
  pendiente: 'bg-e-recibida-bg text-e-recibida',
  proceso: 'bg-e-agendada-bg text-e-agendada',
  final: 'bg-e-enviado-bg text-e-enviado',
};

const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Tarjeta de indicador. Si tiene `onAbrir`, lleva a la lista ya filtrada. */
const Indicador = ({ titulo, valor, unidad, detalle, Icono, tono, onAbrir, className }) => {
  const contenido = (
    <>
      <span aria-hidden="true" className={cx('mb-2 inline-flex size-9 items-center justify-center rounded-[10px] text-[15px]', TONO_KPI[tono])}>
        <Icono />
      </span>
      <span className="text-[13px] font-semibold text-tenue">{titulo}</span>
      <span className="text-[1.6rem] leading-tight font-bold text-titulo tabular-nums sm:text-[2rem]">
        {valor}
        {unidad && <small className="text-[0.95rem] font-semibold text-tenue"> {unidad}</small>}
      </span>
      <span className="text-[12.5px] leading-snug text-sutil">{detalle}</span>
    </>
  );
  const base = cx(claseTarjeta, 'flex min-w-0 flex-col items-start gap-1 p-3.5 text-left sm:p-[18px]', className);
  return onAbrir ? (
    <button
      type="button"
      onClick={onAbrir}
      className={cx(base, 'cursor-pointer transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-acento hover:shadow-alta', FOCO)}
    >
      {contenido}
      <span className="sr-only">. Ver en la lista de solicitudes</span>
    </button>
  ) : (
    <div className={base}>{contenido}</div>
  );
};

/** Gráfico de barras agrupadas: solicitudes recibidas e informes enviados por mes */
const GraficoMeses = ({ meses }) => {
  const [activo, setActivo] = useState(null);
  const maximo = Math.max(1, ...meses.flatMap((m) => [m.cantidad, m.informes]));
  // 3 líneas guía "redondas" para leer la escala
  const paso = Math.max(1, Math.ceil(maximo / 3));
  const tope = paso * 3;

  return (
    <div>
      <div aria-hidden="true" className="mb-3.5 flex flex-wrap gap-[18px] text-[13px] text-tenue">
        <span className="inline-flex items-center gap-[7px]">
          <i className="inline-block size-2.5 rounded-[3px] bg-viz-1" /> Solicitudes recibidas
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <i className="inline-block size-2.5 rounded-[3px] bg-viz-2" /> Informes enviados
        </span>
      </div>

      <div className="relative h-[200px] pl-[30px] sm:h-[230px]" onMouseLeave={() => setActivo(null)}>
        {/* Líneas guía (recesivas) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 bottom-[26px] flex flex-col justify-between">
          {[tope, paso * 2, paso, 0].map((g) => (
            <div key={g} className={cx('relative border-t', g === 0 ? 'border-borde-fuerte' : 'border-borde')}>
              <span className="absolute -top-2 left-0 text-[11px] text-sutil tabular-nums">{g}</span>
            </div>
          ))}
        </div>

        <div className="relative ml-1 grid h-full grid-cols-6">
          {meses.map((m) => (
            <div
              key={m.mes}
              tabIndex={0}
              onMouseEnter={() => setActivo(m.mes)}
              onFocus={() => setActivo(m.mes)}
              onBlur={() => setActivo(null)}
              aria-label={`${m.etiqueta}${m.actual ? ' (mes actual)' : ''}: ${plural(m.cantidad, 'solicitud recibida', 'solicitudes recibidas')}, ${plural(m.informes, 'informe enviado', 'informes enviados')}`}
              className={cx(
                'relative flex flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-anillo',
                activo === m.mes && 'bg-acento-suave'
              )}
            >
              {/* Barras: 4px redondeadas arriba, 2px de separación entre ellas */}
              <div aria-hidden="true" className="flex w-full flex-1 items-end justify-center gap-0.5 px-[10%] sm:px-[18%]">
                <span className="max-w-[26px] flex-1 rounded-t bg-viz-1 transition-[height] duration-400" style={{ height: `${(m.cantidad / tope) * 100}%` }} />
                <span className="max-w-[26px] flex-1 rounded-t bg-viz-2 transition-[height] duration-400" style={{ height: `${(m.informes / tope) * 100}%` }} />
              </div>
              <span aria-hidden="true" className={cx('flex h-[26px] items-center text-[12.5px]', m.actual ? 'font-bold text-texto' : 'text-tenue')}>
                {m.etiqueta}
              </span>
              {activo === m.mes && (
                <div
                  role="presentation"
                  className="pointer-events-none absolute bottom-[calc(100%-20px)] left-1/2 z-5 flex min-w-[130px] -translate-x-1/2 flex-col gap-[3px] rounded-lg border border-borde-fuerte bg-superficie px-[11px] py-[9px] text-[12.5px] whitespace-nowrap text-texto shadow-alta"
                >
                  <strong>
                    {m.etiqueta}
                    {m.actual ? ' (actual)' : ''}
                  </strong>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <i className="inline-block size-2.5 rounded-[3px] bg-viz-1" /> {plural(m.cantidad, 'recibida', 'recibidas')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <i className="inline-block size-2.5 rounded-[3px] bg-viz-2" /> {plural(m.informes, 'informe', 'informes')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* La misma información como tabla, para lectores de pantalla */}
      <div className="sr-only">
        <table>
          <caption>Solicitudes recibidas e informes enviados por mes</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Recibidas</th>
              <th scope="col">Informes</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes}>
                <th scope="row">{m.etiqueta}</th>
                <td>{m.cantidad}</td>
                <td>{m.informes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/** Pista + relleno de una barra horizontal */
const Pista = ({ ancho, color = 'bg-viz-barra', className }) => (
  <span aria-hidden="true" className={cx('block h-2.5 overflow-hidden rounded-full bg-superficie-3', className)}>
    <span className={cx('block h-full rounded-full transition-[width] duration-400', color)} style={{ width: `${ancho}%` }} />
  </span>
);

/**
 * Barras horizontales de una sola serie (familias, etapas).
 * `escala`: el valor que llena la barra. Si varios grupos se comparan entre sí,
 * deben usar la misma escala (si no, un 1 y un 8 se verían igual de largos).
 */
const Barras = ({ filas, total, escala }) => {
  const maximo = Math.max(1, escala ?? Math.max(...filas.map((f) => f.cantidad)));
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {filas.map((f) => (
        <li key={f.clave} className="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-x-3 gap-y-1 text-[13.5px] sm:grid-cols-[minmax(110px,34%)_minmax(0,1fr)_82px]">
          <span className="truncate text-texto">{f.etiqueta}</span>
          <Pista ancho={(f.cantidad / maximo) * 100} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
          <span className="text-right font-bold text-texto tabular-nums sm:col-start-3 sm:row-start-1">
            {f.cantidad}
            {total ? <small className="font-medium text-sutil"> · {porcentaje(f.cantidad, total)}%</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
};

const Tarjeta = ({ titulo, subtitulo, className, children }) => (
  <section className={cx(claseTarjeta, className)}>
    <header className="px-4 pt-[18px] sm:px-5">
      <h2 className="m-0 text-[1.02rem] font-bold text-titulo">{titulo}</h2>
      {subtitulo && <p className="mt-[3px] mb-0 text-[13px] text-tenue">{subtitulo}</p>}
    </header>
    <div className="px-4 pt-4 pb-5 sm:px-5">{children}</div>
  </section>
);

const SinDatos = ({ children }) => <p className="my-2 text-sm text-tenue">{children}</p>;

// ---------------------------------------------------------------------
const Dashboard = () => {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [catalogos, setCatalogos] = useState(null);
  const [carga, setCarga] = useState('cargando');
  const [error, setError] = useState('');
  const [actualizado, setActualizado] = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = (silencioso = false) => {
    if (silencioso) setRefrescando(true);
    else setCarga('cargando');
    Promise.all([obtenerIndicadores(), listarSolicitudes(), obtenerCatalogos()])
      .then(([ind, lista, cat]) => {
        setDatos(ind);
        setSolicitudes(lista);
        setCatalogos(cat);
        setActualizado(new Date());
        setCarga('lista');
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) return;
        setError(err.message);
        setCarga('error');
      })
      .finally(() => setRefrescando(false));
  };
  useEffect(() => cargar(), []);

  // Las solicitudes en curso que llevan más tiempo esperando
  const enEspera = useMemo(
    () =>
      solicitudes
        .filter((s) => s.etapa !== 'informe_enviado')
        .sort((a, b) => new Date(a.fechaSolicitud) - new Date(b.fechaSolicitud))
        .slice(0, 5),
    [solicitudes]
  );

  /** Abre la lista de solicitudes con un filtro ya aplicado */
  const irALista = (filtros) => {
    try {
      sessionStorage.setItem(
        CLAVE_FILTROS,
        JSON.stringify({ etapa: '', familiaCargo: '', responsable: '', q: '', desde: '', hasta: '', ...filtros })
      );
    } catch {
      /* sin almacenamiento: abre la lista sin filtro */
    }
    navigate('/solicitudes');
  };

  if (carga === 'cargando') return <Pagina><Cargando texto="Calculando indicadores…" /></Pagina>;
  if (carga === 'error') return <Pagina><ErrorCarga mensaje={error} onReintentar={() => cargar()} /></Pagina>;

  const d = datos;
  const totalResultados = d.porResultado.reduce((a, r) => a + r.cantidad, 0);
  const familias = d.porFamilia.filter((f) => f.cantidad > 0);
  const maxEtapa = Math.max(...d.porEtapa.map((e) => e.cantidad));
  const diasEsperando = (s) => Math.max(0, Math.floor((Date.now() - new Date(s.fechaSolicitud)) / DIA_MS));

  return (
    <Pagina>
      <Titulo
        titulo="Panel de indicadores"
        acciones={
          <Boton variante="contorno" onClick={() => cargar(true)} disabled={refrescando}>
            <FaSyncAlt aria-hidden="true" className={refrescando ? 'animate-spin' : undefined} />
            {refrescando ? 'Actualizando…' : 'Actualizar'}
          </Boton>
        }
      >
        Resumen del proceso de evaluación psicolaboral
        {actualizado && <> · actualizado a las {actualizado.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</>}
      </Titulo>

      {/* ================= POSTULACIONES WEB POR REVISAR ================= */}
      {puede('postulacion:ver') && d.postulacionesPorRevisar > 0 && (
        <Link
          to="/postulaciones"
          className={cx(
            'mb-5 flex items-center gap-3 rounded-[14px] border border-acento bg-acento-suave px-4 py-3.5 text-texto no-underline transition-colors hover:brightness-97 sm:px-5',
            FOCO
          )}
        >
          <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-superficie text-lg text-acento">
            <FaEnvelopeOpenText />
          </span>
          <span className="min-w-0 flex-1 text-sm leading-snug">
            <strong className="text-base">{plural(d.postulacionesPorRevisar, 'postulación web', 'postulaciones web')}</strong> por revisar
            <span className="block text-[13px] text-tenue">Llegaron desde el formulario público. Revísalas y pásalas a evaluación.</span>
          </span>
          <span className="hidden shrink-0 text-sm font-semibold text-acento sm:inline">Revisar</span>
          <FaChevronRight aria-hidden="true" className="shrink-0 text-xs text-acento" />
        </Link>
      )}

      {/* ================= INDICADORES PRINCIPALES ================= */}
      <section aria-label="Indicadores principales" className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Indicador
          titulo="Candidatos registrados"
          valor={d.totalCandidatos}
          detalle={`${plural(d.totalSolicitudes, 'solicitud', 'solicitudes')} en total`}
          Icono={FaUsers}
          tono="neutro"
          onAbrir={() => navigate('/candidatos')}
        />
        <Indicador
          titulo="Pendientes"
          valor={d.pendientes}
          detalle="Evaluación recibida, por agendar"
          Icono={FaInbox}
          tono="pendiente"
          onAbrir={() => irALista({ etapa: 'recibida' })}
        />
        <Indicador titulo="En proceso" valor={d.enProceso} detalle="Entrevista agendada o realizada" Icono={FaSpinner} tono="proceso" />
        <Indicador
          titulo="Finalizadas"
          valor={d.finalizadas}
          detalle="Informe enviado al analista"
          Icono={FaCheckCircle}
          tono="final"
          onAbrir={() => irALista({ etapa: 'informe_enviado' })}
        />
        <Indicador
          titulo="Timing promedio"
          valor={d.timingPromedioDias === null ? '—' : d.timingPromedioDias.toLocaleString('es-CL')}
          unidad={d.timingPromedioDias === null ? '' : 'días'}
          detalle={
            d.informesConTiming
              ? `De la solicitud al informe · ${plural(d.informesConTiming, 'informe', 'informes')}`
              : 'Aparece con el primer informe enviado'
          }
          Icono={FaStopwatch}
          tono="neutro"
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        {/* ================= POR MES ================= */}
        <Tarjeta titulo="Evaluaciones por mes" subtitulo="Últimos 6 meses" className="md:col-span-2">
          <GraficoMeses meses={d.porMes} />
        </Tarjeta>

        {/* ================= ESTADO DEL PROCESO ================= */}
        <Tarjeta titulo="Estado del proceso" subtitulo="Las 4 etapas agrupadas en los 3 estados del caso">
          {['Pendiente', 'En proceso', 'Finalizada'].map((estado) => {
            const filas = d.porEtapa.filter((e) => estadoGeneral(e.clave) === estado);
            const suma = filas.reduce((a, f) => a + f.cantidad, 0);
            return (
              <div key={estado} className="[&+&]:mt-4 [&+&]:border-t [&+&]:border-dashed [&+&]:border-borde [&+&]:pt-3.5">
                <p className="mt-0 mb-2 flex justify-between text-xs font-bold tracking-[0.04em] text-sutil uppercase">
                  {estado} <span className="text-texto">{suma}</span>
                </p>
                <Barras filas={filas} total={d.totalSolicitudes} escala={maxEtapa} />
              </div>
            );
          })}
        </Tarjeta>

        {/* ================= FAMILIAS ================= */}
        <Tarjeta titulo="Por familia de cargo" subtitulo="Todas las solicitudes registradas">
          {familias.length ? <Barras filas={familias} total={d.totalSolicitudes} /> : <SinDatos>Todavía no hay solicitudes.</SinDatos>}
        </Tarjeta>

        {/* ================= RESULTADOS ================= */}
        <Tarjeta titulo="Resultados de las evaluaciones" subtitulo={plural(totalResultados, 'informe enviado', 'informes enviados')}>
          {totalResultados ? (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {d.porResultado.map((r) => {
                const tono = TONO_RESULTADO[r.clave] ?? { Icono: FaCheckCircle, icono: 'text-acento', barra: 'bg-viz-barra' };
                const pct = porcentaje(r.cantidad, totalResultados);
                return (
                  <li key={r.clave} className="flex flex-col gap-[7px]">
                    <span className="flex items-center gap-[9px] text-sm">
                      <tono.Icono aria-hidden="true" className={tono.icono} />
                      <span className="flex-1 text-texto">{r.etiqueta}</span>
                      <span className="font-bold text-texto tabular-nums">
                        {r.cantidad} <small className="font-medium text-sutil">· {pct}%</small>
                      </span>
                    </span>
                    <Pista ancho={pct} color={tono.barra} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <SinDatos>Los resultados aparecen cuando se envía el primer informe.</SinDatos>
          )}
        </Tarjeta>

        {/* ================= EN CURSO HACE MÁS TIEMPO ================= */}
        <Tarjeta titulo="En curso hace más tiempo" subtitulo="Solicitudes sin informe, de la más antigua a la más nueva">
          {d.sinResponsable > 0 && (
            <button
              type="button"
              onClick={() => irALista({ responsable: 'sin' })}
              className={cx('mb-3.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] bg-e-recibida-bg px-3.5 py-[11px] text-left text-sm text-e-recibida hover:brightness-97', FOCO)}
            >
              <FaExclamationCircle aria-hidden="true" />
              <span className="flex-1">
                <strong>{d.sinResponsable}</strong> {d.sinResponsable === 1 ? 'solicitud sin' : 'solicitudes sin'} profesional responsable
              </span>
              <FaChevronRight aria-hidden="true" className="text-[11px]" />
            </button>
          )}
          {enEspera.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {enEspera.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/solicitudes/${s.id}`}
                    className={cx(
                      'flex items-center gap-3 rounded-[10px] border border-borde px-3 py-2.5 text-texto no-underline transition-colors hover:border-acento hover:bg-acento-suave',
                      FOCO
                    )}
                  >
                    <Avatar nombre={s.candidato.nombre} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <strong className="text-sm">{s.candidato.nombre}</strong>
                      <span className="truncate text-[12.5px] text-tenue">
                        {s.nombreCargo} · desde el {formatearFecha(s.fechaSolicitud)}
                      </span>
                    </span>
                    <span className="shrink-0 text-base font-bold text-texto tabular-nums">
                      {diasEsperando(s)} <small className="text-xs font-medium text-sutil">{diasEsperando(s) === 1 ? 'día' : 'días'}</small>
                    </span>
                    <span className="hidden sm:inline-flex">
                      <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <SinDatos>No hay solicitudes en curso. ¡Todo al día!</SinDatos>
          )}
        </Tarjeta>
      </div>
    </Pagina>
  );
};

export default Dashboard;
