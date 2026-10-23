import { describe, test, expect } from 'vitest';
import {
  estadoGeneral,
  siguienteEtapa,
  requisitoEtapa,
  filtrarSolicitudes,
  contarPorEtapa,
  formatearFecha,
  formatearFechaHora,
  hace,
  telefonoLegible,
  telefonoWhatsapp,
  cambios,
  construirCsvSolicitudes,
} from './proceso';

// Solicitudes ficticias, con la misma forma que entrega el servidor
const solicitud = (extra = {}) => ({
  id: 's1',
  etapa: 'recibida',
  fechaSolicitud: '2026-10-10T15:00:00.000Z',
  candidato: { nombre: 'Valentina Ortega', correo: 'valentina.ortega@ejemplo.cl', origen: 'externo' },
  evaluador: null,
  familiaCargo: 'operario_calificado',
  nombreCargo: 'Operador de máquina',
  ubicacion: 'Planta Calbuco',
  unidad: 'industrial',
  evaluacion: { fechaEntrevista: null, observaciones: '', resultado: null, fechaInforme: null },
  timingDias: null,
  ...extra,
});

const LISTA = [
  solicitud(),
  solicitud({ id: 's2', etapa: 'agendada', evaluador: { id: 'ev1', nombre: 'Paula Vidal' }, nombreCargo: 'Jefe de turno', familiaCargo: 'jefatura', fechaSolicitud: '2026-09-05T15:00:00.000Z', candidato: { nombre: 'Matías Cárcamo', correo: 'm@ejemplo.cl' } }),
  solicitud({ id: 's3', etapa: 'informe_enviado', evaluador: { id: 'ev2', nombre: 'Rodrigo Saavedra' } }),
];

describe('Etapas del proceso', () => {
  test('agrupa las 4 etapas en los 3 estados del caso', () => {
    expect(estadoGeneral('recibida')).toBe('Pendiente');
    expect(estadoGeneral('agendada')).toBe('En proceso');
    expect(estadoGeneral('realizada')).toBe('En proceso');
    expect(estadoGeneral('informe_enviado')).toBe('Finalizada');
  });

  test('sabe cuál es la etapa siguiente', () => {
    expect(siguienteEtapa('recibida')).toBe('agendada');
    expect(siguienteEtapa('informe_enviado')).toBe(null);
  });

  test('avisa qué falta antes de avanzar (mismas reglas del servidor)', () => {
    expect(requisitoEtapa(solicitud(), 'agendada')).toContain('fecha y hora');
    const conFecha = solicitud({ evaluacion: { fechaEntrevista: '2026-10-28T10:00', resultado: null } });
    expect(requisitoEtapa(conFecha, 'realizada')).toBe('');
    expect(requisitoEtapa(conFecha, 'informe_enviado')).toContain('resultado');
    expect(requisitoEtapa(solicitud(), 'recibida')).toBe('');
  });
});

describe('Filtros de la lista', () => {
  test('por etapa, familia y responsable (incluye "sin asignar")', () => {
    expect(filtrarSolicitudes(LISTA, { etapa: 'agendada' }).map((s) => s.id)).toEqual(['s2']);
    expect(filtrarSolicitudes(LISTA, { familiaCargo: 'jefatura' })).toHaveLength(1);
    expect(filtrarSolicitudes(LISTA, { responsable: 'sin' }).map((s) => s.id)).toEqual(['s1']);
    expect(filtrarSolicitudes(LISTA, { responsable: 'ev2' }).map((s) => s.id)).toEqual(['s3']);
  });

  test('busca por candidato o cargo sin importar tildes ni mayúsculas', () => {
    expect(filtrarSolicitudes(LISTA, { q: 'CARCAMO' }).map((s) => s.id)).toEqual(['s2']);
    expect(filtrarSolicitudes(LISTA, { q: 'máquina' })).toHaveLength(2);
    expect(filtrarSolicitudes(LISTA, { q: '   ' })).toHaveLength(3);
  });

  test('por rango de fechas (incluye el día de término)', () => {
    expect(filtrarSolicitudes(LISTA, { desde: '2026-10-01' })).toHaveLength(2);
    expect(filtrarSolicitudes(LISTA, { hasta: '2026-09-05' }).map((s) => s.id)).toEqual(['s2']);
  });

  test('cuenta cuántas hay en cada etapa', () => {
    expect(contarPorEtapa(LISTA)).toEqual({ todas: 3, recibida: 1, agendada: 1, realizada: 0, informe_enviado: 1 });
  });
});

describe('Formatos', () => {
  test('fechas en formato chileno', () => {
    expect(formatearFecha('2026-10-28')).toBe('28-10-2026');
    expect(formatearFechaHora('2026-10-28T09:30')).toBe('28-10-2026, 09:30');
    expect(formatearFecha(null)).toBe('—');
  });

  test('tiempo relativo', () => {
    const ahora = new Date('2026-10-23T12:00:00').getTime();
    expect(hace('2026-10-23T08:00:00', ahora)).toBe('Hoy');
    expect(hace('2026-10-22T08:00:00', ahora)).toBe('Ayer');
    expect(hace('2026-10-09T08:00:00', ahora)).toBe('Hace 2 semanas');
  });

  test('teléfono legible y enlace de WhatsApp', () => {
    expect(telefonoLegible('+56912345678')).toBe('+56 9 1234 5678');
    expect(telefonoWhatsapp('+56 9 1234 5678')).toBe('56912345678');
    expect(telefonoWhatsapp('123')).toBe('');
  });
});

describe('Edición', () => {
  test('solo manda al servidor los campos que cambiaron', () => {
    const original = { nombreCargo: 'Operador', ceco: null, referido: false };
    expect(cambios(original, { nombreCargo: 'Operador', ceco: '', referido: false })).toEqual({});
    expect(cambios(original, { nombreCargo: 'Supervisor', ceco: 'CC-1', referido: true })).toEqual({
      nombreCargo: 'Supervisor',
      ceco: 'CC-1',
      referido: true,
    });
  });
});

describe('Exportar a Excel', () => {
  test('usa los nombres legibles, punto y coma y BOM', () => {
    const csv = construirCsvSolicitudes([LISTA[1]], {
      familiasCargo: { jefatura: 'Jefatura' },
      etapas: { agendada: 'Entrevista agendada' },
    });
    expect(csv.startsWith('﻿')).toBe(true);
    const fila = csv.split('\r\n')[1];
    expect(fila).toContain('"Matías Cárcamo"');
    expect(fila).toContain('"Jefatura"');
    expect(fila).toContain('"Entrevista agendada";"En proceso"');
  });

  test('neutraliza textos que Excel podría ejecutar como fórmula', () => {
    const csv = construirCsvSolicitudes([solicitud({ nombreCargo: '=HYPERLINK("x")' })]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
