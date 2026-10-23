// Rutas de candidatos: listado, detalle, registro, edición y borrado.
import { Router } from 'express';
import { permitir } from '../seguridad.js';
import { manejar, borrarArchivos } from './utilidades.js';
import {
  listarCandidatos,
  obtenerCandidato,
  crearCandidato,
  actualizarCandidato,
  eliminarCandidato,
} from '../servicios/candidatos.js';

export function rutasCandidatos({ repo, auth, carpetaArchivos }) {
  const router = Router();
  router.use(auth.requerir);

  router.get('/', permitir('candidato:ver'), manejar((req, res) => {
    res.json(listarCandidatos(repo, { q: req.query.q }));
  }));

  router.get('/:id', permitir('candidato:ver'), manejar((req, res) => {
    res.json(obtenerCandidato(repo, req.params.id));
  }));

  router.post('/', permitir('candidato:crear'), manejar((req, res) => {
    res.status(201).json(crearCandidato(repo, req.body || {}));
  }));

  router.put('/:id', permitir('candidato:editar'), manejar((req, res) => {
    res.json(actualizarCandidato(repo, req.params.id, req.body || {}));
  }));

  // Borrado permanente: datos, solicitudes, evaluaciones y archivos del candidato
  router.delete('/:id', permitir('candidato:eliminar'), manejar(async (req, res) => {
    const { archivos } = eliminarCandidato(repo, req.params.id);
    await borrarArchivos(carpetaArchivos, archivos);
    console.log(`Candidato ${req.params.id} eliminado por ${req.usuario.nombre}.`);
    res.json({ ok: true });
  }));

  return router;
}
