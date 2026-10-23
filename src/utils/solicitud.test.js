import { describe, test, expect } from 'vitest';
import {
  digitosCelular,
  formatearCelular,
  formatearTamano,
  validarAdjunto,
  validarCampoSolicitud,
  validarSolicitudCompleta,
  construirFormData,
} from './solicitud';

// Archivo falso: solo importa el nombre y el tamaño
const archivo = (name, size = 1000) => ({ name, size });

const VALIDOS = {
  nombre: 'Valentina Ortega',
  correo: 'valentina.ortega@ejemplo.cl',
  telefono: '9 1234 5678',
  origen: 'externo',
  familiaCargo: 'operario_calificado',
  nombreCargo: 'Operador de máquina',
  ubicacion: 'Planta Calbuco',
  unidad: 'industrial',
  ceco: 'a170010301',
  evaluadorId: 'ev-1',
  requiereReferencias: true,
  referido: false,
  aspectosIndagar: '  Trabajo en turnos.  ',
};

describe('Celular', () => {
  test('acepta el número con o sin +56 y espacios', () => {
    expect(digitosCelular('+56 9 1234 5678')).toBe('912345678');
    expect(digitosCelular('56912345678')).toBe('912345678');
    expect(formatearCelular('912345678')).toBe('9 1234 5678');
  });

  test('rechaza números que no son celulares chilenos', () => {
    expect(validarCampoSolicitud('telefono', '812345678')).toBeTruthy();
    expect(validarCampoSolicitud('telefono', '9123')).toBeTruthy();
    expect(validarCampoSolicitud('telefono', '9 1234 5678')).toBe('');
  });
});

describe('Campos del formulario', () => {
  test('exige nombre, correo válido, origen y datos del cargo', () => {
    expect(validarCampoSolicitud('nombre', 'Al')).toBeTruthy();
    expect(validarCampoSolicitud('correo', 'sin-arroba')).toBeTruthy();
    expect(validarCampoSolicitud('origen', 'otro')).toBeTruthy();
    expect(validarCampoSolicitud('familiaCargo', '')).toBeTruthy();
    expect(validarCampoSolicitud('ubicacion', ' ')).toBeTruthy();
  });

  test('el centro de costo es opcional, pero si viene debe tener formato', () => {
    expect(validarCampoSolicitud('ceco', '')).toBe('');
    expect(validarCampoSolicitud('ceco', 'a170010301')).toBe('');
    expect(validarCampoSolicitud('ceco', 'A17 00')).toBeTruthy();
  });

  test('los aspectos a indagar tienen un máximo', () => {
    expect(validarCampoSolicitud('aspectosIndagar', 'x'.repeat(2001))).toBeTruthy();
  });
});

describe('Archivos adjuntos', () => {
  test('el CV es obligatorio; el descriptor no', () => {
    expect(validarAdjunto(null, { obligatorio: true, que: 'el CV' })).toBe('Adjunta el CV (PDF o DOCX).');
    expect(validarAdjunto(null)).toBe('');
  });

  test('solo PDF o DOCX, no vacíos y hasta 5 MB', () => {
    expect(validarAdjunto(archivo('cv.PDF'))).toBe('');
    expect(validarAdjunto(archivo('cv.docx'))).toBe('');
    expect(validarAdjunto(archivo('cv.doc'))).toBeTruthy();
    expect(validarAdjunto(archivo('cv.pdf', 0))).toBeTruthy();
    expect(validarAdjunto(archivo('cv.pdf', 6 * 1024 * 1024))).toBeTruthy();
    expect(formatearTamano(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('Formulario completo', () => {
  test('con todo correcto no hay errores', () => {
    expect(validarSolicitudCompleta(VALIDOS, { cv: archivo('cv.pdf') })).toEqual({});
  });

  test('junta todos los errores de una vez', () => {
    const errores = validarSolicitudCompleta({ ...VALIDOS, nombre: '', unidad: '' }, {});
    expect(Object.keys(errores).sort()).toEqual(['cv', 'nombre', 'unidad']);
  });

  test('con un candidato ya registrado no se piden sus datos', () => {
    const vacio = { ...VALIDOS, nombre: '', correo: '', telefono: '', origen: '' };
    const errores = validarSolicitudCompleta(vacio, { candidatoExistente: { id: 'c1' }, cv: archivo('cv.pdf') });
    expect(errores).toEqual({});
  });
});

describe('Datos que se envían al servidor', () => {
  test('candidato nuevo: manda sus datos normalizados', () => {
    const datos = construirFormData(VALIDOS, { cv: archivo('cv.pdf') });
    expect(datos.get('telefono')).toBe('+56912345678');
    expect(datos.get('ceco')).toBe('A170010301');
    expect(datos.get('aspectosIndagar')).toBe('Trabajo en turnos.');
    expect(datos.get('requiereReferencias')).toBe('true');
    expect(datos.get('candidatoId')).toBe(null);
  });

  test('candidato ya registrado: solo manda su id', () => {
    const datos = construirFormData(VALIDOS, { candidatoExistente: { id: 'c1' }, cv: archivo('cv.pdf') });
    expect(datos.get('candidatoId')).toBe('c1');
    expect(datos.get('nombre')).toBe(null);
  });
});
