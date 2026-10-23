// =====================================================================
// FORMATO DE RESPUESTA
// Convierte las filas de la base (snake_case, 0/1) en objetos claros para
// el frontend (camelCase, booleanos). Nunca expone rutas internas de archivos.
// =====================================================================

const DIA_MS = 86_400_000;

/** Días entre la solicitud y el envío del informe (el "timing" del proceso) */
export function calcularTiming(fechaSolicitud, fechaInforme) {
  if (!fechaSolicitud || !fechaInforme) return null;
  const inicio = Date.parse(`${String(fechaSolicitud).slice(0, 10)}T12:00:00Z`);
  const fin = Date.parse(`${String(fechaInforme).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(inicio) || Number.isNaN(fin)) return null;
  return Math.max(0, Math.round((fin - inicio) / DIA_MS));
}

export const aCandidato = (fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  correo: fila.correo,
  telefono: fila.telefono,
  origen: fila.origen,
  creadoEn: fila.creado_en,
  actualizadoEn: fila.actualizado_en ?? null,
  ...(fila.total_solicitudes !== undefined && {
    totalSolicitudes: Number(fila.total_solicitudes),
    ultimaSolicitud: fila.ultima_solicitud ?? null,
  }),
});

export const aSolicitud = (fila) => ({
  id: fila.id,
  etapa: fila.etapa,
  fechaSolicitud: fila.fecha_solicitud,
  actualizadoEn: fila.actualizado_en ?? null,
  candidato: {
    id: fila.candidato_id,
    nombre: fila.candidato_nombre,
    correo: fila.candidato_correo,
    telefono: fila.candidato_telefono,
    origen: fila.candidato_origen,
  },
  analista: { id: fila.analista_id, nombre: fila.analista_nombre },
  evaluador: fila.evaluador_id ? { id: fila.evaluador_id, nombre: fila.evaluador_nombre } : null,
  familiaCargo: fila.familia_cargo,
  nombreCargo: fila.nombre_cargo,
  ubicacion: fila.ubicacion,
  unidad: fila.unidad,
  ceco: fila.ceco,
  requiereReferencias: Boolean(fila.requiere_referencias),
  referido: Boolean(fila.referido),
  aspectosIndagar: fila.aspectos_indagar,
  cv: fila.cv_archivo ? { nombre: fila.cv_nombre_original, bytes: fila.cv_bytes } : null,
  descriptor: fila.descriptor_archivo ? { nombre: fila.descriptor_nombre_original } : null,
  evaluacion: {
    fechaEntrevista: fila.fecha_entrevista ?? null,
    observaciones: fila.observaciones ?? '',
    resultado: fila.resultado ?? null,
    fechaInforme: fila.fecha_informe ?? null,
  },
  timingDias: fila.etapa === 'informe_enviado' ? calcularTiming(fila.fecha_solicitud, fila.fecha_informe) : null,
});

export const aHistorial = (fila) => ({
  id: fila.id,
  accion: fila.accion,
  detalle: fila.detalle,
  usuario: fila.usuario_nombre ?? 'Sistema',
  fecha: fila.creado_en,
});
