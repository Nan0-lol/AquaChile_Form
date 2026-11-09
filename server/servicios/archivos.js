// =====================================================================
// ARCHIVOS ADJUNTOS: una carpeta por persona
//
//   uploads/
//     Valentina-Rios-Carrasco-3f2a1b/
//       CV-postulacion.pdf        ← el que subió en el formulario público
//       CV.pdf                    ← el de su solicitud de evaluación
//       Descriptor-del-cargo.pdf
//
// - El nombre de la carpeta es el nombre de la persona (sin tildes ni símbolos,
//   para que funcione en Windows) + un código corto sacado de su correo.
//   Así la postulación y la solicitud de la misma persona caen en la MISMA
//   carpeta, y dos personas que se llaman igual no se mezclan.
// - En la base se guarda la ruta relativa: "Valentina-Rios-Carrasco-3f2a1b/CV.pdf".
// - Nunca se usa el nombre que trae el archivo del usuario, y toda ruta se
//   revisa para que no pueda salir de la carpeta uploads.
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** "José Ñúñez O'Higgins" → "Jose-Nunez-OHiggins" */
export const limpiarNombre = (texto = '') =>
  String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^A-Za-z0-9\s-]/g, '') // quita símbolos
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 60) || 'Sin-nombre';

/** Nombre de la carpeta de una persona */
export function carpetaDePersona(nombre, correo) {
  const clave = String(correo || '').trim().toLowerCase();
  const codigo = clave
    ? crypto.createHash('sha256').update(clave).digest('hex').slice(0, 6)
    : crypto.randomBytes(3).toString('hex');
  return `${limpiarNombre(nombre)}-${codigo}`;
}

/**
 * Ruta absoluta de un adjunto guardado en la base, o null si intenta salir de
 * la carpeta de adjuntos. Sirve también para los archivos antiguos (sin carpeta).
 */
export function rutaDentro(carpetaBase, relativo) {
  if (!relativo || typeof relativo !== 'string') return null;
  const base = path.resolve(carpetaBase);
  const ruta = path.resolve(base, relativo);
  return ruta.startsWith(base + path.sep) ? ruta : null;
}

/** Primer nombre libre: CV.pdf, CV-2.pdf, CV-3.pdf… */
const nombreLibre = (carpeta, base, extension) => {
  for (let n = 1; ; n++) {
    const nombre = n === 1 ? `${base}${extension}` : `${base}-${n}${extension}`;
    if (!fs.existsSync(path.join(carpeta, nombre))) return nombre;
  }
};

/**
 * Mueve (o copia) un archivo a la carpeta de la persona.
 * @param {string} carpetaBase  la carpeta uploads
 * @param {string} origen       ruta absoluta del archivo a guardar
 * @param {{nombre: string, correo?: string, tipo: string, copiar?: boolean}} opciones
 *        tipo: nombre del archivo final sin extensión ('CV', 'CV-postulacion', 'Descriptor-del-cargo')
 * @returns {Promise<string>} ruta relativa para guardar en la base
 */
export async function guardarEnCarpetaDePersona(carpetaBase, origen, { nombre, correo, tipo, copiar = false }) {
  const carpeta = carpetaDePersona(nombre, correo);
  const destinoCarpeta = path.join(carpetaBase, carpeta);
  await fs.promises.mkdir(destinoCarpeta, { recursive: true });
  const archivo = nombreLibre(destinoCarpeta, tipo, path.extname(origen).toLowerCase());
  const destino = path.join(destinoCarpeta, archivo);
  if (copiar) await fs.promises.copyFile(origen, destino);
  else await fs.promises.rename(origen, destino);
  return `${carpeta}/${archivo}`;
}

/** Borra adjuntos (y la carpeta de la persona si queda vacía). Ignora los que ya no existen. */
export const borrarAdjuntos = (carpetaBase, relativos = []) =>
  Promise.all(
    relativos.filter(Boolean).map(async (relativo) => {
      const ruta = rutaDentro(carpetaBase, relativo);
      if (!ruta) return;
      await fs.promises.unlink(ruta).catch(() => {});
      const carpeta = path.dirname(ruta);
      if (carpeta !== path.resolve(carpetaBase)) {
        // rmdir solo funciona si está vacía: si quedan otros archivos, no hace nada
        await fs.promises.rmdir(carpeta).catch(() => {});
      }
    })
  );
