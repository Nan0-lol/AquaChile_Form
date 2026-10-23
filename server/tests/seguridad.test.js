import { describe, test, expect, afterEach } from 'vitest';
import { crearLimitador, cabecerasSeguridad, esBot, crearAutenticador } from '../seguridad.js';

// Respuesta falsa de Express: guarda el código, el JSON y las cabeceras
const respuestaFalsa = () => {
  const res = { codigo: 200, cuerpo: null, cabeceras: {} };
  res.status = (c) => ((res.codigo = c), res);
  res.json = (j) => ((res.cuerpo = j), res);
  res.setHeader = (k, v) => (res.cabeceras[k] = v);
  res.removeHeader = (k) => delete res.cabeceras[k];
  return res;
};

// Ejecuta un middleware y cuenta si dejó pasar (next) o bloqueó
const ejecutar = (middleware, req = {}) => {
  const res = respuestaFalsa();
  let paso = false;
  middleware(req, res, () => (paso = true));
  return { paso, res };
};

describe('Límite de envíos por IP', () => {
  let limitador;
  afterEach(() => limitador?.detener());

  test('deja pasar hasta el máximo y luego bloquea con 429', () => {
    let t = 0;
    limitador = crearLimitador({ maximo: 3, ventanaMs: 1000, ahora: () => t });
    const req = { ip: '1.2.3.4' };
    expect(ejecutar(limitador, req).paso).toBe(true);
    expect(ejecutar(limitador, req).paso).toBe(true);
    expect(ejecutar(limitador, req).paso).toBe(true);
    const bloqueado = ejecutar(limitador, req);
    expect(bloqueado.paso).toBe(false);
    expect(bloqueado.res.codigo).toBe(429);
    expect(bloqueado.res.cabeceras['Retry-After']).toBeTruthy();
  });

  test('cada IP tiene su propio contador', () => {
    limitador = crearLimitador({ maximo: 1, ventanaMs: 1000, ahora: () => 0 });
    expect(ejecutar(limitador, { ip: 'A' }).paso).toBe(true);
    expect(ejecutar(limitador, { ip: 'B' }).paso).toBe(true);
    expect(ejecutar(limitador, { ip: 'A' }).paso).toBe(false);
  });

  test('el contador se reinicia al terminar la ventana de tiempo', () => {
    let t = 0;
    limitador = crearLimitador({ maximo: 1, ventanaMs: 1000, ahora: () => t });
    ejecutar(limitador, { ip: 'A' });
    expect(ejecutar(limitador, { ip: 'A' }).paso).toBe(false);
    t = 1001;
    expect(ejecutar(limitador, { ip: 'A' }).paso).toBe(true);
  });
});

describe('Cabeceras de seguridad', () => {
  test('agrega las protecciones básicas', () => {
    const { paso, res } = ejecutar(cabecerasSeguridad());
    expect(paso).toBe(true);
    expect(res.cabeceras['X-Content-Type-Options']).toBe('nosniff');
    expect(res.cabeceras['X-Frame-Options']).toBe('DENY');
    expect(res.cabeceras['Strict-Transport-Security']).toBe(undefined);
  });

  test('en producción activa HTTPS estricto', () => {
    const { res } = ejecutar(cabecerasSeguridad({ produccion: true }));
    expect(res.cabeceras['Strict-Transport-Security']).toBeTruthy();
  });
});

describe('Campo trampa contra bots', () => {
  test('detecta cuando el campo invisible viene lleno', () => {
    expect(esBot({ sitioWeb: 'http://spam.com' })).toBe(true);
    expect(esBot({ sitioWeb: ['x'] })).toBe(true);
  });

  test('una persona real lo deja vacío', () => {
    expect(esBot({ sitioWeb: '' })).toBe(false);
    expect(esBot({ sitioWeb: '   ' })).toBe(false);
    expect(esBot({})).toBe(false);
  });
});

describe('Login de administradores', () => {
  let t;
  let auth;
  const conToken = (token) => ({ headers: { authorization: token ? `Bearer ${token}` : '' } });

  const crear = () => {
    t = 1_000;
    auth = crearAutenticador({
      usuario: 'reclutamiento',
      password: 'Clave-Segura-2026',
      duracionMs: 5_000,
      ahora: () => t,
    });
  };

  afterEach(() => auth?.detener());

  test('rechaza contraseña o usuario incorrectos', () => {
    crear();
    expect(auth.iniciar('reclutamiento', 'mala')).toBe(null);
    expect(auth.iniciar('otro', 'Clave-Segura-2026')).toBe(null);
  });

  test('no se cae con datos raros', () => {
    crear();
    expect(auth.iniciar(undefined, {})).toBe(null);
    expect(auth.iniciar(123, ['x'])).toBe(null);
  });

  test('con credenciales correctas entrega un token que abre el panel', () => {
    crear();
    const sesion = auth.iniciar('reclutamiento', 'Clave-Segura-2026');
    expect(sesion.token).toHaveLength(64);
    expect(sesion.usuario).toBe('reclutamiento');
    expect(ejecutar(auth.requerir, conToken(sesion.token)).paso).toBe(true);
  });

  test('sin token o con un token inventado responde 401', () => {
    crear();
    expect(ejecutar(auth.requerir, conToken('')).res.codigo).toBe(401);
    expect(ejecutar(auth.requerir, conToken('inventado')).res.codigo).toBe(401);
  });

  test('el token vence pasado el tiempo límite', () => {
    crear();
    const { token } = auth.iniciar('reclutamiento', 'Clave-Segura-2026');
    t += 6_000;
    expect(ejecutar(auth.requerir, conToken(token)).paso).toBe(false);
  });

  test('cerrar sesión invalida el token', () => {
    crear();
    const { token } = auth.iniciar('reclutamiento', 'Clave-Segura-2026');
    auth.cerrar(conToken(token));
    expect(ejecutar(auth.requerir, conToken(token)).paso).toBe(false);
  });
});
