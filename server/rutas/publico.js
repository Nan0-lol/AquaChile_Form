// Rutas PÚBLICAS (sin iniciar sesión). Es lo único del sistema que ve un postulante:
//   GET  /api/publico/opciones       → áreas de interés para el formulario
//   POST /api/publico/postulaciones  → enviar la postulación con el CV
// Solo reciben datos: nunca devuelven información de otras personas ni del proceso.
import { Router } from 'express';
import path from 'node:path';
import { opcionesPublicas } from '../modelos/catalogos.js';
import { validarArchivo } from '../validaciones.js';
import { recibirPostulacion } from '../servicios/postulaciones.js';
import { manejar, borrarArchivos } from './utilidades.js';

export const MENSAJE_RECIBIDA = 'Recibimos tu postulación. Si tu perfil calza con la vacante, te contactaremos por correo.';

export function rutasPublicas({ repo, subida, carpetaArchivos, limitarPostulaciones }) {
  const router = Router();

  router.get('/opciones', (_req, res) => {
    res.json(opcionesPublicas());
  });

  router.post(
    '/postulaciones',
    limitarPostulaciones,
    subida.single('cv'),
    manejar(async (req, res) => {
      const cv = req.file ?? null;
      const borrarCv = () => borrarArchivos(carpetaArchivos, cv ? [cv.filename] : []);
      try {
        if (cv) {
          // Solo PDF, y el contenido real debe serlo (no basta con la extensión)
          const extension = path.extname(cv.filename).toLowerCase();
          const error =
            extension === '.pdf' ? await validarArchivo(cv.path, extension) : 'El CV debe estar en formato PDF.';
          if (error) {
            await borrarCv();
            return res.status(400).json({ ok: false, mensaje: 'Revisa el archivo adjunto.', errores: { cv: error } });
          }
        }
        const { ignorada } = recibirPostulacion(repo, req.body || {}, cv);
        if (ignorada) await borrarCv(); // bot: se borra, pero se responde igual
        res.status(201).json({ ok: true, mensaje: MENSAJE_RECIBIDA });
      } catch (err) {
        await borrarCv(); // si no se guardó, no deja archivos huérfanos
        throw err;
      }
    })
  );

  return router;
}
