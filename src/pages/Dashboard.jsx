import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers,
  FaRegClock,
  FaSearch,
  FaRegCalendarCheck,
  FaCheckCircle,
  FaFileDownload,
  FaEye,
  FaSyncAlt,
  FaFileExcel,
  FaTimes,
  FaEnvelope,
  FaPhoneAlt,
  FaWhatsapp,
  FaIdCard,
  FaBriefcase,
  FaInbox,
  FaExternalLinkAlt,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaRegCopy,
  FaChartBar,
  FaSearchPlus,
  FaRegFileAlt,
  FaFileWord,
  FaLayerGroup,
} from 'react-icons/fa';
import * as auth from '../auth';
import {
  AREAS,
  ESTADOS,
  ORDEN_ESTADOS,
  obtenerPostulaciones,
  actualizarEstado,
  descargarCv,
  ErrorApi,
} from '../services/postulaciones';
import './Dashboard.css';

const POR_PAGINA = 10;
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ICONOS_ESTADO = {
  pendiente: FaRegClock,
  revision: FaSearchPlus,
  entrevista: FaRegCalendarCheck,
  finalizado: FaCheckCircle,
};

// ================= UTILIDADES =================
const iniciales = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

const aFecha = (valor) => {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const formatearFecha = (valor) => {
  const d = aFecha(valor);
  return d
    ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
};

const tiempoRelativo = (valor) => {
  const d = aFecha(valor);
  if (!d) return '';
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return `Hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }
  const meses = Math.floor(dias / 30);
  return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
};

const telefonoInternacional = (tel = '') => {
  const digitos = tel.replace(/\D/g, '');
  if (!digitos) return '';
  return digitos.startsWith('56') ? digitos : `56${digitos}`;
};

const esWord = (nombre = '') => nombre.toLowerCase().endsWith('.docx');

const sinAcentos = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const exportarCsv = (filas) => {
  const columnas = ['Nombre', 'RUT', 'Correo', 'Teléfono', 'Cargo', 'Área', 'Fecha', 'Estado'];
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = filas.map((p) =>
    [
      p.nombre,
      p.rut,
      p.correo,
      p.telefono,
      p.cargo,
      AREAS[p.area] ?? p.area,
      formatearFecha(p.fecha),
      ESTADOS[p.estado]?.label,
    ]
      .map(escapar)
      .join(';')
  );
  // BOM + punto y coma: Excel en español lo abre con columnas y acentos correctos
  const contenido = '﻿' + [columnas.join(';'), ...lineas].join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `postulaciones_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ================= COMPONENTES PEQUEÑOS =================
const EstadoBadge = ({ estado }) => {
  const Icono = ICONOS_ESTADO[estado] ?? FaRegClock;
  return (
    <span className={`db-badge db-badge--${estado}`}>
      <Icono aria-hidden="true" />
      {ESTADOS[estado]?.label ?? 'Pendiente'}
    </span>
  );
};

// Tarjeta de resumen. Es un botón: al presionarla filtra la tabla por ese estado.
const KpiCard = ({ titulo, valor, detalle, Icono, variante, cargando, activa, onClick }) => (
  <button
    type="button"
    className={`db-kpi db-kpi--${variante}${activa ? ' is-active' : ''}`}
    onClick={onClick}
    aria-pressed={activa}
    title={`Ver ${titulo.toLowerCase()} en la tabla`}
  >
    <div className="db-kpi-top">
      <span className="db-kpi-title">{titulo}</span>
      <span className="db-kpi-icon" aria-hidden="true">
        <Icono />
      </span>
    </div>
    <span className="db-kpi-value">{cargando ? '—' : valor}</span>
    <span className="db-kpi-detail">{cargando ? 'Cargando…' : detalle}</span>
  </button>
);

const EstadoVacio = ({ Icono, titulo, texto, children }) => (
  <div className="db-empty">
    <span className="db-empty-icon" aria-hidden="true">
      <Icono />
    </span>
    <p className="db-empty-title">{titulo}</p>
    {texto && <p className="db-empty-text">{texto}</p>}
    {children}
  </div>
);

// ================= DASHBOARD =================
const Dashboard = () => {
  const navigate = useNavigate();

  const [postulaciones, setPostulaciones] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState('cargando'); // cargando | listo | error
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroArea, setFiltroArea] = useState('todas');
  const [pagina, setPagina] = useState(1);

  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [aviso, setAviso] = useState(null); // { tipo, texto }

  const panelRef = useRef(null);
  const tablaRef = useRef(null);

  // ---------- Sesión vencida: se limpia y se vuelve al login ----------
  const sesionExpirada = () => {
    auth.cerrarSesion();
    navigate('/login', { replace: true });
  };

  // ---------- Carga de datos ----------
  const cargar = useCallback(async () => {
    setEstadoCarga('cargando');
    try {
      const datos = await obtenerPostulaciones();
      setPostulaciones(datos);
      setEstadoCarga('listo');
      setUltimaActualizacion(new Date());
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 401) return sesionExpirada();
      console.error('Error al cargar postulaciones:', err);
      setEstadoCarga('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ---------- Avisos temporales ----------
  const mostrarAviso = (tipo, texto) => {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), 3500);
  };

  // ---------- Cerrar con Escape ----------
  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === 'Escape') setSeleccionadaId(null);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, []);

  useEffect(() => {
    if (seleccionadaId) panelRef.current?.focus();
  }, [seleccionadaId]);

  // ---------- Métricas ----------
  const conteos = useMemo(() => {
    const base = { pendiente: 0, revision: 0, entrevista: 0, finalizado: 0 };
    postulaciones.forEach((p) => {
      base[p.estado] = (base[p.estado] ?? 0) + 1;
    });
    return base;
  }, [postulaciones]);

  const total = postulaciones.length;

  const nuevasSemana = useMemo(() => {
    const hace7 = Date.now() - 7 * 86400000;
    return postulaciones.filter((p) => (aFecha(p.fecha)?.getTime() ?? 0) >= hace7).length;
  }, [postulaciones]);

  const porArea = useMemo(
    () =>
      Object.entries(AREAS).map(([valor, label]) => ({
        valor,
        label,
        cantidad: postulaciones.filter((p) => p.area === valor).length,
      })),
    [postulaciones]
  );

  const porMes = useMemo(() => {
    const hoy = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const ref = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1);
      const cantidad = postulaciones.filter((p) => {
        const d = aFecha(p.fecha);
        return d && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
      }).length;
      return { label: MESES_CORTOS[ref.getMonth()], cantidad, actual: i === 5 };
    });
  }, [postulaciones]);

  const porcentaje = (n) => (total > 0 ? `${Math.round((n / total) * 100)}% del total` : 'Sin datos aún');

  // ---------- Filtros ----------
  const filtradas = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    const qRut = busqueda.replace(/[^0-9kK]/g, '').toLowerCase();
    return postulaciones
      .filter((p) => filtroEstado === 'todos' || p.estado === filtroEstado)
      .filter((p) => filtroArea === 'todas' || p.area === filtroArea)
      .filter((p) => {
        if (!q) return true;
        const rutLimpio = p.rut.replace(/[^0-9kK]/g, '').toLowerCase();
        return (
          sinAcentos(p.nombre).includes(q) ||
          sinAcentos(p.correo).includes(q) ||
          sinAcentos(p.cargo).includes(q) ||
          (qRut.length >= 3 && rutLimpio.includes(qRut))
        );
      })
      .sort((a, b) => (aFecha(b.fecha)?.getTime() ?? 0) - (aFecha(a.fecha)?.getTime() ?? 0));
  }, [postulaciones, busqueda, filtroEstado, filtroArea]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  useEffect(() => setPagina(1), [busqueda, filtroEstado, filtroArea]);

  const hayFiltros = busqueda || filtroEstado !== 'todos' || filtroArea !== 'todas';
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('todos');
    setFiltroArea('todas');
  };

  // Al presionar una tarjeta: filtra por ese estado y baja hasta la tabla.
  // Si la tarjeta ya estaba activa, vuelve a mostrar todas.
  const irATabla = (estado) => {
    setFiltroEstado((actual) => (actual === estado && estado !== 'todos' ? 'todos' : estado));
    setBusqueda('');
    setFiltroArea('todas');
    tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const seleccionada = postulaciones.find((p) => p.id === seleccionadaId) ?? null;

  // ---------- Acciones ----------
  const cambiarEstado = async (id, nuevoEstado) => {
    const anterior = postulaciones.find((p) => p.id === id)?.estado;
    if (anterior === nuevoEstado) return;
    // Actualización optimista: se ve el cambio al instante
    setPostulaciones((prev) => prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p)));
    try {
      await actualizarEstado(id, nuevoEstado);
      mostrarAviso('ok', `Estado actualizado a "${ESTADOS[nuevoEstado].label}".`);
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 401) return sesionExpirada();
      console.error(err);
      setPostulaciones((prev) => prev.map((p) => (p.id === id ? { ...p, estado: anterior } : p)));
      mostrarAviso('error', 'No se pudo guardar el cambio. Inténtalo nuevamente.');
    }
  };

  const manejarDescarga = async (p) => {
    try {
      await descargarCv(p);
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 401) return sesionExpirada();
      console.error(err);
      mostrarAviso('error', 'No se pudo descargar el CV.');
    }
  };

  const copiar = async (texto, etiqueta) => {
    try {
      await navigator.clipboard.writeText(texto);
      mostrarAviso('ok', `${etiqueta} copiado.`);
    } catch {
      mostrarAviso('error', 'No se pudo copiar.');
    }
  };

  const cargando = estadoCarga === 'cargando' && total === 0;
  const maxArea = Math.max(...porArea.map((a) => a.cantidad), 1);
  const maxMes = Math.max(...porMes.map((m) => m.cantidad), 1);

  // ================= RENDER =================
  return (
    <>
      <main className="db-main">
        {/* ---------- TÍTULO ---------- */}
        <section className="db-titlebar">
          <div>
            <h1>Postulaciones</h1>
            <p>
              Revisa, filtra y gestiona a los candidatos que postulan a AquaChile.
              {ultimaActualizacion && (
                <span className="db-updated">
                  {' '}Actualizado a las{' '}
                  {ultimaActualizacion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}.
                </span>
              )}
            </p>
          </div>
          <div className="db-titlebar-actions">
            <button
              type="button"
              className="db-btn db-btn--ghost"
              onClick={cargar}
              disabled={estadoCarga === 'cargando'}
            >
              <FaSyncAlt className={estadoCarga === 'cargando' ? 'db-spin' : ''} aria-hidden="true" />
              Actualizar
            </button>
            <button
              type="button"
              className="db-btn db-btn--outline"
              onClick={() => exportarCsv(filtradas)}
              disabled={filtradas.length === 0}
              title="Descarga la lista filtrada para abrirla en Excel"
            >
              <FaFileExcel aria-hidden="true" /> Exportar a Excel
            </button>
          </div>
        </section>

        {estadoCarga === 'error' && (
          <div className="db-alert" role="alert">
            <FaExclamationTriangle aria-hidden="true" />
            <span>No pudimos conectar con el servidor. Revisa que el backend esté encendido.</span>
            <button type="button" onClick={cargar}>Reintentar</button>
          </div>
        )}

        {/* ---------- KPIs ---------- */}
        <section className="db-kpis" aria-label="Resumen">
          <KpiCard
            titulo="Total postulantes"
            valor={total}
            detalle={total > 0 ? `${nuevasSemana} nuevas esta semana` : 'Sin postulaciones aún'}
            Icono={FaUsers}
            variante="total"
            cargando={cargando}
            activa={filtroEstado === 'todos'}
            onClick={() => irATabla('todos')}
          />
          {ORDEN_ESTADOS.map((estado) => (
            <KpiCard
              key={estado}
              titulo={ESTADOS[estado].label}
              valor={conteos[estado]}
              detalle={total > 0 ? porcentaje(conteos[estado]) : ESTADOS[estado].descripcion}
              Icono={ICONOS_ESTADO[estado]}
              variante={estado}
              cargando={cargando}
              activa={filtroEstado === estado}
              onClick={() => irATabla(estado)}
            />
          ))}
        </section>

        {/* ---------- TABLA ---------- */}
        <section className="db-card db-table-card" aria-labelledby="tabla-titulo" ref={tablaRef}>
          <div className="db-card-head db-table-head">
            <div>
              <h2 id="tabla-titulo">Solicitudes</h2>
              <p>
                {total > 0
                  ? `${filtradas.length} de ${total} ${total === 1 ? 'postulación' : 'postulaciones'}`
                  : 'Las postulaciones del formulario aparecerán aquí'}
              </p>
            </div>

            <div className="db-filters">
              <label className="db-search">
                <FaSearch aria-hidden="true" />
                <span className="db-visually-hidden">Buscar</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, RUT o cargo"
                />
              </label>
              <label className="db-select">
                <span className="db-visually-hidden">Filtrar por área</span>
                <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
                  <option value="todas">Todas las áreas</option>
                  {Object.entries(AREAS).map(([valor, label]) => (
                    <option key={valor} value={valor}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="db-tabs" role="tablist" aria-label="Filtrar por estado">
            {['todos', ...ORDEN_ESTADOS].map((estado) => (
              <button
                key={estado}
                type="button"
                role="tab"
                aria-selected={filtroEstado === estado}
                className={`db-tab${filtroEstado === estado ? ' is-active' : ''}`}
                onClick={() => setFiltroEstado(estado)}
              >
                {estado === 'todos' ? 'Todos' : ESTADOS[estado].label}
                <span className="db-tab-count">{estado === 'todos' ? total : conteos[estado]}</span>
              </button>
            ))}
          </div>

          {cargando ? (
            <div className="db-skeleton-list" aria-label="Cargando postulaciones">
              {[0, 1, 2, 3].map((i) => (
                <div className="db-skeleton-row" key={i}>
                  <span className="db-skeleton db-skeleton--circle" />
                  <span className="db-skeleton db-skeleton--wide" />
                  <span className="db-skeleton" />
                  <span className="db-skeleton" />
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <EstadoVacio
              Icono={FaInbox}
              titulo="Aún no hay postulaciones"
              texto="Cuando alguien envíe el formulario de postulación, aparecerá aquí con su CV listo para revisar."
            >
              <a href="/formulario" target="_blank" rel="noopener noreferrer" className="db-btn db-btn--outline">
                Abrir formulario público <FaExternalLinkAlt aria-hidden="true" />
              </a>
            </EstadoVacio>
          ) : filtradas.length === 0 ? (
            <EstadoVacio
              Icono={FaSearch}
              titulo="Sin resultados"
              texto="Ninguna postulación coincide con la búsqueda o los filtros elegidos."
            >
              {hayFiltros && (
                <button type="button" className="db-btn db-btn--outline" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}
            </EstadoVacio>
          ) : (
            <>
              <div className="db-table-wrap">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th scope="col">Candidato</th>
                      <th scope="col">RUT</th>
                      <th scope="col">Cargo y área</th>
                      <th scope="col">Postuló</th>
                      <th scope="col">Estado</th>
                      <th scope="col" className="db-th-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((p) => (
                      <tr
                        key={p.id}
                        className={p.estado === 'pendiente' ? 'is-new' : undefined}
                        onClick={() => setSeleccionadaId(p.id)}
                      >
                        <td>
                          <div className="db-candidate">
                            <span className="db-avatar">{iniciales(p.nombre)}</span>
                            <div>
                              <span className="db-candidate-name">{p.nombre}</span>
                              <span className="db-candidate-mail">{p.correo}</span>
                            </div>
                          </div>
                        </td>
                        <td className="db-mono">{p.rut || '—'}</td>
                        <td>
                          <span className="db-cargo">{p.cargo || '—'}</span>
                          <span className="db-area-chip">{AREAS[p.area] ?? (p.area || '—')}</span>
                        </td>
                        <td>
                          <span className="db-date">{formatearFecha(p.fecha)}</span>
                          <span className="db-date-rel">{tiempoRelativo(p.fecha)}</span>
                        </td>
                        <td>
                          <EstadoBadge estado={p.estado} />
                        </td>
                        <td className="db-td-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="db-icon-btn"
                            onClick={() => manejarDescarga(p)}
                            aria-label={`Descargar CV de ${p.nombre}`}
                            title="Descargar CV"
                          >
                            <FaFileDownload aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="db-btn db-btn--primary db-btn--sm"
                            onClick={() => setSeleccionadaId(p.id)}
                          >
                            <FaEye aria-hidden="true" /> Revisar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <nav className="db-pagination" aria-label="Paginación">
                  <span>
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="db-icon-btn"
                      onClick={() => setPagina(paginaActual - 1)}
                      disabled={paginaActual === 1}
                      aria-label="Página anterior"
                    >
                      <FaChevronLeft aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="db-icon-btn"
                      onClick={() => setPagina(paginaActual + 1)}
                      disabled={paginaActual === totalPaginas}
                      aria-label="Página siguiente"
                    >
                      <FaChevronRight aria-hidden="true" />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>

        {/* ---------- GRÁFICOS ---------- */}
        <section className="db-charts">
          <div className="db-card">
            <div className="db-card-head">
              <div>
                <h2>Postulaciones por área</h2>
                <p>Distribución total según el área de interés</p>
              </div>
            </div>
            {total === 0 ? (
              <EstadoVacio
                Icono={FaChartBar}
                titulo="Sin datos todavía"
                texto="El gráfico se completa a medida que lleguen postulaciones."
              />
            ) : (
              <ul className="db-hbars">
                {porArea.map((a) => (
                  <li key={a.valor}>
                    <div className="db-hbar-label">
                      <span>{a.label}</span>
                      <strong>{a.cantidad}</strong>
                    </div>
                    <div className="db-hbar-track">
                      <div
                        className="db-hbar-fill"
                        style={{ width: `${(a.cantidad / maxArea) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="db-card">
            <div className="db-card-head">
              <div>
                <h2>Postulaciones por mes</h2>
                <p>Últimos 6 meses</p>
              </div>
            </div>
            {total === 0 ? (
              <EstadoVacio
                Icono={FaChartBar}
                titulo="Sin datos todavía"
                texto="Aquí verás cuántas postulaciones llegan cada mes."
              />
            ) : (
              <div className="db-vbars" role="img" aria-label={porMes.map((m) => `${m.label}: ${m.cantidad}`).join(', ')}>
                {porMes.map((m) => (
                  <div className={`db-vbar${m.actual ? ' is-current' : ''}`} key={m.label}>
                    <span className="db-vbar-value">{m.cantidad}</span>
                    <div className="db-vbar-track">
                      <div
                        className="db-vbar-fill"
                        style={{ height: `${Math.max((m.cantidad / maxMes) * 100, m.cantidad ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="db-vbar-label">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ---------- PANEL DE DETALLE ---------- */}
      {seleccionada && (
        <>
          <div className="db-drawer-backdrop" onClick={() => setSeleccionadaId(null)} />
          <aside
            className="db-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-nombre"
            tabIndex={-1}
            ref={panelRef}
          >
            <div className="db-drawer-head">
              <span className="db-avatar db-avatar--lg">{iniciales(seleccionada.nombre)}</span>
              <div className="db-drawer-title">
                <h2 id="detalle-nombre">{seleccionada.nombre}</h2>
                <span>
                  {seleccionada.cargo ? `${seleccionada.cargo} · ` : ''}Postuló el {formatearFecha(seleccionada.fecha)}
                </span>
              </div>
              <button
                type="button"
                className="db-icon-btn"
                onClick={() => setSeleccionadaId(null)}
                aria-label="Cerrar detalle"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <div className="db-drawer-body">
              <section className="db-drawer-section">
                <h3>Estado del proceso</h3>
                <div className="db-steps" role="radiogroup" aria-label="Estado del proceso">
                  {ORDEN_ESTADOS.map((estado, i) => {
                    const actualIdx = ORDEN_ESTADOS.indexOf(seleccionada.estado);
                    const clase = i < actualIdx ? 'is-done' : i === actualIdx ? 'is-active' : '';
                    return (
                      <button
                        key={estado}
                        type="button"
                        role="radio"
                        aria-checked={seleccionada.estado === estado}
                        className={`db-step ${clase}`}
                        onClick={() => cambiarEstado(seleccionada.id, estado)}
                      >
                        <span className="db-step-dot">{i < actualIdx ? '✓' : i + 1}</span>
                        <span className="db-step-label">{ESTADOS[estado].label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="db-drawer-section">
                <h3>Datos de contacto</h3>
                <dl className="db-info">
                  <div>
                    <dt><FaEnvelope aria-hidden="true" /> Correo</dt>
                    <dd>
                      <a href={`mailto:${seleccionada.correo}`}>{seleccionada.correo || '—'}</a>
                      {seleccionada.correo && (
                        <button
                          type="button"
                          className="db-copy"
                          onClick={() => copiar(seleccionada.correo, 'Correo')}
                          aria-label="Copiar correo"
                        >
                          <FaRegCopy aria-hidden="true" />
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt><FaPhoneAlt aria-hidden="true" /> Teléfono</dt>
                    <dd>
                      {seleccionada.telefono ? (
                        <>
                          <a href={`tel:+${telefonoInternacional(seleccionada.telefono)}`}>
                            +{telefonoInternacional(seleccionada.telefono)}
                          </a>
                          <a
                            className="db-whatsapp"
                            href={`https://wa.me/${telefonoInternacional(seleccionada.telefono)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FaWhatsapp aria-hidden="true" /> WhatsApp
                          </a>
                        </>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt><FaIdCard aria-hidden="true" /> RUT</dt>
                    <dd>
                      <span className="db-mono">{seleccionada.rut || '—'}</span>
                      {seleccionada.rut && (
                        <button
                          type="button"
                          className="db-copy"
                          onClick={() => copiar(seleccionada.rut, 'RUT')}
                          aria-label="Copiar RUT"
                        >
                          <FaRegCopy aria-hidden="true" />
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt><FaBriefcase aria-hidden="true" /> Cargo</dt>
                    <dd>{seleccionada.cargo || '—'}</dd>
                  </div>
                  <div>
                    <dt><FaLayerGroup aria-hidden="true" /> Área</dt>
                    <dd>{AREAS[seleccionada.area] ?? (seleccionada.area || '—')}</dd>
                  </div>
                </dl>
              </section>

              <section className="db-drawer-section">
                <h3>Carta de presentación</h3>
                {seleccionada.carta ? (
                  <p className="db-letter">{seleccionada.carta}</p>
                ) : (
                  <p className="db-muted">El candidato no adjuntó carta de presentación.</p>
                )}
              </section>

              <section className="db-drawer-section">
                <h3>Currículum</h3>
                <div className="db-cv">
                  {esWord(seleccionada.cvNombre) ? (
                    <FaFileWord className="db-cv-icon db-cv-icon--word" aria-hidden="true" />
                  ) : (
                    <FaRegFileAlt className="db-cv-icon" aria-hidden="true" />
                  )}
                  <div className="db-cv-info">
                    <strong>{seleccionada.cvNombre || 'CV del candidato'}</strong>
                    <span>{esWord(seleccionada.cvNombre) ? 'Documento Word' : 'Documento PDF'}</span>
                  </div>
                  <button
                    type="button"
                    className="db-btn db-btn--outline db-btn--sm"
                    onClick={() => manejarDescarga(seleccionada)}
                  >
                    <FaFileDownload aria-hidden="true" /> Descargar
                  </button>
                </div>
              </section>
            </div>

            <div className="db-drawer-foot">
              <a className="db-btn db-btn--primary" href={`mailto:${seleccionada.correo}?subject=${encodeURIComponent('Tu postulación en AquaChile')}`}>
                <FaEnvelope aria-hidden="true" /> Escribir al candidato
              </a>
            </div>
          </aside>
        </>
      )}

      {/* ---------- AVISOS ---------- */}
      {aviso && (
        <div className={`db-toast db-toast--${aviso.tipo}`} role="status">
          {aviso.tipo === 'ok' ? <FaCheckCircle aria-hidden="true" /> : <FaExclamationTriangle aria-hidden="true" />}
          {aviso.texto}
        </div>
      )}
    </>
  );
};

export default Dashboard;
