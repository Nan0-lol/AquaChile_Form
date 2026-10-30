// Formulario público /postular (lo llena la misma persona que postula, por eso
// los mensajes le hablan de "tú"). El servidor repite estas reglas en
// server/validaciones.js: aquí solo sirven para avisar al instante.
import { digitosCelular, formatearCelular, MAX_ARCHIVO_BYTES } from './solicitud';

export const POSTULACION_INICIAL = {
  nombre: '',
  correo: '',
  telefono: '',
  area: '',
};

export const CAMPOS_POSTULACION = Object.keys(POSTULACION_INICIAL);

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Devuelve el mensaje de error del campo, o '' si está bien. */
export const validarCampoPostulacion = (campo, valor = '') => {
  const texto = String(valor ?? '').trim();
  switch (campo) {
    case 'nombre':
      return texto.length < 3 || texto.length > 100 ? 'Ingresa tu nombre completo.' : '';
    case 'correo':
      if (!texto) return 'Ingresa tu correo.';
      return REGEX_CORREO.test(texto) && texto.length <= 254 ? '' : 'Correo con formato inválido.';
    case 'telefono':
      if (!texto) return 'Ingresa tu teléfono.';
      return /^9\d{8}$/.test(digitosCelular(texto)) ? '' : 'Debe tener 9 dígitos y comenzar con 9.';
    case 'area':
      return texto ? '' : 'Selecciona un área.';
    default:
      return '';
  }
};

/** El CV va solo en PDF (como en el formulario original) */
export const validarCvPdf = (archivo) => {
  if (!archivo) return 'Adjunta tu CV en PDF.';
  if (!archivo.name.toLowerCase().endsWith('.pdf')) return 'El archivo debe ser PDF.';
  if (archivo.size === 0) return 'El archivo está vacío.';
  if (archivo.size > MAX_ARCHIVO_BYTES) return 'El archivo supera los 5 MB.';
  return '';
};

/** Revisa todo el formulario: { campo: mensaje } solo con los que tienen error */
export const validarPostulacionCompleta = (valores, { cv = null, consentimiento = false } = {}) => {
  const errores = {};
  for (const campo of CAMPOS_POSTULACION) {
    const error = validarCampoPostulacion(campo, valores[campo]);
    if (error) errores[campo] = error;
  }
  const errorCv = validarCvPdf(cv);
  if (errorCv) errores.cv = errorCv;
  if (!consentimiento) errores.consentimiento = 'Debes aceptar el tratamiento de tus datos para postular.';
  return errores;
};

/** FormData con los nombres que espera POST /api/publico/postulaciones */
export const construirFormDataPostulacion = (valores, { cv, trampa = '' }) => {
  const datos = new FormData();
  datos.append('nombre', valores.nombre.trim());
  datos.append('correo', valores.correo.trim());
  datos.append('telefono', `+56${digitosCelular(valores.telefono)}`);
  datos.append('area', valores.area);
  datos.append('consentimiento', 'true');
  datos.append('sitioWeb', trampa); // campo trampa: una persona nunca lo ve ni lo llena
  datos.append('cv', cv); // el archivo va al final
  return datos;
};

/**
 * Datos con que se prellena "Nueva solicitud" cuando el analista pasa una
 * postulación a evaluación (el resto lo completa el analista).
 */
export const valoresDesdePostulacion = (p) => ({
  nombre: p.nombre,
  correo: p.correo,
  telefono: formatearCelular(p.telefono),
});

/** Filtra la bandeja por estado y texto (sin tildes ni mayúsculas) */
export const filtrarPostulaciones = (lista, { estado = '', q = '' } = {}) => {
  const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const texto = normalizar(q.trim());
  return lista.filter(
    (p) =>
      (!estado || p.estado === estado) &&
      (!texto || [p.nombre, p.correo].some((v) => normalizar(v).includes(texto)))
  );
};

/** { nueva: n, en_evaluacion: n, descartada: n } */
export const contarPorEstado = (lista) =>
  lista.reduce(
    (cuenta, p) => ({ ...cuenta, [p.estado]: (cuenta[p.estado] ?? 0) + 1 }),
    { nueva: 0, en_evaluacion: 0, descartada: 0 }
  );
