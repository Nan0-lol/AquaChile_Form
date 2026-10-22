// Medidas de seguridad del formulario público. No necesita instalar paquetes.

/**
 * Limita cuántas veces puede enviar una misma IP dentro de una ventana de tiempo.
 * Es en memoria: se reinicia si se reinicia el servidor (suficiente para un solo servidor).
 */
export function crearLimitador({
  ventanaMs = 15 * 60 * 1000,
  maximo = 5,
  ahora = () => Date.now(),
  mensaje = 'Hiciste demasiados envíos seguidos. Inténtalo de nuevo en unos minutos.',
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

/**
 * Cabeceras de seguridad para una API que solo devuelve JSON.
 * Con producción=true (HTTPS) también se activa HSTS.
 */
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

/**
 * Campo trampa ("honeypot"): el formulario tiene un campo invisible que una
 * persona nunca llena, pero muchos bots sí. Si viene con algo, es un bot.
 */
export const CAMPO_TRAMPA = 'sitioWeb';

export function esBot(body = {}) {
  const valor = body?.[CAMPO_TRAMPA];
  if (Array.isArray(valor)) return valor.length > 0;
  return typeof valor === 'string' ? valor.trim() !== '' : valor != null;
}