import { describe, test, expect } from 'vitest';
import {
  rutEsValido,
  formatearRut,
  formatearTamano,
  esWord,
  validarCv,
  validarCampo,
  MAX_CV_BYTES,
} from './validaciones';

// Simula un archivo como los que entrega <input type="file">
const archivo = (name, size) => ({ name, size });

describe('RUT', () => {
  test('acepta RUT válidos, con o sin puntos y guion', () => {
    expect(rutEsValido('12.345.678-5')).toBe(true);
    expect(rutEsValido('123456785')).toBe(true);
    expect(rutEsValido('11.111.111-1')).toBe(true);
  });

  test('acepta RUT terminados en K (mayúscula o minúscula)', () => {
    expect(rutEsValido('10.000.013-K')).toBe(true);
    expect(rutEsValido('10000013k')).toBe(true);
  });

  test('rechaza un dígito verificador incorrecto', () => {
    expect(rutEsValido('12.345.678-9')).toBe(false);
  });

  test('rechaza RUT demasiado cortos, largos o con letras', () => {
    expect(rutEsValido('1-9')).toBe(false);
    expect(rutEsValido('1234567890-1')).toBe(false);
    expect(rutEsValido('12.3A5.678-5')).toBe(false);
    expect(rutEsValido('')).toBe(false);
  });

  test('formatea con puntos y guion', () => {
    expect(formatearRut('123456785')).toBe('12.345.678-5');
    expect(formatearRut('10000013k')).toBe('10.000.013-K');
    expect(formatearRut('9.876.543-2')).toBe('9.876.543-2');
  });
});

describe('Archivo del CV', () => {
  test('acepta PDF y DOCX dentro del límite', () => {
    expect(validarCv(archivo('cv.pdf', 2048))).toBe('');
    expect(validarCv(archivo('CV.DOCX', 2048))).toBe('');
  });

  test('exige adjuntar un archivo', () => {
    expect(validarCv(null)).toBe('Adjunta tu CV en PDF o DOCX.');
  });

  test('rechaza otros formatos', () => {
    expect(validarCv(archivo('foto.jpg', 2048))).toBe('El archivo debe ser PDF o DOCX.');
    expect(validarCv(archivo('cv.pdf.exe', 2048))).toBe('El archivo debe ser PDF o DOCX.');
  });

  test('rechaza archivos vacíos', () => {
    expect(validarCv(archivo('cv.pdf', 0))).toBe('El archivo está vacío.');
  });

  test('rechaza archivos de más de 5 MB', () => {
    expect(validarCv(archivo('cv.pdf', MAX_CV_BYTES))).toBe('');
    expect(validarCv(archivo('cv.pdf', MAX_CV_BYTES + 1))).toBe('El archivo supera los 5 MB.');
  });

  test('reconoce documentos de Word', () => {
    expect(esWord('Mi_CV.docx')).toBe(true);
    expect(esWord('Mi_CV.pdf')).toBe(false);
  });

  test('muestra el tamaño en KB o MB', () => {
    expect(formatearTamano(2048)).toBe('2 KB');
    expect(formatearTamano(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});

describe('Campos del formulario', () => {
  test('nombre: mínimo 3 caracteres', () => {
    expect(validarCampo('nombre', 'Ana')).toBe('');
    expect(validarCampo('nombre', '  A ')).toBe('Ingresa tu nombre completo.');
  });

  test('correo: formato válido', () => {
    expect(validarCampo('correo', 'maria@gmail.com')).toBe('');
    expect(validarCampo('correo', 'maria@gmail')).toBe('Correo con formato inválido.');
    expect(validarCampo('correo', '')).toBe('Ingresa tu correo.');
  });

  test('teléfono: celular chileno de 9 dígitos que empieza con 9', () => {
    expect(validarCampo('telefono', '9 1234 5678')).toBe('');
    expect(validarCampo('telefono', '812345678')).toBe('Debe tener 9 dígitos y comenzar con 9.');
    expect(validarCampo('telefono', '91234')).toBe('Debe tener 9 dígitos y comenzar con 9.');
  });

  test('área: obligatoria', () => {
    expect(validarCampo('area', 'planta')).toBe('');
    expect(validarCampo('area', '')).toBe('Selecciona un área.');
  });

  test('cargo: obligatorio, entre 2 y 100 caracteres', () => {
    expect(validarCampo('cargo', 'Operario')).toBe('');
    expect(validarCampo('cargo', '')).toBe('Indica el cargo al que postulas.');
    expect(validarCampo('cargo', 'x'.repeat(101))).toBe('El cargo debe tener entre 2 y 100 caracteres.');
  });

  test('carta: opcional, máximo 3.000 caracteres', () => {
    expect(validarCampo('carta', '')).toBe('');
    expect(validarCampo('carta', 'x'.repeat(3001))).toBe('La carta puede tener hasta 3.000 caracteres.');
  });
});
