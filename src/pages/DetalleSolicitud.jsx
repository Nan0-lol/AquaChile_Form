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
  telefonoLegible,
  telefonoWhatsapp,
  cambios,
} from '../utils/proceso';
import { validarCampoSolicitud, esWord, MAX_ASPECTOS } from '../utils/solicitud';
import { puede } from '../auth';
import { EtapaBadge } from '../components/Proceso';
import {
  cx,
  FOCO,
  Boton,
  Campo,
  Selector,
  Interruptor,
  Contador,
  Ayuda,
  MensajeError,
  Avatar,
  Chip,
  Tarjeta,
  ListaDatos,
  Dato,
  SinDato,
  Alerta,
  Pagina,
  Cargando,
  ErrorCarga,
  Confirmar,
  Aviso,
  claseEntrada,
  claseEtiqueta,
  claseTarjeta,
  claseVolver,
} from '../components/ui';

const MAX_OBSERVACIONES = 5000;
const GRILLA = 'grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2';
const ENLACE = 'text-acento underline-offset-2 hover:underline [overflow-wrap:anywhere]';

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

/** Un paso del avance del proceso (hecho, actual o pendiente) */
const Paso = ({ numero, estado, titulo, detalle }) => (
  <li
    aria-current={estado === 'actual' ? 'step' : undefined}
    className={cx(
      'flex items-start gap-2.5 border-t-3 pt-3.5',
      estado === 'hecho' ? 'border-hecho' : estado === 'actual' ? 'border-acento' : 'border-borde'
    )}
  >
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold',
        estado === 'hecho' && 'bg-hecho text-white',
        estado === 'actual' && 'bg-acento-solido text-white ring-4 ring-anillo',
        estado === 'pendiente' && 'bg-superficie-3 text-tenue'
      )}
    >
      {estado === 'hecho' ? <FaCheck /> : numero}
    </span>
    <span className="flex min-w-0 flex-col">
      <strong className={cx('text-[13.5px]', estado === 'pendiente' ? 'text-tenue' : 'text-texto')}>{titulo}</strong>
      <small className="mt-0.5 text-[12.5px] text-tenue">{detalle}</small>
    </span>
  </li>
);

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

  if (carga === 'cargando') return <Pagina><Cargando texto="Cargando solicitud…" /></Pagina>;
  if (carga === 'error') {
    return (
      <Pagina>
        <Link to="/solicitudes" className={claseVolver}>
          <FaArrowLeft aria-hidden="true" /> Solicitudes
        </Link>
        <ErrorCarga mensaje={errorCarga} onReintentar={errorCarga.includes('no existe') ? undefined : cargar} />
      </Pagina>
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

    const limpios = {
      ...datos,
      ceco: datos.ceco.trim().toUpperCase(),
      nombreCargo: datos.nombreCargo.trim(),
      ubicacion: datos.ubicacion.trim(),
      aspectosIndagar: datos.aspectosIndagar.trim(),
    };
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

  // ---------- Borrar y descargar ----------
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

  /** Props de los campos de la evaluación (en solo lectura si el rol no evalúa) */
  const propsEval = (campo, tamano) => ({
    id: campo,
    value: evaluacion[campo],
    onChange: (e) => cambiarEval(campo, e.target.value),
    disabled: !puedeEvaluar,
    'aria-invalid': erroresEval[campo] ? 'true' : 'false',
    'aria-describedby': erroresEval[campo] ? `${campo}-error` : undefined,
    className: claseEntrada(erroresEval[campo], tamano),
  });

  const propsDato = (campo, tamano) => ({
    id: `dato-${campo}`,
    value: datos[campo],
    onChange: (e) => cambiarDato(campo, e.target.value),
    'aria-invalid': erroresDatos[campo] ? 'true' : 'false',
    'aria-describedby': erroresDatos[campo] ? `dato-${campo}-error` : undefined,
    className: claseEntrada(erroresDatos[campo], tamano),
  });

  const whatsapp = telefonoWhatsapp(s.candidato.telefono);
  const detallePaso = {
    recibida: formatearFecha(s.fechaSolicitud),
    agendada: s.evaluacion.fechaEntrevista ? formatearFechaHora(s.evaluacion.fechaEntrevista) : 'Sin fecha',
    realizada: indiceEtapa >= 2 ? 'Entrevista hecha' : '—',
    informe_enviado: s.etapa === 'informe_enviado' && s.evaluacion.fechaInforme ? formatearFecha(s.evaluacion.fechaInforme) : '—',
  };

  return (
    <Pagina>
      <Link to="/solicitudes" className={claseVolver}>
        <FaArrowLeft aria-hidden="true" /> Solicitudes
      </Link>

      {/* ================= ENCABEZADO ================= */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar nombre={s.candidato.nombre} grande />
        <div className="min-w-[220px] flex-1">
          <h1 className="mt-0 mb-1 text-[1.35rem] font-bold text-titulo sm:text-[1.6rem]">{s.candidato.nombre}</h1>
          <p className="m-0 text-[14.5px] text-tenue">
            {s.nombreCargo} · {catalogos.familiasCargo[s.familiaCargo] ?? s.familiaCargo} · {s.ubicacion}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <EtapaBadge etapa={s.etapa} etapas={catalogos.etapas} conEstado />
          {puedeBorrar && (
            <Boton variante="peligro-suave" tamano="sm" onClick={() => setConfirmarBorrado(true)}>
              <FaTrashAlt aria-hidden="true" /> Eliminar
            </Boton>
          )}
        </div>
      </div>

      {/* ================= AVANCE DEL PROCESO ================= */}
      <section aria-labelledby="avance-titulo" className={cx(claseTarjeta, 'mb-5 px-4 pt-[18px] pb-4 sm:px-6 sm:pt-[22px]')}>
        <h2 id="avance-titulo" className="sr-only">
          Avance del proceso
        </h2>
        <ol className="m-0 grid list-none grid-cols-2 gap-x-2 gap-y-4 p-0 md:grid-cols-4">
          {ORDEN_ETAPAS.map((etapa, i) => (
            <Paso
              key={etapa}
              numero={i + 1}
              estado={i < indiceEtapa || s.etapa === 'informe_enviado' ? 'hecho' : i === indiceEtapa ? 'actual' : 'pendiente'}
              titulo={catalogos.etapas[etapa]}
              detalle={detallePaso[etapa]}
            />
          ))}
        </ol>

        <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-4">
          {s.etapa === 'informe_enviado' ? (
            <p className="m-0 inline-flex items-center gap-2 text-sm text-tenue">
              <FaCheck aria-hidden="true" className="text-e-enviado" /> Proceso finalizado en{' '}
              <strong className="text-texto">
                {s.timingDias ?? 0} {s.timingDias === 1 ? 'día' : 'días'}
              </strong>{' '}
              desde la solicitud.
            </p>
          ) : (
            <p className="m-0 text-sm text-tenue">
              {s.evaluador ? (
                <>
                  Responsable: <strong className="text-texto">{s.evaluador.nombre}</strong>
                </>
              ) : (
                <>Sin responsable asignado{puedeEtapa && ': al avanzar, quedará a tu cargo.'}</>
              )}
            </p>
          )}

          {puedeEtapa && (
            <div className="flex w-full flex-wrap gap-2.5 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
              {anterior && (
                <Boton variante="fantasma" tamano="sm" onClick={() => setConfirmarRetroceso(true)} disabled={moviendo}>
                  <FaUndo aria-hidden="true" /> Volver a «{catalogos.etapas[anterior]}»
                </Boton>
              )}
              {siguiente && (
                <Boton
                  onClick={() => moverA(siguiente)}
                  disabled={moviendo || Boolean(faltaParaAvanzar)}
                  aria-describedby={faltaParaAvanzar ? 'avance-requisito' : undefined}
                >
                  {moviendo ? (
                    'Guardando…'
                  ) : (
                    <>
                      Pasar a «{catalogos.etapas[siguiente]}» <FaArrowRight aria-hidden="true" />
                    </>
                  )}
                </Boton>
              )}
            </div>
          )}
        </div>
        {puedeEtapa && faltaParaAvanzar && !errorEtapa && (
          <p id="avance-requisito" className="mt-2.5 mb-0 text-left text-[13px] text-e-recibida sm:text-right">
            {faltaParaAvanzar}
            {hayCambiosEval && ' Si ya lo escribiste abajo, guarda la evaluación.'}
          </p>
        )}
        {errorEtapa && (
          <div className="mt-3">
            <Alerta>{errorEtapa}</Alerta>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ================= EVALUACIÓN ================= */}
          <Tarjeta titulo="Evaluación psicolaboral" Icono={FaStethoscope}>
            {!puedeEvaluar && (
              <p className="mt-0 mb-4 rounded-lg border border-borde bg-superficie-2 px-3 py-2.5 text-[13px] text-tenue">
                Solo el profesional evaluador puede registrar la evaluación. Aquí la ves en modo lectura.
              </p>
            )}
            <form onSubmit={guardarEval} noValidate className="flex flex-col gap-4">
              <div className={GRILLA}>
                <Campo id="fechaEntrevista" etiqueta="Fecha y hora de la entrevista" error={erroresEval.fechaEntrevista}>
                  <input type="datetime-local" min={`${diaLocal(s.fechaSolicitud)}T00:00`} {...propsEval('fechaEntrevista')} />
                </Campo>
                <Campo id="resultado" etiqueta="Resultado" error={erroresEval.resultado}>
                  <Selector error={erroresEval.resultado} {...propsEval('resultado')}>
                    <option value="">Sin resultado todavía</option>
                    {Object.entries(catalogos.resultados).map(([clave, texto]) => (
                      <option key={clave} value={clave}>
                        {texto}
                      </option>
                    ))}
                  </Selector>
                </Campo>
                <Campo
                  id="fechaInforme"
                  etiqueta="Fecha del informe"
                  ayuda="Si la dejas vacía, se pone sola al enviar el informe."
                  error={erroresEval.fechaInforme}
                >
                  <input type="date" min={diaLocal(s.fechaSolicitud)} max={ahoraLocal().slice(0, 10)} {...propsEval('fechaInforme')} />
                </Campo>
                <div className="flex min-w-0 flex-col sm:col-span-2">
                  <label htmlFor="observaciones" className={claseEtiqueta}>
                    Observaciones generales
                  </label>
                  <textarea
                    rows={5}
                    maxLength={MAX_OBSERVACIONES}
                    placeholder={puedeEvaluar ? 'Impresiones de la entrevista, fortalezas, aspectos a desarrollar…' : ''}
                    {...propsEval('observaciones', 'min-h-[110px] resize-y px-3 py-2.5 text-[14.5px] leading-normal')}
                  />
                  <div className="flex justify-between gap-3">
                    <Ayuda>No escribas datos sensibles innecesarios: el caso usa solo datos ficticios.</Ayuda>
                    <Contador largo={evaluacion.observaciones.length} maximo={MAX_OBSERVACIONES} />
                  </div>
                  <MensajeError id="observaciones-error" texto={erroresEval.observaciones} />
                </div>
              </div>
              {puedeEvaluar && (
                <div className="flex flex-wrap justify-end gap-2.5">
                  {hayCambiosEval && (
                    <Boton
                      variante="fantasma"
                      onClick={() => {
                        setEvaluacion(evaluacionInicial(s));
                        setErroresEval({});
                      }}
                    >
                      Descartar cambios
                    </Boton>
                  )}
                  <Boton type="submit" disabled={!hayCambiosEval || guardandoEval}>
                    {guardandoEval ? 'Guardando…' : 'Guardar evaluación'}
                  </Boton>
                </div>
              )}
            </form>
          </Tarjeta>

          {/* ================= DATOS DE LA SOLICITUD ================= */}
          <Tarjeta
            titulo="Datos de la solicitud"
            Icono={FaClipboardList}
            accion={
              puedeEditar &&
              !editando && (
                <Boton variante="fantasma" tamano="sm" onClick={() => setEditando(true)}>
                  <FaPen aria-hidden="true" /> Editar
                </Boton>
              )
            }
          >
            {!editando ? (
              <ListaDatos>
                <Dato etiqueta="Familia de cargo">{catalogos.familiasCargo[s.familiaCargo]}</Dato>
                <Dato etiqueta="Cargo">{s.nombreCargo}</Dato>
                <Dato etiqueta="Ubicación">{s.ubicacion}</Dato>
                <Dato etiqueta="Unidad">{catalogos.unidades[s.unidad]}</Dato>
                <Dato etiqueta="Centro de costo">{s.ceco || null}</Dato>
                <Dato etiqueta="Responsable">{s.evaluador?.nombre ?? <SinDato>Sin asignar</SinDato>}</Dato>
                <Dato etiqueta="Solicitada por">{s.analista.nombre}</Dato>
                <Dato etiqueta="Fecha de solicitud">
                  {formatearFecha(s.fechaSolicitud)} ({hace(s.fechaSolicitud).toLowerCase()})
                </Dato>
                <Dato etiqueta="Referencias laborales">{s.requiereReferencias ? 'Sí, se requieren' : 'No'}</Dato>
                <Dato etiqueta="Referido">{s.referido ? 'Sí' : 'No'}</Dato>
                <Dato etiqueta="Aspectos a indagar" ancho>
                  {s.aspectosIndagar ? <span className="leading-relaxed whitespace-pre-wrap">{s.aspectosIndagar}</span> : <SinDato>Sin indicaciones</SinDato>}
                </Dato>
              </ListaDatos>
            ) : (
              <form onSubmit={guardarDatos} noValidate className="flex flex-col gap-4">
                <div className={GRILLA}>
                  <Campo id="dato-familiaCargo" etiqueta="Familia de cargo">
                    <Selector {...propsDato('familiaCargo')}>
                      {Object.entries(catalogos.familiasCargo).map(([clave, texto]) => (
                        <option key={clave} value={clave}>
                          {texto}
                        </option>
                      ))}
                    </Selector>
                  </Campo>
                  <Campo id="dato-nombreCargo" etiqueta="Cargo" error={erroresDatos.nombreCargo}>
                    <input type="text" maxLength={100} {...propsDato('nombreCargo')} />
                  </Campo>
                  <Campo id="dato-ubicacion" etiqueta="Ubicación" error={erroresDatos.ubicacion}>
                    <input type="text" maxLength={100} list="ubicaciones-detalle" {...propsDato('ubicacion')} />
                    <datalist id="ubicaciones-detalle">
                      {catalogos.ubicacionesSugeridas.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </Campo>
                  <Campo id="dato-unidad" etiqueta="Unidad">
                    <Selector {...propsDato('unidad')}>
                      {Object.entries(catalogos.unidades).map(([clave, texto]) => (
                        <option key={clave} value={clave}>
                          {texto}
                        </option>
                      ))}
                    </Selector>
                  </Campo>
                  <Campo id="dato-ceco" etiqueta="Centro de costo" error={erroresDatos.ceco}>
                    <input type="text" maxLength={20} placeholder="Ej. CC-1050" {...propsDato('ceco')} />
                  </Campo>
                  <Campo id="dato-evaluadorId" etiqueta="Responsable" error={erroresDatos.evaluadorId}>
                    <Selector error={erroresDatos.evaluadorId} {...propsDato('evaluadorId')}>
                      <option value="">Sin asignar</option>
                      {evaluadores.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.nombre}
                        </option>
                      ))}
                    </Selector>
                  </Campo>
                  <div className="flex flex-wrap gap-6 sm:col-span-2">
                    <Interruptor
                      checked={datos.requiereReferencias}
                      onChange={(e) => cambiarDato('requiereReferencias', e.target.checked)}
                      titulo="Requiere referencias laborales"
                    />
                    <Interruptor checked={datos.referido} onChange={(e) => cambiarDato('referido', e.target.checked)} titulo="Es referido" />
                  </div>
                  <Campo id="dato-aspectosIndagar" etiqueta="Aspectos a indagar" error={erroresDatos.aspectosIndagar} className="sm:col-span-2">
                    <textarea rows={3} maxLength={MAX_ASPECTOS} {...propsDato('aspectosIndagar', 'min-h-[88px] resize-y px-3 py-2.5 text-[14.5px] leading-normal')} />
                  </Campo>
                </div>
                <div className="flex flex-wrap justify-end gap-2.5">
                  <Boton variante="fantasma" onClick={cancelarEdicion} disabled={guardandoDatos}>
                    Cancelar
                  </Boton>
                  <Boton type="submit" disabled={guardandoDatos}>
                    {guardandoDatos ? 'Guardando…' : 'Guardar cambios'}
                  </Boton>
                </div>
              </form>
            )}
          </Tarjeta>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {/* ================= CANDIDATO ================= */}
          <Tarjeta titulo="Candidato" Icono={FaUser}>
            <p className="mt-0 mb-1.5 text-base font-bold text-texto">{s.candidato.nombre}</p>
            <Chip>{catalogos.origenes[s.candidato.origen] ?? s.candidato.origen}</Chip>
            <ul className="mt-3.5 mb-4 flex list-none flex-col gap-2.5 p-0 text-sm">
              <li className="flex min-w-0 items-center gap-2.5">
                <FaEnvelope aria-hidden="true" className="shrink-0 text-sutil" />
                <a href={`mailto:${s.candidato.correo}`} className={ENLACE}>
                  {s.candidato.correo}
                </a>
              </li>
              <li className="flex min-w-0 flex-wrap items-center gap-2.5">
                <FaPhone aria-hidden="true" className="shrink-0 text-sutil" />
                <a href={`tel:${s.candidato.telefono}`} className={ENLACE}>
                  {telefonoLegible(s.candidato.telefono)}
                </a>
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Escribir por WhatsApp a ${s.candidato.nombre} (se abre en una pestaña nueva)`}
                    className={cx('inline-flex items-center gap-[5px] rounded-full bg-wa-bg px-2.5 py-[3px] text-[12.5px] font-semibold text-wa no-underline hover:brightness-95', FOCO)}
                  >
                    <FaWhatsapp aria-hidden="true" /> WhatsApp
                  </a>
                )}
              </li>
            </ul>
            <Link to={`/candidatos/${s.candidato.id}`} className={cx('inline-flex items-center gap-2 rounded text-sm font-semibold text-acento no-underline hover:underline', FOCO)}>
              Ver ficha y otras evaluaciones <FaArrowRight aria-hidden="true" className="text-[11px]" />
            </Link>
          </Tarjeta>

          {/* ================= DOCUMENTOS ================= */}
          <Tarjeta titulo="Documentos" Icono={FaPaperclip}>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {[
                ['cv', 'CV del candidato'],
                ['descriptor', 'Descriptor del cargo'],
              ].map(([tipo, texto]) =>
                s[tipo] ? (
                  <li key={tipo}>
                    <button
                      type="button"
                      onClick={() => descargar(tipo)}
                      className={cx(
                        'flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-borde bg-superficie-2 px-3 py-2.5 text-left text-texto transition-colors hover:border-acento hover:bg-acento-suave',
                        FOCO
                      )}
                    >
                      {esWord(s[tipo].nombre) ? (
                        <FaFileWord aria-hidden="true" className="shrink-0 text-2xl text-word" />
                      ) : (
                        <FaFilePdf aria-hidden="true" className="shrink-0 text-2xl text-pdf" />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <strong className="text-[13.5px]">{texto}</strong>
                        <span className="truncate text-[12.5px] text-tenue">{s[tipo].nombre}</span>
                      </span>
                      <FaDownload aria-hidden="true" className="shrink-0 text-acento" />
                      <span className="sr-only">Descargar</span>
                    </button>
                  </li>
                ) : (
                  <li key={tipo} className="flex flex-col rounded-[10px] border border-dashed border-borde bg-superficie-2 px-3 py-2.5">
                    <strong className="text-[13.5px] text-texto">{texto}</strong>
                    <span className="text-[12.5px] text-tenue">No se adjuntó</span>
                  </li>
                )
              )}
            </ul>
          </Tarjeta>

          {/* ================= HISTORIAL ================= */}
          <Tarjeta titulo="Historial" Icono={FaHistory}>
            <ol className="m-0 list-none p-0">
              {s.historial.map((h) => (
                <li
                  key={h.id}
                  className="relative flex gap-3 pb-4 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-3.5 [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[5px] [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-borde [&:not(:last-child)]:before:content-['']"
                >
                  <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full border-3 border-acento bg-superficie" />
                  <div className="min-w-0">
                    <strong className="block text-[13.5px] text-texto">{h.accion}</strong>
                    {h.detalle && <span className="block text-[13px] [overflow-wrap:anywhere] text-texto">{h.detalle}</span>}
                    <span className="mt-0.5 block text-[12.5px] text-tenue">
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
        Se borrarán la solicitud, su evaluación, su historial y los documentos adjuntos. El candidato se mantiene registrado.{' '}
        <strong>Esta acción no se puede deshacer.</strong>
      </Confirmar>

      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
    </Pagina>
  );
};

export default DetalleSolicitud;
