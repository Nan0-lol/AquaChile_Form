import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// La base se guarda en server/data/postulaciones.db
// (se puede cambiar la carpeta con la variable de entorno CARPETA_DATOS)
const CARPETA_DATOS = process.env.CARPETA_DATOS || path.join(__dirname, 'data');

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

  // Siempre con parámetros (?) para que lo que escriba el usuario
  // nunca se interprete como código SQL.
  const insertar = db.prepare(`
    INSERT INTO postulaciones (
      id, nombre_completo, correo, celular, familia_cargo, nombre_cargo,
      cv_archivo, cv_nombre_original, cv_bytes, creado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const listarUltimas = db.prepare(
    'SELECT * FROM postulaciones ORDER BY creado_en DESC LIMIT ?'
  );
  const contarTodas = db.prepare('SELECT COUNT(*) AS total FROM postulaciones');

  return {
    guardar(p) {
      insertar.run(
        p.id,
        p.nombreCompleto,
        p.correo,
        p.celular,
        p.familiaCargo,
        p.nombreCargo,
        p.cvArchivo,
        p.cvNombreOriginal,
        p.cvBytes,
        p.creadoEn
      );
    },
    listar({ limite = 100 } = {}) {
      return listarUltimas.all(limite);
    },
    contar() {
      return Number(contarTodas.get().total);
    },
    cerrar() {
      db.close();
    },
  };
}