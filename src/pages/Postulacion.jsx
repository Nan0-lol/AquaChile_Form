import React, { useState, useRef } from 'react';
import {
  FaLeaf,
  FaLightbulb,
  FaMapMarkerAlt,
  FaCloudUploadAlt,
  FaFilePdf,
  FaTimes,
  FaCheckCircle,
  FaFacebookF,
  FaInstagram,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import './Postulacion.css';

// ================= CONFIGURACIÓN =================
// Ajusta esta URL a la ruta real de tu backend (server/, puerto 3001).
const API_URL = 'http://localhost:3001/api/postulaciones';
const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB

// ================= UTILIDADES DE VALIDACIÓN =================
const limpiarRut = (rut) => rut.replace(/[^0-9kK]/g, '').toUpperCase();

// Valida el dígito verificador con módulo 11
const rutEsValido = (rut) => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 8 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === dvEsperado;
};

// 12345678K -> 12.345.678-K
const formatearRut = (rut) => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
};

const formatearTamano = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const validarCv = (archivo) => {
  if (!archivo) return 'Adjunta tu CV en PDF.';
  const esPdf =
    archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
  if (!esPdf) return 'El archivo debe ser PDF.';
  if (archivo.size > MAX_CV_BYTES) return 'El archivo supera los 5 MB.';
  return '';
};

const validarCampo = (nombre, valor) => {
  switch (nombre) {
    case 'nombre':
      return valor.trim().length < 3 ? 'Ingresa tu nombre completo.' : '';
    case 'rut':
      if (!valor.trim()) return 'Ingresa tu RUT.';
      return rutEsValido(valor) ? '' : 'RUT inválido. Revisa el dígito verificador.';
    case 'correo':
      if (!valor.trim()) return 'Ingresa tu correo.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor) ? '' : 'Correo con formato inválido.';
    case 'telefono': {
      const digitos = valor.replace(/\D/g, '');
      if (!digitos) return 'Ingresa tu teléfono.';
      return /^9\d{8}$/.test(digitos) ? '' : 'Debe tener 9 dígitos y comenzar con 9.';
    }
    case 'area':
      return valor ? '' : 'Selecciona un área.';
    default:
      return '';
  }
};

// Cifras del Reporte Integrado AquaChile 2024 (actualízalas cuando salga el reporte siguiente)
// Enlaces oficiales de AquaChile (se abren en pestaña nueva)
const ENLACES_FOOTER = [
  { texto: 'Contacto comercial', url: 'https://es.aquachile.com/contacto-comercial/' },
  { texto: 'Trabaja con nosotros', url: 'https://trabajos.aquachile.com/' },
  { texto: 'Canal de Denuncias', url: 'https://secure.ethicspoint.com/domain/media/es/gui/90628/index.html' },
];

const REDES_SOCIALES = [
  { nombre: 'Facebook', url: 'https://www.facebook.com/TiendaAquaChile', Icono: FaFacebookF },
  { nombre: 'Instagram', url: 'https://www.instagram.com/aqua_chile/', Icono: FaInstagram },
  { nombre: 'X', url: 'https://x.com/aqua_chile', Icono: FaXTwitter },
];

const CIFRAS = [
  { valor: '+5.800', etiqueta: 'colaboradores' },
  { valor: '62', etiqueta: 'países de destino' },
  { valor: '6', etiqueta: 'plantas de proceso' },
  { valor: '11', etiqueta: 'pisciculturas' },
];

const VALORES_INICIALES = {
  nombre: '',
  rut: '',
  correo: '',
  telefono: '',
  area: '',
  carta: '',
};

const Postulacion = () => {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [errores, setErrores] = useState({});
  const [cv, setCv] = useState(null);
  const [consentimiento, setConsentimiento] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [estadoEnvio, setEstadoEnvio] = useState(null); // 'ok' | 'error' | null
  const inputCvRef = useRef(null);

  // ---------- Campos de texto ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setValores((prev) => ({ ...prev, [name]: value }));
    // Si el campo ya tenía error, se re-valida mientras escribe
    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: validarCampo(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'rut' && value.trim()) {
      setValores((prev) => ({ ...prev, rut: formatearRut(value) }));
    }
    setErrores((prev) => ({ ...prev, [name]: validarCampo(name, value) }));
  };

  // ---------- CV ----------
  const procesarArchivo = (archivo) => {
    const error = validarCv(archivo);
    setErrores((prev) => ({ ...prev, cv: error }));
    if (error) {
      setCv(null);
      if (inputCvRef.current) inputCvRef.current.value = '';
      return;
    }
    setCv(archivo);
  };

  const handleCvChange = (e) => procesarArchivo(e.target.files?.[0] || null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const archivos = e.dataTransfer.files;
    if (!archivos?.length) return;
    // Sincroniza el input real para que el formulario nativo también lo tenga
    if (inputCvRef.current) inputCvRef.current.files = archivos;
    procesarArchivo(archivos[0]);
  };

  const quitarCv = () => {
    setCv(null);
    setErrores((prev) => ({ ...prev, cv: '' }));
    if (inputCvRef.current) {
      inputCvRef.current.value = '';
      inputCvRef.current.focus();
    }
  };

  // ---------- Envío ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setEstadoEnvio(null);

    const nuevosErrores = {};
    Object.keys(VALORES_INICIALES).forEach((campo) => {
      const error = validarCampo(campo, valores[campo]);
      if (error) nuevosErrores[campo] = error;
    });
    const errorCv = validarCv(cv);
    if (errorCv) nuevosErrores.cv = errorCv;
    if (!consentimiento) {
      nuevosErrores.consentimiento = 'Debes aceptar el tratamiento de tus datos para postular.';
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      // Lleva el foco al primer campo con error
      const primero = Object.keys(nuevosErrores)[0];
      document.getElementById(primero)?.focus();
      return;
    }

    const datos = new FormData();
    datos.append('nombre', valores.nombre.trim());
    datos.append('rut', formatearRut(valores.rut));
    datos.append('correo', valores.correo.trim());
    datos.append('telefono', `+56${valores.telefono.replace(/\D/g, '')}`);
    datos.append('area', valores.area);
    datos.append('carta', valores.carta.trim());
    datos.append('cv', cv);
    datos.append('consentimiento', 'true');

    try {
      setEnviando(true);
      const res = await fetch(API_URL, { method: 'POST', body: datos });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEstadoEnvio('ok');
      setValores(VALORES_INICIALES);
      setConsentimiento(false);
      setCv(null);
      setErrores({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error al enviar la postulación:', err);
      setEstadoEnvio('error');
    } finally {
      setEnviando(false);
    }
  };

  // Props comunes de accesibilidad para cada campo
  const propsCampo = (nombre) => ({
    id: nombre,
    name: nombre,
    value: valores[nombre],
    onChange: handleChange,
    onBlur: handleBlur,
    className: errores[nombre] ? 'input-error' : undefined,
    'aria-invalid': errores[nombre] ? 'true' : 'false',
    'aria-describedby': errores[nombre] ? `${nombre}-error` : undefined,
  });

  const MensajeError = ({ campo }) =>
    errores[campo] ? (
      <span id={`${campo}-error`} className="error-message" role="alert">
        {errores[campo]}
      </span>
    ) : null;

  const Asterisco = () => (
    <span className="required-asterisk" aria-hidden="true">*</span>
  );

  return (
    <div className="aquachile-container">

      {/* 1. SECCIÓN HERO */}
      <section
        className="hero-section"
        style={{ backgroundImage: `url('/FondoFormulario.png')` }}
      >
        <div className="hero-overlay">
          <div className="hero-content">
            <span className="badge-unete">TRABAJA EN AQUACHILE</span>
            <h1>
              Únete al equipo que <br />
              <span className="highlight-accent">alimenta al mundo</span>
            </h1>
            <p>
              Forma parte de la empresa salmonera líder nacida en el sur de Chile.
              Buscamos talentos comprometidos con la excelencia, la sustentabilidad
              y el orgullo por nuestras raíces.
            </p>
          </div>
        </div>
      </section>

      {/* 2. FORMULARIO PRINCIPAL */}
      <section className="form-section">
        <div className="form-card">
          {estadoEnvio === 'ok' ? (
            <div className="form-success" role="status">
              <FaCheckCircle className="form-success-icon" aria-hidden="true" />
              <h2>¡Postulación enviada!</h2>
              <p>
                Gracias por tu interés en AquaChile. Revisaremos tu perfil y, si calza con
                alguna de nuestras vacantes, te contactaremos por correo electrónico.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEstadoEnvio(null)}
              >
                Enviar otra postulación
              </button>
            </div>
          ) : (
          <>
          <h2>Postula a nuestro equipo</h2>
          <p className="subtitle">
            Completa tus datos y adjunta tu Currículum Vitae actualizado en formato PDF (máx. 5 MB).
            <span className="subtitle-required">
              Los campos marcados con<Asterisco /> son obligatorios.
            </span>
          </p>

          {/* noValidate: usamos nuestra validación (el navegador no puede enfocar el input de archivo oculto) */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="nombre">Nombre completo<Asterisco /></label>
                <input
                  type="text"
                  autoComplete="name"
                  required
                  {...propsCampo('nombre')}
                />
                <MensajeError campo="nombre" />
              </div>
              <div className="input-group">
                <label htmlFor="rut">RUT<Asterisco /></label>
                <input
                  type="text"
                  placeholder="12.345.678-9"
                  maxLength={12}
                  required
                  {...propsCampo('rut')}
                />
                <MensajeError campo="rut" />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label htmlFor="correo">Correo electrónico<Asterisco /></label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  {...propsCampo('correo')}
                />
                <MensajeError campo="correo" />
              </div>
              <div className="input-group">
                <label htmlFor="telefono">Teléfono<Asterisco /></label>
                <div className={`phone-input${errores.telefono ? ' has-error' : ''}`}>
                  <span className="prefix">+56</span>
                  <input
                    type="tel"
                    placeholder="9 1234 5678"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    maxLength={11}
                    required
                    {...propsCampo('telefono')}
                  />
                </div>
                <MensajeError campo="telefono" />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="area">Área de interés<Asterisco /></label>
              <select required {...propsCampo('area')}>
                <option value="">Selecciona un área de postulación...</option>
                <option value="planta">Plantas de Proceso</option>
                <option value="piscicultura">Pisciculturas</option>
                <option value="administracion">Administración y Finanzas</option>
                <option value="comercial">Área Comercial</option>
              </select>
              <MensajeError campo="area" />
            </div>

            <div className="input-group">
              <label htmlFor="carta">Carta de presentación</label>
              <textarea
                rows="4"
                {...propsCampo('carta')}
              ></textarea>
            </div>

            {/* ---------- CV: input real oculto + zona de arrastrar y soltar ---------- */}
            <div className="input-group">
              <span className="field-label" id="cv-label">
                Adjuntar CV (PDF)<Asterisco />
              </span>

              <input
                ref={inputCvRef}
                id="cv"
                name="cv"
                type="file"
                accept=".pdf,application/pdf"
                className="visually-hidden cv-input"
                onChange={handleCvChange}
                aria-labelledby="cv-label"
                aria-invalid={errores.cv ? 'true' : 'false'}
                aria-describedby={errores.cv ? 'cv-error' : 'cv-hint'}
                required
              />

              {!cv ? (
                <label
                  htmlFor="cv"
                  className={`dropzone-container${arrastrando ? ' drag-active' : ''}${errores.cv ? ' error' : ''}`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="dropzone-content">
                    <FaCloudUploadAlt className="dropzone-icon" aria-hidden="true" />
                    <p className="dropzone-text">
                      Arrastra tu CV aquí o <span className="dropzone-link">haz clic para seleccionarlo</span>
                    </p>
                    <p className="dropzone-hint" id="cv-hint">PDF, máx. 5 MB</p>
                  </div>
                </label>
              ) : (
                <div className="file-loaded">
                  <div className="file-loaded-info">
                    <FaFilePdf className="file-loaded-icon" aria-hidden="true" />
                    <div>
                      <span className="file-loaded-name">{cv.name}</span>
                      <span className="file-loaded-size">{formatearTamano(cv.size)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={quitarCv}
                    aria-label={`Quitar ${cv.name}`}
                  >
                    <FaTimes aria-hidden="true" />
                  </button>
                </div>
              )}
              <MensajeError campo="cv" />
            </div>

            {/* ---------- Consentimiento de datos personales ---------- */}
            <div className="consent-group">
              <label className={`consent-label${errores.consentimiento ? ' has-error' : ''}`}>
                <input
                  type="checkbox"
                  id="consentimiento"
                  name="consentimiento"
                  checked={consentimiento}
                  onChange={(e) => {
                    setConsentimiento(e.target.checked);
                    if (e.target.checked) setErrores((prev) => ({ ...prev, consentimiento: '' }));
                  }}
                  aria-invalid={errores.consentimiento ? 'true' : 'false'}
                  aria-describedby={errores.consentimiento ? 'consentimiento-error' : undefined}
                />
                <span>
                  Acepto el tratamiento de mis datos personales para fines de
                  reclutamiento y selección.<Asterisco />
                </span>
              </label>
              <MensajeError campo="consentimiento" />
            </div>

            <button type="submit" className="btn-submit" disabled={enviando}>
              {enviando ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  Enviando…
                </>
              ) : (
                <>
                  Enviar postulación <span className="btn-arrow" aria-hidden="true">&rarr;</span>
                </>
              )}
            </button>

            {estadoEnvio === 'error' && (
              <p className="form-status form-status--error" role="alert">
                No pudimos enviar tu postulación. Inténtalo nuevamente en unos minutos.
              </p>
            )}
          </form>
          </>
          )}
        </div>
      </section>

      {/* 3. CIFRAS + TARJETAS DE INFORMACIÓN */}
      <section className="why-section" aria-labelledby="why-title">
        <div className="why-header">
          <span className="section-eyebrow">¿Por qué AquaChile?</span>
          <h2 id="why-title">Crecemos desde el sur, para el mundo</h2>
        </div>

        <dl className="stats-strip">
          {CIFRAS.map((cifra) => (
            <div className="stat" key={cifra.etiqueta}>
              <dt className="stat-label">{cifra.etiqueta}</dt>
              <dd className="stat-value">{cifra.valor}</dd>
            </div>
          ))}
        </dl>
        <p className="stats-source">Fuente: Reporte Integrado AquaChile 2024.</p>
      </section>

      <section className="info-cards-section">
        <div className="card">
          <div className="icon-container">
            <FaLeaf aria-hidden="true" />
          </div>
          <h3>Sustentabilidad</h3>
          <p>
            Comprometidos con minimizar el impacto ambiental y maximizar el bienestar social en cada proceso.
          </p>
        </div>
        <div className="card">
          <div className="icon-container">
            <FaLightbulb aria-hidden="true" />
          </div>
          <h3>Innovación</h3>
          <p>
            Fomentamos el desarrollo de soluciones sostenibles y prácticas responsables en la industria.
          </p>
        </div>
        <div className="card">
          <div className="icon-container">
            <FaMapMarkerAlt aria-hidden="true" />
          </div>
          <h3>Orgullo del Sur</h3>
          <p>
            Empresa nacida en el sur de Chile, con operaciones desde La Araucanía hasta Magallanes.
          </p>
        </div>
      </section>

      {/* 4. FOOTER CORPORATIVO */}
      <footer className="aquachile-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/logo.png" alt="AquaChile" className="footer-logo-img" />
            <p>
              CARDONAL S/N, LOTE B,<br />
              PUERTO MONTT, CHILE<br />
              <a href="tel:+56652433500" className="footer-phone">+(56) 65 2433 500</a>
            </p>
          </div>
          <div className="footer-links">
            {ENLACES_FOOTER.map((enlace) => (
              <a
                key={enlace.texto}
                href={enlace.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {enlace.texto}
              </a>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span>© {new Date().getFullYear()} AquaChile. Todos los derechos reservados.</span>
            <Link to="/login" className="footer-admin-link">Acceso administradores</Link>
          </div>
          <div className="footer-social">
            <span className="footer-social-label">Encuéntranos</span>
            {REDES_SOCIALES.map(({ nombre, url, Icono }) => (
              <a
                key={nombre}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`AquaChile en ${nombre} (se abre en una pestaña nueva)`}
                className="social-link"
              >
                <Icono aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Postulacion;