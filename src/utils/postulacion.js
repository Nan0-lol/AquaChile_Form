// Formulario público /postular (lo llena la misma persona que postula, por eso
// los mensajes le hablan de "tú"). El servidor repite estas reglas en
// server/validaciones.js: aquí solo sirven para avisar al instante.
import { digitosCelular, formatearCelular, MAX_ARCHIVO_BYTES } from './solicitud';

export const MAX_CARTA = 3000;

export const POSTULACION_INICIAL = {
  nombre: '',
  rut: '',
  correo: '',
  telefono: '',
  area: '',
  carta: '', // opcional
};

export const CAMPOS_POSTULACION = Object.keys(POSTULACION_INICIAL);

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- RUT ----------
export const limpiarRut = (rut = '') => String(rut).replace(/[^0-9kK]/g, '').toUpperCase();

/** Revisa el dígito verificador (módulo 11) */
export const rutEsValido = (rut = '') => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 8 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return limpio.slice(-1) === esperado;
};

/** 12345678k -> 12.345.678-K */
export const formatearRut = (rut = '') => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  return `${limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${limpio.slice(-1)}`;
};

/** Devuelve el mensaje de error del campo, o '' si está bien. */
export const validarCampoPostulacion = (campo, valor = '') => {
  const texto = String(valor ?? '').trim();
  switch (campo) {
    case 'nombre':
      return texto.length < 3 || texto.length > 100 ? 'Ingresa tu nombre completo.' : '';
    case 'rut':
      if (!texto) return 'Ingresa tu RUT.';
      return rutEsValido(texto) ? '' : 'RUT inválido. Revisa el dígito verificador.';
    case 'correo':
      if (!texto) return 'Ingresa tu correo.';
      return REGEX_CORREO.test(texto) && texto.length <= 254 ? '' : 'Correo con formato inválido.';
    case 'telefono':
      if (!texto) return 'Ingresa tu teléfono.';
      return /^9\d{8}$/.test(digitosCelular(texto)) ? '' : 'Debe tener 9 dígitos y comenzar con 9.';
    case 'area':
      return texto ? '' : 'Selecciona un área.';
    case 'carta':
      return String(valor).length > MAX_CARTA ? 'La carta puede tener hasta 3.000 caracteres.' : '';
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
  datos.append('rut', formatearRut(valores.rut));
  datos.append('correo', valores.correo.trim());
  datos.append('telefono', `+56${digitosCelular(valores.telefono)}`);
  datos.append('area', valores.area);
  datos.append('carta', valores.carta.trim());
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
      (!texto || [p.nombre, p.correo, p.rut].some((v) => normalizar(v).includes(texto)))
  );
};

/** { nueva: n, en_evaluacion: n, descartada: n } */
export const contarPorEstado = (lista) =>
  lista.reduce(
    (cuenta, p) => ({ ...cuenta, [p.estado]: (cuenta[p.estado] ?? 0) + 1 }),
    { nueva: 0, en_evaluacion: 0, descartada: 0 }
  );
