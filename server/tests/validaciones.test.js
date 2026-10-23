import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  validarCandidato,
  validarSolicitud,
  validarEvaluacion,
  validarArchivo,
  aBooleano,
} from '../validaciones.js';
import { CANDIDATO, SOLICITUD } from './ayudas.js';

describe('Validación de candidato', () => {
  test('un candidato correcto no tiene errores y se normaliza', () => {
    const { errores, datos } = validarCandidato(CANDIDATO);
    expect(errores).toEqual({});
    expect(datos.correo).toBe('valentina.ortega@ejemplo.cl');
    expect(datos.telefono).toBe('+56912345678');
  });

  test('marca cada campo con su propio mensaje', () => {
    const { errores } = validarCandidato({ nombre: 'A', correo: 'malo', telefono: '123', origen: 'otro' });
    expect(Object.keys(errores).sort()).toEqual(['correo', 'nombre', 'origen', 'telefono']);
  });

  test('al editar solo revisa los campos que vienen', () => {
    const { errores, datos } = validarCandidato({ telefono: '9 8765 4321' }, { parcial: true });
    expect(errores).toEqual({});
    expect(datos).toEqual({ telefono: '+56987654321' });
  });

  test('rechaza caracteres de control en el nombre', () => {
    expect(validarCandidato({ ...CANDIDATO, nombre: 'Ana\u0000Soto' }).errores.nombre).toBeTruthy();
  });
});

describe('Validación de solicitud', () => {
  test('una solicitud correcta no tiene errores', () => {
    const { errores, datos } = validarSolicitud(SOLICITUD);
    expect(errores).toEqual({});
    expect(datos.ceco).toBe('C100200300');
    expect(datos.requiereReferencias).toBe(true);
    expect(datos.referido).toBe(false);
    expect(datos.aspectosIndagar).toContain('\n');
  });

  test('solo acepta familias de cargo y unidades del catálogo', () => {
    const { errores } = validarSolicitud({ ...SOLICITUD, familiaCargo: 'gerencia', unidad: 'toString' });
    expect(errores.familiaCargo).toBeTruthy();
    expect(errores.unidad).toBeTruthy();
  });

  test('el centro de costo es opcional pero con formato', () => {
    expect(validarSolicitud({ ...SOLICITUD, ceco: '' }).errores).toEqual({});
    expect(validarSolicitud({ ...SOLICITUD, ceco: 'A1; DROP' }).errores.ceco).toBeTruthy();
  });

  test('exige cargo y ubicación', () => {
    const { errores } = validarSolicitud({ ...SOLICITUD, nombreCargo: '', ubicacion: ' ' });
    expect(errores.nombreCargo).toBeTruthy();
    expect(errores.ubicacion).toBeTruthy();
  });

  test('limita el largo de los aspectos a indagar', () => {
    expect(validarSolicitud({ ...SOLICITUD, aspectosIndagar: 'x'.repeat(2001) }).errores.aspectosIndagar).toBeTruthy();
  });

  test('entiende "sí", "1" y true como verdadero', () => {
    expect([aBooleano('sí'), aBooleano('1'), aBooleano(true), aBooleano('no'), aBooleano(undefined)]).toEqual([
      true, true, true, false, false,
    ]);
  });
});

describe('Validación de evaluación', () => {
  test('acepta fecha con hora para la entrevista y fecha para el informe', () => {
    const { errores, datos } = validarEvaluacion({
      fechaEntrevista: '2026-10-28T10:30',
      resultado: 'recomendado',
      fechaInforme: '2026-10-30',
      observaciones: 'Buen desempeño.\nSe recomienda.',
    });
    expect(errores).toEqual({});
    expect(datos.resultado).toBe('recomendado');
  });

  test('rechaza fechas imposibles y resultados que no existen', () => {
    const { errores } = validarEvaluacion({ fechaEntrevista: '2026-02-31T10:00', fechaInforme: '30-10-2026', resultado: 'apto' });
    expect(Object.keys(errores).sort()).toEqual(['fechaEntrevista', 'fechaInforme', 'resultado']);
  });

  test('un campo vacío borra el valor (null)', () => {
    expect(validarEvaluacion({ resultado: '', fechaEntrevista: '' }).datos).toEqual({ resultado: null, fechaEntrevista: null });
  });
});

describe('Archivos: revisa el contenido real, no solo la extensión', () => {
  let carpeta;
  const crear = (nombre, contenido) => {
    const ruta = path.join(carpeta, nombre);
    fs.writeFileSync(ruta, contenido);
    return ruta;
  };
  beforeAll(() => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'aquachile-val-'));
  });
  afterAll(() => fs.rmSync(carpeta, { recursive: true, force: true }));

  test('acepta un PDF real y rechaza uno falso', async () => {
    expect(await validarArchivo(crear('real.pdf', '%PDF-1.7\nhola'), '.pdf')).toBe(null);
    expect(await validarArchivo(crear('falso.pdf', 'texto'), '.pdf')).toBe('El archivo no es un PDF válido.');
  });

  test('rechaza archivos vacíos', async () => {
    expect(await validarArchivo(crear('vacio.pdf', ''), '.pdf')).toBe('El archivo está vacío.');
  });

  test('acepta un DOCX con estructura de Word y rechaza un ZIP cualquiera', async () => {
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const real = Buffer.concat([zip, Buffer.from('[Content_Types].xml word/document.xml')]);
    expect(await validarArchivo(crear('real.docx', real), '.docx')).toBe(null);
    expect(await validarArchivo(crear('falso.docx', Buffer.concat([zip, Buffer.from('fotos')])), '.docx')).toBe(
      'El archivo no es un DOCX válido.'
    );
  });
});
