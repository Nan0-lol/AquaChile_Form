import fs from 'node:fs/promises';

// Debe coincidir con las opciones del <select> "Área de interés" del formulario.
export const AREAS = {
  planta: 'Plantas de Proceso',
  piscicultura: 'Pisciculturas',
  administracion: 'Administración y Finanzas',
  comercial: 'Área Comercial',
};

// Etapas del proceso que maneja el dashboard.
export const ESTADOS = ['pendiente', 'revision', 'entrevista', 'finalizado'];

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Celular chileno: +56 9 1234 5678, 56912345678, 9 1234 5678, etc.
const REGEX_CELULAR = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;
// Caracteres de control (saltos de línea, tabulaciones, etc.)
const REGEX_CONTROL = /[\u0000-\u001F\u007F]/;
// Igual que el anterior, pero permite saltos de línea (para la carta)
const REGEX_CONTROL_MULTILINEA = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/;

const MAX_CARTA = 3000;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// ---------- RUT ----------
const limpiarRut = (rut) => rut.replace(/[^0-9kK]/g, '').toUpperCase();

/** Valida el dígito verificador con módulo 11. */
export function rutEsValido(rut = '') {
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
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
}

/** 12345678k -> 12.345.678-K (siempre se guarda con este formato). */
export function formatearRut(rut = '') {
  const limpio = limpiarRut(rut);
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

/**
 * Valida y limpia los campos de texto de la postulación.
 * Devuelve { errores: string[], datos: {...} } con los datos ya normalizados.
 */
export function validarCampos(body = {}) {
  const errores = [];

  const nombreCompleto = texto(body.nombreCompleto);
  const rutCrudo = texto(body.rut);
  const correo = texto(body.correo).toLowerCase();
  const celularCrudo = texto(body.celular);
  const area = texto(body.area);
  const nombreCargo = texto(body.nombreCargo);
  const carta = texto(body.carta);
  const consentimiento = texto(body.consentimiento) === 'true';

  if (
    nombreCompleto.length < 3 ||
    nombreCompleto.length > 100 ||
    REGEX_CONTROL.test(nombreCompleto)
  ) {
    errores.push('El nombre debe tener entre 3 y 100 caracteres.');
  }

  let rut = rutCrudo;
  if (rutEsValido(rutCrudo)) {
    rut = formatearRut(rutCrudo);
  } else {
    errores.push('El RUT no es válido.');
  }

  if (correo.length > 254 || !REGEX_CORREO.test(correo)) {
    errores.push('El correo electrónico no es válido.');
  }

  let celular = celularCrudo;
  if (REGEX_CELULAR.test(celularCrudo)) {
    // Se guarda siempre en el mismo formato: +569XXXXXXXX
    celular = `+56${celularCrudo.replace(/\D/g, '').slice(-9)}`;
  } else {
    errores.push('El número de celular no es válido.');
  }

  if (!Object.hasOwn(AREAS, area)) {
    errores.push('El área de interés no es válida.');
  }

  if (
    nombreCargo.length < 2 ||
    nombreCargo.length > 100 ||
    REGEX_CONTROL.test(nombreCargo)
  ) {
    errores.push('El cargo debe tener entre 2 y 100 caracteres.');
  }

  if (carta.length > MAX_CARTA || REGEX_CONTROL_MULTILINEA.test(carta)) {
    errores.push(`La carta de presentación puede tener hasta ${MAX_CARTA} caracteres.`);
  }

  if (!consentimiento) {
    errores.push('Debes aceptar el tratamiento de tus datos personales.');
  }

  return {
    errores,
    datos: { nombreCompleto, rut, correo, celular, area, nombreCargo, carta },
  };
}

/**
 * Revisa el contenido real del archivo (no solo la extensión).
 * Devuelve un mensaje de error, o null si el archivo es válido.
 */
export async function validarArchivo(ruta, extension) {
  const contenido = await fs.readFile(ruta);

  if (contenido.length === 0) {
    return 'El archivo está vacío.';
  }

  if (extension === '.pdf') {
    const esPdf = contenido.subarray(0, 5).toString('latin1') === '%PDF-';
    return esPdf ? null : 'El archivo no es un PDF válido.';
  }

  if (extension === '.docx') {
    // Un DOCX es un ZIP (empieza con "PK\x03\x04") que contiene carpeta word/
    const esZip =
      contenido[0] === 0x50 &&
      contenido[1] === 0x4b &&
      contenido[2] === 0x03 &&
      contenido[3] === 0x04;
    const tieneEstructuraWord =
      contenido.includes('[Content_Types].xml') && contenido.includes('word/');
    return esZip && tieneEstructuraWord ? null : 'El archivo no es un DOCX válido.';
  }

  return 'Formato no válido. Sube un archivo PDF o DOCX.';
}