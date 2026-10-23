// =====================================================================
// USUARIOS INICIALES
// La primera vez que arranca el servidor (base sin usuarios):
//   - Si existen ADMIN_USUARIO y ADMIN_PASSWORD en el .env, crea ese administrador.
//   - Si no, y NO es producción, crea usuarios de demostración (ficticios).
//   - En producción sin esas variables, no arranca (para no dejar claves conocidas).
// =====================================================================
import { protegerPassword } from '../seguridad.js';

// Personas ficticias para la demo. Cambia estas claves antes de publicar.
export const USUARIOS_DEMO = [
  { usuario: 'admin', password: 'admin123', nombre: 'Administrador del sistema', rol: 'admin', correo: 'admin@ejemplo.cl' },
  { usuario: 'analista', password: 'analista123', nombre: 'Carla Rojas', rol: 'analista', correo: 'carla.rojas@ejemplo.cl' },
  { usuario: 'evaluador', password: 'evaluador123', nombre: 'Paula Vidal', rol: 'evaluador', correo: 'paula.vidal@ejemplo.cl' },
  { usuario: 'evaluador2', password: 'evaluador123', nombre: 'Rodrigo Saavedra', rol: 'evaluador', correo: 'rodrigo.saavedra@ejemplo.cl' },
  { usuario: 'jefatura', password: 'jefatura123', nombre: 'Andrés Pino', rol: 'jefatura', correo: 'andres.pino@ejemplo.cl' },
];

export function crearUsuario(repo, { usuario, password, nombre, rol, correo = '' }) {
  return repo.usuarios.crear({
    usuario: usuario.trim().toLowerCase(),
    nombre,
    rol,
    correo,
    ...protegerPassword(password),
  });
}

/** Devuelve la lista de usuarios creados (vacía si ya existían). */
export function asegurarUsuariosIniciales(repo, { produccion = false, env = {} } = {}) {
  if (repo.usuarios.contar() > 0) return [];

  if (env.ADMIN_USUARIO && env.ADMIN_PASSWORD) {
    const admin = {
      usuario: env.ADMIN_USUARIO,
      password: env.ADMIN_PASSWORD,
      nombre: env.ADMIN_NOMBRE || 'Administrador',
      rol: 'admin',
      correo: env.ADMIN_CORREO || '',
    };
    crearUsuario(repo, admin);
    return [{ ...admin, password: '(la definida en .env)' }];
  }

  if (produccion) {
    throw new Error('No hay usuarios. Define ADMIN_USUARIO y ADMIN_PASSWORD para crear el primero.');
  }

  repo.transaccion(() => USUARIOS_DEMO.forEach((u) => crearUsuario(repo, u)));
  return USUARIOS_DEMO;
}
