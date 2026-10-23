import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { repoConUsuarios } from './ayudas.js';

describe('Base de datos: tablas relacionadas', () => {
  let ctx;
  let repo;
  const nuevoCandidato = (correo = 'v@ejemplo.cl') =>
    repo.candidatos.crear({ nombre: 'Valentina Ortega', correo, telefono: '+56912345678', origen: 'externo' });
  const nuevaSolicitud = (candidatoId, extra = {}) =>
    repo.solicitudes.crear({
      candidatoId,
      analistaId: ctx.analista.id,
      familiaCargo: 'tecnico_a',
      nombreCargo: 'Técnico',
      ubicacion: 'Planta Calbuco',
      unidad: 'industrial',
      ...extra,
    });

  beforeEach(() => {
    ctx = repoConUsuarios();
    repo = ctx.repo;
  });
  afterEach(() => repo.cerrar());

  test('una solicitud se lee junto a su candidato, analista y evaluador', () => {
    const c = nuevoCandidato();
    const s = nuevaSolicitud(c, { evaluadorId: ctx.evaluador.id });
    const fila = repo.solicitudes.obtener(s);
    expect(fila.candidato_nombre).toBe('Valentina Ortega');
    expect(fila.analista_nombre).toBe('Carla Rojas');
    expect(fila.evaluador_nombre).toBe('Paula Vidal');
    expect(fila.etapa).toBe('recibida');
  });

  test('un candidato puede tener varias solicitudes', () => {
    const c = nuevoCandidato();
    nuevaSolicitud(c);
    nuevaSolicitud(c, { nombreCargo: 'Supervisor' });
    expect(repo.candidatos.listar()[0].total_solicitudes).toBe(2);
    expect(repo.solicitudes.listar({ candidatoId: c })).toHaveLength(2);
  });

  test('la evaluación se crea una sola vez por solicitud y se completa por partes', () => {
    const s = nuevaSolicitud(nuevoCandidato());
    repo.evaluaciones.guardar(s, { fechaEntrevista: '2026-10-28T10:00' });
    repo.evaluaciones.guardar(s, { resultado: 'recomendado' });
    const e = repo.evaluaciones.obtenerPorSolicitud(s);
    expect(e.fecha_entrevista).toBe('2026-10-28T10:00');
    expect(e.resultado).toBe('recomendado');
  });

  test('borrar un candidato borra en cascada sus solicitudes, evaluaciones e historial', () => {
    const c = nuevoCandidato();
    const s = nuevaSolicitud(c);
    repo.evaluaciones.guardar(s, { observaciones: 'x' });
    repo.historial.registrar(s, ctx.analista.id, 'Solicitud creada');
    repo.candidatos.eliminar(c);
    expect(repo.solicitudes.contar()).toBe(0);
    expect(repo.evaluaciones.obtenerPorSolicitud(s)).toBe(null);
    expect(repo.historial.listar(s)).toHaveLength(0);
  });

  test('no permite una solicitud con un candidato que no existe', () => {
    expect(() => nuevaSolicitud('no-existe')).toThrow();
  });

  test('la base rechaza etapas que no existen', () => {
    const s = nuevaSolicitud(nuevoCandidato());
    expect(() => repo.solicitudes.cambiarEtapa(s, 'aprobada')).toThrow();
  });

  test('filtra por etapa, familia, fechas y texto', () => {
    const c = nuevoCandidato();
    nuevaSolicitud(c, { fechaSolicitud: '2026-08-10T12:00:00.000Z' });
    nuevaSolicitud(c, { familiaCargo: 'jefatura', nombreCargo: 'Jefe de planta', fechaSolicitud: '2026-10-05T12:00:00.000Z' });
    expect(repo.solicitudes.listar({ familiaCargo: 'jefatura' })).toHaveLength(1);
    expect(repo.solicitudes.listar({ desde: '2026-10-01' })).toHaveLength(1);
    expect(repo.solicitudes.listar({ hasta: '2026-08-10' })).toHaveLength(1);
    expect(repo.solicitudes.listar({ q: 'JEFE' })).toHaveLength(1);
    expect(repo.solicitudes.listar({ etapa: 'informe_enviado' })).toHaveLength(0);
  });

  test('una transacción con error no deja nada guardado', () => {
    expect(() =>
      repo.transaccion(() => {
        nuevoCandidato('a@ejemplo.cl');
        throw new Error('falla a la mitad');
      })
    ).toThrow();
    expect(repo.candidatos.contar()).toBe(0);
  });

  test('resiste intentos de inyección SQL', () => {
    nuevoCandidato();
    expect(repo.candidatos.obtener("x' OR '1'='1")).toBe(null);
    expect(repo.solicitudes.listar({ q: "' OR 1=1 --" })).toHaveLength(0);
    expect(repo.candidatos.eliminar("x' OR '1'='1")).toBe(false);
    expect(repo.candidatos.contar()).toBe(1);
  });

  test('la lista de usuarios nunca incluye contraseñas', () => {
    const [u] = repo.usuarios.listar({ rol: 'jefatura' });
    expect(u.nombre).toBe('Andrés Pino');
    expect(u.password_hash).toBe(undefined);
  });
});
