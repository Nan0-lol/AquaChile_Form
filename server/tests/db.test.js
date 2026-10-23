import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearRepositorio } from '../db.js';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

const postulacion = (id, cambios = {}) => ({
  id,
  nombreCompleto: 'María González',
  rut: '12.345.678-5',
  correo: 'maria@gmail.com',
  celular: '+56912345678',
  area: 'planta',
  nombreCargo: 'Operaria',
  carta: 'Hola\ncon saltos de línea',
  cvArchivo: `${id}.pdf`,
  cvNombreOriginal: 'CV_Maria.pdf',
  cvBytes: 2048,
  creadoEn: new Date().toISOString(),
  ...cambios,
});

describe('Repositorio de postulaciones', () => {
  let repo;

  // Cada prueba usa una base nueva en memoria: no toca tu postulaciones.db
  beforeEach(() => {
    repo = crearRepositorio(':memory:');
  });

  afterEach(() => {
    repo.cerrar();
  });

  test('guarda y recupera todos los campos', () => {
    repo.guardar(postulacion('a'));
    const fila = repo.obtener('a');
    expect(fila.nombre_completo).toBe('María González');
    expect(fila.rut).toBe('12.345.678-5');
    expect(fila.familia_cargo).toBe('planta');
    expect(fila.carta).toContain('\n');
    expect(fila.estado).toBe('pendiente');
  });

  test('lista de la más nueva a la más antigua', () => {
    repo.guardar(postulacion('vieja', { creadoEn: '2026-01-01T00:00:00Z' }));
    repo.guardar(postulacion('nueva', { creadoEn: '2026-10-01T00:00:00Z' }));
    expect(repo.listar().map((f) => f.id)).toEqual(['nueva', 'vieja']);
    expect(repo.contar()).toBe(2);
  });

  test('cambia el estado y avisa si la postulación no existe', () => {
    repo.guardar(postulacion('a'));
    expect(repo.actualizarEstado('a', 'entrevista')).toBe(true);
    expect(repo.obtener('a').estado).toBe('entrevista');
    expect(repo.obtener('a').actualizado_en).toBeTruthy();
    expect(repo.actualizarEstado('no-existe', 'revision')).toBe(false);
  });

  test('elimina solo la postulación indicada', () => {
    repo.guardar(postulacion('a'));
    repo.guardar(postulacion('b'));
    expect(repo.eliminar('a')).toBe(true);
    expect(repo.obtener('a')).toBe(null);
    expect(repo.obtener('b')).toBeTruthy();
    expect(repo.eliminar('a')).toBe(false);
  });

  test('resiste intentos de inyección SQL', () => {
    repo.guardar(postulacion('a'));
    expect(repo.obtener("a' OR '1'='1")).toBe(null);
    expect(repo.eliminar("x' OR '1'='1")).toBe(false);
    expect(repo.contar()).toBe(1);
  });
});

describe('Migración de una base antigua', () => {
  let carpeta;

  beforeEach(() => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'aquachile-db-'));
  });

  afterEach(() => {
    fs.rmSync(carpeta, { recursive: true, force: true });
  });

  test('agrega las columnas nuevas sin perder las postulaciones existentes', () => {
    const ruta = path.join(carpeta, 'vieja.db');
    // Base con la estructura de la primera versión (sin rut, carta ni estado)
    const vieja = new DatabaseSync(ruta);
    vieja.exec(`
      CREATE TABLE postulaciones (
        id TEXT PRIMARY KEY, nombre_completo TEXT NOT NULL, correo TEXT NOT NULL,
        celular TEXT NOT NULL, familia_cargo TEXT NOT NULL, nombre_cargo TEXT NOT NULL,
        cv_archivo TEXT NOT NULL, cv_nombre_original TEXT NOT NULL,
        cv_bytes INTEGER NOT NULL, creado_en TEXT NOT NULL
      );
      INSERT INTO postulaciones VALUES
        ('antigua', 'Fernando Castillo', 'f@c.cl', '+56912345678', 'tecnologia',
         'Dev', 'x.pdf', 'cv.pdf', 100, '2026-10-20T10:00:00Z');
    `);
    vieja.close();

    const repo = crearRepositorio(ruta);
    const fila = repo.obtener('antigua');
    expect(fila.nombre_completo).toBe('Fernando Castillo');
    expect(fila.estado).toBe('pendiente');
    expect(fila.rut).toBe('');
    repo.cerrar();
  });
});
