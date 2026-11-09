// Carpeta por persona para los CV y descriptores (uploads/Nombre-Apellido-xxxxxx/)
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  limpiarNombre,
  carpetaDePersona,
  rutaDentro,
  guardarEnCarpetaDePersona,
  borrarAdjuntos,
} from '../servicios/archivos.js';

describe('carpeta por persona', () => {
  let base;
  const archivoTemporal = (nombre) => {
    const ruta = path.join(base, nombre);
    fs.writeFileSync(ruta, '%PDF-1.4 prueba');
    return ruta;
  };
  const valentina = { nombre: 'Valentina Ríos', correo: 'valentina@ejemplo.cl' };

  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'adjuntos-'));
  });

  test('el nombre de la carpeta queda sin tildes ni símbolos', () => {
    expect(limpiarNombre("José Ñúñez O'Higgins")).toBe('Jose-Nunez-OHiggins');
    expect(limpiarNombre('   ')).toBe('Sin-nombre');
  });

  test('la misma persona (mismo correo) siempre cae en la misma carpeta', () => {
    expect(carpetaDePersona('Valentina Ríos', 'VALENTINA@ejemplo.cl')).toBe(carpetaDePersona('Valentina Ríos', 'valentina@ejemplo.cl'));
    expect(carpetaDePersona('Valentina Ríos', 'valentina@ejemplo.cl')).toMatch(/^Valentina-Rios-[0-9a-f]{6}$/);
  });

  test('dos personas con el mismo nombre no se mezclan', () => {
    expect(carpetaDePersona('Valentina Ríos', 'a@ejemplo.cl')).not.toBe(carpetaDePersona('Valentina Ríos', 'b@ejemplo.cl'));
  });

  test('guarda el archivo en la carpeta y no pisa uno que ya existe', async () => {
    const primero = await guardarEnCarpetaDePersona(base, archivoTemporal('a.pdf'), { ...valentina, tipo: 'CV' });
    const segundo = await guardarEnCarpetaDePersona(base, archivoTemporal('b.pdf'), { ...valentina, tipo: 'CV' });
    expect(primero).toMatch(/^Valentina-Rios-[0-9a-f]{6}\/CV\.pdf$/);
    expect(segundo).toBe(primero.replace('CV.pdf', 'CV-2.pdf'));
    expect(fs.existsSync(path.join(base, 'a.pdf'))).toBe(false); // se movió
  });

  test('nunca permite rutas fuera de la carpeta de adjuntos', () => {
    expect(rutaDentro(base, '../secreto.txt')).toBe(null);
    expect(rutaDentro(base, '/etc/passwd')).toBe(null);
    expect(rutaDentro(base, '')).toBe(null);
  });

  test('al borrar el último archivo también se borra la carpeta vacía', async () => {
    const cv = await guardarEnCarpetaDePersona(base, archivoTemporal('a.pdf'), { ...valentina, tipo: 'CV' });
    const otro = await guardarEnCarpetaDePersona(base, archivoTemporal('b.pdf'), { ...valentina, tipo: 'Descriptor-del-cargo' });
    const carpeta = path.join(base, path.dirname(cv));
    await borrarAdjuntos(base, [cv]);
    expect(fs.existsSync(carpeta)).toBe(true); // aún queda el descriptor
    await borrarAdjuntos(base, [otro]);
    expect(fs.existsSync(carpeta)).toBe(false);
  });
});
