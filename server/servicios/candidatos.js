// =====================================================================
// SERVICIO DE CANDIDATOS: reglas para registrar, editar, consultar y borrar.
// =====================================================================
import { validarCandidato, hayErrores } from '../validaciones.js';
import { aCandidato, aSolicitud } from './formato.js';
import { ErrorServicio, noEncontrado, datosInvalidos } from './errores.js';

const CANDIDATO = 'El candidato';

const correoDuplicado = (existente) =>
  new ErrorServicio(409, `Ya existe un candidato con ese correo: ${existente.nombre}.`, {
    errores: { correo: `Este correo ya está registrado para ${existente.nombre}.` },
    candidatoExistente: { id: existente.id, nombre: existente.nombre },
  });

export function listarCandidatos(repo, { q } = {}) {
  const busqueda = typeof q === 'string' ? q.trim().slice(0, 100) : '';
  return repo.candidatos.listar({ q: busqueda }).map(aCandidato);
}

/** Candidato con todas sus solicitudes (su historia en el proceso) */
export function obtenerCandidato(repo, id) {
  const fila = repo.candidatos.obtener(id);
  if (!fila) throw noEncontrado(CANDIDATO);
  return {
    ...aCandidato(fila),
    solicitudes: repo.solicitudes.listar({ candidatoId: id }).map(aSolicitud),
  };
}

export function crearCandidato(repo, body) {
  const { errores, datos } = validarCandidato(body);
  if (hayErrores(errores)) throw datosInvalidos(errores);
  const existente = repo.candidatos.buscarPorCorreo(datos.correo);
  if (existente) throw correoDuplicado(existente);
  const id = repo.candidatos.crear(datos);
  return aCandidato(repo.candidatos.obtener(id));
}

export function actualizarCandidato(repo, id, body) {
  if (!repo.candidatos.obtener(id)) throw noEncontrado(CANDIDATO);
  const { errores, datos } = validarCandidato(body, { parcial: true });
  if (hayErrores(errores)) throw datosInvalidos(errores);
  if (datos.correo) {
    const existente = repo.candidatos.buscarPorCorreo(datos.correo);
    if (existente && existente.id !== id) throw correoDuplicado(existente);
  }
  repo.candidatos.actualizar(id, datos);
  return aCandidato(repo.candidatos.obtener(id));
}

/**
 * Borra al candidato y todo lo asociado (solicitudes, evaluaciones, historial).
 * Devuelve los nombres de archivo que hay que eliminar del disco.
 */
export function eliminarCandidato(repo, id) {
  if (!repo.candidatos.obtener(id)) throw noEncontrado(CANDIDATO);
  const archivos = repo.candidatos
    .archivos(id)
    .flatMap((f) => [f.cv_archivo, f.descriptor_archivo])
    .filter(Boolean);
  repo.candidatos.eliminar(id);
  return { archivos };
}
