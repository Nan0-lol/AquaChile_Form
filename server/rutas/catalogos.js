// Catálogos (familias de cargo, unidades, etapas…), usuarios para las listas
// desplegables e indicadores del dashboard.
import { Router } from 'express';
import { catalogos, esClave, ROLES } from '../modelos/catalogos.js';
import { permitir } from '../seguridad.js';
import { calcularIndicadores } from '../servicios/indicadores.js';

export function rutasCatalogos({ repo, auth }) {
  const router = Router();
  router.use(auth.requerir);

  router.get('/catalogos', (_req, res) => {
    res.json(catalogos());
  });

  // ?rol=evaluador → para elegir al profesional responsable
  router.get('/usuarios', (req, res) => {
    const rol = esClave(ROLES, req.query.rol) ? req.query.rol : undefined;
    res.json(repo.usuarios.listar({ rol }));
  });

  router.get('/indicadores', permitir('indicadores:ver'), (_req, res) => {
    res.json(calcularIndicadores(repo));
  });

  return router;
}
