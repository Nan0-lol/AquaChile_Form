import React, { useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaLeaf, FaLightbulb, FaMapMarkerAlt, FaArrowRight } from 'react-icons/fa';
import { obtenerOpcionesPublicas, enviarPostulacion, ErrorApi } from '../services/api';
import { formatearCelular } from '../utils/solicitud';
import {
  MAX_CARTA,
  POSTULACION_INICIAL,
  CAMPOS_POSTULACION,
  validarCampoPostulacion,
  validarPostulacionCompleta,
  validarCvPdf,
  construirFormDataPostulacion,
  formatearRut,
} from '../utils/postulacion';
import {
  cx,
  Boton,
  Spinner,
  Campo,
  Selector,
  EntradaCelular,
  Asterisco,
  Opcional,
  MensajeError,
  Contador,
  Alerta,
  Cargando,
  ErrorCarga,
  claseEntrada,
  claseEtiqueta,
  claseTarjeta,
} from '../components/ui';
import ZonaArchivo from '../components/ZonaArchivo';

// =====================================================================
// FORMULARIO PÚBLICO DE POSTULACIÓN  (/postular, sin iniciar sesión)
// Es el formulario original del proyecto. Sirve para quien viene de fuera
// y para quien ya trabaja en AquaChile (le mandan este mismo enlace).
// La persona SOLO envía sus datos y su CV: no ve nada más del sistema.
// Lo que envía llega a la bandeja "Postulaciones" del analista.
// =====================================================================

// Cifras del Reporte Integrado AquaChile 2024 (actualízalas cuando salga el reporte siguiente)
const CIFRAS = [
  { valor: '+5.800', etiqueta: 'colaboradores' },
  { valor: '62', etiqueta: 'países de destino' },
  { valor: '6', etiqueta: 'plantas de proceso' },
  { valor: '11', etiqueta: 'pisciculturas' },
];

const VALORES = [
  {
    Icono: FaLeaf,
    titulo: 'Sustentabilidad',
    texto: 'Comprometidos con minimizar el impacto ambiental y maximizar el bienestar social en cada proceso.',
  },
  {
    Icono: FaLightbulb,
    titulo: 'Innovación',
    texto: 'Fomentamos el desarrollo de soluciones sostenibles y prácticas responsables en la industria.',
  },
  {
    Icono: FaMapMarkerAlt,
    titulo: 'Orgullo del Sur',
    texto: 'Empresa nacida en el sur de Chile, con operaciones desde La Araucanía hasta Magallanes.',
  },
];

const ORDEN_FOCO = [...CAMPOS_POSTULACION, 'cv', 'consentimiento'];

const Postular = () => {
  const [opciones, setOpciones] = useState(null);
  const [carga, setCarga] = useState('cargando'); // cargando | lista | error
  const [valores, setValores] = useState(POSTULACION_INICIAL);
  const [cv, setCv] = useState(null);
  const [consentimiento, setConsentimiento] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviada, setEnviada] = useState(false);
  const trampaRef = useRef(null);

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Postula · AquaChile';
    return () => {
      document.title = anterior;
    };
  }, []);

  const cargar = () => {
    setCarga('cargando');
    obtenerOpcionesPublicas()
      .then((o) => {
        setOpciones(o);
        setCarga('lista');
      })
      .catch(() => setCarga('error'));
  };
  useEffect(cargar, []);

  // ---------- Campos ----------
  const cambiar = (campo, valor) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: validarCampoPostulacion(campo, valor) }));
  };

  const salir = (campo) => {
    const valor = valores[campo];
    if (campo === 'telefono' && valor.trim()) cambiar('telefono', formatearCelular(valor));
    if (campo === 'rut' && valor.trim()) cambiar('rut', formatearRut(valor));
    setErrores((prev) => ({ ...prev, [campo]: validarCampoPostulacion(campo, valor) }));
  };

  const propsCampo = (campo, tamano) => ({
    id: campo,
    name: campo,
    value: valores[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    onBlur: () => salir(campo),
    'aria-invalid': errores[campo] ? 'true' : 'false',
    'aria-describedby': errores[campo] ? `${campo}-error` : undefined,
    className: claseEntrada(errores[campo], tamano),
  });

  const elegirCv = (archivo) => {
    const error = validarCvPdf(archivo);
    setErrores((prev) => ({ ...prev, cv: error }));
    setCv(error ? null : archivo);
  };

  // ---------- Envío ----------
  const enfocarPrimerError = (lista) => {
    const primero = ORDEN_FOCO.find((c) => lista[c]);
    if (primero) document.getElementById(primero)?.focus();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setErrorEnvio('');

    const nuevos = validarPostulacionCompleta(valores, { cv, consentimiento });
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(nuevos);
      return;
    }

    setEnviando(true);
    try {
      await enviarPostulacion(construirFormDataPostulacion(valores, { cv, trampa: trampaRef.current?.value || '' }));
      setEnviada(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const porCampo = err instanceof ErrorApi ? err.errores : {};
      if (Object.keys(porCampo).length) {
        setErrores((prev) => ({ ...prev, ...porCampo }));
        if (porCampo.cv) setCv(null);
        setErrorEnvio('Revisa los campos marcados.');
        enfocarPrimerError(porCampo);
      } else {
        setErrorEnvio(err.message || 'No pudimos enviar tu postulación. Inténtalo nuevamente en unos minutos.');
      }
    } finally {
      setEnviando(false);
    }
  };

  const otraPostulacion = () => {
    setValores(POSTULACION_INICIAL);
    setCv(null);
    setConsentimiento(false);
    setErrores({});
    setErrorEnvio('');
    setEnviada(false);
    window.scrollTo({ top: 0 });
  };

  // ---------- Contenido de la tarjeta ----------
  let contenido;
  if (carga === 'cargando') {
    contenido = <Cargando texto="Cargando formulario…" />;
  } else if (carga === 'error') {
    contenido = (
      <ErrorCarga mensaje="No pudimos cargar el formulario. Revisa tu conexión e inténtalo de nuevo." onReintentar={cargar} />
    );
  } else if (enviada) {
    contenido = (
      <div role="status" className="flex flex-col items-center px-2 py-6 text-center sm:py-10">
        <FaCheckCircle aria-hidden="true" className="text-5xl text-e-enviado" />
        <h2 className="mt-4 mb-2 text-2xl font-bold text-titulo">¡Postulación enviada!</h2>
        <p className="mt-0 mb-7 max-w-[440px] text-[15px] leading-relaxed text-tenue">
          Gracias por tu interés en AquaChile. Revisaremos tu perfil y, si calza con alguna de nuestras vacantes, te
          contactaremos por correo electrónico.
        </p>
        <Boton variante="contorno" onClick={otraPostulacion}>
          Enviar otra postulación
        </Boton>
      </div>
    );
  } else {
    contenido = (
      <>
        <h2 className="mt-0 mb-1.5 text-[1.45rem] font-bold text-titulo">Postula a nuestro equipo</h2>
        <p className="mt-0 mb-1 text-[14.5px] leading-relaxed text-tenue">
          Completa tus datos y adjunta tu Currículum Vitae actualizado en formato PDF (máx. 5 MB).
        </p>
        <p className="mt-0 mb-7 text-[12.5px] text-tenue">
          Los campos marcados con
          <Asterisco /> son obligatorios.
        </p>

        {/* noValidate: usamos nuestros mensajes (el navegador no puede enfocar el input de archivo oculto) */}
        <form onSubmit={enviar} noValidate className="flex flex-col gap-[18px]">
          <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
            <Campo id="nombre" etiqueta="Nombre completo" obligatorio error={errores.nombre}>
              <input type="text" autoComplete="name" maxLength={100} {...propsCampo('nombre')} />
            </Campo>
            <Campo id="rut" etiqueta="RUT" obligatorio error={errores.rut}>
              <input type="text" placeholder="12.345.678-9" maxLength={12} autoComplete="off" {...propsCampo('rut')} />
            </Campo>
            <Campo id="correo" etiqueta="Correo electrónico" obligatorio error={errores.correo}>
              <input type="email" autoComplete="email" maxLength={254} {...propsCampo('correo')} />
            </Campo>
            <Campo id="telefono" etiqueta="Teléfono" obligatorio error={errores.telefono}>
              <EntradaCelular error={errores.telefono} autoComplete="tel-national" {...propsCampo('telefono')} />
            </Campo>
          </div>

          <Campo id="area" etiqueta="Área de interés" obligatorio error={errores.area}>
            <Selector error={errores.area} {...propsCampo('area')}>
              <option value="">Selecciona un área de postulación…</option>
              {Object.entries(opciones.areas).map(([clave, texto]) => (
                <option key={clave} value={clave}>
                  {texto}
                </option>
              ))}
            </Selector>
          </Campo>

          <div className="flex min-w-0 flex-col">
            <label htmlFor="carta" className={claseEtiqueta}>
              Carta de presentación <Opcional />
            </label>
            <textarea
              rows={4}
              maxLength={MAX_CARTA}
              {...propsCampo('carta', 'min-h-[110px] resize-y px-3 py-2.5 text-[14.5px] leading-normal')}
            />
            {valores.carta.length > MAX_CARTA * 0.8 && (
              <div className="flex justify-end">
                <Contador largo={valores.carta.length} maximo={MAX_CARTA} />
              </div>
            )}
            <MensajeError id="carta-error" texto={errores.carta} />
          </div>

          <ZonaArchivo
            id="cv"
            etiqueta="Adjuntar CV (PDF)"
            obligatorio
            archivo={cv}
            error={errores.cv}
            ayuda="PDF, máx. 5 MB"
            accept=".pdf,application/pdf"
            texto="Arrastra tu CV aquí o"
            textoEnlace="haz clic para seleccionarlo"
            onElegir={elegirCv}
            onQuitar={() => setCv(null)}
          />

          {/* Campo trampa: invisible para las personas; los bots suelen llenarlo */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="sitioWeb">No llenes este campo</label>
            <input ref={trampaRef} type="text" id="sitioWeb" name="sitioWeb" tabIndex={-1} autoComplete="off" />
          </div>

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-texto">
              <input
                id="consentimiento"
                type="checkbox"
                checked={consentimiento}
                onChange={(e) => {
                  setConsentimiento(e.target.checked);
                  if (e.target.checked) setErrores((prev) => ({ ...prev, consentimiento: '' }));
                }}
                aria-invalid={errores.consentimiento ? 'true' : 'false'}
                aria-describedby={errores.consentimiento ? 'consentimiento-error' : undefined}
                className="mt-[3px] size-[17px] shrink-0 accent-acento-solido focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
              />
              <span>
                Acepto el tratamiento de mis datos personales para fines de reclutamiento y selección.
                <Asterisco />
              </span>
            </label>
            <MensajeError id="consentimiento-error" texto={errores.consentimiento} />
          </div>

          {errorEnvio && <Alerta>{errorEnvio}</Alerta>}
          <Boton type="submit" tamano="lg" disabled={enviando} className="w-full">
            {enviando ? (
              <>
                <Spinner /> Enviando…
              </>
            ) : (
              <>
                Enviar postulación <FaArrowRight aria-hidden="true" className="text-sm" />
              </>
            )}
          </Boton>
        </form>
      </>
    );
  }

  return (
    <div className="flex flex-col bg-fondo">
      {/* ---------- 1. Portada ---------- */}
      <section className="bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('/FondoFormulario.png')` }}>
        <div className="bg-linear-100 from-[#1e2d38]/92 via-[#1e2d38]/75 to-[#1e2d38]/45 px-5 pt-14 pb-32 sm:pt-20 sm:pb-36">
          <div className="mx-auto max-w-[1000px] text-white">
            <span className="inline-block rounded-full bg-white/14 px-3 py-1 text-xs font-bold tracking-[0.08em] uppercase">
              Trabaja en AquaChile
            </span>
            <h1 className="mt-4 mb-3 text-[2rem] leading-tight font-bold sm:text-[2.6rem]">
              Únete al equipo que <br className="hidden sm:block" />
              <span className="text-acento-claro">alimenta al mundo</span>
            </h1>
            <p className="m-0 max-w-[560px] text-[15px] leading-relaxed text-slate-200">
              Forma parte de la empresa salmonera líder nacida en el sur de Chile. Buscamos talentos comprometidos con
              la excelencia, la sustentabilidad y el orgullo por nuestras raíces.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 2. Formulario ---------- */}
      <div className="relative -mt-20 px-4">
        <section
          aria-label="Formulario de postulación"
          className={cx(claseTarjeta, 'mx-auto max-w-[588px] px-5 pt-7 pb-8 shadow-alta sm:px-8 sm:pt-9 sm:pb-9')}
        >
          {contenido}
        </section>
      </div>

      {/* ---------- 3. ¿Por qué AquaChile? ---------- */}
      <section aria-labelledby="por-que-titulo" className="mx-auto w-full max-w-[1000px] px-4 pt-16 pb-16 sm:pt-20">
        <div className="mb-7 text-center">
          <span className="text-xs font-bold tracking-[0.08em] text-acento uppercase">¿Por qué AquaChile?</span>
          <h2 id="por-que-titulo" className="mt-2 mb-0 text-[1.6rem] font-bold text-titulo sm:text-[1.9rem]">
            Crecemos desde el sur, para el mundo
          </h2>
        </div>

        <dl className={cx(claseTarjeta, 'm-0 grid grid-cols-2 divide-borde overflow-hidden sm:grid-cols-4 sm:divide-x')}>
          {CIFRAS.map((c) => (
            <div key={c.etiqueta} className="flex flex-col-reverse items-center px-3 py-6 text-center">
              <dt className="text-[13px] text-tenue">{c.etiqueta}</dt>
              <dd className="m-0 mb-1 text-[2rem] leading-none font-bold text-acento">{c.valor}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2.5 mb-10 text-right text-xs text-tenue">Fuente: Reporte Integrado AquaChile 2024.</p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {VALORES.map(({ Icono, titulo, texto }) => (
            <div key={titulo} className={cx(claseTarjeta, 'flex flex-col items-center px-6 py-9 text-center')}>
              <span aria-hidden="true" className="mb-4 inline-flex size-[52px] items-center justify-center rounded-full bg-acento-suave text-xl text-acento">
                <Icono />
              </span>
              <h3 className="mt-0 mb-2.5 text-lg font-bold text-titulo">{titulo}</h3>
              <p className="m-0 text-sm leading-relaxed text-tenue">{texto}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Postular;
