// Catálogos compartidos por el formulario y el dashboard.
// Deben coincidir con server/validaciones.js.

export const AREAS = {
  planta: 'Plantas de Proceso',
  piscicultura: 'Pisciculturas',
  administracion: 'Administración y Finanzas',
  comercial: 'Área Comercial',
};

export const ESTADOS = {
  pendiente: { label: 'Pendiente', descripcion: 'CV sin revisar' },
  revision: { label: 'En revisión', descripcion: 'Perfil en evaluación' },
  entrevista: { label: 'Entrevista', descripcion: 'Citados a entrevista' },
  finalizado: { label: 'Finalizado', descripcion: 'Proceso cerrado' },
};

export const ORDEN_ESTADOS = ['pendiente', 'revision', 'entrevista', 'finalizado'];
