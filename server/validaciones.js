// =====================================================================
// VALIDACIONES DEL SERVIDOR
// Cada función devuelve { errores, datos }:
//   - errores: { campo: 'mensaje' } (vacío si todo está bien)
//   - datos:   los valores ya limpios y normalizados, listos para guardar
// El navegador valida lo mismo, pero aquí es donde de verdad se protege.
// =====================================================================
import fs from 'node:fs/promises';
import { FAMILIAS_CARGO, UNIDADES, ORIGENES, RESULTADOS, esClave } from './modelos/catalogos.js';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Celular chileno: +56 9 1234 5678, 56912345678, 9 1234 5678, etc.
const REGEX_CELULAR = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;
// Caracteres de control (saltos de línea, tabulaciones, etc.)
const REGEX_CONTROL = /[\u0000-\u001F\u007F]/;
// Igual, pero permite saltos de línea (para textos largos)
const REGEX_CONTROL_MULTILINEA = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/;
// Centro de costo: letras y números (ej. CC-1050)
const REGEX_CECO = /^[A-Z0-9-]{1,20}$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const LIMITES = {
  aspectosIndagar: 2000,
  observaciones: 5000,
};

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const presente = (body, campo) => Object.hasOwn(body, campo);

/** Convierte 'true', 'sí', '1', true… en booleano (lo que llega de un formulario) */
export const aBooleano = (valor) =>
  valor === true || ['true', '1', 'si', 'sí', 'on'].includes(String(valor ?? '').trim().toLowerCase());

const fechaValida = (valor, conHora = false) => {
  const regex = conHora ? REGEX_FECHA_HORA : REGEX_FECHA;
  if (!regex.test(valor)) return false;
  const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  // Rechaza fechas imposibles como 2026-02-31
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
};

const textoCorto = (valor, min, max) =>
  valor.length >= min && valor.length <= max && !REGEX_CONTROL.test(valor);

// ---------------------------------------------------------------------
// CANDIDATO
// ---------------------------------------------------------------------
/**
 * @param {object} body
 * @param {{ parcial?: boolean }} opciones parcial = solo valida los campos que vienen (para editar)
 */
export function validarCandidato(body = {}, { parcial = false } = {}) {
  const errores = {};
  const datos = {};
  const revisar = (campo) => !parcial || presente(body, campo);

  if (revisar('nombre')) {
    const nombre = texto(body.nombre);
    if (!textoCorto(nombre, 3, 100)) errores.nombre = 'El nombre debe tener entre 3 y 100 caracteres.';
    datos.nombre = nombre;
  }

  if (revisar('correo')) {
    const correo = texto(body.correo).toLowerCase();
    if (correo.length > 254 || !REGEX_CORREO.test(correo)) {
      errores.correo = 'El correo electrónico no es válido.';
    }
    datos.correo = correo;
  }

  if (revisar('telefono')) {
    const crudo = texto(body.telefono);
    if (REGEX_CELULAR.test(crudo)) {
      // Siempre se guarda igual: +569XXXXXXXX
      datos.telefono = `+56${crudo.replace(/\D/g, '').slice(-9)}`;
    } else {
      errores.telefono = 'Ingresa un celular chileno de 9 dígitos que empiece con 9.';
      datos.telefono = crudo;
    }
  }

  if (revisar('origen')) {
    const origen = texto(body.origen);
    if (!esClave(ORIGENES, origen)) errores.origen = 'Indica si el candidato es interno o externo.';
    datos.origen = origen;
  }

  return { errores, datos };
}

// ---------------------------------------------------------------------
// SOLICITUD DE EVALUACIÓN
// ---------------------------------------------------------------------
export function validarSolicitud(body = {}, { parcial = false } = {}) {
  const errores = {};
  const datos = {};
  const revisar = (campo) => !parcial || presente(body, campo);

  if (revisar('familiaCargo')) {
    const familia = texto(body.familiaCargo);
    if (!esClave(FAMILIAS_CARGO, familia)) errores.familiaCargo = 'Selecciona una familia de cargo.';
    datos.familiaCargo = familia;
  }

  if (revisar('nombreCargo')) {
    const cargo = texto(body.nombreCargo);
    if (!textoCorto(cargo, 2, 100)) errores.nombreCargo = 'El cargo debe tener entre 2 y 100 caracteres.';
    datos.nombreCargo = cargo;
  }

  if (revisar('ubicacion')) {
    const ubicacion = texto(body.ubicacion);
    if (!textoCorto(ubicacion, 2, 100)) errores.ubicacion = 'Indica la ubicación del cargo.';
    datos.ubicacion = ubicacion;
  }

  if (revisar('unidad')) {
    const unidad = texto(body.unidad);
    if (!esClave(UNIDADES, unidad)) errores.unidad = 'Selecciona una unidad.';
    datos.unidad = unidad;
  }

  if (revisar('ceco')) {
    const ceco = texto(body.ceco).toUpperCase();
    if (ceco && !REGEX_CECO.test(ceco)) {
      errores.ceco = 'El centro de costo solo puede tener letras y números (máx. 20).';
    }
    datos.ceco = ceco;
  }

  if (revisar('requiereReferencias')) datos.requiereReferencias = aBooleano(body.requiereReferencias);
  if (revisar('referido')) datos.referido = aBooleano(body.referido);

  if (revisar('aspectosIndagar')) {
    const aspectos = texto(body.aspectosIndagar);
    if (aspectos.length > LIMITES.aspectosIndagar || REGEX_CONTROL_MULTILINEA.test(aspectos)) {
      errores.aspectosIndagar = `Puede tener hasta ${LIMITES.aspectosIndagar} caracteres.`;
    }
    datos.aspectosIndagar = aspectos;
  }

  if (revisar('evaluadorId')) {
    // Opcional: puede quedar sin asignar. Que exista y sea evaluador lo revisa el servicio.
    const evaluadorId = texto(body.evaluadorId);
    datos.evaluadorId = evaluadorId || null;
  }

  return { errores, datos };
}

// ---------------------------------------------------------------------
// EVALUACIÓN (siempre parcial: la evaluadora la completa por partes)
// ---------------------------------------------------------------------
export function validarEvaluacion(body = {}) {
  const errores = {};
  const datos = {};

  if (presente(body, 'fechaEntrevista')) {
    const fecha = texto(body.fechaEntrevista);
    if (fecha && !fechaValida(fecha, true)) {
      errores.fechaEntrevista = 'Indica una fecha y hora válidas.';
    }
    datos.fechaEntrevista = fecha || null;
  }

  if (presente(body, 'observaciones')) {
    const obs = texto(body.observaciones);
    if (obs.length > LIMITES.observaciones || REGEX_CONTROL_MULTILINEA.test(obs)) {
      errores.observaciones = `Las observaciones pueden tener hasta ${LIMITES.observaciones} caracteres.`;
    }
    datos.observaciones = obs;
  }

  if (presente(body, 'resultado')) {
    const resultado = texto(body.resultado);
    if (resultado && !esClave(RESULTADOS, resultado)) errores.resultado = 'Selecciona un resultado válido.';
    datos.resultado = resultado || null;
  }

  if (presente(body, 'fechaInforme')) {
    const fecha = texto(body.fechaInforme);
    if (fecha && !fechaValida(fecha)) errores.fechaInforme = 'Indica una fecha válida.';
    datos.fechaInforme = fecha || null;
  }

  return { errores, datos };
}

export const hayErrores = (errores) => Object.keys(errores).length > 0;

// ---------------------------------------------------------------------
// ARCHIVOS: revisa el contenido real, no solo la extensión
// ---------------------------------------------------------------------
/** Devuelve un mensaje de error, o null si el archivo es válido. */
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
    // Un DOCX es un ZIP (empieza con "PK\x03\x04") que contiene la carpeta word/
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
