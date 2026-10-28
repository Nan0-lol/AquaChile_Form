// =====================================================================
// SERVICIO DE POSTULACIONES (formulario público /postular)
// Flujo:
//   1. La persona postula desde la página pública (sin cuenta): nombre, RUT,
//      correo, teléfono, área de interés, carta de presentación (opcional) y su CV en PDF.
//   2. Queda "Por revisar" en la bandeja del analista.
//   3. El analista la revisa y:
//        - la pasa a evaluación → se crea la solicitud con esos datos y el CV, o
//        - la descarta (y puede reabrirla si se equivocó).
// La página pública solo ENVÍA datos: nunca muestra nada del sistema.
// =====================================================================
import { validarPostulacion, hayErrores } from '../validaciones.js';
import { ESTADOS_POSTULACION, esClave } from '../modelos/catalogos.js';
import { aPostulacion } from './formato.js';
import { noEncontrado, datosInvalidos, reglaNegocio } from './errores.js';

const POSTULACION = 'La postulación';

const obtenerFila = (repo, id) => {
  const fila = repo.postulaciones.obtener(id);
  if (!fila) throw noEncontrado(POSTULACION);
  return fila;
};

/**
 * Recibe una postulación del formulario público.
 * @param {object} body  campos del formulario
 * @param {object|null} cv  archivo subido ({ filename, originalname, size } de multer)
 * @returns {{ id: string|null, ignorada: boolean }}
 *   ignorada = true si la llenó un bot (campo trampa): no se guarda, pero se
 *   responde igual que a una persona para que el bot no se dé cuenta.
 */
export function recibirPostulacion(repo, body = {}, cv = null) {
  if (typeof body.sitioWeb === 'string' && body.sitioWeb.trim()) return { id: null, ignorada: true };

  const { errores, datos } = validarPostulacion(body);
  if (!cv) errores.cv = 'Adjunta tu CV en PDF.';
  if (hayErrores(errores)) throw datosInvalidos(errores);

  const id = repo.postulaciones.crear({
    ...datos,
    cvArchivo: cv.filename,
    cvNombreOriginal: cv.originalname,
    cvBytes: cv.size,
  });
  return { id, ignorada: false };
}

/** Filtros: estado (nueva | en_evaluacion | descartada) y q (texto libre) */
export function listarPostulaciones(repo, filtros = {}) {
  const limpios = {};
  if (esClave(ESTADOS_POSTULACION, filtros.estado)) limpios.estado = filtros.estado;
  if (typeof filtros.q === 'string' && filtros.q.trim()) limpios.q = filtros.q.trim().slice(0, 100);
  return repo.postulaciones.listar(limpios).map(aPostulacion);
}

export function obtenerPostulacion(repo, id) {
  return aPostulacion(obtenerFila(repo, id));
}

/**
 * Descartar ('descartada') o volver a dejar por revisar ('nueva').
 * Pasarla a evaluación se hace creando la solicitud (ver crearSolicitud).
 */
export function cambiarEstadoPostulacion(repo, usuario, id, estado) {
  if (estado !== 'nueva' && estado !== 'descartada') {
    throw datosInvalidos({ estado: 'Estado no válido.' }, 'Estado no válido.');
  }
  const fila = obtenerFila(repo, id);
  if (fila.estado === 'en_evaluacion') {
    throw reglaNegocio('Esta postulación ya pasó a evaluación: revisa su solicitud.');
  }
  if (fila.estado !== estado) repo.postulaciones.cambiarEstado(id, estado, usuario.id);
  return obtenerPostulacion(repo, id);
}

/**
 * La postulación debe seguir "por revisar" para crear su solicitud.
 * Devuelve la fila (la ruta usa su CV si el analista no sube otro).
 */
export function postulacionParaEvaluar(repo, id) {
  const fila = obtenerFila(repo, id);
  if (fila.estado === 'en_evaluacion') throw reglaNegocio('Esta postulación ya pasó a evaluación.');
  if (fila.estado === 'descartada') throw reglaNegocio('Esta postulación fue descartada. Reábrela primero.');
  return fila;
}

/** Datos del CV para descargarlo */
export function archivoDePostulacion(repo, id) {
  const fila = obtenerFila(repo, id);
  return { archivo: fila.cv_archivo, nombre: fila.cv_nombre_original };
}

/** Borrado permanente (por ejemplo, si la persona pide eliminar sus datos) */
export function eliminarPostulacion(repo, id) {
  const fila = obtenerFila(repo, id);
  repo.postulaciones.eliminar(id);
  return { archivos: [fila.cv_archivo] };
}
