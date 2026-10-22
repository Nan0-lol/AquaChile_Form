import fs from 'node:fs/promises';

// Debe coincidir con las opciones del <select> del formulario.
export const FAMILIAS_CARGO = [
  'tecnologia',
  'recursos_humanos',
  'ventas',
  'operaciones',
  'finanzas',
];

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Celular chileno: +56 9 1234 5678, 56912345678, 9 1234 5678, etc.
const REGEX_CELULAR = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;
// Caracteres de control (saltos de línea, tabulaciones, etc.)
const REGEX_CONTROL = /[\u0000-\u001F\u007F]/;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * Valida y limpia los campos de texto de la postulación.
 * Devuelve { errores: string[], datos: {...} } con los datos ya normalizados.
 */
export function validarCampos(body = {}) {
  const errores = [];

  const nombreCompleto = texto(body.nombreCompleto);
  const correo = texto(body.correo).toLowerCase();
  const celularCrudo = texto(body.celular);
  const familiaCargo = texto(body.familiaCargo);
  const nombreCargo = texto(body.nombreCargo);

  if (
    nombreCompleto.length < 3 ||
    nombreCompleto.length > 100 ||
    REGEX_CONTROL.test(nombreCompleto)
  ) {
    errores.push('El nombre debe tener entre 3 y 100 caracteres.');
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

  if (!FAMILIAS_CARGO.includes(familiaCargo)) {
    errores.push('La familia de cargo no es válida.');
  }

  if (
    nombreCargo.length < 2 ||
    nombreCargo.length > 100 ||
    REGEX_CONTROL.test(nombreCargo)
  ) {
    errores.push('El nombre del cargo debe tener entre 2 y 100 caracteres.');
  }

  return {
    errores,
    datos: { nombreCompleto, correo, celular, familiaCargo, nombreCargo },
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