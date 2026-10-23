import { describe, test, expect } from 'vitest';
import {
  iniciales,
  aFecha,
  tiempoRelativo,
  telefonoInternacional,
  sinAcentos,
  construirCsv,
} from './formato';

const DIA = 86_400_000;
const AHORA = new Date('2026-10-22T15:00:00Z').getTime();
const haceDias = (n) => new Date(AHORA - n * DIA).toISOString();

describe('Formato del dashboard', () => {
  test('iniciales del nombre (máximo 2 letras)', () => {
    expect(iniciales('María José González')).toBe('MJ');
    expect(iniciales('  diego  ')).toBe('D');
    expect(iniciales('')).toBe('?');
  });

  test('fechas inválidas se tratan como vacías', () => {
    expect(aFecha('no es fecha')).toBe(null);
    expect(aFecha(null)).toBe(null);
    expect(aFecha('2026-10-22T10:00:00Z')).toBeTruthy();
  });

  test('tiempo relativo en español', () => {
    expect(tiempoRelativo(haceDias(0), AHORA)).toBe('Hoy');
    expect(tiempoRelativo(haceDias(1), AHORA)).toBe('Ayer');
    expect(tiempoRelativo(haceDias(3), AHORA)).toBe('Hace 3 días');
    expect(tiempoRelativo(haceDias(7), AHORA)).toBe('Hace 1 semana');
    expect(tiempoRelativo(haceDias(15), AHORA)).toBe('Hace 2 semanas');
    expect(tiempoRelativo(haceDias(31), AHORA)).toBe('Hace 1 mes');
    expect(tiempoRelativo(haceDias(65), AHORA)).toBe('Hace 2 meses');
  });

  test('teléfono en formato internacional para WhatsApp', () => {
    expect(telefonoInternacional('+56 9 1234 5678')).toBe('56912345678');
    expect(telefonoInternacional('912345678')).toBe('56912345678');
    expect(telefonoInternacional('')).toBe('');
  });

  test('la búsqueda ignora tildes y mayúsculas', () => {
    expect(sinAcentos('Jorge MUÑOZ Pérez')).toBe('jorge munoz perez');
  });
});

describe('Exportar a Excel', () => {
  const fila = {
    nombre: 'Ana "La Jefa" Soto',
    rut: '12.345.678-5',
    correo: 'ana@gmail.com',
    telefono: '+56912345678',
    cargo: 'Analista',
    area: 'administracion',
    fecha: '2026-10-22T15:00:00Z',
    estado: 'entrevista',
  };

  test('empieza con BOM para que Excel muestre bien las tildes', () => {
    expect(construirCsv([]).startsWith('﻿')).toBe(true);
  });

  test('usa punto y coma y nombres legibles de área y estado', () => {
    const csv = construirCsv([fila]);
    const [encabezado, linea] = csv.slice(1).split('\r\n');
    expect(encabezado).toBe('Nombre;RUT;Correo;Teléfono;Cargo;Área;Fecha;Estado');
    expect(linea).toContain('"Administración y Finanzas"');
    expect(linea).toContain('"Entrevista"');
  });

  test('escapa las comillas del texto del usuario', () => {
    expect(construirCsv([fila])).toContain('"Ana ""La Jefa"" Soto"');
  });

  test('una fila por postulación', () => {
    const csv = construirCsv([fila, fila, fila]);
    expect(csv.split('\r\n')).toHaveLength(4);
  });
});
