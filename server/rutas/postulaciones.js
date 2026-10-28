// Bandeja de postulaciones (solo con sesión): el analista revisa lo que llegó
// por el formulario público, descarga el CV, la descarta o la pasa a evaluación.
import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { permitir } from '../seguridad.js';
import { manejar, borrarArchivos } from './utilidades.js';
import {
  listarPostulaciones,
  obtenerPostulacion,
  cambiarEstadoPostulacion,
  archivoDePostulacion,
  eliminarPostulacion,
} from '../servicios/postulaciones.js';

export function rutasPostulaciones({ repo, auth, carpetaArchivos }) {
  const router = Router();
  router.use(auth.requerir);

  router.get('/', permitir('postulacion:ver'), manejar((req, res) => {
    res.json(listarPostulaciones(repo, req.query));
  }));

  router.get('/:id', permitir('postulacion:ver'), manejar((req, res) => {
    res.json(obtenerPostulacion(repo, req.params.id));
  }));

  router.get('/:id/cv', permitir('postulacion:ver'), manejar((req, res) => {
    const { archivo, nombre } = archivoDePostulacion(repo, req.params.id);
    const ruta = path.join(carpetaArchivos, path.basename(archivo));
    if (!fs.existsSync(ruta)) {
      return res.status(404).json({ ok: false, mensaje: 'El archivo ya no existe en el servidor.' });
    }
    res.download(ruta, nombre || path.basename(archivo));
  }));

  // { estado: 'descartada' } o { estado: 'nueva' } (reabrir)
  router.patch('/:id/estado', permitir('postulacion:gestionar'), manejar((req, res) => {
    res.json(cambiarEstadoPostulacion(repo, req.usuario, req.params.id, req.body?.estado));
  }));

  router.delete('/:id', permitir('postulacion:eliminar'), manejar(async (req, res) => {
    const { archivos } = eliminarPostulacion(repo, req.params.id);
    await borrarArchivos(carpetaArchivos, archivos);
    console.log(`Postulación ${req.params.id} eliminada por ${req.usuario.nombre}.`);
    res.json({ ok: true });
  }));

  return router;
}
