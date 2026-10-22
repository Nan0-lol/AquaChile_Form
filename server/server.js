import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validarCampos, validarArchivo, ESTADOS } from './validaciones.js';
import { crearRepositorio } from './db.js';
import { crearServicioCorreo } from './correo.js';
import { crearLimitador, cabecerasSeguridad, esBot, crearAutenticador } from './seguridad.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const ORIGEN_PERMITIDO = process.env.ORIGEN_PERMITIDO || 'http://localhost:5173';
const CARPETA_CV = path.join(__dirname, 'uploads');
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB
const EXTENSIONES_VALIDAS = ['.pdf', '.docx'];
const PRODUCCION = process.env.NODE_ENV === 'production';

// Máximo de envíos por IP en la ventana de tiempo (se puede ajustar con variables de entorno).
const LIMITE_ENVIOS = Number(process.env.LIMITE_ENVIOS) || 5;
const VENTANA_MINUTOS = Number(process.env.VENTANA_MINUTOS) || 15;

// --- Credenciales del panel de administración ---
// Defínelas en server/.env (ese archivo NO se sube a GitHub):
//   ADMIN_USUARIO=reclutamiento
//   ADMIN_PASSWORD=una-clave-larga-y-segura
let ADMIN_USUARIO = process.env.ADMIN_USUARIO;
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_USUARIO || !ADMIN_PASSWORD) {
  if (PRODUCCION) {
    console.error('Faltan ADMIN_USUARIO y ADMIN_PASSWORD. El servidor no arranca sin ellas en producción.');
    process.exit(1);
  }
  ADMIN_USUARIO = 'admin';
  ADMIN_PASSWORD = 'admin123';
  console.warn('Aviso: usando credenciales de desarrollo (admin / admin123). Defínelas en server/.env.');
}

fs.mkdirSync(CARPETA_CV, { recursive: true });

const repo = crearRepositorio();
const correo = crearServicioCorreo();

// --- Subida de archivos ---
// El nombre lo genera el servidor (nunca se usa el que manda el usuario).
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CARPETA_CV),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: TAMANO_MAXIMO,
    files: 1,
    fields: 12, // cantidad de campos de texto
    fieldSize: 10 * 1024, // 10 KB por campo
    fieldNameSize: 100,
    parts: 15,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXTENSIONES_VALIDAS.includes(ext)) {
      return cb(new Error('FORMATO_INVALIDO'));
    }
    cb(null, true);
  },
});

const borrarArchivo = (archivo) =>
  archivo ? fs.promises.unlink(archivo.path).catch(() => {}) : Promise.resolve();

// El nombre original solo se guarda para mostrarlo; nunca se usa como ruta.
const limpiarNombreOriginal = (nombre = '') =>
  path
    .basename(nombre)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, 255) || 'cv';

const limitarEnvios = crearLimitador({
  ventanaMs: VENTANA_MINUTOS * 60 * 1000,
  maximo: LIMITE_ENVIOS,
});

// Frena a quien intente adivinar la contraseña: 10 intentos cada 15 minutos por IP
const limitarLogin = crearLimitador({
  ventanaMs: 15 * 60 * 1000,
  maximo: 10,
  mensaje: 'Demasiados intentos de inicio de sesión. Espera unos minutos.',
});

const auth = crearAutenticador({ usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD });

// Forma en que el dashboard recibe cada postulación (nunca expone la ruta interna del CV)
const aPublico = (f) => ({
  id: f.id,
  nombre: f.nombre_completo,
  rut: f.rut,
  correo: f.correo,
  telefono: f.celular,
  area: f.familia_cargo,
  cargo: f.nombre_cargo,
  carta: f.carta,
  cvNombre: f.cv_nombre_original,
  cvBytes: f.cv_bytes,
  fecha: f.creado_en,
  estado: f.estado || 'pendiente',
});

const app = express();
app.disable('x-powered-by');

// Detrás de un proxy (hosting, Nginx...) hay que indicarlo para ver la IP real:
//   TRUST_PROXY=1 node server.js
if (process.env.TRUST_PROXY) {
  const valor = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(valor) ? Number(valor) : valor);
}

app.use(cabecerasSeguridad({ produccion: PRODUCCION }));
app.use(
  cors({
    origin: ORIGEN_PERMITIDO,
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// El limitador va primero: si alguien abusa, ni siquiera se procesa el archivo.
app.post('/api/postulaciones', limitarEnvios, upload.single('cv'), async (req, res, next) => {
  try {
    // 0) Campo trampa: si un bot lo llenó, respondemos "éxito" sin guardar nada
    // (así el bot no se entera de que fue detectado).
    if (esBot(req.body)) {
      await borrarArchivo(req.file);
      console.warn(`Posible bot descartado (IP ${req.ip}).`);
      return res.status(201).json({ ok: true, id: crypto.randomUUID() });
    }

    // 1) Campos de texto
    const { errores, datos } = validarCampos(req.body);

    // 2) Archivo: debe existir y su contenido real debe coincidir con el formato
    if (!req.file) {
      errores.push('Adjunta tu CV.');
    } else {
      const extension = path.extname(req.file.filename).toLowerCase();
      const errorArchivo = await validarArchivo(req.file.path, extension);
      if (errorArchivo) errores.push(errorArchivo);
    }

    // 3) Si algo falla, no dejamos el archivo guardado
    if (errores.length > 0) {
      await borrarArchivo(req.file);
      return res.status(400).json({
        ok: false,
        mensaje: errores.join(' '),
        errores,
      });
    }

    // 4) Guardar en la base de datos
    // (si esto falla, el catch de abajo borra el archivo y responde 500)
    const id = crypto.randomUUID();
    repo.guardar({
      id,
      ...datos,
      cvArchivo: req.file.filename,
      cvNombreOriginal: limpiarNombreOriginal(req.file.originalname),
      cvBytes: req.file.size,
      creadoEn: new Date().toISOString(),
    });

    console.log(`Postulación ${id} guardada (${datos.correo}).`);
    res.status(201).json({ ok: true, id });

    // 5) Correo de confirmación. Se envía después de responder y no se espera:
    // si falla, la postulación ya quedó guardada (el error solo se registra).
    correo.enviarConfirmacion(datos);
  } catch (err) {
    await borrarArchivo(req.file);
    next(err);
  }
});

// =====================================================================
// PANEL DE ADMINISTRACIÓN (todas estas rutas exigen haber iniciado sesión)
// =====================================================================
app.post('/api/login', limitarLogin, (req, res) => {
  const { usuario, password } = req.body || {};
  const sesion = auth.iniciar(usuario, password);
  if (!sesion) {
    return res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
  }
  res.json({ ok: true, ...sesion });
});

app.post('/api/logout', (req, res) => {
  auth.cerrar(req);
  res.json({ ok: true });
});

app.get('/api/postulaciones', auth.requerir, (_req, res) => {
  res.json(repo.listar().map(aPublico));
});

app.patch('/api/postulaciones/:id/estado', auth.requerir, (req, res) => {
  const estado = req.body?.estado;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ ok: false, mensaje: 'Estado no válido.' });
  }
  const actualizada = repo.actualizarEstado(req.params.id, estado);
  if (!actualizada) {
    return res.status(404).json({ ok: false, mensaje: 'Postulación no encontrada.' });
  }
  res.json({ ok: true });
});

app.get('/api/postulaciones/:id/cv', auth.requerir, (req, res) => {
  const fila = repo.obtener(req.params.id);
  if (!fila) {
    return res.status(404).json({ ok: false, mensaje: 'Postulación no encontrada.' });
  }
  // basename: aunque alguien manipulara la base, nunca se sale de la carpeta uploads
  const ruta = path.join(CARPETA_CV, path.basename(fila.cv_archivo));
  if (!fs.existsSync(ruta)) {
    return res.status(404).json({ ok: false, mensaje: 'El archivo del CV ya no existe.' });
  }
  res.download(ruta, fila.cv_nombre_original);
});

// --- Manejo de errores (multer y otros) ---
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res
      .status(413)
      .json({ ok: false, mensaje: 'El archivo supera el máximo permitido de 5 MB.' });
  }
  if (err instanceof multer.MulterError) {
    // Demasiados campos, campos gigantes, archivos extra, etc.
    return res.status(400).json({ ok: false, mensaje: 'Solicitud no válida.' });
  }
  if (err.message === 'FORMATO_INVALIDO') {
    return res
      .status(400)
      .json({ ok: false, mensaje: 'Formato no válido. Sube un archivo PDF o DOCX.' });
  }
  console.error(err);
  res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});