// =====================================================================
// SERVICIO DE POSTULACIONES
// Todo lo que el dashboard necesita del backend pasa por aquí.
// =====================================================================
import { API_BASE } from '../config';
import { obtenerToken } from '../auth';

// Los catálogos viven en utils/catalogos.js; se re-exportan aquí por comodidad
import { AREAS, ESTADOS, ORDEN_ESTADOS } from '../utils/catalogos';
export { AREAS, ESTADOS, ORDEN_ESTADOS };

// Error con el código HTTP, para que el dashboard sepa si la sesión expiró (401)
export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

const pedir = async (ruta, opciones = {}) => {
  const token = obtenerToken();
  const res = await fetch(`${API_BASE}${ruta}`, {
    ...opciones,
    headers: {
      ...(opciones.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const datos = await res.json().catch(() => ({}));
    throw new ErrorApi(datos.mensaje || `HTTP ${res.status}`, res.status);
  }
  return res;
};

const normalizarPostulacion = (p) => ({
  id: p.id,
  nombre: p.nombre || 'Sin nombre',
  rut: p.rut || '',
  correo: p.correo || '',
  telefono: p.telefono || '',
  area: p.area || '',
  cargo: p.cargo || '',
  carta: p.carta || '',
  cvNombre: p.cvNombre || '',
  fecha: p.fecha || null,
  estado: ORDEN_ESTADOS.includes(p.estado) ? p.estado : 'pendiente',
});

// ---------- API pública ----------
export const obtenerPostulaciones = async () => {
  const res = await pedir('/postulaciones');
  const datos = await res.json();
  return (Array.isArray(datos) ? datos : []).map(normalizarPostulacion);
};

export const actualizarEstado = async (id, estado) => {
  await pedir(`/postulaciones/${encodeURIComponent(id)}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
};

// Borra la postulación y su CV para siempre
export const eliminarPostulacion = async (id) => {
  await pedir(`/postulaciones/${encodeURIComponent(id)}`, { method: 'DELETE' });
};

// Descarga el CV con su nombre original (pasa el token, por eso no es un simple <a href>)
export const descargarCv = async (postulacion) => {
  const res = await pedir(`/postulaciones/${encodeURIComponent(postulacion.id)}/cv`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = postulacion.cvNombre || 'CV';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
