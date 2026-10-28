// =====================================================================
// ARRANQUE DEL SERVIDOR
//   node server.js   (o npm start)
// Lee la configuración de server/.env, abre la base de datos, crea los
// usuarios iniciales si no hay ninguno y enciende la API.
// =====================================================================
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearRepositorio } from './db.js';
import { crearAutenticador } from './seguridad.js';
import { crearServicioCorreo } from './correo.js';
import { asegurarUsuariosIniciales } from './servicios/usuarios.js';
import { crearApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga server/.env sin instalar paquetes (Node 20.12+)
const rutaEnv = path.join(__dirname, '.env');
if (fs.existsSync(rutaEnv) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(rutaEnv);
}

const PORT = Number(process.env.PORT) || 3001;
const PRODUCCION = process.env.NODE_ENV === 'production';
const CARPETA_ARCHIVOS = path.join(__dirname, 'uploads');

const repo = crearRepositorio();

try {
  const creados = asegurarUsuariosIniciales(repo, { produccion: PRODUCCION, env: process.env });
  if (creados.length) {
    console.log('\nUsuarios iniciales creados (datos ficticios para la demo):');
    console.table(creados.map(({ usuario, password, rol }) => ({ usuario, contraseña: password, rol })));
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = crearApp({
  repo,
  auth: crearAutenticador({ repo }),
  correo: crearServicioCorreo(),
  carpetaArchivos: CARPETA_ARCHIVOS,
  origenPermitido: process.env.ORIGEN_PERMITIDO || 'http://localhost:5173',
  produccion: PRODUCCION,
  limites: {
    login: Number(process.env.LIMITE_LOGIN) || undefined,
    envios: Number(process.env.LIMITE_ENVIOS) || undefined,
    postulaciones: Number(process.env.LIMITE_POSTULACIONES) || undefined,
  },
});

// Detrás de un proxy (hosting, Nginx...) hay que indicarlo para ver la IP real: TRUST_PROXY=1
if (process.env.TRUST_PROXY) {
  const valor = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(valor) ? Number(valor) : valor);
}

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
