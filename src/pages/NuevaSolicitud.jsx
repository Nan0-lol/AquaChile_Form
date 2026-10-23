import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUserPlus,
  FaSearch,
  FaBriefcase,
  FaClipboardCheck,
  FaPaperclip,
  FaCloudUploadAlt,
  FaFilePdf,
  FaFileWord,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaRedo,
  FaEnvelope,
} from 'react-icons/fa';
import {
  obtenerCatalogos,
  obtenerEvaluadores,
  buscarCandidatos,
  obtenerCandidato,
  crearSolicitud,
  ErrorApi,
} from '../services/api';
import {
  MAX_ASPECTOS,
  formatearCelular,
  formatearTamano,
  esWord,
  validarAdjunto,
  validarCampoSolicitud,
  validarSolicitudCompleta,
  construirFormData,
} from '../utils/solicitud';
import { puede } from '../auth';
import './NuevaSolicitud.css';

const VALORES_INICIALES = {
  // Candidato (solo si es nuevo)
  nombre: '',
  correo: '',
  telefono: '',
  origen: '',
  // Cargo
  familiaCargo: '',
  nombreCargo: '',
  ubicacion: '',
  unidad: '',
  ceco: '',
  // Proceso
  evaluadorId: '',
  requiereReferencias: false,
  referido: false,
  aspectosIndagar: '',
};

// Orden en que se revisan los campos para llevar el foco al primer error
const ORDEN_CAMPOS = [
  'candidatoId', 'nombre', 'correo', 'telefono', 'origen',
  'familiaCargo', 'nombreCargo', 'ubicacion', 'unidad', 'ceco',
  'evaluadorId', 'aspectosIndagar', 'cv', 'descriptor',
];

const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

// ---------------------------------------------------------------------
// Piezas pequeñas del formulario
// ---------------------------------------------------------------------
const Asterisco = () => <span className="ns-req" aria-hidden="true">*</span>;

const MensajeError = ({ id, texto }) =>
  texto ? (
    <p id={id} className="ns-error" role="alert">
      {texto}
    </p>
  ) : null;

const Seccion = ({ numero, titulo, descripcion, Icono, children }) => (
  <section className="ns-card" aria-labelledby={`ns-sec-${numero}`}>
    <header className="ns-card-head">
      <span className="ns-card-icon" aria-hidden="true">
        <Icono />
      </span>
      <div>
        <h2 id={`ns-sec-${numero}`}>
          <span className="ns-card-num">{numero}.</span> {titulo}
        </h2>
        {descripcion && <p>{descripcion}</p>}
      </div>
    </header>
    <div className="ns-card-body">{children}</div>
  </section>
);

/** Zona para arrastrar o elegir un archivo (CV o descriptor de cargo) */
const ZonaArchivo = ({ id, etiqueta, obligatorio, archivo, error, ayuda, onElegir, onQuitar }) => {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const elegir = (lista) => {
    const elegido = lista?.[0] ?? null;
    onElegir(elegido);
    if (inputRef.current) inputRef.current.value = '';
  };

  const quitar = () => {
    onQuitar();
    // Se devuelve el foco al input para que el teclado no quede "perdido"
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="ns-field">
      <span className="ns-label" id={`${id}-label`}>
        {etiqueta}
        {obligatorio ? <Asterisco /> : <span className="ns-optional">(opcional)</span>}
      </span>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="visually-hidden ns-file-input"
        onChange={(e) => elegir(e.target.files)}
        aria-labelledby={`${id}-label`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
      />

      {!archivo ? (
        <label
          htmlFor={id}
          className={`ns-drop${arrastrando ? ' is-drag' : ''}${error ? ' is-error' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            elegir(e.dataTransfer.files);
          }}
        >
          <FaCloudUploadAlt className="ns-drop-icon" aria-hidden="true" />
          <span className="ns-drop-text">
            Arrastra el archivo o <span className="ns-drop-link">haz clic para elegirlo</span>
          </span>
          <span className="ns-drop-hint" id={`${id}-hint`}>
            {ayuda}
          </span>
        </label>
      ) : (
        <div className="ns-file">
          {esWord(archivo.name) ? (
            <FaFileWord className="ns-file-icon ns-file-icon--word" aria-hidden="true" />
          ) : (
            <FaFilePdf className="ns-file-icon" aria-hidden="true" />
          )}
          <div className="ns-file-info">
            <span className="ns-file-name">{archivo.name}</span>
            <span className="ns-file-size">{formatearTamano(archivo.size)}</span>
          </div>
          <button type="button" className="ns-icon-btn" onClick={quitar} aria-label={`Quitar ${archivo.name}`}>
            <FaTimes aria-hidden="true" />
          </button>
        </div>
      )}
      <MensajeError id={`${id}-error`} texto={error} />
    </div>
  );
};

/** Buscador de candidatos ya registrados */
const BuscadorCandidato = ({ error, onElegir }) => {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [estado, setEstado] = useState('inicial'); // inicial | buscando | listo | error

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setResultados([]);
      setEstado('inicial');
      return undefined;
    }
    setEstado('buscando');
    let vigente = true;
    // Espera a que deje de escribir (300 ms) antes de preguntar al servidor
    const espera = setTimeout(() => {
      buscarCandidatos(q)
        .then((lista) => {
          if (!vigente) return;
          setResultados(lista.slice(0, 6));
          setEstado('listo');
        })
        .catch(() => vigente && setEstado('error'));
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [texto]);

  return (
    <div className="ns-field">
      <label className="ns-label" htmlFor="candidatoId">
        Buscar candidato
        <Asterisco />
      </label>
      <div className={`ns-search${error ? ' is-error' : ''}`}>
        <FaSearch aria-hidden="true" />
        <input
          id="candidatoId"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre o correo (mínimo 2 letras)"
          autoComplete="off"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'candidatoId-error' : 'candidatoId-estado'}
        />
      </div>
      <MensajeError id="candidatoId-error" texto={error} />

      <div id="candidatoId-estado" className="ns-search-estado" aria-live="polite">
        {estado === 'buscando' && 'Buscando…'}
        {estado === 'error' && 'No pudimos buscar. Revisa la conexión e inténtalo de nuevo.'}
        {estado === 'listo' && resultados.length === 0 && 'No hay candidatos con ese nombre o correo. Regístralo como candidato nuevo.'}
        {estado === 'listo' && resultados.length > 0 && `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`}
      </div>

      {resultados.length > 0 && (
        <ul className="ns-results">
          {resultados.map((c) => (
            <li key={c.id}>
              <button type="button" className="ns-result" onClick={() => onElegir(c)}>
                <span className="ns-avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
                <span className="ns-result-info">
                  <span className="ns-result-name">{c.nombre}</span>
                  <span className="ns-result-meta">{c.correo}</span>
                </span>
                <span className="ns-result-count">
                  {c.totalSolicitudes
                    ? `${c.totalSolicitudes} evaluación${c.totalSolicitudes === 1 ? '' : 'es'}`
                    : 'Sin evaluaciones'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------
const NuevaSolicitud = () => {
  const [catalogos, setCatalogos] = useState(null);
  const [evaluadores, setEvaluadores] = useState([]);
  const [carga, setCarga] = useState('cargando'); // cargando | lista | error

  const [modo, setModo] = useState('nuevo'); // nuevo | existente
  const [candidato, setCandidato] = useState(null); // candidato ya registrado elegido
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [cv, setCv] = useState(null);
  const [descriptor, setDescriptor] = useState(null);
  const [errores, setErrores] = useState({});
  const [sugerido, setSugerido] = useState(null); // candidato con el mismo correo (409)

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [creada, setCreada] = useState(null); // solicitud recién creada

  // ---------- Carga de listas ----------
  const cargarListas = () => {
    setCarga('cargando');
    Promise.all([obtenerCatalogos(), obtenerEvaluadores()])
      .then(([cat, evs]) => {
        setCatalogos(cat);
        setEvaluadores(evs);
        setCarga('lista');
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) return; // el layout manda al login
        setCarga('error');
      });
  };
  useEffect(cargarListas, []);

  // ---------- Aviso al salir con datos sin enviar ----------
  const hayCambios = useMemo(
    () => !creada && (cv || descriptor || candidato || Object.keys(VALORES_INICIALES).some((k) => valores[k] !== VALORES_INICIALES[k])),
    [valores, cv, descriptor, candidato, creada]
  );
  useEffect(() => {
    if (!hayCambios) return undefined;
    const alSalir = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [hayCambios]);

  // ---------- Campos ----------
  const cambiar = (campo, valor) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: validarCampoSolicitud(campo, valor) }));
    if (campo === 'correo') setSugerido(null);
  };

  const alSalirDelCampo = (campo) => {
    const valor = valores[campo];
    if (campo === 'telefono' && valor.trim()) cambiar('telefono', formatearCelular(valor));
    if (campo === 'ceco') cambiar('ceco', valor.toUpperCase());
    // El aviso de "correo ya registrado" viene del servidor: se mantiene hasta que lo cambie
    if (campo === 'correo' && sugerido) return;
    setErrores((prev) => ({ ...prev, [campo]: validarCampoSolicitud(campo, valor) }));
  };

  const propsCampo = (campo, { ayuda } = {}) => ({
    id: campo,
    name: campo,
    value: valores[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    onBlur: () => alSalirDelCampo(campo),
    'aria-invalid': errores[campo] ? 'true' : 'false',
    'aria-describedby': errores[campo] ? `${campo}-error` : ayuda ? `${campo}-ayuda` : undefined,
    className: errores[campo] ? 'is-error' : undefined,
  });

  const elegirArchivo = (campo, archivo, opciones) => {
    const error = validarAdjunto(archivo, opciones);
    setErrores((prev) => ({ ...prev, [campo]: error }));
    const guardar = campo === 'cv' ? setCv : setDescriptor;
    guardar(error ? null : archivo);
  };

  // ---------- Candidato nuevo o existente ----------
  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    setCandidato(null);
    setSugerido(null);
    setErrores((prev) => {
      const sinCandidato = { ...prev };
      ['candidatoId', 'nombre', 'correo', 'telefono', 'origen'].forEach((c) => delete sinCandidato[c]);
      return sinCandidato;
    });
  };

  const elegirCandidato = (c) => {
    setCandidato(c);
    setErrores((prev) => ({ ...prev, candidatoId: '' }));
  };

  // El servidor avisó que el correo ya existe: se ofrece usar ese candidato
  const usarSugerido = async () => {
    const id = sugerido.id;
    setModo('existente');
    setSugerido(null);
    setErrores((prev) => ({ ...prev, correo: '', candidatoId: '' }));
    try {
      setCandidato(await obtenerCandidato(id));
    } catch {
      setCandidato({ id, nombre: sugerido.nombre });
    }
  };

  // ---------- Envío ----------
  const enfocarPrimerError = (lista) => {
    const primero = ORDEN_CAMPOS.find((c) => lista[c]);
    if (primero) document.getElementById(primero)?.focus();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setErrorEnvio('');

    const nuevos = validarSolicitudCompleta(valores, { candidatoExistente: candidato, cv, descriptor });
    if (modo === 'existente' && !candidato) nuevos.candidatoId = 'Busca y elige al candidato, o regístralo como nuevo.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(nuevos);
      return;
    }

    setEnviando(true);
    try {
      const solicitud = await crearSolicitud(
        construirFormData(valores, { candidatoExistente: candidato, cv, descriptor })
      );
      setCreada(solicitud);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (!(err instanceof ErrorApi) || err.estado === 401) {
        setErrorEnvio('No pudimos enviar la solicitud. Inténtalo nuevamente.');
      } else if (Object.keys(err.errores).length) {
        // Errores por campo que detectó el servidor (incluye el correo repetido)
        setErrores((prev) => ({ ...prev, ...err.errores }));
        if (err.datos.candidatoExistente) setSugerido(err.datos.candidatoExistente);
        setErrorEnvio(err.estado === 409 ? '' : 'Revisa los campos marcados.');
        enfocarPrimerError(err.errores);
      } else {
        setErrorEnvio(err.message);
      }
    } finally {
      setEnviando(false);
    }
  };

  const reiniciar = () => {
    setValores(VALORES_INICIALES);
    setCandidato(null);
    setModo('nuevo');
    setCv(null);
    setDescriptor(null);
    setErrores({});
    setSugerido(null);
    setErrorEnvio('');
    setCreada(null);
    window.scrollTo({ top: 0 });
  };

  // ---------- Pantallas ----------
  if (carga === 'cargando') {
    return (
      <main className="ns-main">
        <div className="ns-estado" role="status">
          <span className="ns-spinner ns-spinner--dark" aria-hidden="true" />
          Cargando formulario…
        </div>
      </main>
    );
  }

  if (carga === 'error') {
    return (
      <main className="ns-main">
        <div className="ns-estado ns-estado--error" role="alert">
          <FaExclamationTriangle aria-hidden="true" />
          <p>No pudimos cargar las listas del formulario. Revisa que el servidor esté encendido.</p>
          <button type="button" className="ns-btn ns-btn--outline" onClick={cargarListas}>
            <FaRedo aria-hidden="true" /> Reintentar
          </button>
        </div>
      </main>
    );
  }

  if (creada) {
    const familia = catalogos.familiasCargo[creada.familiaCargo] ?? creada.familiaCargo;
    return (
      <main className="ns-main">
        <section className="ns-card ns-exito" role="status" aria-labelledby="ns-exito-titulo">
          <FaCheckCircle className="ns-exito-icon" aria-hidden="true" />
          <h1 id="ns-exito-titulo">Solicitud enviada</h1>
          <p className="ns-exito-sub">La evaluación quedó en la etapa «{catalogos.etapas[creada.etapa]}».</p>

          <dl className="ns-resumen">
            <div>
              <dt>Candidato</dt>
              <dd>{creada.candidato.nombre}</dd>
            </div>
            <div>
              <dt>Cargo</dt>
              <dd>
                {creada.nombreCargo} · {familia}
              </dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{creada.ubicacion}</dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{creada.evaluador?.nombre ?? 'Sin asignar'}</dd>
            </div>
          </dl>

          <p className="ns-exito-aviso">
            <FaEnvelope aria-hidden="true" />
            {creada.evaluador
              ? `Se le avisó por correo a ${creada.evaluador.nombre}.`
              : 'Quedó sin responsable: cualquier evaluador podrá tomarla.'}
          </p>

          <div className="ns-exito-acciones">
            <button type="button" className="ns-btn ns-btn--primary" onClick={reiniciar}>
              Crear otra solicitud
            </button>
            {puede('indicadores:ver') && (
              <Link to="/dashboard" className="ns-btn ns-btn--outline">
                Ir al panel
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  const largoAspectos = valores.aspectosIndagar.length;

  return (
    <main className="ns-main">
      <div className="ns-titlebar">
        <h1>Nueva solicitud de evaluación</h1>
        <p>
          Completa los datos para que el equipo de evaluación agende la entrevista. Los campos con
          <Asterisco /> son obligatorios.
        </p>
      </div>

      <form onSubmit={enviar} noValidate className="ns-form">
        {/* ================= 1. CANDIDATO ================= */}
        <Seccion numero={1} titulo="Candidato" descripcion="¿A quién hay que evaluar?" Icono={FaUserPlus}>
          <div className="ns-segmented" role="group" aria-label="Tipo de candidato">
            <button
              type="button"
              className={modo === 'nuevo' ? 'is-active' : ''}
              aria-pressed={modo === 'nuevo'}
              onClick={() => cambiarModo('nuevo')}
            >
              Candidato nuevo
            </button>
            <button
              type="button"
              className={modo === 'existente' ? 'is-active' : ''}
              aria-pressed={modo === 'existente'}
              onClick={() => cambiarModo('existente')}
            >
              Ya registrado
            </button>
          </div>

          {modo === 'nuevo' && (
            <div className="ns-grid">
              <div className="ns-field ns-span-2">
                <label className="ns-label" htmlFor="nombre">
                  Nombre completo
                  <Asterisco />
                </label>
                <input type="text" autoComplete="off" maxLength={100} {...propsCampo('nombre')} />
                <MensajeError id="nombre-error" texto={errores.nombre} />
              </div>

              <div className="ns-field">
                <label className="ns-label" htmlFor="correo">
                  Correo electrónico
                  <Asterisco />
                </label>
                <input type="email" autoComplete="off" maxLength={254} {...propsCampo('correo')} />
                <MensajeError id="correo-error" texto={errores.correo} />
                {sugerido && (
                  <button type="button" className="ns-sugerido" onClick={usarSugerido}>
                    Usar a {sugerido.nombre} (ya registrado)
                  </button>
                )}
              </div>

              <div className="ns-field">
                <label className="ns-label" htmlFor="telefono">
                  Celular
                  <Asterisco />
                </label>
                <div className={`ns-phone${errores.telefono ? ' is-error' : ''}`}>
                  <span className="ns-phone-prefix" aria-hidden="true">+56</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="9 1234 5678"
                    maxLength={11}
                    autoComplete="off"
                    {...propsCampo('telefono')}
                  />
                </div>
                <MensajeError id="telefono-error" texto={errores.telefono} />
              </div>

              <fieldset className="ns-field ns-fieldset ns-span-2" aria-describedby={errores.origen ? 'origen-error' : undefined}>
                <legend className="ns-label">
                  Origen
                  <Asterisco />
                </legend>
                <div className="ns-radios">
                  {Object.entries(catalogos.origenes).map(([clave, texto], i) => (
                    <label key={clave} className={`ns-radio${valores.origen === clave ? ' is-checked' : ''}`}>
                      <input
                        type="radio"
                        name="origen"
                        id={i === 0 ? 'origen' : undefined}
                        value={clave}
                        checked={valores.origen === clave}
                        onChange={() => cambiar('origen', clave)}
                      />
                      <span>
                        <strong>{texto}</strong>
                        <small>{clave === 'interno' ? 'Ya trabaja en AquaChile' : 'Viene de fuera de la empresa'}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <MensajeError id="origen-error" texto={errores.origen} />
              </fieldset>
            </div>
          )}

          {modo === 'existente' &&
            (candidato ? (
              <div className="ns-elegido">
                <span className="ns-avatar ns-avatar--lg" aria-hidden="true">{iniciales(candidato.nombre)}</span>
                <div className="ns-elegido-info">
                  <strong>{candidato.nombre}</strong>
                  <span>
                    {[candidato.correo, candidato.telefono && formatearCelular(candidato.telefono)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {candidato.origen && (
                    <span className="ns-chip">{catalogos.origenes[candidato.origen] ?? candidato.origen}</span>
                  )}
                </div>
                <button type="button" className="ns-btn ns-btn--ghost ns-btn--sm" onClick={() => setCandidato(null)}>
                  Cambiar
                </button>
              </div>
            ) : (
              <BuscadorCandidato error={errores.candidatoId} onElegir={elegirCandidato} />
            ))}
        </Seccion>

        {/* ================= 2. CARGO ================= */}
        <Seccion numero={2} titulo="Cargo a evaluar" descripcion="Datos de la vacante." Icono={FaBriefcase}>
          <div className="ns-grid">
            <div className="ns-field">
              <label className="ns-label" htmlFor="familiaCargo">
                Familia de cargo
                <Asterisco />
              </label>
              <select {...propsCampo('familiaCargo')}>
                <option value="">Selecciona…</option>
                {Object.entries(catalogos.familiasCargo).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
              <MensajeError id="familiaCargo-error" texto={errores.familiaCargo} />
            </div>

            <div className="ns-field">
              <label className="ns-label" htmlFor="nombreCargo">
                Nombre del cargo
                <Asterisco />
              </label>
              <input type="text" maxLength={100} placeholder="Ej. Operador de máquina" {...propsCampo('nombreCargo')} />
              <MensajeError id="nombreCargo-error" texto={errores.nombreCargo} />
            </div>

            <div className="ns-field">
              <label className="ns-label" htmlFor="ubicacion">
                Ubicación
                <Asterisco />
              </label>
              <input
                type="text"
                maxLength={100}
                list="ns-ubicaciones"
                placeholder="Elige o escribe una"
                {...propsCampo('ubicacion')}
              />
              <datalist id="ns-ubicaciones">
                {catalogos.ubicacionesSugeridas.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              <MensajeError id="ubicacion-error" texto={errores.ubicacion} />
            </div>

            <div className="ns-field">
              <label className="ns-label" htmlFor="unidad">
                Unidad
                <Asterisco />
              </label>
              <select {...propsCampo('unidad')}>
                <option value="">Selecciona…</option>
                {Object.entries(catalogos.unidades).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
              <MensajeError id="unidad-error" texto={errores.unidad} />
            </div>

            <div className="ns-field">
              <label className="ns-label" htmlFor="ceco">
                Centro de costo <span className="ns-optional">(opcional)</span>
              </label>
              <input
                type="text"
                maxLength={20}
                placeholder="Ej. A170010301"
                autoComplete="off"
                {...propsCampo('ceco', { ayuda: true })}
              />
              {!errores.ceco && (
                <p id="ceco-ayuda" className="ns-hint">
                  Letras y números, como aparece en la requisición.
                </p>
              )}
              <MensajeError id="ceco-error" texto={errores.ceco} />
            </div>
          </div>
        </Seccion>

        {/* ================= 3. PROCESO ================= */}
        <Seccion
          numero={3}
          titulo="Proceso de evaluación"
          descripcion="Quién evalúa y qué debe considerar."
          Icono={FaClipboardCheck}
        >
          <div className="ns-grid">
            <div className="ns-field">
              <label className="ns-label" htmlFor="evaluadorId">
                Profesional responsable <span className="ns-optional">(opcional)</span>
              </label>
              <select {...propsCampo('evaluadorId', { ayuda: true })}>
                <option value="">Sin asignar por ahora</option>
                {evaluadores.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre}
                  </option>
                ))}
              </select>
              {!errores.evaluadorId && (
                <p id="evaluadorId-ayuda" className="ns-hint">
                  Se le avisará por correo apenas envíes la solicitud.
                </p>
              )}
              <MensajeError id="evaluadorId-error" texto={errores.evaluadorId} />
            </div>

            <div className="ns-toggles">
              <label className="ns-toggle">
                <input
                  type="checkbox"
                  checked={valores.requiereReferencias}
                  onChange={(e) => cambiar('requiereReferencias', e.target.checked)}
                />
                <span className="ns-toggle-ui" aria-hidden="true" />
                <span className="ns-toggle-text">
                  <strong>Requiere referencias laborales</strong>
                  <small>El evaluador las pedirá durante el proceso.</small>
                </span>
              </label>
              <label className="ns-toggle">
                <input
                  type="checkbox"
                  checked={valores.referido}
                  onChange={(e) => cambiar('referido', e.target.checked)}
                />
                <span className="ns-toggle-ui" aria-hidden="true" />
                <span className="ns-toggle-text">
                  <strong>Es referido</strong>
                  <small>Lo recomendó alguien de la empresa.</small>
                </span>
              </label>
            </div>

            <div className="ns-field ns-span-2">
              <label className="ns-label" htmlFor="aspectosIndagar">
                Aspectos a indagar <span className="ns-optional">(opcional)</span>
              </label>
              <textarea
                rows={4}
                maxLength={MAX_ASPECTOS}
                placeholder="Ej. disponibilidad para turnos rotativos, experiencia liderando equipos…"
                {...propsCampo('aspectosIndagar', { ayuda: true })}
              />
              <div className="ns-textarea-foot">
                <span id="aspectosIndagar-ayuda" className="ns-hint">
                  Lo que la jefatura quiere que se revise en la entrevista.
                </span>
                <span className={`ns-counter${largoAspectos > MAX_ASPECTOS * 0.9 ? ' is-near' : ''}`}>
                  {largoAspectos.toLocaleString('es-CL')} / {MAX_ASPECTOS.toLocaleString('es-CL')}
                </span>
              </div>
              <MensajeError id="aspectosIndagar-error" texto={errores.aspectosIndagar} />
            </div>
          </div>
        </Seccion>

        {/* ================= 4. DOCUMENTOS ================= */}
        <Seccion numero={4} titulo="Documentos" descripcion="PDF o DOCX, hasta 5 MB cada uno." Icono={FaPaperclip}>
          <div className="ns-grid">
            <ZonaArchivo
              id="cv"
              etiqueta="CV del candidato"
              obligatorio
              archivo={cv}
              error={errores.cv}
              ayuda="PDF o DOCX, máx. 5 MB"
              onElegir={(a) => elegirArchivo('cv', a, { obligatorio: true, que: 'el CV del candidato' })}
              onQuitar={() => setCv(null)}
            />
            <ZonaArchivo
              id="descriptor"
              etiqueta="Descriptor del cargo"
              archivo={descriptor}
              error={errores.descriptor}
              ayuda="Perfil o descripción del cargo"
              onElegir={(a) => elegirArchivo('descriptor', a)}
              onQuitar={() => setDescriptor(null)}
            />
          </div>
        </Seccion>

        {/* ================= ENVÍO ================= */}
        <div className="ns-actions">
          {errorEnvio && (
            <p className="ns-alert" role="alert">
              <FaExclamationTriangle aria-hidden="true" /> {errorEnvio}
            </p>
          )}
          <button type="button" className="ns-btn ns-btn--ghost" onClick={reiniciar} disabled={enviando || !hayCambios}>
            Limpiar
          </button>
          <button type="submit" className="ns-btn ns-btn--primary ns-btn--lg" disabled={enviando}>
            {enviando ? (
              <>
                <span className="ns-spinner" aria-hidden="true" /> Enviando…
              </>
            ) : (
              'Enviar solicitud'
            )}
          </button>
        </div>
      </form>
    </main>
  );
};

export default NuevaSolicitud;
