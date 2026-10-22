import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// La base se guarda en server/data/postulaciones.db
// (se puede cambiar la carpeta con la variable de entorno CARPETA_DATOS)
const CARPETA_DATOS = process.env.CARPETA_DATOS || path.join(__dirname, 'data');

// Columnas agregadas después de la primera versión de la tabla.
// Si la base ya existía, se agregan solas al arrancar (no se pierde nada).
const COLUMNAS_NUEVAS = {
  rut: "TEXT NOT NULL DEFAULT ''",
  carta: "TEXT NOT NULL DEFAULT ''",
  estado: "TEXT NOT NULL DEFAULT 'pendiente'",
  actualizado_en: 'TEXT',
};

/**
 * Abre (o crea) la base de datos y devuelve funciones para usarla.
 * Para pruebas se puede pasar ':memory:' y no se escribe nada en disco.
 */
export function crearRepositorio(ruta) {
  let rutaFinal = ruta;
  if (!rutaFinal) {
    fs.mkdirSync(CARPETA_DATOS, { recursive: true });
    rutaFinal = path.join(CARPETA_DATOS, 'postulaciones.db');
  }

  const db = new DatabaseSync(rutaFinal);

  // Nota: la columna familia_cargo guarda el "área de interés" del formulario.
  db.exec(`
    CREATE TABLE IF NOT EXISTS postulaciones (
      id                 TEXT PRIMARY KEY,
      nombre_completo    TEXT NOT NULL,
      correo             TEXT NOT NULL,
      celular            TEXT NOT NULL,
      familia_cargo      TEXT NOT NULL,
      nombre_cargo       TEXT NOT NULL,
      cv_archivo         TEXT NOT NULL,
      cv_nombre_original TEXT NOT NULL,
      cv_bytes           INTEGER NOT NULL,
      creado_en          TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_postulaciones_creado_en
      ON postulaciones (creado_en);
  `);

  // Migración: agrega las columnas que falten
  const existentes = new Set(
    db.prepare('PRAGMA table_info(postulaciones)').all().map((c) => c.name)
  );
  for (const [columna, definicion] of Object.entries(COLUMNAS_NUEVAS)) {
    if (!existentes.has(columna)) {
      db.exec(`ALTER TABLE postulaciones ADD COLUMN ${columna} ${definicion}`);
    }
  }

  // Siempre con parámetros (?) para que lo que escriba el usuario
  // nunca se interprete como código SQL.
  const insertar = db.prepare(`
    INSERT INTO postulaciones (
      id, nombre_completo, rut, correo, celular, familia_cargo, nombre_cargo,
      carta, cv_archivo, cv_nombre_original, cv_bytes, estado, creado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)
  `);
  const listarUltimas = db.prepare(
    'SELECT * FROM postulaciones ORDER BY creado_en DESC LIMIT ?'
  );
  const buscarPorId = db.prepare('SELECT * FROM postulaciones WHERE id = ?');
  const cambiarEstado = db.prepare(
    'UPDATE postulaciones SET estado = ?, actualizado_en = ? WHERE id = ?'
  );
  const contarTodas = db.prepare('SELECT COUNT(*) AS total FROM postulaciones');

  return {
    guardar(p) {
      insertar.run(
        p.id,
        p.nombreCompleto,
        p.rut,
        p.correo,
        p.celular,
        p.area,
        p.nombreCargo,
        p.carta ?? '',
        p.cvArchivo,
        p.cvNombreOriginal,
        p.cvBytes,
        p.creadoEn
      );
    },
    listar({ limite = 1000 } = {}) {
      return listarUltimas.all(limite);
    },
    obtener(id) {
      return buscarPorId.get(id) ?? null;
    },
    actualizarEstado(id, estado) {
      const resultado = cambiarEstado.run(estado, new Date().toISOString(), id);
      return Number(resultado.changes) > 0;
    },
    contar() {
      return Number(contarTodas.get().total);
    },
    cerrar() {
      db.close();
    },
  };
}