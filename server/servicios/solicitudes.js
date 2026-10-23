// =====================================================================
// SERVICIO DE SOLICITUDES DE EVALUACIÓN PSICOLABORAL
// Aquí viven las reglas del proceso:
//   - Una solicitud siempre tiene candidato, analista, cargo y CV.
//   - "Entrevista agendada" y "realizada" exigen la fecha de la entrevista.
//   - "Informe enviado" exige el resultado; si falta la fecha del informe, se pone hoy.
//   - Si un evaluador avanza una solicitud sin responsable, queda asignada a él.
//   - Todo cambio queda en el historial (quién, qué y cuándo).
// =====================================================================
import {
  validarCandidato,
  validarSolicitud,
  validarEvaluacion,
  hayErrores,
} from '../validaciones.js';
import { ETAPAS, ORDEN_ETAPAS, FAMILIAS_CARGO, RESULTADOS, esClave } from '../modelos/catalogos.js';
import { aSolicitud, aHistorial } from './formato.js';
import { ErrorServicio, noEncontrado, datosInvalidos, reglaNegocio } from './errores.js';

const SOLICITUD = 'La solicitud';
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Fechas en hora local del servidor (el mismo formato que usan los formularios)
const hoy = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
const ahoraLocal = () => {
  const d = new Date();
  return `${d.toLocaleDateString('sv-SE')}T${d.toTimeString().slice(0, 5)}`; // YYYY-MM-DDTHH:MM
};
const diaLocal = (iso) => new Date(iso).toLocaleDateString('sv-SE');
const sumarDias = (dia, dias) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
// Una entrevista se agenda, a más tardar, dentro del año siguiente a la solicitud
const MAX_DIAS_ENTREVISTA = 365;
const ETAPAS_CON_ENTREVISTA_HECHA = ['realizada', 'informe_enviado'];

const NOMBRES_CAMPOS = {
  evaluadorId: 'responsable',
  familiaCargo: 'familia de cargo',
  nombreCargo: 'cargo',
  ubicacion: 'ubicación',
  unidad: 'unidad',
  ceco: 'centro de costo',
  requiereReferencias: 'referencias',
  referido: 'referido',
  aspectosIndagar: 'aspectos a indagar',
  fechaEntrevista: 'fecha de entrevista',
  observaciones: 'observaciones',
  resultado: 'resultado',
  fechaInforme: 'fecha del informe',
};
const listarCampos = (datos) => Object.keys(datos).map((c) => NOMBRES_CAMPOS[c] ?? c).join(', ');

const obtenerFila = (repo, id) => {
  const fila = repo.solicitudes.obtener(id);
  if (!fila) throw noEncontrado(SOLICITUD);
  return fila;
};

/** El responsable debe existir y tener rol de evaluador */
const revisarEvaluador = (repo, evaluadorId, errores) => {
  if (!evaluadorId) return;
  const evaluador = repo.usuarios.obtener(evaluadorId);
  if (!evaluador || evaluador.rol !== 'evaluador' || !evaluador.activo) {
    errores.evaluadorId = 'Selecciona un profesional evaluador válido.';
  }
};

// ---------------------------------------------------------------------
// CONSULTAR
// ---------------------------------------------------------------------
/** Filtros aceptados: etapa, familiaCargo, evaluadorId, desde, hasta, q (los inválidos se ignoran) */
export function listarSolicitudes(repo, filtros = {}) {
  const limpios = {};
  if (esClave(ETAPAS, filtros.etapa)) limpios.etapa = filtros.etapa;
  if (esClave(FAMILIAS_CARGO, filtros.familiaCargo)) limpios.familiaCargo = filtros.familiaCargo;
  if (typeof filtros.evaluadorId === 'string' && filtros.evaluadorId) limpios.evaluadorId = filtros.evaluadorId;
  if (REGEX_FECHA.test(filtros.desde ?? '')) limpios.desde = filtros.desde;
  if (REGEX_FECHA.test(filtros.hasta ?? '')) limpios.hasta = filtros.hasta;
  if (typeof filtros.q === 'string' && filtros.q.trim()) limpios.q = filtros.q.trim().slice(0, 100);
  return repo.solicitudes.listar(limpios).map(aSolicitud);
}

/** Detalle completo: solicitud, candidato, evaluación e historial */
export function obtenerSolicitud(repo, id) {
  const fila = obtenerFila(repo, id);
  return { ...aSolicitud(fila), historial: repo.historial.listar(id).map(aHistorial) };
}

// ---------------------------------------------------------------------
// CREAR (lo hace el analista; reemplaza al formulario de Forms)
// ---------------------------------------------------------------------
/**
 * @param {object} usuario  quien crea la solicitud (req.usuario)
 * @param {object} body     datos del formulario
 * @param {{cv?: object, descriptor?: object}} archivos  { filename, originalname, size } de multer
 *
 * El candidato puede ser uno ya registrado (body.candidatoId) o uno nuevo
 * (body.nombre, body.correo, body.telefono, body.origen).
 */
export function crearSolicitud(repo, usuario, body = {}, archivos = {}) {
  const errores = {};
  let candidatoId = typeof body.candidatoId === 'string' ? body.candidatoId.trim() : '';
  let datosCandidato = null;

  if (candidatoId) {
    if (!repo.candidatos.obtener(candidatoId)) errores.candidatoId = 'El candidato seleccionado no existe.';
  } else {
    const resultado = validarCandidato(body);
    Object.assign(errores, resultado.errores);
    datosCandidato = resultado.datos;
    if (!resultado.errores.correo) {
      const existente = repo.candidatos.buscarPorCorreo(datosCandidato.correo);
      if (existente) {
        throw new ErrorServicio(409, `Ya existe un candidato con ese correo: ${existente.nombre}.`, {
          errores: { correo: `Este correo ya está registrado para ${existente.nombre}. Selecciónalo de la lista.` },
          candidatoExistente: { id: existente.id, nombre: existente.nombre },
        });
      }
    }
  }

  const { errores: erroresSolicitud, datos } = validarSolicitud(body);
  Object.assign(errores, erroresSolicitud);
  revisarEvaluador(repo, datos.evaluadorId, errores);
  if (!archivos.cv) errores.cv = 'Adjunta el CV del candidato (PDF o DOCX).';
  if (hayErrores(errores)) throw datosInvalidos(errores);

  const id = repo.transaccion(() => {
    if (datosCandidato) candidatoId = repo.candidatos.crear(datosCandidato);
    const nuevaId = repo.solicitudes.crear({
      ...datos,
      candidatoId,
      analistaId: usuario.id,
      cvArchivo: archivos.cv.filename,
      cvNombreOriginal: archivos.cv.originalname,
      cvBytes: archivos.cv.size,
      descriptorArchivo: archivos.descriptor?.filename ?? null,
      descriptorNombreOriginal: archivos.descriptor?.originalname ?? null,
    });
    repo.historial.registrar(
      nuevaId,
      usuario.id,
      'Solicitud creada',
      datosCandidato ? 'Con candidato nuevo' : 'Con candidato ya registrado'
    );
    return nuevaId;
  });

  return obtenerSolicitud(repo, id);
}

// ---------------------------------------------------------------------
// EDITAR DATOS (cambio de cargo, error de tipeo, reasignar responsable)
// ---------------------------------------------------------------------
export function actualizarSolicitud(repo, usuario, id, body = {}) {
  obtenerFila(repo, id);
  const { errores, datos } = validarSolicitud(body, { parcial: true });
  if (Object.hasOwn(datos, 'evaluadorId')) revisarEvaluador(repo, datos.evaluadorId, errores);
  if (hayErrores(errores)) throw datosInvalidos(errores);
  if (Object.keys(datos).length === 0) return obtenerSolicitud(repo, id);

  repo.transaccion(() => {
    repo.solicitudes.actualizar(id, datos);
    repo.historial.registrar(id, usuario.id, 'Datos editados', listarCampos(datos));
  });
  return obtenerSolicitud(repo, id);
}

// ---------------------------------------------------------------------
// AVANZAR EL PROCESO
// ---------------------------------------------------------------------
/** Si la solicitud no tiene responsable y quien trabaja en ella es evaluador, se le asigna */
const asignarSiFalta = (repo, fila, usuario) => {
  if (!fila.evaluador_id && usuario.rol === 'evaluador') {
    repo.solicitudes.actualizar(fila.id, { evaluadorId: usuario.id });
    repo.historial.registrar(fila.id, usuario.id, 'Responsable asignado', usuario.nombre);
  }
};

/**
 * Devuelve { solicitud, informeEnviado } (informeEnviado = true si recién pasó a esa etapa,
 * para que la ruta avise por correo al analista).
 */
export function cambiarEtapa(repo, usuario, id, etapa) {
  if (!esClave(ETAPAS, etapa)) throw datosInvalidos({ etapa: 'Etapa no válida.' }, 'Etapa no válida.');
  const fila = obtenerFila(repo, id);
  if (fila.etapa === etapa) return { solicitud: obtenerSolicitud(repo, id), informeEnviado: false };

  const necesitaEntrevista = ORDEN_ETAPAS.indexOf(etapa) >= ORDEN_ETAPAS.indexOf('agendada');
  if (necesitaEntrevista && !fila.fecha_entrevista) {
    throw reglaNegocio('Primero registra la fecha y hora de la entrevista.', 'fechaEntrevista');
  }
  if (ETAPAS_CON_ENTREVISTA_HECHA.includes(etapa) && fila.fecha_entrevista > ahoraLocal()) {
    throw reglaNegocio(
      'La entrevista todavía no ocurre: márcala como realizada después de la fecha agendada.',
      'fechaEntrevista'
    );
  }
  if (etapa === 'informe_enviado' && !fila.resultado) {
    throw reglaNegocio('Registra el resultado de la evaluación antes de enviar el informe.', 'resultado');
  }

  repo.transaccion(() => {
    if (etapa === 'informe_enviado' && !fila.fecha_informe) {
      repo.evaluaciones.guardar(id, { fechaInforme: hoy() });
    }
    repo.solicitudes.cambiarEtapa(id, etapa);
    asignarSiFalta(repo, fila, usuario);
    repo.historial.registrar(id, usuario.id, 'Etapa cambiada', `${ETAPAS[fila.etapa]} → ${ETAPAS[etapa]}`);
  });

  return { solicitud: obtenerSolicitud(repo, id), informeEnviado: etapa === 'informe_enviado' };
}

/** Registrar o actualizar la evaluación (fecha de entrevista, observaciones, resultado, fecha de informe) */
export function guardarEvaluacion(repo, usuario, id, body = {}) {
  const fila = obtenerFila(repo, id);
  const { errores, datos } = validarEvaluacion(body);

  // ---- Reglas de fechas (que la línea de tiempo tenga sentido) ----
  const diaSolicitud = diaLocal(fila.fecha_solicitud);
  const entrevista = Object.hasOwn(datos, 'fechaEntrevista') ? datos.fechaEntrevista : fila.fecha_entrevista;
  const informe = Object.hasOwn(datos, 'fechaInforme') ? datos.fechaInforme : fila.fecha_informe;

  if (datos.fechaEntrevista && !errores.fechaEntrevista) {
    const dia = datos.fechaEntrevista.slice(0, 10);
    if (dia < diaSolicitud) {
      errores.fechaEntrevista = 'La entrevista no puede ser anterior a la fecha de la solicitud.';
    } else if (dia > sumarDias(diaSolicitud, MAX_DIAS_ENTREVISTA)) {
      errores.fechaEntrevista = 'La entrevista debe quedar dentro del año siguiente a la solicitud.';
    } else if (ETAPAS_CON_ENTREVISTA_HECHA.includes(fila.etapa) && datos.fechaEntrevista > ahoraLocal()) {
      errores.fechaEntrevista = 'La entrevista ya figura como realizada: su fecha no puede ser futura.';
    }
  }
  if (datos.fechaInforme && !errores.fechaInforme) {
    if (datos.fechaInforme < diaSolicitud) {
      errores.fechaInforme = 'El informe no puede ser anterior a la fecha de la solicitud.';
    } else if (datos.fechaInforme > hoy()) {
      errores.fechaInforme = 'La fecha del informe no puede ser futura.';
    }
  }
  if (informe && entrevista && !errores.fechaInforme && !errores.fechaEntrevista && informe < entrevista.slice(0, 10)) {
    errores[Object.hasOwn(datos, 'fechaInforme') ? 'fechaInforme' : 'fechaEntrevista'] =
      'El informe no puede ser anterior a la entrevista.';
  }
  // Con el informe ya enviado, el resultado no puede quedar vacío
  if (fila.etapa === 'informe_enviado' && Object.hasOwn(datos, 'resultado') && !datos.resultado) {
    errores.resultado = 'El informe ya fue enviado: el resultado no puede quedar vacío.';
  }
  if (hayErrores(errores)) throw datosInvalidos(errores);
  if (Object.keys(datos).length === 0) return obtenerSolicitud(repo, id);

  repo.transaccion(() => {
    repo.evaluaciones.guardar(id, datos);
    asignarSiFalta(repo, fila, usuario);
    const detalle = datos.resultado
      ? `${listarCampos(datos)} · ${RESULTADOS[datos.resultado]}`
      : listarCampos(datos);
    repo.historial.registrar(id, usuario.id, 'Evaluación actualizada', detalle);
  });
  return obtenerSolicitud(repo, id);
}

// ---------------------------------------------------------------------
// ELIMINAR (borrado permanente; devuelve los archivos a borrar del disco)
// ---------------------------------------------------------------------
export function eliminarSolicitud(repo, id) {
  const fila = obtenerFila(repo, id);
  repo.solicitudes.eliminar(id);
  return { archivos: [fila.cv_archivo, fila.descriptor_archivo].filter(Boolean) };
}

/** Datos de un archivo adjunto para descargarlo ('cv' o 'descriptor') */
export function archivoDeSolicitud(repo, id, tipo) {
  const fila = obtenerFila(repo, id);
  const archivo = tipo === 'descriptor' ? fila.descriptor_archivo : fila.cv_archivo;
  const nombre = tipo === 'descriptor' ? fila.descriptor_nombre_original : fila.cv_nombre_original;
  if (!archivo) throw noEncontrado(tipo === 'descriptor' ? 'El descriptor del cargo' : 'El CV');
  return { archivo, nombre };
}
