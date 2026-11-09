// Ayudas compartidas por las rutas.
import fs from 'node:fs';
import { ErrorServicio } from '../servicios/errores.js';
import { borrarAdjuntos, rutaDentro } from '../servicios/archivos.js';

/**
 * Envuelve un controlador: si el servicio lanza un ErrorServicio, responde con su
 * código y mensaje; cualquier otro error pasa al manejador general (500).
 */
export const manejar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof ErrorServicio) {
      return res.status(err.estado).json({ ok: false, mensaje: err.message, ...err.extra });
    }
    next(err);
  }
};

/** Borra adjuntos de la carpeta uploads (sin salir nunca de ella). Ignora los que ya no existen. */
export const borrarArchivos = borrarAdjuntos;

/** Descarga un adjunto con su nombre original, o responde 404 si ya no está. */
export function enviarAdjunto(res, carpetaArchivos, archivo, nombre) {
  const ruta = rutaDentro(carpetaArchivos, archivo);
  if (!ruta || !fs.existsSync(ruta)) {
    return res.status(404).json({ ok: false, mensaje: 'El archivo ya no existe en el servidor.' });
  }
  res.download(ruta, nombre || 'archivo');
}
