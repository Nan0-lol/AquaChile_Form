import { describe, test, expect } from 'vitest';
import {
  POSTULACION_INICIAL,
  validarCampoPostulacion,
  validarPostulacionCompleta,
  construirFormDataPostulacion,
  valoresDesdePostulacion,
  filtrarPostulaciones,
  contarPorEstado,
  validarCvPdf,
} from './postulacion';

const VALORES = {
  nombre: 'Camila Henríquez',
  correo: 'camila.henriquez@ejemplo.cl',
  telefono: '9 8765 4321',
  area: 'piscicultura',
};
const CV = new File(['%PDF-1.4 prueba'], 'CV_Camila.pdf', { type: 'application/pdf' });

describe('Formulario público de postulación', () => {
  test('vacío: marca los campos, el CV y el consentimiento', () => {
    const errores = validarPostulacionCompleta(POSTULACION_INICIAL);
    expect(Object.keys(errores).sort()).toEqual(['area', 'consentimiento', 'correo', 'cv', 'nombre', 'telefono']);
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
    expect(fd.has('rut')).toBe(false); // ya no se pide RUT
    expect(fd.get('telefono')).toBe('+56987654321');
    expect(fd.get('sitioWeb')).toBe('');
    expect(fd.get('cv').name).toBe('CV_Camila.pdf');
  });
});

describe('Bandeja de postulaciones', () => {
  const LISTA = [
    { id: '1', nombre: 'Camila Henríquez', correo: 'c@ejemplo.cl', estado: 'nueva' },
    { id: '2', nombre: 'Diego Fuentealba', correo: 'diego.f@ejemplo.cl', estado: 'nueva' },
    { id: '3', nombre: 'Cristóbal Muñoz', correo: 'x@ejemplo.cl', estado: 'descartada' },
  ];

  test('filtra por estado y busca sin importar tildes, también por correo', () => {
    expect(filtrarPostulaciones(LISTA, { estado: 'nueva' })).toHaveLength(2);
    expect(filtrarPostulaciones(LISTA, { q: 'henriquez' })[0].id).toBe('1');
    expect(filtrarPostulaciones(LISTA, { q: 'diego.f@' })[0].id).toBe('2');
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
