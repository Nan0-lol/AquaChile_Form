// Ayudas compartidas por las rutas.
import fs from 'node:fs';
import path from 'node:path';
import { ErrorServicio } from '../servicios/errores.js';

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

/** Borra archivos de la carpeta de adjuntos (sin salir nunca de ella). Ignora los que ya no existen. */
export const borrarArchivos = (carpeta, nombres = []) =>
  Promise.all(
    nombres
      .filter(Boolean)
      .map((nombre) => fs.promises.unlink(path.join(carpeta, path.basename(nombre))).catch(() => {}))
  );
