// =====================================================================
// SERVICIO DE POSTULACIONES
// Todo lo que el dashboard necesita del backend pasa por aquí.
// Si tus rutas del servidor se llaman distinto, solo cambias este archivo.
// =====================================================================
import * as auth from '../auth';

// Ajusta a la URL de tu backend (carpeta server/, puerto 3001)
export const API_BASE = 'http://localhost:3001/api';

// ---------- Catálogos (deben coincidir con los <option> del formulario) ----------
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

// ---------- Utilidades internas ----------
const encabezados = (extra = {}) => {
  const headers = { ...extra };
  // Si tu auth.js entrega un token, se envía automáticamente
  const token = typeof auth.obtenerToken === 'function' ? auth.obtenerToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const pedir = async (ruta, opciones = {}) => {
  const res = await fetch(`${API_BASE}${ruta}`, {
    ...opciones,
    headers: encabezados(opciones.headers),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
};

// Acepta distintos nombres de campos para no depender del formato exacto del backend
const normalizarEstado = (valor) => {
  const v = String(valor || '').toLowerCase();
  if (v.startsWith('revis') || v === 'en revisión' || v === 'en_revision') return 'revision';
  if (v.startsWith('entrev')) return 'entrevista';
  if (v.startsWith('final') || v === 'cerrado') return 'finalizado';
  return 'pendiente';
};

const normalizarArea = (valor) => {
  if (!valor) return '';
  if (AREAS[valor]) return valor;
  // Si el backend guardó la etiqueta en vez del valor
  const encontrada = Object.entries(AREAS).find(
    ([, label]) => label.toLowerCase() === String(valor).toLowerCase()
  );
  return encontrada ? encontrada[0] : String(valor);
};

export const normalizarPostulacion = (p) => ({
  id: p.id ?? p._id ?? p.uuid,
  nombre: p.nombre ?? p.nombreCompleto ?? p.nombre_completo ?? 'Sin nombre',
  rut: p.rut ?? '',
  correo: p.correo ?? p.email ?? '',
  telefono: p.telefono ?? p.celular ?? '',
  area: normalizarArea(p.area ?? p.areaInteres ?? p.area_interes),
  carta: p.carta ?? p.cartaPresentacion ?? p.carta_presentacion ?? '',
  cvNombre: p.cvNombre ?? p.cv_nombre ?? p.cv?.originalname ?? p.cv ?? '',
  fecha: p.fecha ?? p.createdAt ?? p.created_at ?? p.fechaPostulacion ?? null,
  estado: normalizarEstado(p.estado),
});

// ---------- API pública ----------
export const obtenerPostulaciones = async () => {
  const res = await pedir('/postulaciones');
  const datos = await res.json();
  const lista = Array.isArray(datos) ? datos : datos.postulaciones ?? datos.data ?? [];
  return lista.map(normalizarPostulacion);
};

export const actualizarEstado = async (id, estado) => {
  await pedir(`/postulaciones/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
};

// Descarga el CV como archivo (pasa el token, por eso no es un simple <a href>)
export const descargarCv = async (postulacion) => {
  const res = await pedir(`/postulaciones/${postulacion.id}/cv`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  const nombreSeguro = postulacion.nombre.replace(/[^\p{L}\p{N}]+/gu, '_');
  enlace.href = url;
  enlace.download = `CV_${nombreSeguro}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};