import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearRepositorio } from '../db.js';
import { asegurarUsuariosIniciales, USUARIOS_DEMO } from '../servicios/usuarios.js';
import { cargarDatosDemo, crearPdfSimple } from '../seed.js';
import { validarArchivo } from '../validaciones.js';
import { calcularIndicadores } from '../servicios/indicadores.js';

describe('Usuarios iniciales', () => {
  test('en desarrollo crea los usuarios de demo con su rol', () => {
    const repo = crearRepositorio(':memory:');
    expect(asegurarUsuariosIniciales(repo)).toHaveLength(USUARIOS_DEMO.length);
    expect(repo.usuarios.buscarPorUsuario('jefatura').rol).toBe('jefatura');
    // La segunda vez no crea nada
    expect(asegurarUsuariosIniciales(repo)).toHaveLength(0);
    repo.cerrar();
  });

  test('con ADMIN_USUARIO en el .env crea solo ese administrador', () => {
    const repo = crearRepositorio(':memory:');
    asegurarUsuariosIniciales(repo, { env: { ADMIN_USUARIO: 'Reclutamiento', ADMIN_PASSWORD: 'Clave-Larga-2026' } });
    expect(repo.usuarios.contar()).toBe(1);
    expect(repo.usuarios.buscarPorUsuario('reclutamiento').rol).toBe('admin');
    repo.cerrar();
  });

  test('en producción sin usuarios ni ADMIN_* se niega a arrancar', () => {
    const repo = crearRepositorio(':memory:');
    expect(() => asegurarUsuariosIniciales(repo, { produccion: true })).toThrow();
    repo.cerrar();
  });
});

describe('Datos ficticios de la demo', () => {
  let carpeta;
  let repo;
  beforeAll(() => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'aquachile-seed-'));
    repo = crearRepositorio(':memory:');
    asegurarUsuariosIniciales(repo);
    cargarDatosDemo(repo, { carpetaArchivos: carpeta });
  });
  afterAll(() => {
    repo.cerrar();
    fs.rmSync(carpeta, { recursive: true, force: true });
  });

  test('carga 12 candidatos con solicitudes en las 4 etapas', () => {
    const i = calcularIndicadores(repo);
    expect(i.totalCandidatos).toBe(12);
    expect(i.porEtapa.every((e) => e.cantidad > 0)).toBe(true);
    expect(i.timingPromedioDias).toBe(8.5);
  });

  test('todos los correos son ficticios (@ejemplo.cl)', () => {
    expect(repo.candidatos.listar().every((c) => c.correo.endsWith('@ejemplo.cl'))).toBe(true);
    expect(repo.postulaciones.listar().every((p) => p.correo.endsWith('@ejemplo.cl'))).toBe(true);
  });

  test('incluye postulaciones web por revisar y una descartada', () => {
    expect(repo.postulaciones.contar()).toBe(4);
    expect(calcularIndicadores(repo).postulacionesPorRevisar).toBe(3);
  });

  test('los CV de ejemplo son PDF válidos que el propio sistema acepta', async () => {
    const archivos = fs.readdirSync(carpeta);
    expect(archivos).toHaveLength(16); // 12 de solicitudes + 4 de postulaciones
    expect(await validarArchivo(path.join(carpeta, archivos[0]), '.pdf')).toBe(null);
    expect(crearPdfSimple('Prueba', ['línea con tilde (y paréntesis)']).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
