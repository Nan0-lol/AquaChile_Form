// =====================================================================
// APLICACIÓN EXPRESS
// Arma la API uniendo seguridad, subida de archivos y rutas.
// Se separa de server.js para poder crearla en las pruebas sin abrir un puerto.
// =====================================================================
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { cabecerasSeguridad, crearLimitador } from './seguridad.js';
import { rutasSesion } from './rutas/sesion.js';
import { rutasCatalogos } from './rutas/catalogos.js';
import { rutasCandidatos } from './rutas/candidatos.js';
import { rutasSolicitudes } from './rutas/solicitudes.js';
import { rutasPostulaciones } from './rutas/postulaciones.js';
import { rutasPublicas } from './rutas/publico.js';

export const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB por archivo
const EXTENSIONES_VALIDAS = ['.pdf', '.docx'];

/**
 * @param {object} opciones
 * @param {object} opciones.repo             repositorio de db.js
 * @param {object} opciones.auth             autenticador de seguridad.js
 * @param {object} opciones.correo           servicio de correo.js
 * @param {string} opciones.carpetaArchivos  dónde se guardan los CV y descriptores
 * @param {string} [opciones.origenPermitido] dirección del frontend (CORS)
 * @param {boolean} [opciones.produccion]
 * @param {object} [opciones.limites]        { login, envios, postulaciones } máximo por IP cada 15 min
 */
export function crearApp({
  repo,
  auth,
  correo,
  carpetaArchivos,
  origenPermitido = 'http://localhost:5173',
  produccion = false,
  limites = {},
}) {
  fs.mkdirSync(carpetaArchivos, { recursive: true });

  // --- Subida de archivos: el nombre lo genera el servidor (nunca el del usuario) ---
  const subida = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, carpetaArchivos),
      filename: (_req, file, cb) => {
        cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: {
      fileSize: TAMANO_MAXIMO,
      files: 2,
      fields: 30,
      fieldSize: 10 * 1024, // 10 KB por campo de texto
      fieldNameSize: 100,
      parts: 40,
    },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!EXTENSIONES_VALIDAS.includes(ext)) return cb(new Error('FORMATO_INVALIDO'));
      cb(null, true);
    },
  });

  const ventanaMs = 15 * 60 * 1000;
  // Frena a quien intente adivinar contraseñas
  const limitarLogin = crearLimitador({
    ventanaMs,
    maximo: limites.login ?? 10,
    mensaje: 'Demasiados intentos de inicio de sesión. Espera unos minutos.',
  });
  // Frena envíos masivos de solicitudes (por ejemplo, un script)
  const limitarEnvios = crearLimitador({ ventanaMs, maximo: limites.envios ?? 60 });
  // El formulario público es lo más expuesto: pocas postulaciones por IP
  const limitarPostulaciones = crearLimitador({
    ventanaMs,
    maximo: limites.postulaciones ?? 10,
    mensaje: 'Recibimos varias postulaciones seguidas desde tu conexión. Inténtalo de nuevo en unos minutos.',
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(cabecerasSeguridad({ produccion }));
  app.use(
    cors({
      origin: origenPermitido,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Disposition'],
    })
  );
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Lo único público: el formulario de postulación (solo envía datos)
  app.use('/api/publico', rutasPublicas({ repo, subida, carpetaArchivos, limitarPostulaciones }));

  // Todo lo demás exige sesión iniciada
  app.use('/api', rutasSesion({ auth, limitarLogin }));
  app.use('/api', rutasCatalogos({ repo, auth }));
  app.use('/api/candidatos', rutasCandidatos({ repo, auth, carpetaArchivos }));
  app.use('/api/postulaciones', rutasPostulaciones({ repo, auth, carpetaArchivos }));
  app.use(
    '/api/solicitudes',
    rutasSolicitudes({ repo, auth, correo, subida, carpetaArchivos, limitarEnvios })
  );

  // Ruta inexistente
  app.use('/api', (_req, res) => res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada.' }));

  // --- Manejo de errores (multer, JSON mal formado y otros) ---
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, mensaje: 'Cada archivo puede pesar hasta 5 MB.' });
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ ok: false, mensaje: 'Solicitud no válida.' });
    }
    if (err.message === 'FORMATO_INVALIDO') {
      return res.status(400).json({ ok: false, mensaje: 'Formato no válido. Sube un archivo PDF o DOCX.' });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ ok: false, mensaje: 'Los datos enviados no son válidos.' });
    }
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
  });

  app.detener = () => {
    limitarLogin.detener();
    limitarEnvios.detener();
    limitarPostulaciones.detener();
  };
  return app;
}
