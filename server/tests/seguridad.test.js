import { describe, test, expect, afterEach } from 'vitest';
import {
  crearLimitador,
  cabecerasSeguridad,
  crearAutenticador,
  permitir,
  protegerPassword,
  passwordCoincide,
} from '../seguridad.js';
import { puede, permisosDe } from '../modelos/permisos.js';
import { repoConUsuarios } from './ayudas.js';

// Respuesta falsa de Express: guarda el código, el JSON y las cabeceras
const respuestaFalsa = () => {
  const res = { codigo: 200, cuerpo: null, cabeceras: {} };
  res.status = (c) => ((res.codigo = c), res);
  res.json = (j) => ((res.cuerpo = j), res);
  res.setHeader = (k, v) => (res.cabeceras[k] = v);
  res.removeHeader = (k) => delete res.cabeceras[k];
  return res;
};
const ejecutar = (middleware, req = {}) => {
  const res = respuestaFalsa();
  let paso = false;
  middleware(req, res, () => (paso = true));
  return { paso, res, req };
};

describe('Límite de intentos por IP', () => {
  let limitador;
  afterEach(() => limitador?.detener());

  test('bloquea con 429 al pasar el máximo y se reinicia al terminar la ventana', () => {
    let t = 0;
    limitador = crearLimitador({ maximo: 2, ventanaMs: 1000, ahora: () => t });
    const req = { ip: '1.2.3.4' };
    expect(ejecutar(limitador, req).paso).toBe(true);
    expect(ejecutar(limitador, req).paso).toBe(true);
    const bloqueado = ejecutar(limitador, req);
    expect(bloqueado.paso).toBe(false);
    expect(bloqueado.res.codigo).toBe(429);
    t = 1001;
    expect(ejecutar(limitador, req).paso).toBe(true);
  });

  test('cada IP tiene su propio contador', () => {
    limitador = crearLimitador({ maximo: 1, ventanaMs: 1000, ahora: () => 0 });
    expect(ejecutar(limitador, { ip: 'A' }).paso).toBe(true);
    expect(ejecutar(limitador, { ip: 'B' }).paso).toBe(true);
    expect(ejecutar(limitador, { ip: 'A' }).paso).toBe(false);
  });
});

describe('Cabeceras de seguridad', () => {
  test('agrega las protecciones básicas y HSTS solo en producción', () => {
    expect(ejecutar(cabecerasSeguridad()).res.cabeceras['X-Content-Type-Options']).toBe('nosniff');
    expect(ejecutar(cabecerasSeguridad()).res.cabeceras['Strict-Transport-Security']).toBe(undefined);
    expect(ejecutar(cabecerasSeguridad({ produccion: true })).res.cabeceras['Strict-Transport-Security']).toBeTruthy();
  });
});

describe('Contraseñas', () => {
  test('nunca se guardan tal cual y la misma clave se ve distinta en cada usuario', () => {
    const a = protegerPassword('Clave-2026');
    const b = protegerPassword('Clave-2026');
    expect(a.passwordHash).not.toContain('Clave');
    expect(a.passwordHash === b.passwordHash).toBe(false);
    expect(passwordCoincide('Clave-2026', a)).toBe(true);
    expect(passwordCoincide('clave-2026', a)).toBe(false);
  });
});

describe('Login con usuarios de la base', () => {
  let auth;
  let t;
  afterEach(() => auth?.detener());
  const conToken = (token) => ({ headers: { authorization: token ? `Bearer ${token}` : '' } });

  const preparar = () => {
    const ctx = repoConUsuarios();
    t = 1000;
    auth = crearAutenticador({ repo: ctx.repo, duracionMs: 5000, ahora: () => t });
    return ctx;
  };

  test('rechaza usuario o contraseña incorrectos, y datos raros', () => {
    preparar();
    expect(auth.iniciar('analista', 'mala')).toBe(null);
    expect(auth.iniciar('noexiste', 'analista-clave')).toBe(null);
    expect(auth.iniciar(undefined, {})).toBe(null);
  });

  test('entrega token, rol y permisos; el usuario no distingue mayúsculas', () => {
    preparar();
    const sesion = auth.iniciar('  ANALISTA ', 'analista-clave');
    expect(sesion.token).toHaveLength(64);
    expect(sesion.usuario.rol).toBe('analista');
    expect(sesion.usuario.password_hash).toBe(undefined);
    expect(sesion.permisos).toContain('solicitud:crear');
  });

  test('el token deja pasar y deja al usuario en req.usuario', () => {
    preparar();
    const { token } = auth.iniciar('evaluador', 'evaluador-clave');
    const r = ejecutar(auth.requerir, conToken(token));
    expect(r.paso).toBe(true);
    expect(r.req.usuario.nombre).toBe('Paula Vidal');
  });

  test('sin token, con token falso o vencido: 401', () => {
    preparar();
    const { token } = auth.iniciar('evaluador', 'evaluador-clave');
    expect(ejecutar(auth.requerir, conToken('')).res.codigo).toBe(401);
    expect(ejecutar(auth.requerir, conToken('inventado')).res.codigo).toBe(401);
    t += 6000;
    expect(ejecutar(auth.requerir, conToken(token)).res.codigo).toBe(401);
  });

  test('cerrar sesión invalida el token', () => {
    preparar();
    const { token } = auth.iniciar('jefatura', 'jefatura-clave');
    auth.cerrar(conToken(token));
    expect(ejecutar(auth.requerir, conToken(token)).paso).toBe(false);
  });
});

describe('Permisos por rol', () => {
  test('el analista crea solicitudes pero no registra evaluaciones', () => {
    expect(puede('analista', 'solicitud:crear')).toBe(true);
    expect(puede('analista', 'evaluacion:editar')).toBe(false);
    expect(puede('analista', 'solicitud:etapa')).toBe(false);
  });

  test('el evaluador avanza etapas y registra evaluaciones, pero no crea solicitudes', () => {
    expect(puede('evaluador', 'evaluacion:editar')).toBe(true);
    expect(puede('evaluador', 'solicitud:etapa')).toBe(true);
    expect(puede('evaluador', 'solicitud:crear')).toBe(false);
  });

  test('jefatura solo consulta', () => {
    expect(permisosDe('jefatura').sort()).toEqual(['candidato:ver', 'indicadores:ver', 'postulacion:ver', 'solicitud:ver']);
  });

  test('las postulaciones web las gestiona el analista; el evaluador no las ve', () => {
    expect(puede('analista', 'postulacion:gestionar')).toBe(true);
    expect(puede('jefatura', 'postulacion:gestionar')).toBe(false);
    expect(puede('evaluador', 'postulacion:ver')).toBe(false);
  });

  test('solo el administrador borra candidatos; un rol desconocido no puede nada', () => {
    expect(puede('admin', 'candidato:eliminar')).toBe(true);
    expect(puede('analista', 'candidato:eliminar')).toBe(false);
    expect(permisosDe('hacker')).toEqual([]);
  });

  test('el middleware responde 403 cuando el rol no tiene permiso', () => {
    const bloqueado = ejecutar(permitir('solicitud:crear'), { usuario: { rol: 'jefatura' } });
    expect(bloqueado.paso).toBe(false);
    expect(bloqueado.res.codigo).toBe(403);
    expect(ejecutar(permitir('solicitud:crear'), { usuario: { rol: 'analista' } }).paso).toBe(true);
  });
});
