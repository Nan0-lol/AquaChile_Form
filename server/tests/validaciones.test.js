import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validarCampos, validarArchivo, rutEsValido, formatearRut } from '../validaciones.js';

// Una postulación correcta; cada prueba cambia solo lo que quiere revisar
const BASE = {
  nombreCompleto: 'María González',
  rut: '12345678-5',
  correo: 'Maria@Gmail.com',
  celular: '+56 9 1234 5678',
  area: 'planta',
  nombreCargo: 'Operaria de planta',
  carta: 'Hola,\nquiero trabajar en AquaChile.',
  consentimiento: 'true',
};

const errores = (cambios) => validarCampos({ ...BASE, ...cambios }).errores;

describe('validarCampos', () => {
  test('una postulación correcta no tiene errores', () => {
    expect(errores({})).toEqual([]);
  });

  test('normaliza RUT, correo y celular antes de guardar', () => {
    const { datos } = validarCampos(BASE);
    expect(datos.rut).toBe('12.345.678-5');
    expect(datos.correo).toBe('maria@gmail.com');
    expect(datos.celular).toBe('+56912345678');
  });

  test('rechaza un RUT con dígito verificador incorrecto', () => {
    expect(errores({ rut: '12345678-9' })).toContain('El RUT no es válido.');
  });

  test('rechaza un correo mal escrito', () => {
    expect(errores({ correo: 'maria@gmail' })).toContain('El correo electrónico no es válido.');
  });

  test('rechaza un celular que no es chileno', () => {
    expect(errores({ celular: '12345' })).toContain('El número de celular no es válido.');
  });

  test('solo acepta las áreas del formulario', () => {
    expect(errores({ area: 'tecnologia' })).toContain('El área de interés no es válida.');
    // "toString" existe en todos los objetos de JavaScript: no debe colarse como área
    expect(errores({ area: 'toString' })).toContain('El área de interés no es válida.');
  });

  test('exige el cargo', () => {
    expect(errores({ nombreCargo: '' })).toContain('El cargo debe tener entre 2 y 100 caracteres.');
  });

  test('exige aceptar el tratamiento de datos', () => {
    expect(errores({ consentimiento: '' })).toContain(
      'Debes aceptar el tratamiento de tus datos personales.'
    );
  });

  test('la carta es opcional, pero tiene un máximo', () => {
    expect(errores({ carta: '' })).toEqual([]);
    expect(errores({ carta: 'x'.repeat(3001) }).length).toBe(1);
  });

  test('rechaza caracteres de control en el nombre', () => {
    expect(errores({ nombreCompleto: 'Ana\u0000Soto' })).toContain(
      'El nombre debe tener entre 3 y 100 caracteres.'
    );
  });

  test('no se cae si llegan datos que no son texto', () => {
    expect(() => validarCampos({ nombreCompleto: ['x'], rut: 123, correo: null })).not.toThrow();
  });
});

describe('RUT', () => {
  test('valida con módulo 11, incluido el dígito K', () => {
    expect(rutEsValido('12.345.678-5')).toBe(true);
    expect(rutEsValido('10.000.013-K')).toBe(true);
    expect(rutEsValido('12.345.678-9')).toBe(false);
  });

  test('formatea con puntos y guion', () => {
    expect(formatearRut('10000013k')).toBe('10.000.013-K');
  });
});

describe('validarArchivo (revisa el contenido real, no solo la extensión)', () => {
  let carpeta;
  const crear = (nombre, contenido) => {
    const ruta = path.join(carpeta, nombre);
    fs.writeFileSync(ruta, contenido);
    return ruta;
  };

  beforeAll(() => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'aquachile-test-'));
  });

  afterAll(() => {
    fs.rmSync(carpeta, { recursive: true, force: true });
  });

  test('acepta un PDF real', async () => {
    const ruta = crear('real.pdf', '%PDF-1.7\ncontenido');
    expect(await validarArchivo(ruta, '.pdf')).toBe(null);
  });

  test('rechaza un archivo que solo se llama .pdf', async () => {
    const ruta = crear('falso.pdf', 'esto es texto, no un PDF');
    expect(await validarArchivo(ruta, '.pdf')).toBe('El archivo no es un PDF válido.');
  });

  test('rechaza archivos vacíos', async () => {
    const ruta = crear('vacio.pdf', '');
    expect(await validarArchivo(ruta, '.pdf')).toBe('El archivo está vacío.');
  });

  test('acepta un DOCX con estructura de Word', async () => {
    const contenido = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('[Content_Types].xml ... word/document.xml'),
    ]);
    expect(await validarArchivo(crear('real.docx', contenido), '.docx')).toBe(null);
  });

  test('rechaza un ZIP cualquiera renombrado a .docx', async () => {
    const contenido = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('fotos.zip')]);
    expect(await validarArchivo(crear('falso.docx', contenido), '.docx')).toBe(
      'El archivo no es un DOCX válido.'
    );
  });
});
