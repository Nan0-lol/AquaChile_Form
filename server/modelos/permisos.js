// =====================================================================
// PERMISOS POR ROL
// Una sola tabla define qué puede hacer cada rol. El servidor la usa para
// bloquear acciones y el frontend puede usar la misma para ocultar botones.
// =====================================================================

const TODOS = ['admin', 'analista', 'evaluador', 'jefatura'];

export const PERMISOS = {
  // Consultar (todos, incluida jefatura en modo lectura)
  'candidato:ver': TODOS,
  'solicitud:ver': TODOS,
  'indicadores:ver': TODOS,

  // Analista: registra candidatos y crea solicitudes
  'candidato:crear': ['admin', 'analista'],
  'solicitud:crear': ['admin', 'analista'],

  // Editar datos (a veces cambia el cargo o hay un error de tipeo)
  'candidato:editar': ['admin', 'analista', 'evaluador'],
  'solicitud:editar': ['admin', 'analista', 'evaluador'],

  // Evaluador: avanza el proceso y registra la evaluación
  'solicitud:etapa': ['admin', 'evaluador'],
  'evaluacion:editar': ['admin', 'evaluador'],

  // Postulaciones del formulario público: el analista las revisa
  'postulacion:ver': ['admin', 'analista', 'jefatura'],
  'postulacion:gestionar': ['admin', 'analista'],

  // Borrado permanente
  'solicitud:eliminar': ['admin', 'analista'],
  'candidato:eliminar': ['admin'],
  'postulacion:eliminar': ['admin'],
};

/** ¿El rol puede realizar la acción? */
export const puede = (rol, accion) => Boolean(PERMISOS[accion]?.includes(rol));

/** Lista de acciones permitidas para un rol (la entrega el login al frontend) */
export const permisosDe = (rol) => Object.keys(PERMISOS).filter((accion) => puede(rol, accion));
