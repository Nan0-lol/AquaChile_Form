// =====================================================================
// CATÁLOGOS DEL PROCESO DE EVALUACIÓN PSICOLABORAL
// Basados en los registros que usa hoy el equipo de Reclutamiento.
// La clave (izquierda) es lo que se guarda en la base; el texto (derecha)
// es lo que ve la persona. El frontend los pide en GET /api/catalogos.
// =====================================================================

export const ROLES = {
  admin: 'Administrador',
  analista: 'Analista de Reclutamiento',
  evaluador: 'Profesional Evaluador',
  jefatura: 'Jefatura',
};

export const ORIGENES = {
  interno: 'Interno',
  externo: 'Externo',
};

export const FAMILIAS_CARGO = {
  profesional_a: 'Profesional A',
  profesional_bc: 'Profesional B C',
  tecnico_a: 'Técnico A',
  tecnico_bc: 'Técnico B C',
  operario_calificado: 'Operario Calificado',
  supervisor_b: 'Supervisor B',
  jefatura: 'Jefatura',
};

export const UNIDADES = {
  corporativo: 'Corporativo',
  industrial: 'Industrial',
  produccion_am: 'Producción AM',
  produccion_ad: 'Producción AD',
  otros_produccion: 'Otros Producción',
};

// Sugerencias para el campo "Ubicación" (se acepta también otra escrita a mano)
export const UBICACIONES_SUGERIDAS = [
  'Oficina Central',
  'Planta Calbuco',
  'Planta Cailín',
  'Planta Magallanes',
  'Pargua PA',
  'AM Melinka',
  'Codihue',
];

// Las 4 etapas del proceso, en orden (las mismas columnas del Planner actual)
export const ETAPAS = {
  recibida: 'Evaluación recibida',
  agendada: 'Entrevista agendada',
  realizada: 'Entrevista realizada',
  informe_enviado: 'Informe enviado',
};

export const ORDEN_ETAPAS = ['recibida', 'agendada', 'realizada', 'informe_enviado'];

export const RESULTADOS = {
  recomendado: 'Recomendado',
  recomendado_obs: 'Recomendado con observaciones',
  no_recomendado: 'No recomendado',
};

// Áreas de interés del formulario público (las mismas del formulario original)
export const AREAS_INTERES = {
  planta: 'Plantas de Proceso',
  piscicultura: 'Pisciculturas',
  administracion: 'Administración y Finanzas',
  comercial: 'Área Comercial',
};

// Estados de lo que llega por el formulario público
export const ESTADOS_POSTULACION = {
  nueva: 'Por revisar',
  en_evaluacion: 'En evaluación',
  descartada: 'Descartada',
};

/** Todo junto, tal como lo entrega GET /api/catalogos */
export const catalogos = () => ({
  roles: ROLES,
  origenes: ORIGENES,
  familiasCargo: FAMILIAS_CARGO,
  unidades: UNIDADES,
  ubicacionesSugeridas: UBICACIONES_SUGERIDAS,
  etapas: ETAPAS,
  ordenEtapas: ORDEN_ETAPAS,
  resultados: RESULTADOS,
  estadosPostulacion: ESTADOS_POSTULACION,
  areasInteres: AREAS_INTERES,
});

/** Lo único que necesita ver el formulario público (sin datos internos) */
export const opcionesPublicas = () => ({
  areas: AREAS_INTERES,
});

/** true si `valor` es una de las claves del catálogo (evita claves como "toString") */
export const esClave = (catalogo, valor) =>
  typeof valor === 'string' && Object.hasOwn(catalogo, valor);
