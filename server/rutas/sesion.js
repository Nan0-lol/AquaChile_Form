// Rutas de sesión: iniciar, cerrar y consultar quién está conectado.
import { Router } from 'express';
import { permisosDe } from '../modelos/permisos.js';

export function rutasSesion({ auth, limitarLogin }) {
  const router = Router();

  router.post('/login', limitarLogin, (req, res) => {
    const { usuario, password } = req.body || {};
    const sesion = auth.iniciar(usuario, password);
    if (!sesion) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
    }
    res.json({ ok: true, ...sesion });
  });

  router.post('/logout', (req, res) => {
    auth.cerrar(req);
    res.json({ ok: true });
  });

  // El frontend lo usa al recargar la página para saber si la sesión sigue viva
  router.get('/sesion', auth.requerir, (req, res) => {
    res.json({ ok: true, usuario: req.usuario, permisos: permisosDe(req.usuario.rol) });
  });

  return router;
}
