import { describe, test, expect } from 'vitest';
import {
  POSTULACION_INICIAL,
  validarCampoPostulacion,
  validarPostulacionCompleta,
  construirFormDataPostulacion,
  valoresDesdePostulacion,
  filtrarPostulaciones,
  contarPorEstado,
  rutEsValido,
  formatearRut,
  validarCvPdf,
} from './postulacion';

const VALORES = {
  nombre: 'Camila Henríquez',
  rut: '152348762',
  correo: 'camila.henriquez@ejemplo.cl',
  telefono: '9 8765 4321',
  area: 'piscicultura',
  carta: '',
};
const CV = new File(['%PDF-1.4 prueba'], 'CV_Camila.pdf', { type: 'application/pdf' });

describe('Formulario público de postulación', () => {
  test('RUT: revisa el dígito verificador y lo ordena', () => {
    expect(rutEsValido('15.234.876-2')).toBe(true);
    expect(rutEsValido('15.234.876-3')).toBe(false);
    expect(formatearRut('152348762')).toBe('15.234.876-2');
    expect(validarCampoPostulacion('rut', '1234')).toBe('RUT inválido. Revisa el dígito verificador.');
  });

  test('vacío: marca los obligatorios, el CV y el consentimiento (la carta no)', () => {
    const errores = validarPostulacionCompleta(POSTULACION_INICIAL);
    expect(Object.keys(errores).sort()).toEqual(['area', 'consentimiento', 'correo', 'cv', 'nombre', 'rut', 'telefono']);
  });

  test('completo y con consentimiento: sin errores', () => {
    expect(validarPostulacionCompleta(VALORES, { cv: CV, consentimiento: true })).toEqual({});
  });

  test('el CV va solo en PDF', () => {
    expect(validarCvPdf(new File(['x'], 'cv.docx'))).toBe('El archivo debe ser PDF.');
    expect(validarCvPdf(CV)).toBe('');
  });

  test('arma el FormData que espera el servidor', () => {
    const fd = construirFormDataPostulacion(VALORES, { cv: CV });
    expect(fd.get('rut')).toBe('15.234.876-2');
    expect(fd.get('telefono')).toBe('+56987654321');
    expect(fd.get('sitioWeb')).toBe('');
    expect(fd.get('cv').name).toBe('CV_Camila.pdf');
  });
});

describe('Bandeja de postulaciones', () => {
  const LISTA = [
    { id: '1', nombre: 'Camila Henríquez', correo: 'c@ejemplo.cl', rut: '15.234.876-2', estado: 'nueva' },
    { id: '2', nombre: 'Diego Fuentealba', correo: 'd@ejemplo.cl', rut: '17.890.123-0', estado: 'nueva' },
    { id: '3', nombre: 'Cristóbal Muñoz', correo: 'x@ejemplo.cl', rut: '20.456.789-1', estado: 'descartada' },
  ];

  test('filtra por estado y busca sin importar tildes, también por RUT', () => {
    expect(filtrarPostulaciones(LISTA, { estado: 'nueva' })).toHaveLength(2);
    expect(filtrarPostulaciones(LISTA, { q: 'henriquez' })[0].id).toBe('1');
    expect(filtrarPostulaciones(LISTA, { q: '17.890' })[0].id).toBe('2');
  });

  test('cuenta por estado (incluye los que están en cero)', () => {
    expect(contarPorEstado(LISTA)).toEqual({ nueva: 2, en_evaluacion: 0, descartada: 1 });
  });

  test('prellena "Nueva solicitud" con nombre, correo y celular', () => {
    expect(valoresDesdePostulacion({ ...VALORES, telefono: '+56987654321' })).toEqual({
      nombre: 'Camila Henríquez',
      correo: 'camila.henriquez@ejemplo.cl',
      telefono: '9 8765 4321',
    });
  });
});
