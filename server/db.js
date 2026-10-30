// =====================================================================
// ACCESO A DATOS (repositorio)
// Única capa que habla con la base de datos. Todas las consultas usan
// parámetros (?) para que lo que escriba un usuario nunca se ejecute como SQL.
//
// Modelo:
//   usuarios ──┐ (analista que pide / evaluador responsable)
//   candidatos ─┴─< solicitudes ──1:1── evaluaciones
//                        └──< historial (quién hizo qué y cuándo)
//   postulaciones (formulario público) ──> solicitud (cuando el analista la pasa a evaluación)
// =====================================================================
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// SQLite viene incluido en Node 22.5+. Se carga con require (y no con import)
// para que funcione igual al correr el servidor y al correr las pruebas con Vitest.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// La base se guarda en server/data/aquachile.db
// (se puede cambiar la carpeta con la variable de entorno CARPETA_DATOS)
const CARPETA_DATOS = process.env.CARPETA_DATOS || path.join(__dirname, 'data');

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id             TEXT PRIMARY KEY,
    usuario        TEXT NOT NULL UNIQUE,
    nombre         TEXT NOT NULL,
    correo         TEXT NOT NULL DEFAULT '',
    rol            TEXT NOT NULL CHECK (rol IN ('admin', 'analista', 'evaluador', 'jefatura')),
    password_hash  TEXT NOT NULL,
    password_sal   TEXT NOT NULL,
    activo         INTEGER NOT NULL DEFAULT 1,
    creado_en      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS candidatos (
    id              TEXT PRIMARY KEY,
    nombre          TEXT NOT NULL,
    correo          TEXT NOT NULL,
    telefono        TEXT NOT NULL,
    origen          TEXT NOT NULL CHECK (origen IN ('interno', 'externo')),
    creado_en       TEXT NOT NULL,
    actualizado_en  TEXT
  );

  CREATE TABLE IF NOT EXISTS solicitudes (
    id                          TEXT PRIMARY KEY,
    candidato_id                TEXT NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
    analista_id                 TEXT NOT NULL REFERENCES usuarios(id),
    evaluador_id                TEXT REFERENCES usuarios(id),
    familia_cargo               TEXT NOT NULL,
    nombre_cargo                TEXT NOT NULL,
    ubicacion                   TEXT NOT NULL,
    unidad                      TEXT NOT NULL,
    ceco                        TEXT NOT NULL DEFAULT '',
    requiere_referencias        INTEGER NOT NULL DEFAULT 0,
    referido                    INTEGER NOT NULL DEFAULT 0,
    aspectos_indagar            TEXT NOT NULL DEFAULT '',
    cv_archivo                  TEXT,
    cv_nombre_original          TEXT,
    cv_bytes                    INTEGER,
    descriptor_archivo          TEXT,
    descriptor_nombre_original  TEXT,
    etapa                       TEXT NOT NULL DEFAULT 'recibida'
                                CHECK (etapa IN ('recibida', 'agendada', 'realizada', 'informe_enviado')),
    fecha_solicitud             TEXT NOT NULL,
    actualizado_en              TEXT
  );

  CREATE TABLE IF NOT EXISTS evaluaciones (
    id                TEXT PRIMARY KEY,
    solicitud_id      TEXT NOT NULL UNIQUE REFERENCES solicitudes(id) ON DELETE CASCADE,
    fecha_entrevista  TEXT,
    observaciones     TEXT NOT NULL DEFAULT '',
    resultado         TEXT CHECK (resultado IN ('recomendado', 'recomendado_obs', 'no_recomendado')),
    fecha_informe     TEXT,
    actualizado_en    TEXT
  );

  CREATE TABLE IF NOT EXISTS historial (
    id            TEXT PRIMARY KEY,
    solicitud_id  TEXT NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    usuario_id    TEXT REFERENCES usuarios(id),
    accion        TEXT NOT NULL,
    detalle       TEXT NOT NULL DEFAULT '',
    creado_en     TEXT NOT NULL
  );

  -- Lo que llega desde el formulario público /postular. Queda "nueva" hasta que
  -- el analista la revisa: la pasa a evaluación (crea la solicitud) o la descarta.
  CREATE TABLE IF NOT EXISTS postulaciones (
    id                  TEXT PRIMARY KEY,
    nombre              TEXT NOT NULL,
    correo              TEXT NOT NULL,
    telefono            TEXT NOT NULL,
    area                TEXT NOT NULL,
    cv_archivo          TEXT NOT NULL,
    cv_nombre_original  TEXT NOT NULL,
    cv_bytes            INTEGER NOT NULL,
    estado              TEXT NOT NULL DEFAULT 'nueva'
                        CHECK (estado IN ('nueva', 'en_evaluacion', 'descartada')),
    solicitud_id        TEXT REFERENCES solicitudes(id) ON DELETE SET NULL,
    revisado_por        TEXT REFERENCES usuarios(id),
    revisado_en         TEXT,
    creado_en           TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_postulaciones_estado ON postulaciones (estado, creado_en);
  CREATE INDEX IF NOT EXISTS idx_solicitudes_candidato ON solicitudes (candidato_id);
  CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes (fecha_solicitud);
  CREATE INDEX IF NOT EXISTS idx_solicitudes_etapa ON solicitudes (etapa);
  CREATE INDEX IF NOT EXISTS idx_historial_solicitud ON historial (solicitud_id);
`;

// Consulta base de una solicitud con su candidato, personas y evaluación
const SELECT_SOLICITUD = `
  SELECT s.*,
         c.nombre   AS candidato_nombre,
         c.correo   AS candidato_correo,
         c.telefono AS candidato_telefono,
         c.origen   AS candidato_origen,
         a.nombre   AS analista_nombre,
         a.correo   AS analista_correo,
         ev.nombre  AS evaluador_nombre,
         ev.correo  AS evaluador_correo,
         e.fecha_entrevista,
         e.observaciones,
         e.resultado,
         e.fecha_informe
    FROM solicitudes s
    JOIN candidatos c   ON c.id = s.candidato_id
    JOIN usuarios a     ON a.id = s.analista_id
    LEFT JOIN usuarios ev ON ev.id = s.evaluador_id
    LEFT JOIN evaluaciones e ON e.solicitud_id = s.id
`;

const ahoraIso = () => new Date().toISOString();
const nuevoId = () => crypto.randomUUID();
// SQLite guarda booleanos como 0/1
const bit = (valor) => (valor ? 1 : 0);

/**
 * Abre (o crea) la base de datos y devuelve funciones para usarla.
 * Para pruebas se puede pasar ':memory:' y no se escribe nada en disco.
 */
export function crearRepositorio(ruta) {
  let rutaFinal = ruta;
  if (!rutaFinal) {
    fs.mkdirSync(CARPETA_DATOS, { recursive: true });
    rutaFinal = path.join(CARPETA_DATOS, 'aquachile.db');
  }

  const db = new DatabaseSync(rutaFinal);
  db.exec('PRAGMA foreign_keys = ON;'); // activa las relaciones (y el borrado en cascada)
  // Versiones de prueba anteriores crearon "postulaciones" con otros campos: se rehace
  // (solo tenía datos ficticios de demostración)
  const columnasPostulacion = db.prepare('PRAGMA table_info(postulaciones)').all().map((c) => c.name);
  if (columnasPostulacion.length && (columnasPostulacion.includes('rut') || !columnasPostulacion.includes('area'))) {
    db.exec('DROP TABLE postulaciones');
  }
  db.exec(ESQUEMA);

  const q = (sql) => db.prepare(sql);

  // Ejecuta varias operaciones como una sola: o se guardan todas, o ninguna
  const transaccion = (fn) => {
    db.exec('BEGIN');
    try {
      const resultado = fn();
      db.exec('COMMIT');
      return resultado;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  // -------------------------------------------------------------------
  // USUARIOS
  // -------------------------------------------------------------------
  const usuarios = {
    crear({ usuario, nombre, correo = '', rol, passwordHash, passwordSal }) {
      const id = nuevoId();
      q(`INSERT INTO usuarios (id, usuario, nombre, correo, rol, password_hash, password_sal, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, usuario, nombre, correo, rol, passwordHash, passwordSal, ahoraIso()
      );
      return id;
    },
    buscarPorUsuario(usuario) {
      return q('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1').get(usuario) ?? null;
    },
    obtener(id) {
      return q('SELECT * FROM usuarios WHERE id = ?').get(id) ?? null;
    },
    /** Lista pública (sin contraseñas), opcionalmente filtrada por rol */
    listar({ rol } = {}) {
      const sql = `SELECT id, usuario, nombre, correo, rol FROM usuarios WHERE activo = 1
                   ${rol ? 'AND rol = ?' : ''} ORDER BY nombre`;
      return rol ? q(sql).all(rol) : q(sql).all();
    },
    contar() {
      return Number(q('SELECT COUNT(*) AS n FROM usuarios').get().n);
    },
  };

  // -------------------------------------------------------------------
  // CANDIDATOS
  // -------------------------------------------------------------------
  const candidatos = {
    crear({ nombre, correo, telefono, origen }) {
      const id = nuevoId();
      q(`INSERT INTO candidatos (id, nombre, correo, telefono, origen, creado_en)
         VALUES (?, ?, ?, ?, ?, ?)`).run(id, nombre, correo, telefono, origen, ahoraIso());
      return id;
    },
    /** Actualiza solo los campos que vienen */
    actualizar(id, campos) {
      const columnas = { nombre: 'nombre', correo: 'correo', telefono: 'telefono', origen: 'origen' };
      const sets = [];
      const valores = [];
      for (const [campo, columna] of Object.entries(columnas)) {
        if (Object.hasOwn(campos, campo)) {
          sets.push(`${columna} = ?`);
          valores.push(campos[campo]);
        }
      }
      if (sets.length === 0) return Boolean(candidatos.obtener(id));
      sets.push('actualizado_en = ?');
      valores.push(ahoraIso(), id);
      return Number(q(`UPDATE candidatos SET ${sets.join(', ')} WHERE id = ?`).run(...valores).changes) > 0;
    },
    obtener(id) {
      return q('SELECT * FROM candidatos WHERE id = ?').get(id) ?? null;
    },
    buscarPorCorreo(correo) {
      return q('SELECT * FROM candidatos WHERE correo = ?').get(correo) ?? null;
    },
    /** Lista con la cantidad de solicitudes y la última etapa de cada candidato */
    listar({ q: busqueda } = {}) {
      const base = `
        SELECT c.*,
               COUNT(s.id) AS total_solicitudes,
               MAX(s.fecha_solicitud) AS ultima_solicitud
          FROM candidatos c
          LEFT JOIN solicitudes s ON s.candidato_id = c.id`;
      if (busqueda) {
        const patron = `%${busqueda.toLowerCase()}%`;
        return q(`${base}
          WHERE lower(c.nombre) LIKE ? OR lower(c.correo) LIKE ?
          GROUP BY c.id ORDER BY c.nombre`).all(patron, patron);
      }
      return q(`${base} GROUP BY c.id ORDER BY c.nombre`).all();
    },
    /** Archivos de todas sus solicitudes (para borrarlos del disco) */
    archivos(id) {
      return q(`SELECT cv_archivo, descriptor_archivo FROM solicitudes WHERE candidato_id = ?`).all(id);
    },
    /** Borra al candidato y, en cascada, sus solicitudes, evaluaciones e historial */
    eliminar(id) {
      return Number(q('DELETE FROM candidatos WHERE id = ?').run(id).changes) > 0;
    },
    contar() {
      return Number(q('SELECT COUNT(*) AS n FROM candidatos').get().n);
    },
  };

  // -------------------------------------------------------------------
  // SOLICITUDES
  // -------------------------------------------------------------------
  const COLUMNAS_SOLICITUD = {
    evaluadorId: 'evaluador_id',
    familiaCargo: 'familia_cargo',
    nombreCargo: 'nombre_cargo',
    ubicacion: 'ubicacion',
    unidad: 'unidad',
    ceco: 'ceco',
    requiereReferencias: 'requiere_referencias',
    referido: 'referido',
    aspectosIndagar: 'aspectos_indagar',
  };
  const BOOLEANAS = new Set(['requiereReferencias', 'referido']);

  const solicitudes = {
    crear(s) {
      const id = s.id ?? nuevoId();
      q(`INSERT INTO solicitudes (
           id, candidato_id, analista_id, evaluador_id, familia_cargo, nombre_cargo, ubicacion,
           unidad, ceco, requiere_referencias, referido, aspectos_indagar,
           cv_archivo, cv_nombre_original, cv_bytes, descriptor_archivo, descriptor_nombre_original,
           etapa, fecha_solicitud
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id,
        s.candidatoId,
        s.analistaId,
        s.evaluadorId ?? null,
        s.familiaCargo,
        s.nombreCargo,
        s.ubicacion,
        s.unidad,
        s.ceco ?? '',
        bit(s.requiereReferencias),
        bit(s.referido),
        s.aspectosIndagar ?? '',
        s.cvArchivo ?? null,
        s.cvNombreOriginal ?? null,
        s.cvBytes ?? null,
        s.descriptorArchivo ?? null,
        s.descriptorNombreOriginal ?? null,
        s.etapa ?? 'recibida',
        s.fechaSolicitud ?? ahoraIso()
      );
      return id;
    },
    actualizar(id, campos) {
      const sets = [];
      const valores = [];
      for (const [campo, columna] of Object.entries(COLUMNAS_SOLICITUD)) {
        if (Object.hasOwn(campos, campo)) {
          sets.push(`${columna} = ?`);
          valores.push(BOOLEANAS.has(campo) ? bit(campos[campo]) : campos[campo]);
        }
      }
      if (sets.length === 0) return Boolean(solicitudes.obtener(id));
      sets.push('actualizado_en = ?');
      valores.push(ahoraIso(), id);
      return Number(q(`UPDATE solicitudes SET ${sets.join(', ')} WHERE id = ?`).run(...valores).changes) > 0;
    },
    cambiarEtapa(id, etapa) {
      return (
        Number(q('UPDATE solicitudes SET etapa = ?, actualizado_en = ? WHERE id = ?').run(etapa, ahoraIso(), id).changes) > 0
      );
    },
    obtener(id) {
      return q(`${SELECT_SOLICITUD} WHERE s.id = ?`).get(id) ?? null;
    },
    /**
     * Filtros opcionales: etapa, familiaCargo, evaluadorId, candidatoId,
     * desde / hasta (YYYY-MM-DD, sobre la fecha de solicitud) y q (texto libre)
     */
    listar(filtros = {}) {
      const condiciones = [];
      const valores = [];
      const filtro = (sql, valor) => {
        condiciones.push(sql);
        valores.push(valor);
      };
      if (filtros.etapa) filtro('s.etapa = ?', filtros.etapa);
      if (filtros.familiaCargo) filtro('s.familia_cargo = ?', filtros.familiaCargo);
      if (filtros.evaluadorId) filtro('s.evaluador_id = ?', filtros.evaluadorId);
      if (filtros.candidatoId) filtro('s.candidato_id = ?', filtros.candidatoId);
      if (filtros.desde) filtro('s.fecha_solicitud >= ?', filtros.desde);
      // "hasta" incluye todo ese día
      if (filtros.hasta) filtro('s.fecha_solicitud < ?', `${filtros.hasta}T23:59:59.999Z`);
      if (filtros.q) {
        const patron = `%${String(filtros.q).toLowerCase()}%`;
        condiciones.push('(lower(c.nombre) LIKE ? OR lower(s.nombre_cargo) LIKE ? OR lower(c.correo) LIKE ?)');
        valores.push(patron, patron, patron);
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      return q(`${SELECT_SOLICITUD} ${where} ORDER BY s.fecha_solicitud DESC`).all(...valores);
    },
    eliminar(id) {
      return Number(q('DELETE FROM solicitudes WHERE id = ?').run(id).changes) > 0;
    },
    contar() {
      return Number(q('SELECT COUNT(*) AS n FROM solicitudes').get().n);
    },
  };

  // -------------------------------------------------------------------
  // EVALUACIONES (una por solicitud; se crea al guardar por primera vez)
  // -------------------------------------------------------------------
  const COLUMNAS_EVALUACION = {
    fechaEntrevista: 'fecha_entrevista',
    observaciones: 'observaciones',
    resultado: 'resultado',
    fechaInforme: 'fecha_informe',
  };

  const evaluaciones = {
    obtenerPorSolicitud(solicitudId) {
      return q('SELECT * FROM evaluaciones WHERE solicitud_id = ?').get(solicitudId) ?? null;
    },
    /** Crea la evaluación si no existe y actualiza solo los campos que vienen */
    guardar(solicitudId, campos) {
      if (!evaluaciones.obtenerPorSolicitud(solicitudId)) {
        q('INSERT INTO evaluaciones (id, solicitud_id, actualizado_en) VALUES (?, ?, ?)').run(
          nuevoId(), solicitudId, ahoraIso()
        );
      }
      const sets = [];
      const valores = [];
      for (const [campo, columna] of Object.entries(COLUMNAS_EVALUACION)) {
        if (Object.hasOwn(campos, campo)) {
          sets.push(`${columna} = ?`);
          valores.push(campos[campo]);
        }
      }
      if (sets.length) {
        sets.push('actualizado_en = ?');
        valores.push(ahoraIso(), solicitudId);
        q(`UPDATE evaluaciones SET ${sets.join(', ')} WHERE solicitud_id = ?`).run(...valores);
      }
      return evaluaciones.obtenerPorSolicitud(solicitudId);
    },
  };

  // -------------------------------------------------------------------
  // HISTORIAL (trazabilidad: quién hizo qué y cuándo)
  // -------------------------------------------------------------------
  const historial = {
    registrar(solicitudId, usuarioId, accion, detalle = '') {
      q(`INSERT INTO historial (id, solicitud_id, usuario_id, accion, detalle, creado_en)
         VALUES (?, ?, ?, ?, ?, ?)`).run(nuevoId(), solicitudId, usuarioId ?? null, accion, detalle, ahoraIso());
    },
    listar(solicitudId) {
      return q(`SELECT h.*, u.nombre AS usuario_nombre
                  FROM historial h LEFT JOIN usuarios u ON u.id = h.usuario_id
                 WHERE h.solicitud_id = ?
                 ORDER BY h.creado_en DESC, h.rowid DESC`).all(solicitudId);
    },
  };

  // -------------------------------------------------------------------
  // POSTULACIONES (formulario público)
  // -------------------------------------------------------------------
  // candidato_id: si ya hay un candidato con ese correo (para no duplicarlo)
  const SELECT_POSTULACION = `
    SELECT p.*,
           r.nombre AS revisor_nombre,
           (SELECT c.id FROM candidatos c WHERE c.correo = p.correo) AS candidato_id
      FROM postulaciones p
      LEFT JOIN usuarios r ON r.id = p.revisado_por`;

  const postulaciones = {
    crear(p) {
      const id = nuevoId();
      q(`INSERT INTO postulaciones (
           id, nombre, correo, telefono, area,
           cv_archivo, cv_nombre_original, cv_bytes, creado_en
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, p.nombre, p.correo, p.telefono, p.area,
        p.cvArchivo, p.cvNombreOriginal, p.cvBytes, p.creadoEn ?? ahoraIso()
      );
      return id;
    },
    obtener(id) {
      return q(`${SELECT_POSTULACION} WHERE p.id = ?`).get(id) ?? null;
    },
    /** Filtros opcionales: estado y q (nombre o correo) */
    listar({ estado, q: busqueda } = {}) {
      const condiciones = [];
      const valores = [];
      if (estado) {
        condiciones.push('p.estado = ?');
        valores.push(estado);
      }
      if (busqueda) {
        const patron = `%${busqueda.toLowerCase()}%`;
        condiciones.push('(lower(p.nombre) LIKE ? OR lower(p.correo) LIKE ?)');
        valores.push(patron, patron);
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      return q(`${SELECT_POSTULACION} ${where} ORDER BY p.creado_en DESC`).all(...valores);
    },
    /** Cambia el estado y deja registro de quién la revisó */
    cambiarEstado(id, estado, usuarioId, solicitudId = null) {
      return (
        Number(
          q(`UPDATE postulaciones SET estado = ?, solicitud_id = ?, revisado_por = ?, revisado_en = ?
              WHERE id = ?`).run(estado, solicitudId, usuarioId ?? null, ahoraIso(), id).changes
        ) > 0
      );
    },
    eliminar(id) {
      return Number(q('DELETE FROM postulaciones WHERE id = ?').run(id).changes) > 0;
    },
    contar({ estado } = {}) {
      const fila = estado
        ? q('SELECT COUNT(*) AS n FROM postulaciones WHERE estado = ?').get(estado)
        : q('SELECT COUNT(*) AS n FROM postulaciones').get();
      return Number(fila.n);
    },
  };

  return {
    usuarios,
    candidatos,
    solicitudes,
    evaluaciones,
    historial,
    postulaciones,
    transaccion,
    cerrar() {
      db.close();
    },
  };
}
