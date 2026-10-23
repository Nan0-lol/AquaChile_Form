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
} from 'react-icons/fa';
import { obtenerIndicadores, listarSolicitudes, obtenerCatalogos, ErrorApi } from '../services/api';
import { estadoGeneral, formatearFecha, iniciales } from '../utils/proceso';
import { Cargando, ErrorCarga, EtapaBadge } from '../components/Proceso';
import './NuevaSolicitud.css';
import './Dashboard.css';

const CLAVE_FILTROS = 'aquachile_filtros_solicitudes';
const DIA_MS = 86_400_000;

// Íconos y tono de cada resultado (son estados: siempre van con ícono y texto, nunca solo color)
const TONO_RESULTADO = {
  recomendado: { tono: 'bueno', Icono: FaThumbsUp },
  recomendado_obs: { tono: 'alerta', Icono: FaExclamationTriangle },
  no_recomendado: { tono: 'critico', Icono: FaTimesCircle },
};

const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

/** Tarjeta de indicador. Si tiene filtro, lleva a la lista ya filtrada. */
const Indicador = ({ titulo, valor, unidad, detalle, Icono, tono, onAbrir }) => {
  const contenido = (
    <>
      <span className={`dsh-kpi-icon dsh-kpi-icon--${tono}`} aria-hidden="true">
        <Icono />
      </span>
      <span className="dsh-kpi-titulo">{titulo}</span>
      <span className="dsh-kpi-valor">
        {valor}
        {unidad && <small> {unidad}</small>}
      </span>
      <span className="dsh-kpi-detalle">{detalle}</span>
    </>
  );
  return onAbrir ? (
    <button type="button" className="dsh-kpi dsh-kpi--link" onClick={onAbrir}>
      {contenido}
      <span className="visually-hidden">. Ver en la lista de solicitudes</span>
    </button>
  ) : (
    <div className="dsh-kpi">{contenido}</div>
  );
};

/** Gráfico de barras agrupadas: solicitudes recibidas e informes enviados por mes */
const GraficoMeses = ({ meses }) => {
  const [activo, setActivo] = useState(null);
  const maximo = Math.max(1, ...meses.flatMap((m) => [m.cantidad, m.informes]));
  // 3 líneas guía "redondas" para leer la escala
  const paso = Math.max(1, Math.ceil(maximo / 3));
  const tope = paso * 3;
  const guias = [tope, paso * 2, paso, 0];

  return (
    <div className="dsh-meses">
      <div className="dsh-leyenda" aria-hidden="true">
        <span><i className="dsh-dot dsh-dot--serie1" /> Solicitudes recibidas</span>
        <span><i className="dsh-dot dsh-dot--serie2" /> Informes enviados</span>
      </div>
      <div className="dsh-plot" onMouseLeave={() => setActivo(null)}>
        <div className="dsh-guias" aria-hidden="true">
          {guias.map((g) => (
            <div key={g} className="dsh-guia">
              <span>{g}</span>
            </div>
          ))}
        </div>
        <div className="dsh-columnas">
          {meses.map((m) => (
            <div
              key={m.mes}
              className={`dsh-col${activo === m.mes ? ' is-activo' : ''}${m.actual ? ' is-actual' : ''}`}
              tabIndex={0}
              onMouseEnter={() => setActivo(m.mes)}
              onFocus={() => setActivo(m.mes)}
              onBlur={() => setActivo(null)}
              aria-label={`${m.etiqueta}${m.actual ? ' (mes actual)' : ''}: ${m.cantidad} solicitudes recibidas, ${m.informes} informes enviados`}
            >
              <div className="dsh-barras" aria-hidden="true">
                <span className="dsh-barra dsh-barra--serie1" style={{ height: `${(m.cantidad / tope) * 100}%` }} />
                <span className="dsh-barra dsh-barra--serie2" style={{ height: `${(m.informes / tope) * 100}%` }} />
              </div>
              <span className="dsh-col-mes" aria-hidden="true">{m.etiqueta}</span>
              {activo === m.mes && (
                <div className="dsh-tooltip" role="presentation">
                  <strong>{m.etiqueta}{m.actual ? ' (actual)' : ''}</strong>
                  <span><i className="dsh-dot dsh-dot--serie1" /> {m.cantidad} {m.cantidad === 1 ? 'recibida' : 'recibidas'}</span>
                  <span><i className="dsh-dot dsh-dot--serie2" /> {m.informes} {m.informes === 1 ? 'informe' : 'informes'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* La misma información como tabla, para lectores de pantalla */}
      <div className="visually-hidden">
      <table>
        <caption>Solicitudes recibidas e informes enviados por mes</caption>
        <thead>
          <tr><th scope="col">Mes</th><th scope="col">Recibidas</th><th scope="col">Informes</th></tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes}><th scope="row">{m.etiqueta}</th><td>{m.cantidad}</td><td>{m.informes}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

/** Barras horizontales de una sola serie (familias, etapas) */
// `escala`: el valor que llena la barra. Si varios grupos se comparan entre sí,
// deben usar la misma escala (si no, un 1 y un 8 se verían igual de largos).
const Barras = ({ filas, total, escala, etiquetaValor = (f) => f.cantidad }) => {
  const maximo = Math.max(1, escala ?? Math.max(...filas.map((f) => f.cantidad)));
  return (
    <ul className="dsh-hbarras">
      {filas.map((f) => (
        <li key={f.clave} className="dsh-hbarra">
          <span className="dsh-hbarra-etiqueta">{f.etiqueta}</span>
          <span className="dsh-hbarra-pista" aria-hidden="true">
            <span className="dsh-hbarra-relleno" style={{ width: `${(f.cantidad / maximo) * 100}%` }} />
          </span>
          <span className="dsh-hbarra-valor">
            {etiquetaValor(f)}
            {total ? <small> · {porcentaje(f.cantidad, total)}%</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
};

const Tarjeta = ({ titulo, subtitulo, children, className = '' }) => (
  <section className={`ns-card dsh-card ${className}`}>
    <header className="dsh-card-head">
      <h2>{titulo}</h2>
      {subtitulo && <p>{subtitulo}</p>}
    </header>
    <div className="dsh-card-body">{children}</div>
  </section>
);

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

  if (carga === 'cargando') return <main className="pr-main"><Cargando texto="Calculando indicadores…" /></main>;
  if (carga === 'error') return <main className="pr-main"><ErrorCarga mensaje={error} onReintentar={() => cargar()} /></main>;

  const d = datos;
  const totalResultados = d.porResultado.reduce((a, r) => a + r.cantidad, 0);
  const familias = d.porFamilia.filter((f) => f.cantidad > 0);
  const diasEsperando = (s) => Math.max(0, Math.floor((Date.now() - new Date(s.fechaSolicitud)) / DIA_MS));
  const etapas = d.porEtapa;
  const maxEtapa = Math.max(...etapas.map((e) => e.cantidad));

  return (
    <main className="pr-main dsh">
      <div className="pr-titlebar">
        <div>
          <h1>Panel de indicadores</h1>
          <p>
            Resumen del proceso de evaluación psicolaboral
            {actualizado && <> · actualizado a las {actualizado.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</>}
          </p>
        </div>
        <div className="pr-titlebar-actions">
          <button type="button" className="ns-btn ns-btn--outline" onClick={() => cargar(true)} disabled={refrescando}>
            <FaSyncAlt className={refrescando ? 'dsh-girando' : undefined} aria-hidden="true" />
            {refrescando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* ================= INDICADORES PRINCIPALES ================= */}
      <section className="dsh-kpis" aria-label="Indicadores principales">
        <Indicador
          titulo="Candidatos registrados"
          valor={d.totalCandidatos}
          detalle={`${d.totalSolicitudes} ${d.totalSolicitudes === 1 ? 'solicitud' : 'solicitudes'} en total`}
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
        <Indicador
          titulo="En proceso"
          valor={d.enProceso}
          detalle="Entrevista agendada o realizada"
          Icono={FaSpinner}
          tono="proceso"
        />
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
              ? `De la solicitud al informe · ${d.informesConTiming} ${d.informesConTiming === 1 ? 'informe' : 'informes'}`
              : 'Aparece con el primer informe enviado'
          }
          Icono={FaStopwatch}
          tono="neutro"
        />
      </section>

      <div className="dsh-grid">
        {/* ================= POR MES ================= */}
        <Tarjeta titulo="Evaluaciones por mes" subtitulo="Últimos 6 meses" className="dsh-ancho">
          <GraficoMeses meses={d.porMes} />
        </Tarjeta>

        {/* ================= ETAPAS ================= */}
        <Tarjeta titulo="Estado del proceso" subtitulo="Las 4 etapas agrupadas en los 3 estados del caso">
          {['Pendiente', 'En proceso', 'Finalizada'].map((estado) => {
            const filas = etapas.filter((e) => estadoGeneral(e.clave) === estado);
            const suma = filas.reduce((a, f) => a + f.cantidad, 0);
            return (
              <div key={estado} className="dsh-grupo">
                <p className="dsh-grupo-titulo">
                  {estado} <span>{suma}</span>
                </p>
                <Barras filas={filas} total={d.totalSolicitudes} escala={maxEtapa} />
              </div>
            );
          })}
        </Tarjeta>

        {/* ================= FAMILIAS ================= */}
        <Tarjeta titulo="Por familia de cargo" subtitulo="Todas las solicitudes registradas">
          {familias.length ? (
            <Barras filas={familias} total={d.totalSolicitudes} />
          ) : (
            <p className="dsh-vacio">Todavía no hay solicitudes.</p>
          )}
        </Tarjeta>

        {/* ================= RESULTADOS ================= */}
        <Tarjeta titulo="Resultados de las evaluaciones" subtitulo={`${totalResultados} informes enviados`}>
          {totalResultados ? (
            <ul className="dsh-resultados">
              {d.porResultado.map((r) => {
                const { tono, Icono } = TONO_RESULTADO[r.clave] ?? { tono: 'neutro', Icono: FaCheckCircle };
                const pct = porcentaje(r.cantidad, totalResultados);
                return (
                  <li key={r.clave} className={`dsh-resultado dsh-resultado--${tono}`}>
                    <span className="dsh-resultado-cab">
                      <Icono aria-hidden="true" />
                      <span className="dsh-resultado-nombre">{r.etiqueta}</span>
                      <span className="dsh-resultado-valor">
                        {r.cantidad} <small>· {pct}%</small>
                      </span>
                    </span>
                    <span className="dsh-hbarra-pista" aria-hidden="true">
                      <span className="dsh-hbarra-relleno" style={{ width: `${pct}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="dsh-vacio">Los resultados aparecen cuando se envía el primer informe.</p>
          )}
        </Tarjeta>

        {/* ================= REQUIEREN ATENCIÓN ================= */}
        <Tarjeta titulo="En curso hace más tiempo" subtitulo="Solicitudes sin informe, de la más antigua a la más nueva">
          {d.sinResponsable > 0 && (
            <button type="button" className="dsh-alerta" onClick={() => irALista({ responsable: 'sin' })}>
              <FaExclamationCircle aria-hidden="true" />
              <span>
                <strong>{d.sinResponsable}</strong> {d.sinResponsable === 1 ? 'solicitud sin' : 'solicitudes sin'} profesional
                responsable
              </span>
              <FaChevronRight className="dsh-alerta-flecha" aria-hidden="true" />
            </button>
          )}
          {enEspera.length ? (
            <ul className="dsh-espera">
              {enEspera.map((s) => (
                <li key={s.id}>
                  <Link to={`/solicitudes/${s.id}`} className="dsh-espera-item">
                    <span className="ns-avatar" aria-hidden="true">{iniciales(s.candidato.nombre)}</span>
                    <span className="dsh-espera-info">
                      <strong>{s.candidato.nombre}</strong>
                      <span>
                        {s.nombreCargo} · desde el {formatearFecha(s.fechaSolicitud)}
                      </span>
                    </span>
                    <span className="dsh-espera-dias">
                      {diasEsperando(s)} <small>{diasEsperando(s) === 1 ? 'día' : 'días'}</small>
                    </span>
                    <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dsh-vacio">No hay solicitudes en curso. ¡Todo al día!</p>
          )}
        </Tarjeta>
      </div>
    </main>
  );
};

export default Dashboard;
