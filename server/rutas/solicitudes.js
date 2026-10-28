// Rutas de solicitudes de evaluación: crear (con CV), consultar, editar,
// avanzar de etapa, registrar la evaluación, descargar adjuntos y eliminar.
import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { permitir } from '../seguridad.js';
import { validarArchivo } from '../validaciones.js';
import { manejar, borrarArchivos } from './utilidades.js';
import {
  listarSolicitudes,
  obtenerSolicitud,
  crearSolicitud,
  actualizarSolicitud,
  cambiarEtapa,
  guardarEvaluacion,
  eliminarSolicitud,
  archivoDeSolicitud,
} from '../servicios/solicitudes.js';
import { postulacionParaEvaluar } from '../servicios/postulaciones.js';
import { ErrorServicio } from '../servicios/errores.js';

export function rutasSolicitudes({ repo, auth, correo, subida, carpetaArchivos, limitarEnvios }) {
  const router = Router();
  router.use(auth.requerir);

  const correoDe = (usuarioId) => (usuarioId ? repo.usuarios.obtener(usuarioId)?.correo : null);

  router.get('/', permitir('solicitud:ver'), manejar((req, res) => {
    res.json(listarSolicitudes(repo, req.query));
  }));

  router.get('/:id', permitir('solicitud:ver'), manejar((req, res) => {
    res.json(obtenerSolicitud(repo, req.params.id));
  }));

  /**
   * Si la solicitud viene de una postulación y el analista no subió otro CV,
   * se usa una COPIA del CV de la postulación (así borrar una no borra la otra).
   */
  const copiarCvDePostulacion = async (postulacionId) => {
    const fila = postulacionParaEvaluar(repo, postulacionId);
    const origen = path.join(carpetaArchivos, path.basename(fila.cv_archivo));
    const filename = `${crypto.randomUUID()}${path.extname(fila.cv_archivo).toLowerCase()}`;
    try {
      await fs.promises.copyFile(origen, path.join(carpetaArchivos, filename));
    } catch {
      throw new ErrorServicio(404, 'El CV de la postulación ya no existe en el servidor. Adjunta uno nuevo.', {
        errores: { cv: 'Adjunta el CV del candidato (PDF o DOCX).' },
      });
    }
    return { filename, originalname: fila.cv_nombre_original, size: fila.cv_bytes, copiado: true };
  };

  // Formulario del analista: datos + CV (obligatorio) + descriptor del cargo (opcional)
  router.post(
    '/',
    permitir('solicitud:crear'),
    limitarEnvios,
    subida.fields([
      { name: 'cv', maxCount: 1 },
      { name: 'descriptor', maxCount: 1 },
    ]),
    manejar(async (req, res) => {
      let cv = req.files?.cv?.[0] ?? null;
      const descriptor = req.files?.descriptor?.[0] ?? null;
      const subidos = [cv, descriptor].filter(Boolean);
      const postulacionId = typeof req.body?.postulacionId === 'string' ? req.body.postulacionId.trim() : '';

      try {
        // El contenido real de cada archivo debe coincidir con su formato
        const errores = {};
        for (const [campo, archivo] of [['cv', cv], ['descriptor', descriptor]]) {
          if (!archivo) continue;
          const error = await validarArchivo(archivo.path, path.extname(archivo.filename).toLowerCase());
          if (error) errores[campo] = error;
        }
        if (Object.keys(errores).length) {
          await borrarArchivos(carpetaArchivos, subidos.map((a) => a.filename));
          return res.status(400).json({ ok: false, mensaje: 'Revisa los archivos adjuntos.', errores });
        }
        if (!cv && postulacionId) {
          cv = await copiarCvDePostulacion(postulacionId);
          subidos.push(cv);
        }

        const solicitud = crearSolicitud(repo, req.usuario, req.body || {}, { cv, descriptor });
        res.status(201).json(solicitud);

        // Aviso al evaluador asignado (después de responder; si falla, la solicitud ya está guardada)
        if (solicitud.evaluador) correo.avisarNuevaSolicitud(solicitud, correoDe(solicitud.evaluador.id));
      } catch (err) {
        // Si la solicitud no se guardó, no deja archivos huérfanos
        await borrarArchivos(carpetaArchivos, subidos.map((a) => a.filename));
        throw err;
      }
    })
  );

  router.put('/:id', permitir('solicitud:editar'), manejar((req, res) => {
    const antes = obtenerSolicitud(repo, req.params.id);
    const solicitud = actualizarSolicitud(repo, req.usuario, req.params.id, req.body || {});
    res.json(solicitud);
    // Si cambió el responsable, se le avisa
    if (solicitud.evaluador && solicitud.evaluador.id !== antes.evaluador?.id) {
      correo.avisarNuevaSolicitud(solicitud, correoDe(solicitud.evaluador.id));
    }
  }));

  router.patch('/:id/etapa', permitir('solicitud:etapa'), manejar((req, res) => {
    const { solicitud, informeEnviado } = cambiarEtapa(repo, req.usuario, req.params.id, req.body?.etapa);
    res.json(solicitud);
    if (informeEnviado) correo.avisarInformeEnviado(solicitud, correoDe(solicitud.analista.id));
  }));

  router.put('/:id/evaluacion', permitir('evaluacion:editar'), manejar((req, res) => {
    res.json(guardarEvaluacion(repo, req.usuario, req.params.id, req.body || {}));
  }));

  // Descargas protegidas: solo con sesión iniciada
  for (const tipo of ['cv', 'descriptor']) {
    router.get(`/:id/${tipo}`, permitir('solicitud:ver'), manejar((req, res) => {
      const { archivo, nombre } = archivoDeSolicitud(repo, req.params.id, tipo);
      // basename: aunque alguien manipulara la base, nunca se sale de la carpeta de adjuntos
      const ruta = path.join(carpetaArchivos, path.basename(archivo));
      if (!fs.existsSync(ruta)) {
        return res.status(404).json({ ok: false, mensaje: 'El archivo ya no existe en el servidor.' });
      }
      res.download(ruta, nombre || path.basename(archivo));
    }));
  }

  router.delete('/:id', permitir('solicitud:eliminar'), manejar(async (req, res) => {
    const { archivos } = eliminarSolicitud(repo, req.params.id);
    await borrarArchivos(carpetaArchivos, archivos);
    console.log(`Solicitud ${req.params.id} eliminada por ${req.usuario.nombre}.`);
    res.json({ ok: true });
  }));

  return router;
}
