// Validaciones del formulario de postulación (lado del navegador).
// El servidor repite estas validaciones: esto solo da aviso inmediato al postulante.

export const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB
export const EXTENSIONES_CV = ['.pdf', '.docx'];

export const limpiarRut = (rut = '') => rut.replace(/[^0-9kK]/g, '').toUpperCase();

/** Valida el dígito verificador del RUT con módulo 11. */
export const rutEsValido = (rut = '') => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 8 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
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

/** 12345678k -> 12.345.678-K */
export const formatearRut = (rut = '') => {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
};

export const formatearTamano = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const esWord = (nombre = '') => nombre.toLowerCase().endsWith('.docx');

/** Devuelve un mensaje de error, o '' si el archivo sirve. */
export const validarCv = (archivo) => {
  if (!archivo) return 'Adjunta tu CV en PDF o DOCX.';
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES_CV.some((ext) => nombre.endsWith(ext))) {
    return 'El archivo debe ser PDF o DOCX.';
  }
  if (archivo.size === 0) return 'El archivo está vacío.';
  if (archivo.size > MAX_CV_BYTES) return 'El archivo supera los 5 MB.';
  return '';
};

/** Devuelve un mensaje de error para el campo, o '' si está correcto. */
export const validarCampo = (nombre, valor = '') => {
  switch (nombre) {
    case 'nombre':
      return valor.trim().length < 3 ? 'Ingresa tu nombre completo.' : '';
    case 'rut':
      if (!valor.trim()) return 'Ingresa tu RUT.';
      return rutEsValido(valor) ? '' : 'RUT inválido. Revisa el dígito verificador.';
    case 'correo':
      if (!valor.trim()) return 'Ingresa tu correo.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim()) ? '' : 'Correo con formato inválido.';
    case 'telefono': {
      const digitos = valor.replace(/\D/g, '');
      if (!digitos) return 'Ingresa tu teléfono.';
      return /^9\d{8}$/.test(digitos) ? '' : 'Debe tener 9 dígitos y comenzar con 9.';
    }
    case 'area':
      return valor ? '' : 'Selecciona un área.';
    case 'cargo': {
      const largo = valor.trim().length;
      if (!largo) return 'Indica el cargo al que postulas.';
      return largo < 2 || largo > 100 ? 'El cargo debe tener entre 2 y 100 caracteres.' : '';
    }
    case 'carta':
      return valor.length > 3000 ? 'La carta puede tener hasta 3.000 caracteres.' : '';
    default:
      return '';
  }
};
