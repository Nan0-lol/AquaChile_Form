import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaArrowRight,
  FaUndo,
  FaCheck,
  FaEnvelope,
  FaWhatsapp,
  FaPhone,
  FaFilePdf,
  FaFileWord,
  FaDownload,
  FaPen,
  FaTrashAlt,
  FaHistory,
  FaClipboardList,
  FaUser,
  FaPaperclip,
  FaStethoscope,
} from 'react-icons/fa';
import {
  obtenerSolicitud,
  obtenerCatalogos,
  obtenerEvaluadores,
  cambiarEtapa,
  guardarEvaluacion,
  actualizarSolicitud,
  eliminarSolicitud,
  descargarAdjunto,
  ErrorApi,
} from '../services/api';
import {
  ORDEN_ETAPAS,
  siguienteEtapa,
  requisitoEtapa,
  validarFechasEvaluacion,
  ahoraLocal,
  diaLocal,
  formatearFecha,
  formatearFechaHora,
  hace,
  iniciales,
  telefonoLegible,
  telefonoWhatsapp,
  cambios,
} from '../utils/proceso';
import { validarCampoSolicitud, esWord, MAX_ASPECTOS } from '../utils/solicitud';
import { puede } from '../auth';
import { EtapaBadge, Cargando, ErrorCarga, Confirmar, Aviso } from '../components/Proceso';
import './NuevaSolicitud.css';

const MAX_OBSERVACIONES = 5000;

const evaluacionInicial = (s) => ({
  fechaEntrevista: s.evaluacion.fechaEntrevista ?? '',
  resultado: s.evaluacion.resultado ?? '',
  fechaInforme: s.evaluacion.fechaInforme ?? '',
  observaciones: s.evaluacion.observaciones ?? '',
});

const datosIniciales = (s) => ({
  familiaCargo: s.familiaCargo,
  nombreCargo: s.nombreCargo,
  ubicacion: s.ubicacion,
  unidad: s.unidad,
  ceco: s.ceco ?? '',
  evaluadorId: s.evaluador?.id ?? '',
  requiereReferencias: s.requiereReferencias,
  referido: s.referido,
  aspectosIndagar: s.aspectosIndagar ?? '',
});

const Tarjeta = ({ titulo, Icono, accion, children, className = '' }) => (
  <section className={`ns-card pr-card ${className}`}>
    <header className="pr-card-head">
      <h2>
        <Icono aria-hidden="true" /> {titulo}
      </h2>
      {accion}
    </header>
    <div className="pr-card-body">{children}</div>
  </section>
);

const Dato = ({ etiqueta, children }) => (
  <div className="pr-dato">
    <dt>{etiqueta}</dt>
    <dd>{children ?? <span className="pr-sin">—</span>}</dd>
  </div>
);

const MensajeError = ({ id, texto }) =>
  texto ? (
    <p id={id} className="ns-error" role="alert">
      {texto}
    </p>
  ) : null;

// ---------------------------------------------------------------------
const DetalleSolicitud = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [solicitud, setSolicitud] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [evaluadores, setEvaluadores] = useState([]);
  const [carga, setCarga] = useState('cargando');
  const [errorCarga, setErrorCarga] = useState('');

  const [evaluacion, setEvaluacion] = useState(null);
  const [erroresEval, setErroresEval] = useState({});
  const [guardandoEval, setGuardandoEval] = useState(false);

  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState(null);
  const [erroresDatos, setErroresDatos] = useState({});
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  const [moviendo, setMoviendo] = useState(false);
  const [errorEtapa, setErrorEtapa] = useState('');
  const [confirmarRetroceso, setConfirmarRetroceso] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const puedeEtapa = puede('solicitud:etapa');
  const puedeEvaluar = puede('evaluacion:editar');
  const puedeEditar = puede('solicitud:editar');
  const puedeBorrar = puede('solicitud:eliminar');

  // Cada vez que llega la solicitud desde el servidor, los formularios parten de ella
  const recibir = (s) => {
    setSolicitud(s);
    setEvaluacion(evaluacionInicial(s));
    setDatos(datosIniciales(s));
  };

  const cargar = () => {
    setCarga('cargando');
    Promise.all([obtenerSolicitud(id), obtenerCatalogos(), obtenerEvaluadores()])
      .then(([s, cat, evs]) => {
        recibir(s);
        setCatalogos(cat);
        setEvaluadores(evs);
        setCarga('lista');
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) return;
        setErrorCarga(err.estado === 404 ? 'Esta solicitud no existe o fue eliminada.' : err.message);
        setCarga('error');
      });
  };
  useEffect(cargar, [id]);

  if (carga === 'cargando') return <main className="pr-main"><Cargando texto="Cargando solicitud…" /></main>;
  if (carga === 'error') {
    return (
      <main className="pr-main">
        <Link to="/solicitudes" className="pr-volver"><FaArrowLeft aria-hidden="true" /> Solicitudes</Link>
        <ErrorCarga mensaje={errorCarga} onReintentar={errorCarga.includes('no existe') ? undefined : cargar} />
      </main>
    );
  }

  const s = solicitud;
  const indiceEtapa = ORDEN_ETAPAS.indexOf(s.etapa);
  const siguiente = siguienteEtapa(s.etapa);
  const anterior = indiceEtapa > 0 ? ORDEN_ETAPAS[indiceEtapa - 1] : null;
  const faltaParaAvanzar = siguiente ? requisitoEtapa(s, siguiente) : '';
  const cambiosEval = cambios(evaluacionInicial(s), evaluacion);
  const hayCambiosEval = Object.keys(cambiosEval).length > 0;

  // ---------- Etapas ----------
  const moverA = async (etapa) => {
    setErrorEtapa('');
    setMoviendo(true);
    try {
      const actualizada = await cambiarEtapa(s.id, etapa);
      recibir(actualizada);
      setAviso({
        texto:
          etapa === 'informe_enviado'
            ? `Informe enviado. Se le avisó por correo a ${actualizada.analista.nombre}.`
            : `Etapa cambiada a «${catalogos.etapas[etapa]}».`,
      });
    } catch (err) {
      if (err.estado === 401) return;
      setErrorEtapa(err.message);
      setErroresEval((prev) => ({ ...prev, ...err.errores }));
    } finally {
      setMoviendo(false);
      setConfirmarRetroceso(false);
    }
  };

  // ---------- Evaluación ----------
  const cambiarEval = (campo, valor) => {
    setEvaluacion((prev) => ({ ...prev, [campo]: valor }));
    if (erroresEval[campo]) setErroresEval((prev) => ({ ...prev, [campo]: '' }));
  };

  const guardarEval = async (e) => {
    e.preventDefault();
    if (!hayCambiosEval || guardandoEval) return;
    // Mismas reglas de fechas que el servidor: avisa antes de enviar
    const errores = validarFechasEvaluacion(s, evaluacion);
    if (evaluacion.observaciones.length > MAX_OBSERVACIONES) {
      errores.observaciones = `Puede tener hasta ${MAX_OBSERVACIONES.toLocaleString('es-CL')} caracteres.`;
    }
    setErroresEval(errores);
    if (Object.keys(errores).length) return;

    setGuardandoEval(true);
    try {
      recibir(await guardarEvaluacion(s.id, cambiosEval));
      setErrorEtapa('');
      setAviso({ texto: 'Evaluación guardada.' });
    } catch (err) {
      if (err.estado === 401) return;
      setErroresEval(err.errores);
      if (!Object.keys(err.errores).length) setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setGuardandoEval(false);
    }
  };

  // ---------- Datos de la solicitud ----------
  const cambiarDato = (campo, valor) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (erroresDatos[campo]) setErroresDatos((prev) => ({ ...prev, [campo]: validarCampoSolicitud(campo, valor) }));
  };

  const guardarDatos = async (e) => {
    e.preventDefault();
    const errores = {};
    for (const campo of ['familiaCargo', 'nombreCargo', 'ubicacion', 'unidad', 'ceco', 'aspectosIndagar']) {
      const error = validarCampoSolicitud(campo, datos[campo]);
      if (error) errores[campo] = error;
    }
    setErroresDatos(errores);
    if (Object.keys(errores).length) return;

    const limpios = { ...datos, ceco: datos.ceco.trim().toUpperCase(), nombreCargo: datos.nombreCargo.trim(), ubicacion: datos.ubicacion.trim(), aspectosIndagar: datos.aspectosIndagar.trim() };
    const diferencias = cambios(datosIniciales(s), limpios);
    if (!Object.keys(diferencias).length) {
      setEditando(false);
      return;
    }
    setGuardandoDatos(true);
    try {
      recibir(await actualizarSolicitud(s.id, diferencias));
      setEditando(false);
      setAviso({ texto: 'Datos de la solicitud actualizados.' });
    } catch (err) {
      if (err.estado === 401) return;
      setErroresDatos(err.errores);
      if (!Object.keys(err.errores).length) setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setGuardandoDatos(false);
    }
  };

  const cancelarEdicion = () => {
    setDatos(datosIniciales(s));
    setErroresDatos({});
    setEditando(false);
  };

  // ---------- Borrar ----------
  const borrar = async () => {
    setBorrando(true);
    try {
      await eliminarSolicitud(s.id);
      navigate('/solicitudes', { replace: true });
    } catch (err) {
      setBorrando(false);
      setConfirmarBorrado(false);
      if (err.estado !== 401) setAviso({ tipo: 'error', texto: err.message });
    }
  };

  const descargar = async (tipo) => {
    try {
      await descargarAdjunto(s, tipo);
    } catch (err) {
      if (err.estado !== 401) setAviso({ tipo: 'error', texto: err.message });
    }
  };

  const propsEval = (campo) => ({
    id: campo,
    value: evaluacion[campo],
    onChange: (e) => cambiarEval(campo, e.target.value),
    disabled: !puedeEvaluar,
    'aria-invalid': erroresEval[campo] ? 'true' : 'false',
    'aria-describedby': erroresEval[campo] ? `${campo}-error` : undefined,
    className: erroresEval[campo] ? 'is-error' : undefined,
  });

  const propsDato = (campo) => ({
    id: `dato-${campo}`,
    value: datos[campo],
    onChange: (e) => cambiarDato(campo, e.target.value),
    'aria-invalid': erroresDatos[campo] ? 'true' : 'false',
    'aria-describedby': erroresDatos[campo] ? `dato-${campo}-error` : undefined,
    className: erroresDatos[campo] ? 'is-error' : undefined,
  });

  const whatsapp = telefonoWhatsapp(s.candidato.telefono);

  return (
    <main className="pr-main">
      <Link to="/solicitudes" className="pr-volver">
        <FaArrowLeft aria-hidden="true" /> Solicitudes
      </Link>

      {/* ================= ENCABEZADO ================= */}
      <div className="pr-detalle-head">
        <span className="ns-avatar ns-avatar--lg" aria-hidden="true">{iniciales(s.candidato.nombre)}</span>
        <div className="pr-detalle-titulo">
          <h1>{s.candidato.nombre}</h1>
          <p>
            {s.nombreCargo} · {catalogos.familiasCargo[s.familiaCargo] ?? s.familiaCargo} · {s.ubicacion}
          </p>
        </div>
        <div className="pr-detalle-acciones">
          <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} conEstado />
          {puedeBorrar && (
            <button type="button" className="ns-btn ns-btn--ghost ns-btn--sm pr-btn-borrar" onClick={() => setConfirmarBorrado(true)}>
              <FaTrashAlt aria-hidden="true" /> Eliminar
            </button>
          )}
        </div>
      </div>

      {/* ================= AVANCE DEL PROCESO ================= */}
      <section className="ns-card pr-avance" aria-labelledby="avance-titulo">
        <h2 id="avance-titulo" className="visually-hidden">Avance del proceso</h2>
        <ol className="pr-stepper">
          {ORDEN_ETAPAS.map((etapa, i) => {
            const estado = i < indiceEtapa || s.etapa === 'informe_enviado' ? 'hecho' : i === indiceEtapa ? 'actual' : 'pendiente';
            return (
              <li key={etapa} className={`pr-step pr-step--${estado}`} aria-current={estado === 'actual' ? 'step' : undefined}>
                <span className="pr-step-marca" aria-hidden="true">
                  {estado === 'hecho' ? <FaCheck /> : i + 1}
                </span>
                <span className="pr-step-texto">
                  <strong>{catalogos.etapas[etapa]}</strong>
                  <small>
                    {etapa === 'recibida' && formatearFecha(s.fechaSolicitud)}
                    {etapa === 'agendada' && (s.evaluacion.fechaEntrevista ? formatearFechaHora(s.evaluacion.fechaEntrevista) : 'Sin fecha')}
                    {etapa === 'realizada' && (i <= indiceEtapa ? 'Entrevista hecha' : '—')}
                    {etapa === 'informe_enviado' && (s.evaluacion.fechaInforme && s.etapa === 'informe_enviado' ? formatearFecha(s.evaluacion.fechaInforme) : '—')}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="pr-avance-pie">
          {s.etapa === 'informe_enviado' ? (
            <p className="pr-avance-info pr-avance-info--ok">
              <FaCheck aria-hidden="true" /> Proceso finalizado en{' '}
              <strong>{s.timingDias ?? 0} {s.timingDias === 1 ? 'día' : 'días'}</strong> desde la solicitud.
            </p>
          ) : (
            <p className="pr-avance-info">
              {s.evaluador ? (
                <>Responsable: <strong>{s.evaluador.nombre}</strong></>
              ) : (
                <>Sin responsable asignado{puedeEtapa && ': al avanzar, quedará a tu cargo.'}</>
              )}
            </p>
          )}

          {puedeEtapa && (
            <div className="pr-avance-botones">
              {anterior && (
                <button type="button" className="ns-btn ns-btn--ghost ns-btn--sm" onClick={() => setConfirmarRetroceso(true)} disabled={moviendo}>
                  <FaUndo aria-hidden="true" /> Volver a «{catalogos.etapas[anterior]}»
                </button>
              )}
              {siguiente && (
                <button
                  type="button"
                  className="ns-btn ns-btn--primary"
                  onClick={() => moverA(siguiente)}
                  disabled={moviendo || Boolean(faltaParaAvanzar)}
                  aria-describedby={faltaParaAvanzar ? 'avance-requisito' : undefined}
                >
                  {moviendo ? 'Guardando…' : <>Pasar a «{catalogos.etapas[siguiente]}» <FaArrowRight aria-hidden="true" /></>}
                </button>
              )}
            </div>
          )}
        </div>
        {puedeEtapa && faltaParaAvanzar && !errorEtapa && (
          <p id="avance-requisito" className="pr-avance-requisito">
            {faltaParaAvanzar}
            {hayCambiosEval && ' Si ya lo escribiste abajo, guarda la evaluación.'}
          </p>
        )}
        {errorEtapa && <p className="ns-alert pr-avance-error" role="alert">{errorEtapa}</p>}
      </section>

      <div className="pr-detalle-grid">
        <div className="pr-col">
          {/* ================= EVALUACIÓN ================= */}
          <Tarjeta titulo="Evaluación psicolaboral" Icono={FaStethoscope}>
            {!puedeEvaluar && (
              <p className="pr-nota">Solo el profesional evaluador puede registrar la evaluación. Aquí la ves en modo lectura.</p>
            )}
            <form onSubmit={guardarEval} noValidate className="pr-form">
              <div className="ns-grid">
                <div className="ns-field">
                  <label className="ns-label" htmlFor="fechaEntrevista">Fecha y hora de la entrevista</label>
                  <input type="datetime-local" min={`${diaLocal(s.fechaSolicitud)}T00:00`} {...propsEval('fechaEntrevista')} />
                  <MensajeError id="fechaEntrevista-error" texto={erroresEval.fechaEntrevista} />
                </div>
                <div className="ns-field">
                  <label className="ns-label" htmlFor="resultado">Resultado</label>
                  <select {...propsEval('resultado')}>
                    <option value="">Sin resultado todavía</option>
                    {Object.entries(catalogos.resultados).map(([clave, texto]) => (
                      <option key={clave} value={clave}>{texto}</option>
                    ))}
                  </select>
                  <MensajeError id="resultado-error" texto={erroresEval.resultado} />
                </div>
                <div className="ns-field">
                  <label className="ns-label" htmlFor="fechaInforme">Fecha del informe</label>
                  <input type="date" min={diaLocal(s.fechaSolicitud)} max={ahoraLocal().slice(0, 10)} {...propsEval('fechaInforme')} />
                  {!erroresEval.fechaInforme && (
                    <p className="ns-hint">Si la dejas vacía, se pone sola al enviar el informe.</p>
                  )}
                  <MensajeError id="fechaInforme-error" texto={erroresEval.fechaInforme} />
                </div>
                <div className="ns-field ns-span-2">
                  <label className="ns-label" htmlFor="observaciones">Observaciones generales</label>
                  <textarea
                    rows={5}
                    maxLength={MAX_OBSERVACIONES}
                    placeholder={puedeEvaluar ? 'Impresiones de la entrevista, fortalezas, aspectos a desarrollar…' : ''}
                    {...propsEval('observaciones')}
                  />
                  <div className="ns-textarea-foot">
                    <span className="ns-hint">No escribas datos sensibles innecesarios: el caso usa solo datos ficticios.</span>
                    <span className="ns-counter">
                      {evaluacion.observaciones.length.toLocaleString('es-CL')} / {MAX_OBSERVACIONES.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <MensajeError id="observaciones-error" texto={erroresEval.observaciones} />
                </div>
              </div>
              {puedeEvaluar && (
                <div className="pr-form-acciones">
                  {hayCambiosEval && (
                    <button type="button" className="ns-btn ns-btn--ghost" onClick={() => { setEvaluacion(evaluacionInicial(s)); setErroresEval({}); }}>
                      Descartar cambios
                    </button>
                  )}
                  <button type="submit" className="ns-btn ns-btn--primary" disabled={!hayCambiosEval || guardandoEval}>
                    {guardandoEval ? 'Guardando…' : 'Guardar evaluación'}
                  </button>
                </div>
              )}
            </form>
          </Tarjeta>

          {/* ================= DATOS DE LA SOLICITUD ================= */}
          <Tarjeta
            titulo="Datos de la solicitud"
            Icono={FaClipboardList}
            accion={
              puedeEditar && !editando && (
                <button type="button" className="ns-btn ns-btn--ghost ns-btn--sm" onClick={() => setEditando(true)}>
                  <FaPen aria-hidden="true" /> Editar
                </button>
              )
            }
          >
            {!editando ? (
              <dl className="pr-datos">
                <Dato etiqueta="Familia de cargo">{catalogos.familiasCargo[s.familiaCargo]}</Dato>
                <Dato etiqueta="Cargo">{s.nombreCargo}</Dato>
                <Dato etiqueta="Ubicación">{s.ubicacion}</Dato>
                <Dato etiqueta="Unidad">{catalogos.unidades[s.unidad]}</Dato>
                <Dato etiqueta="Centro de costo">{s.ceco || null}</Dato>
                <Dato etiqueta="Responsable">{s.evaluador?.nombre ?? <span className="pr-sin">Sin asignar</span>}</Dato>
                <Dato etiqueta="Solicitada por">{s.analista.nombre}</Dato>
                <Dato etiqueta="Fecha de solicitud">{formatearFecha(s.fechaSolicitud)} ({hace(s.fechaSolicitud).toLowerCase()})</Dato>
                <Dato etiqueta="Referencias laborales">{s.requiereReferencias ? 'Sí, se requieren' : 'No'}</Dato>
                <Dato etiqueta="Referido">{s.referido ? 'Sí' : 'No'}</Dato>
                <div className="pr-dato pr-dato--ancho">
                  <dt>Aspectos a indagar</dt>
                  <dd className="pr-texto-largo">{s.aspectosIndagar || <span className="pr-sin">Sin indicaciones</span>}</dd>
                </div>
              </dl>
            ) : (
              <form onSubmit={guardarDatos} noValidate className="pr-form">
                <div className="ns-grid">
                  <div className="ns-field">
                    <label className="ns-label" htmlFor="dato-familiaCargo">Familia de cargo</label>
                    <select {...propsDato('familiaCargo')}>
                      {Object.entries(catalogos.familiasCargo).map(([clave, texto]) => (
                        <option key={clave} value={clave}>{texto}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ns-field">
                    <label className="ns-label" htmlFor="dato-nombreCargo">Cargo</label>
                    <input type="text" maxLength={100} {...propsDato('nombreCargo')} />
                    <MensajeError id="dato-nombreCargo-error" texto={erroresDatos.nombreCargo} />
                  </div>
                  <div className="ns-field">
                    <label className="ns-label" htmlFor="dato-ubicacion">Ubicación</label>
                    <input type="text" maxLength={100} list="pr-ubicaciones" {...propsDato('ubicacion')} />
                    <datalist id="pr-ubicaciones">
                      {catalogos.ubicacionesSugeridas.map((u) => <option key={u} value={u} />)}
                    </datalist>
                    <MensajeError id="dato-ubicacion-error" texto={erroresDatos.ubicacion} />
                  </div>
                  <div className="ns-field">
                    <label className="ns-label" htmlFor="dato-unidad">Unidad</label>
                    <select {...propsDato('unidad')}>
                      {Object.entries(catalogos.unidades).map(([clave, texto]) => (
                        <option key={clave} value={clave}>{texto}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ns-field">
                    <label className="ns-label" htmlFor="dato-ceco">Centro de costo</label>
                    <input type="text" maxLength={20} placeholder="Ej. CC-1050" {...propsDato('ceco')} />
                    <MensajeError id="dato-ceco-error" texto={erroresDatos.ceco} />
                  </div>
                  <div className="ns-field">
                    <label className="ns-label" htmlFor="dato-evaluadorId">Responsable</label>
                    <select {...propsDato('evaluadorId')}>
                      <option value="">Sin asignar</option>
                      {evaluadores.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                    </select>
                    <MensajeError id="dato-evaluadorId-error" texto={erroresDatos.evaluadorId} />
                  </div>
                  <div className="ns-toggles ns-span-2 pr-toggles-fila">
                    <label className="ns-toggle">
                      <input type="checkbox" checked={datos.requiereReferencias} onChange={(e) => cambiarDato('requiereReferencias', e.target.checked)} />
                      <span className="ns-toggle-ui" aria-hidden="true" />
                      <span className="ns-toggle-text"><strong>Requiere referencias laborales</strong></span>
                    </label>
                    <label className="ns-toggle">
                      <input type="checkbox" checked={datos.referido} onChange={(e) => cambiarDato('referido', e.target.checked)} />
                      <span className="ns-toggle-ui" aria-hidden="true" />
                      <span className="ns-toggle-text"><strong>Es referido</strong></span>
                    </label>
                  </div>
                  <div className="ns-field ns-span-2">
                    <label className="ns-label" htmlFor="dato-aspectosIndagar">Aspectos a indagar</label>
                    <textarea rows={3} maxLength={MAX_ASPECTOS} {...propsDato('aspectosIndagar')} />
                    <MensajeError id="dato-aspectosIndagar-error" texto={erroresDatos.aspectosIndagar} />
                  </div>
                </div>
                <div className="pr-form-acciones">
                  <button type="button" className="ns-btn ns-btn--ghost" onClick={cancelarEdicion} disabled={guardandoDatos}>
                    Cancelar
                  </button>
                  <button type="submit" className="ns-btn ns-btn--primary" disabled={guardandoDatos}>
                    {guardandoDatos ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )}
          </Tarjeta>
        </div>

        <aside className="pr-col pr-col--lateral">
          {/* ================= CANDIDATO ================= */}
          <Tarjeta titulo="Candidato" Icono={FaUser}>
            <p className="pr-candidato-nombre">{s.candidato.nombre}</p>
            <span className="ns-chip">{catalogos.origenes[s.candidato.origen] ?? s.candidato.origen}</span>
            <ul className="pr-contacto">
              <li>
                <FaEnvelope aria-hidden="true" />
                <a href={`mailto:${s.candidato.correo}`}>{s.candidato.correo}</a>
              </li>
              <li>
                <FaPhone aria-hidden="true" />
                <a href={`tel:${s.candidato.telefono}`}>{telefonoLegible(s.candidato.telefono)}</a>
                {whatsapp && (
                  <a
                    className="pr-wa"
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Escribir por WhatsApp a ${s.candidato.nombre} (se abre en una pestaña nueva)`}
                  >
                    <FaWhatsapp aria-hidden="true" /> WhatsApp
                  </a>
                )}
              </li>
            </ul>
            <Link to={`/candidatos/${s.candidato.id}`} className="pr-link">
              Ver ficha y otras evaluaciones <FaArrowRight aria-hidden="true" />
            </Link>
          </Tarjeta>

          {/* ================= DOCUMENTOS ================= */}
          <Tarjeta titulo="Documentos" Icono={FaPaperclip}>
            <ul className="pr-docs">
              {[
                ['cv', 'CV del candidato'],
                ['descriptor', 'Descriptor del cargo'],
              ].map(([tipo, texto]) =>
                s[tipo] ? (
                  <li key={tipo}>
                    <button type="button" className="pr-doc" onClick={() => descargar(tipo)}>
                      {esWord(s[tipo].nombre) ? (
                        <FaFileWord className="ns-file-icon ns-file-icon--word" aria-hidden="true" />
                      ) : (
                        <FaFilePdf className="ns-file-icon" aria-hidden="true" />
                      )}
                      <span className="pr-doc-info">
                        <strong>{texto}</strong>
                        <span>{s[tipo].nombre}</span>
                      </span>
                      <FaDownload className="pr-doc-bajar" aria-hidden="true" />
                      <span className="visually-hidden">Descargar</span>
                    </button>
                  </li>
                ) : (
                  <li key={tipo} className="pr-doc pr-doc--vacio">
                    <span className="pr-doc-info">
                      <strong>{texto}</strong>
                      <span>No se adjuntó</span>
                    </span>
                  </li>
                )
              )}
            </ul>
          </Tarjeta>

          {/* ================= HISTORIAL ================= */}
          <Tarjeta titulo="Historial" Icono={FaHistory}>
            <ol className="pr-historial">
              {s.historial.map((h) => (
                <li key={h.id}>
                  <span className="pr-historial-punto" aria-hidden="true" />
                  <div>
                    <strong>{h.accion}</strong>
                    {h.detalle && <span className="pr-historial-detalle">{h.detalle}</span>}
                    <span className="pr-sub">
                      {h.usuario} · {formatearFechaHora(h.fecha)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Tarjeta>
        </aside>
      </div>

      <Confirmar
        abierto={confirmarRetroceso}
        titulo="¿Volver a la etapa anterior?"
        textoConfirmar="Sí, volver"
        ocupado={moviendo}
        onConfirmar={() => moverA(anterior)}
        onCancelar={() => setConfirmarRetroceso(false)}
      >
        La solicitud volverá a «{anterior && catalogos.etapas[anterior]}». El cambio queda registrado en el historial.
      </Confirmar>

      <Confirmar
        abierto={confirmarBorrado}
        titulo="¿Eliminar esta solicitud?"
        textoConfirmar="Eliminar para siempre"
        peligro
        ocupado={borrando}
        onConfirmar={borrar}
        onCancelar={() => setConfirmarBorrado(false)}
      >
        Se borrarán la solicitud, su evaluación, su historial y los documentos adjuntos. El candidato se mantiene
        registrado. <strong>Esta acción no se puede deshacer.</strong>
      </Confirmar>

      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
    </main>
  );
};

export default DetalleSolicitud;
