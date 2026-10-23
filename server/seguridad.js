// =====================================================================
// SEGURIDAD: límite de intentos, cabeceras, contraseñas, sesiones y roles.
// No necesita instalar paquetes: usa el módulo crypto que trae Node.
// =====================================================================
import crypto from 'node:crypto';
import { puede, permisosDe } from './modelos/permisos.js';

// ---------------------------------------------------------------------
// LÍMITE DE INTENTOS POR IP
// En memoria: se reinicia si se reinicia el servidor (suficiente para un servidor).
// ---------------------------------------------------------------------
export function crearLimitador({
  ventanaMs = 15 * 60 * 1000,
  maximo = 5,
  ahora = () => Date.now(),
  mensaje = 'Hiciste demasiados intentos seguidos. Inténtalo de nuevo en unos minutos.',
} = {}) {
  const registros = new Map(); // ip -> { cuenta, vence }

  const limpiar = () => {
    const t = ahora();
    for (const [ip, r] of registros) {
      if (r.vence <= t) registros.delete(ip);
    }
  };
  // Limpieza periódica para que el mapa no crezca sin límite.
  const intervalo = setInterval(limpiar, Math.min(ventanaMs, 60_000));
  intervalo.unref?.(); // no impide que el programa termine

  const middleware = (req, res, next) => {
    const t = ahora();
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
    let r = registros.get(ip);

    if (!r || r.vence <= t) {
      r = { cuenta: 0, vence: t + ventanaMs };
      registros.set(ip, r);
    }
    r.cuenta += 1;

    const restantes = Math.max(0, maximo - r.cuenta);
    res.setHeader('RateLimit-Limit', String(maximo));
    res.setHeader('RateLimit-Remaining', String(restantes));

    if (r.cuenta > maximo) {
      const segundos = Math.max(1, Math.ceil((r.vence - t) / 1000));
      res.setHeader('Retry-After', String(segundos));
      return res.status(429).json({ ok: false, mensaje });
    }
    next();
  };

  middleware.detener = () => clearInterval(intervalo);
  middleware.tamano = () => registros.size;
  return middleware;
}

// ---------------------------------------------------------------------
// CABECERAS DE SEGURIDAD (para una API que solo devuelve JSON y archivos)
// Con produccion=true (HTTPS) también se activa HSTS.
// ---------------------------------------------------------------------
export function cabecerasSeguridad({ produccion = false } = {}) {
  return (_req, res, next) => {
    res.removeHeader?.('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-store');
    if (produccion) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  };
}

// ---------------------------------------------------------------------
// CONTRASEÑAS: nunca se guardan tal cual.
// scrypt + una "sal" aleatoria distinta por usuario: aunque dos personas
// usen la misma clave, en la base se ven distintas.
// ---------------------------------------------------------------------
const derivar = (password, sal) => crypto.scryptSync(String(password), Buffer.from(sal, 'hex'), 64);

export function protegerPassword(password) {
  const sal = crypto.randomBytes(16).toString('hex');
  return { passwordHash: derivar(password, sal).toString('hex'), passwordSal: sal };
}

export function passwordCoincide(password, { passwordHash, passwordSal }) {
  const esperado = Buffer.from(passwordHash, 'hex');
  const calculado = derivar(password, passwordSal);
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

// Para no revelar si un usuario existe: se calcula un hash igual aunque no exista
const SAL_FALSA = crypto.randomBytes(16).toString('hex');
const HASH_FALSO = derivar('no-existe', SAL_FALSA).toString('hex');

// ---------------------------------------------------------------------
// SESIONES Y ROLES
// Al iniciar sesión se entrega un token aleatorio que vence en unas horas.
// Las sesiones viven en memoria: si se reinicia el servidor, hay que volver a entrar.
// ---------------------------------------------------------------------
export const usuarioPublico = (u) => ({ id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol });

export function crearAutenticador({
  repo,
  duracionMs = 8 * 60 * 60 * 1000, // 8 horas
  ahora = () => Date.now(),
} = {}) {
  const sesiones = new Map(); // token -> { usuarioId, vence }

  const limpiar = () => {
    const t = ahora();
    for (const [token, s] of sesiones) if (s.vence <= t) sesiones.delete(token);
  };
  const intervalo = setInterval(limpiar, 10 * 60 * 1000);
  intervalo.unref?.();

  const tokenDe = (req) => {
    const cabecera = req.headers?.authorization || '';
    return cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
  };

  return {
    /** Devuelve { token, usuario, permisos, venceEn } o null si las credenciales no coinciden. */
    iniciar(usuarioIngresado, passwordIngresada) {
      if (typeof usuarioIngresado !== 'string' || typeof passwordIngresada !== 'string') return null;
      const usuario = repo.usuarios.buscarPorUsuario(usuarioIngresado.trim().toLowerCase());
      // Se calcula el hash siempre, exista o no el usuario, para no revelar cuál falló
      const credenciales = usuario
        ? { passwordHash: usuario.password_hash, passwordSal: usuario.password_sal }
        : { passwordHash: HASH_FALSO, passwordSal: SAL_FALSA };
      const coincide = passwordCoincide(passwordIngresada, credenciales);
      if (!usuario || !coincide) return null;

      const token = crypto.randomBytes(32).toString('hex');
      const vence = ahora() + duracionMs;
      sesiones.set(token, { usuarioId: usuario.id, vence });
      return {
        token,
        usuario: usuarioPublico(usuario),
        permisos: permisosDe(usuario.rol),
        venceEn: new Date(vence).toISOString(),
      };
    },

    cerrar(req) {
      sesiones.delete(tokenDe(req));
    },

    /** Middleware: deja pasar solo con un token válido de un usuario activo. */
    requerir(req, res, next) {
      const token = tokenDe(req);
      const sesion = token ? sesiones.get(token) : null;
      const usuario = sesion && sesion.vence > ahora() ? repo.usuarios.obtener(sesion.usuarioId) : null;
      if (!usuario || !usuario.activo) {
        if (sesion) sesiones.delete(token);
        return res.status(401).json({ ok: false, mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
      }
      req.usuario = usuarioPublico(usuario);
      next();
    },

    detener: () => clearInterval(intervalo),
  };
}

/** Middleware: solo deja pasar si el rol del usuario tiene permiso para la acción. */
export const permitir = (accion) => (req, res, next) => {
  if (!req.usuario || !puede(req.usuario.rol, accion)) {
    return res.status(403).json({ ok: false, mensaje: 'Tu rol no tiene permiso para esta acción.' });
  }
  next();
};
