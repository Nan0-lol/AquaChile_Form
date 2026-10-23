import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { repoConUsuarios } from './ayudas.js';
import { calcularIndicadores } from '../servicios/indicadores.js';
import { calcularTiming } from '../servicios/formato.js';

describe('Indicadores del dashboard', () => {
  let ctx;
  let repo;
  const AHORA = new Date(2026, 9, 22, 12); // 22 de octubre de 2026

  const agregar = ({ fecha, etapa = 'recibida', familia = 'tecnico_a', resultado, informe, evaluador }) => {
    const c = repo.candidatos.crear({
      nombre: 'Persona Ficticia',
      correo: `${Math.random()}@ejemplo.cl`,
      telefono: '+56912345678',
      origen: 'externo',
    });
    const s = repo.solicitudes.crear({
      candidatoId: c,
      analistaId: ctx.analista.id,
      evaluadorId: evaluador ?? null,
      familiaCargo: familia,
      nombreCargo: 'Cargo',
      ubicacion: 'Planta',
      unidad: 'industrial',
      etapa,
      fechaSolicitud: fecha,
    });
    if (resultado || informe) repo.evaluaciones.guardar(s, { resultado: resultado ?? null, fechaInforme: informe ?? null });
  };

  beforeEach(() => {
    ctx = repoConUsuarios();
    repo = ctx.repo;
  });
  afterEach(() => repo.cerrar());

  test('sin datos todo parte en cero y el timing queda vacío', () => {
    const i = calcularIndicadores(repo, { ahora: AHORA });
    expect(i.totalSolicitudes).toBe(0);
    expect(i.timingPromedioDias).toBe(null);
    expect(i.porMes).toHaveLength(6);
    expect(i.porMes.at(-1).etiqueta).toBe('Oct');
  });

  test('cuenta por etapa, por familia y por resultado', () => {
    agregar({ fecha: '2026-10-01T12:00:00Z', etapa: 'informe_enviado', familia: 'jefatura', resultado: 'recomendado', informe: '2026-10-08' });
    agregar({ fecha: '2026-10-10T12:00:00Z', etapa: 'agendada', familia: 'jefatura', evaluador: ctx.evaluador.id });
    agregar({ fecha: '2026-10-15T12:00:00Z' });
    const i = calcularIndicadores(repo, { ahora: AHORA });
    expect(i.porEtapa.map((e) => e.cantidad)).toEqual([1, 1, 0, 1]);
    expect(i.porFamilia[0]).toEqual({ clave: 'jefatura', etiqueta: 'Jefatura', cantidad: 2 });
    expect(i.porResultado.find((r) => r.clave === 'recomendado').cantidad).toBe(1);
    // Los 3 estados del caso: Pendiente / En proceso / Finalizada
    expect([i.pendientes, i.enProceso, i.finalizadas]).toEqual([1, 1, 1]);
    expect(i.sinResponsable).toBe(1);
  });

  test('el timing promedio son los días entre la solicitud y el informe', () => {
    agregar({ fecha: '2026-09-01T12:00:00Z', etapa: 'informe_enviado', resultado: 'recomendado', informe: '2026-09-11' });
    agregar({ fecha: '2026-10-01T12:00:00Z', etapa: 'informe_enviado', resultado: 'recomendado', informe: '2026-10-06' });
    expect(calcularIndicadores(repo, { ahora: AHORA }).timingPromedioDias).toBe(7.5);
    expect(calcularTiming('2026-09-01T23:00:00Z', '2026-09-11')).toBe(10);
    expect(calcularTiming(null, '2026-09-11')).toBe(null);
  });

  test('agrupa por mes los últimos 6 meses e ignora los más antiguos', () => {
    agregar({ fecha: '2026-03-15T12:00:00Z' }); // fuera de la ventana
    agregar({ fecha: '2026-05-15T12:00:00Z' });
    agregar({ fecha: '2026-10-05T12:00:00Z' });
    agregar({ fecha: '2026-10-06T12:00:00Z' });
    const { porMes } = calcularIndicadores(repo, { ahora: AHORA });
    expect(porMes.map((m) => m.cantidad)).toEqual([1, 0, 0, 0, 0, 2]);
    expect(porMes.at(-1).actual).toBe(true);
  });

  test('cuenta los informes enviados en el mes en que se enviaron', () => {
    agregar({ fecha: '2026-09-25T12:00:00Z', etapa: 'informe_enviado', resultado: 'recomendado', informe: '2026-10-02' });
    agregar({ fecha: '2026-10-01T12:00:00Z', etapa: 'informe_enviado', resultado: 'recomendado', informe: '2026-10-06' });
    const { porMes } = calcularIndicadores(repo, { ahora: AHORA });
    expect(porMes.map((m) => m.informes)).toEqual([0, 0, 0, 0, 0, 2]);
    expect(porMes.map((m) => m.cantidad)).toEqual([0, 0, 0, 0, 1, 1]);
  });
});
