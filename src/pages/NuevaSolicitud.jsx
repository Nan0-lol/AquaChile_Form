import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaUserPlus,
  FaSearch,
  FaBriefcase,
  FaClipboardCheck,
  FaPaperclip,
  FaFilePdf,
  FaFileWord,
  FaCheckCircle,
  FaEnvelope,
  FaInbox,
  FaArrowLeft,
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
import { valoresDesdePostulacion } from '../utils/postulacion';
import { hace } from '../utils/proceso';
import {
  cx,
  FOCO,
  Boton,
  Spinner,
  Campo,
  Selector,
  Interruptor,
  EntradaCelular,
  OpcionRadio,
  Contador,
  Asterisco,
  Opcional,
  MensajeError,
  Ayuda,
  Avatar,
  Chip,
  Alerta,
  Pagina,
  Titulo,
  Cargando,
  ErrorCarga,
  claseEntrada,
  claseEtiqueta,
  claseTarjeta,
  claseVolver,
} from '../components/ui';
import ZonaArchivo from '../components/ZonaArchivo';

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

const GRILLA = 'grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2';

// ---------------------------------------------------------------------
// Piezas del formulario
// ---------------------------------------------------------------------
/** Tarjeta numerada de cada sección del formulario */
const Seccion = ({ numero, titulo, descripcion, Icono, children }) => (
  <section className={claseTarjeta} aria-labelledby={`seccion-${numero}`}>
    <header className="flex items-start gap-3.5 border-b border-borde px-4 pt-5 pb-4 sm:px-6">
      <span aria-hidden="true" className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-acento-suave text-base text-acento">
        <Icono />
      </span>
      <div>
        <h2 id={`seccion-${numero}`} className="m-0 text-[1.05rem] font-bold text-titulo">
          <span className="text-acento">{numero}.</span> {titulo}
        </h2>
        {descripcion && <p className="mt-[3px] mb-0 text-[13.5px] text-tenue">{descripcion}</p>}
      </div>
    </header>
    <div className="px-4 pt-5 pb-6 sm:px-6">{children}</div>
  </section>
);

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
    <div className="flex flex-col">
      <label className={claseEtiqueta} htmlFor="candidatoId">
        Buscar candidato
        <Asterisco />
      </label>
      <div
        className={cx(
          'flex h-11 items-center gap-2.5 rounded-lg border bg-superficie px-3 transition-[border-color,box-shadow] focus-within:ring-3',
          error ? 'border-error focus-within:ring-error/20' : 'border-borde-fuerte focus-within:border-acento focus-within:ring-anillo'
        )}
      >
        <FaSearch aria-hidden="true" className="shrink-0 text-sutil" />
        <input
          id="candidatoId"
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre o correo (mínimo 2 letras)"
          autoComplete="off"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'candidatoId-error' : 'candidatoId-estado'}
          className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent text-[14.5px] text-texto outline-none placeholder:text-sutil"
        />
      </div>
      <MensajeError id="candidatoId-error" texto={error} />

      <div id="candidatoId-estado" aria-live="polite" className="mt-2 min-h-[18px] text-[13px] text-tenue">
        {estado === 'buscando' && 'Buscando…'}
        {estado === 'error' && 'No pudimos buscar. Revisa la conexión e inténtalo de nuevo.'}
        {estado === 'listo' && resultados.length === 0 && 'No hay candidatos con ese nombre o correo. Regístralo como candidato nuevo.'}
        {estado === 'listo' && resultados.length > 0 && `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`}
      </div>

      {resultados.length > 0 && (
        <ul className="mt-2 mb-0 list-none divide-y divide-borde overflow-hidden rounded-[10px] border border-borde p-0">
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onElegir(c)}
                className="flex w-full cursor-pointer items-center gap-3 bg-superficie px-3.5 py-2.5 text-left text-texto outline-none transition-colors hover:bg-acento-suave focus-visible:bg-acento-suave"
              >
                <Avatar nombre={c.nombre} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">{c.nombre}</span>
                  <span className="truncate text-[12.5px] text-tenue">{c.correo}</span>
                </span>
                <span className="hidden shrink-0 text-xs text-sutil sm:inline">
                  {c.totalSolicitudes ? `${c.totalSolicitudes} evaluación${c.totalSolicitudes === 1 ? '' : 'es'}` : 'Sin evaluaciones'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Botón de "Candidato nuevo / Ya registrado" */
const BotonModo = ({ activo, children, ...props }) => (
  <button
    type="button"
    aria-pressed={activo}
    className={cx(
      'h-9 flex-1 cursor-pointer rounded-[7px] px-4 text-sm font-semibold transition-colors sm:flex-none',
      FOCO,
      activo ? 'bg-superficie text-acento shadow-[0_1px_3px_rgb(15_30_45/0.12)]' : 'bg-transparent text-tenue hover:text-texto'
    )}
    {...props}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------
const NuevaSolicitud = () => {
  const [catalogos, setCatalogos] = useState(null);
  const [evaluadores, setEvaluadores] = useState([]);
  const [carga, setCarga] = useState('cargando'); // cargando | lista | error

  // Si se llega desde la ficha de un candidato, ya viene elegido.
  // Si se llega desde una postulación web, el formulario viene prellenado con sus datos y su CV.
  const location = useLocation();
  const desdeFicha = location.state?.candidato ?? null;
  const [postulacion, setPostulacion] = useState(location.state?.postulacion ?? null);
  // Si quien postuló ya estaba registrado (mismo correo), se usa ese candidato
  const candidatoInicial =
    desdeFicha ??
    (postulacion?.candidatoId
      ? { id: postulacion.candidatoId, nombre: postulacion.nombre, correo: postulacion.correo, telefono: postulacion.telefono }
      : null);
  const [modo, setModo] = useState(candidatoInicial ? 'existente' : 'nuevo'); // nuevo | existente
  const [candidato, setCandidato] = useState(candidatoInicial); // candidato ya registrado elegido
  const [valores, setValores] = useState(() =>
    postulacion ? { ...VALORES_INICIALES, ...valoresDesdePostulacion(postulacion) } : VALORES_INICIALES
  );
  const [cv, setCv] = useState(null);
  const [usarCvPostulacion, setUsarCvPostulacion] = useState(Boolean(postulacion));
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

  // Trae los datos guardados del candidato que ya estaba registrado (pueden diferir de la postulación)
  useEffect(() => {
    if (!postulacion?.candidatoId) return;
    obtenerCandidato(postulacion.candidatoId)
      .then(setCandidato)
      .catch(() => {});
  }, [postulacion?.candidatoId]);

  // CV que se enviará: uno nuevo, o el de la postulación (lo copia el servidor)
  const cvDePostulacion = postulacion && usarCvPostulacion && !cv ? { name: postulacion.cv.nombre, size: postulacion.cv.bytes } : null;

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

  /** Props comunes de cada input: valor, eventos y accesibilidad */
  const propsCampo = (campo, { ayuda, tamano } = {}) => ({
    id: campo,
    name: campo,
    value: valores[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    onBlur: () => alSalirDelCampo(campo),
    'aria-invalid': errores[campo] ? 'true' : 'false',
    'aria-describedby': errores[campo] ? `${campo}-error` : ayuda ? `${campo}-ayuda` : undefined,
    className: claseEntrada(errores[campo], tamano),
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

    const nuevos = validarSolicitudCompleta(valores, { candidatoExistente: candidato, cv: cv ?? cvDePostulacion, descriptor });
    if (modo === 'existente' && !candidato) nuevos.candidatoId = 'Busca y elige al candidato, o regístralo como nuevo.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(nuevos);
      return;
    }

    setEnviando(true);
    try {
      const solicitud = await crearSolicitud(
        construirFormData(valores, { candidatoExistente: candidato, cv, descriptor, postulacionId: postulacion?.id })
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
    setPostulacion(null);
    setUsarCvPostulacion(false);
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
      <Pagina ancho="angosto">
        <Cargando texto="Cargando formulario…" />
      </Pagina>
    );
  }

  if (carga === 'error') {
    return (
      <Pagina ancho="angosto">
        <ErrorCarga mensaje="No pudimos cargar las listas del formulario. Revisa que el servidor esté encendido." onReintentar={cargarListas} />
      </Pagina>
    );
  }

  if (creada) {
    const familia = catalogos.familiasCargo[creada.familiaCargo] ?? creada.familiaCargo;
    const filas = [
      ['Candidato', creada.candidato.nombre],
      ['Cargo', `${creada.nombreCargo} · ${familia}`],
      ['Ubicación', creada.ubicacion],
      ['Responsable', creada.evaluador?.nombre ?? 'Sin asignar'],
    ];
    return (
      <Pagina ancho="angosto">
        <section role="status" aria-labelledby="exito-titulo" className={cx(claseTarjeta, 'mx-auto mt-6 max-w-[600px] px-[18px] pt-7 pb-6 text-center sm:px-8 sm:pt-9 sm:pb-8')}>
          <FaCheckCircle aria-hidden="true" className="mx-auto text-5xl text-e-enviado" />
          <h1 id="exito-titulo" className="mt-3.5 mb-1.5 text-2xl font-bold text-titulo">
            Solicitud enviada
          </h1>
          <p className="mt-0 mb-6 text-tenue">La evaluación quedó en la etapa «{catalogos.etapas[creada.etapa]}».</p>

          <dl className="m-0 mb-5 divide-y divide-borde overflow-hidden rounded-xl border border-borde text-left">
            {filas.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="grid grid-cols-1 gap-0.5 px-4 py-[11px] sm:grid-cols-[130px_1fr] sm:gap-3">
                <dt className="text-[13px] font-semibold text-tenue">{etiqueta}</dt>
                <dd className="m-0 text-sm text-texto">{valor}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-0 mb-6 inline-flex items-center gap-2 text-sm text-tenue">
            <FaEnvelope aria-hidden="true" className="text-acento" />
            {creada.evaluador
              ? `Se le avisó por correo a ${creada.evaluador.nombre}.`
              : 'Quedó sin responsable: cualquier evaluador podrá tomarla.'}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {postulacion ? (
              <Boton as={Link} to="/postulaciones">
                Volver a postulaciones
              </Boton>
            ) : (
              <Boton onClick={reiniciar}>Crear otra solicitud</Boton>
            )}
            <Boton as={Link} to={`/solicitudes/${creada.id}`} variante="contorno">
              Ver la solicitud
            </Boton>
          </div>
        </section>
      </Pagina>
    );
  }

  const largoAspectos = valores.aspectosIndagar.length;

  return (
    <Pagina ancho="angosto">
      {postulacion && (
        <Link to="/postulaciones" className={claseVolver}>
          <FaArrowLeft aria-hidden="true" /> Postulaciones
        </Link>
      )}
      <Titulo titulo="Nueva solicitud de evaluación">
        Completa los datos para que el equipo de evaluación agende la entrevista. Los campos con
        <Asterisco /> son obligatorios.
      </Titulo>

      {postulacion && (
        <p role="note" className="mt-0 mb-5 flex items-start gap-3 rounded-xl border border-acento bg-acento-suave px-4 py-3.5 text-sm leading-relaxed text-texto">
          <FaInbox aria-hidden="true" className="mt-0.5 shrink-0 text-acento" />
          <span>
            Viene de la <strong>postulación web de {postulacion.nombre}</strong> ({hace(postulacion.creadoEn).toLowerCase()}) · RUT{' '}
            {postulacion.rut} · Área de interés: {catalogos.areasInteres?.[postulacion.area] ?? postulacion.area}. Ya cargamos
            sus datos de contacto y su CV: completa el origen, el cargo y el proceso.
          </span>
        </p>
      )}

      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {/* ================= 1. CANDIDATO ================= */}
        <Seccion numero={1} titulo="Candidato" descripcion="¿A quién hay que evaluar?" Icono={FaUserPlus}>
          <div role="group" aria-label="Tipo de candidato" className="mb-5 flex gap-1 rounded-[10px] bg-superficie-3 p-1 sm:inline-flex">
            <BotonModo activo={modo === 'nuevo'} onClick={() => cambiarModo('nuevo')}>
              Candidato nuevo
            </BotonModo>
            <BotonModo activo={modo === 'existente'} onClick={() => cambiarModo('existente')}>
              Ya registrado
            </BotonModo>
          </div>

          {modo === 'nuevo' && (
            <div className={GRILLA}>
              <Campo id="nombre" etiqueta="Nombre completo" obligatorio error={errores.nombre} className="sm:col-span-2">
                <input type="text" autoComplete="off" maxLength={100} {...propsCampo('nombre')} />
              </Campo>

              <div className="flex min-w-0 flex-col">
                <Campo id="correo" etiqueta="Correo electrónico" obligatorio error={errores.correo}>
                  <input type="email" autoComplete="off" maxLength={254} {...propsCampo('correo')} />
                </Campo>
                {sugerido && (
                  <button
                    type="button"
                    onClick={usarSugerido}
                    className="mt-2 cursor-pointer self-start rounded p-0 text-[13px] font-semibold text-acento underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
                  >
                    Usar a {sugerido.nombre} (ya registrado)
                  </button>
                )}
              </div>

              <Campo id="telefono" etiqueta="Celular" obligatorio error={errores.telefono}>
                <EntradaCelular error={errores.telefono} {...propsCampo('telefono')} />
              </Campo>

              <fieldset className="m-0 min-w-0 border-0 p-0 sm:col-span-2" aria-describedby={errores.origen ? 'origen-error' : undefined}>
                <legend className={cx(claseEtiqueta, 'p-0')}>
                  Origen
                  <Asterisco />
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(catalogos.origenes).map(([clave, texto], i) => (
                    <OpcionRadio
                      key={clave}
                      id={i === 0 ? 'origen' : undefined}
                      name="origen"
                      value={clave}
                      checked={valores.origen === clave}
                      onChange={() => cambiar('origen', clave)}
                      titulo={texto}
                      detalle={clave === 'interno' ? 'Ya trabaja en AquaChile' : 'Viene de fuera de la empresa'}
                    />
                  ))}
                </div>
                <MensajeError id="origen-error" texto={errores.origen} />
              </fieldset>
            </div>
          )}

          {modo === 'existente' &&
            (candidato ? (
              <div className="flex items-center gap-3.5 rounded-xl border border-acento bg-acento-suave px-4 py-3.5">
                <Avatar nombre={candidato.nombre} grande />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
                  <strong className="text-[15px] text-texto">{candidato.nombre}</strong>
                  <span className="text-[13px] text-tenue">
                    {[candidato.correo, candidato.telefono && formatearCelular(candidato.telefono)].filter(Boolean).join(' · ')}
                  </span>
                  {candidato.origen && <Chip>{catalogos.origenes[candidato.origen] ?? candidato.origen}</Chip>}
                </div>
                <Boton variante="fantasma" tamano="sm" onClick={() => setCandidato(null)}>
                  Cambiar
                </Boton>
              </div>
            ) : (
              <BuscadorCandidato error={errores.candidatoId} onElegir={elegirCandidato} />
            ))}
        </Seccion>

        {/* ================= 2. CARGO ================= */}
        <Seccion numero={2} titulo="Cargo a evaluar" descripcion="Datos de la vacante." Icono={FaBriefcase}>
          <div className={GRILLA}>
            <Campo id="familiaCargo" etiqueta="Familia de cargo" obligatorio error={errores.familiaCargo}>
              <Selector error={errores.familiaCargo} {...propsCampo('familiaCargo')}>
                <option value="">Selecciona…</option>
                {Object.entries(catalogos.familiasCargo).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </Selector>
            </Campo>

            <Campo id="nombreCargo" etiqueta="Nombre del cargo" obligatorio error={errores.nombreCargo}>
              <input type="text" maxLength={100} placeholder="Ej. Operador de máquina" {...propsCampo('nombreCargo')} />
            </Campo>

            <Campo id="ubicacion" etiqueta="Ubicación" obligatorio error={errores.ubicacion}>
              <input type="text" maxLength={100} list="ubicaciones-sugeridas" placeholder="Elige o escribe una" {...propsCampo('ubicacion')} />
              <datalist id="ubicaciones-sugeridas">
                {catalogos.ubicacionesSugeridas.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Campo>

            <Campo id="unidad" etiqueta="Unidad" obligatorio error={errores.unidad}>
              <Selector error={errores.unidad} {...propsCampo('unidad')}>
                <option value="">Selecciona…</option>
                {Object.entries(catalogos.unidades).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </Selector>
            </Campo>

            <Campo id="ceco" etiqueta="Centro de costo" opcional ayuda="Letras y números, como aparece en la requisición." error={errores.ceco}>
              <input type="text" maxLength={20} placeholder="Ej. CC-1050" autoComplete="off" {...propsCampo('ceco', { ayuda: true })} />
            </Campo>
          </div>
        </Seccion>

        {/* ================= 3. PROCESO ================= */}
        <Seccion numero={3} titulo="Proceso de evaluación" descripcion="Quién evalúa y qué debe considerar." Icono={FaClipboardCheck}>
          <div className={GRILLA}>
            <Campo
              id="evaluadorId"
              etiqueta="Profesional responsable"
              opcional
              ayuda="Se le avisará por correo apenas envíes la solicitud."
              error={errores.evaluadorId}
            >
              <Selector error={errores.evaluadorId} {...propsCampo('evaluadorId', { ayuda: true })}>
                <option value="">Sin asignar por ahora</option>
                {evaluadores.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre}
                  </option>
                ))}
              </Selector>
            </Campo>

            <div className="flex flex-col justify-center gap-3.5">
              <Interruptor
                checked={valores.requiereReferencias}
                onChange={(e) => cambiar('requiereReferencias', e.target.checked)}
                titulo="Requiere referencias laborales"
                detalle="El evaluador las pedirá durante el proceso."
              />
              <Interruptor
                checked={valores.referido}
                onChange={(e) => cambiar('referido', e.target.checked)}
                titulo="Es referido"
                detalle="Lo recomendó alguien de la empresa."
              />
            </div>

            <div className="flex min-w-0 flex-col sm:col-span-2">
              <label className={claseEtiqueta} htmlFor="aspectosIndagar">
                Aspectos a indagar <Opcional />
              </label>
              <textarea
                rows={4}
                maxLength={MAX_ASPECTOS}
                placeholder="Ej. disponibilidad para turnos rotativos, experiencia liderando equipos…"
                {...propsCampo('aspectosIndagar', { ayuda: true, tamano: 'min-h-[110px] resize-y px-3 py-2.5 text-[14.5px] leading-normal' })}
              />
              <div className="flex justify-between gap-3">
                <Ayuda id="aspectosIndagar-ayuda">Lo que la jefatura quiere que se revise en la entrevista.</Ayuda>
                <Contador largo={largoAspectos} maximo={MAX_ASPECTOS} />
              </div>
              <MensajeError id="aspectosIndagar-error" texto={errores.aspectosIndagar} />
            </div>
          </div>
        </Seccion>

        {/* ================= 4. DOCUMENTOS ================= */}
        <Seccion numero={4} titulo="Documentos" descripcion="PDF o DOCX, hasta 5 MB cada uno." Icono={FaPaperclip}>
          <div className={GRILLA}>
            {cvDePostulacion ? (
              <div className="flex min-w-0 flex-col">
                <span className={claseEtiqueta}>
                  CV del candidato
                  <Asterisco />
                </span>
                <div className="flex min-h-[72px] items-center gap-3 rounded-xl border border-borde-fuerte bg-superficie-2 px-3.5 py-3">
                  {esWord(cvDePostulacion.name) ? (
                    <FaFileWord aria-hidden="true" className="shrink-0 text-[28px] text-word" />
                  ) : (
                    <FaFilePdf aria-hidden="true" className="shrink-0 text-[28px] text-pdf" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-texto">{cvDePostulacion.name}</span>
                    <span className="text-[12.5px] text-tenue">{formatearTamano(cvDePostulacion.size)} · el que envió en su postulación</span>
                  </div>
                  <Boton variante="fantasma" tamano="sm" onClick={() => setUsarCvPostulacion(false)}>
                    Usar otro
                  </Boton>
                </div>
              </div>
            ) : (
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
            )}
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
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1 [&>button]:grow sm:[&>button]:grow-0">
          {errorEnvio && <Alerta>{errorEnvio}</Alerta>}
          <Boton variante="fantasma" onClick={reiniciar} disabled={enviando || !hayCambios}>
            Limpiar
          </Boton>
          <Boton type="submit" tamano="lg" disabled={enviando}>
            {enviando ? (
              <>
                <Spinner /> Enviando…
              </>
            ) : (
              'Enviar solicitud'
            )}
          </Boton>
        </div>
      </form>
    </Pagina>
  );
};

export default NuevaSolicitud;
