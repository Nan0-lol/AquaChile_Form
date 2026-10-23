// =====================================================================
// SERVICIO DE LA API
// Todas las pantallas del panel hablan con el backend a través de aquí.
// Si el servidor responde 401 (sesión vencida o servidor reiniciado),
// se borra la sesión y se avisa con el evento "sesion-expirada": el
// AdminLayout lo escucha y manda al login.
// =====================================================================
import { API_BASE } from '../config';
import { obtenerToken, borrarSesionLocal } from '../auth';

export const EVENTO_SESION_EXPIRADA = 'aquachile:sesion-expirada';

/** Error con el código HTTP y, si vienen, los errores por campo del servidor */
export class ErrorApi extends Error {
  constructor(mensaje, estado, datos = {}) {
    super(mensaje);
    this.estado = estado;
    this.errores = datos.errores ?? {};
    this.datos = datos;
  }
}

/**
 * @param {string} ruta     ej. '/solicitudes'
 * @param {object} opciones { metodo, json, formData, respuesta: 'json' | 'blob' }
 */
async function pedir(ruta, { metodo = 'GET', json, formData, respuesta = 'json' } = {}) {
  const token = obtenerToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE}${ruta}`, {
      method: metodo,
      headers,
      body: formData ?? (json !== undefined ? JSON.stringify(json) : undefined),
    });
  } catch {
    throw new ErrorApi('No pudimos conectarnos con el servidor. Revisa que esté encendido.', 0);
  }

  if (res.status === 401) {
    borrarSesionLocal();
    window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    throw new ErrorApi('Tu sesión expiró. Vuelve a ingresar.', 401);
  }

  if (!res.ok) {
    const datos = await res.json().catch(() => ({}));
    throw new ErrorApi(datos.mensaje || `Error ${res.status} del servidor.`, res.status, datos);
  }

  return respuesta === 'blob' ? res : res.json();
}

const id = (valor) => encodeURIComponent(valor);

const aQuery = (filtros = {}) => {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor);
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
};

// ---------- Catálogos y usuarios ----------
// Los catálogos casi nunca cambian: se piden una vez por visita
let catalogosEnCache = null;
export const obtenerCatalogos = () => {
  catalogosEnCache ??= pedir('/catalogos').catch((err) => {
    catalogosEnCache = null; // si falló, se reintenta la próxima vez
    throw err;
  });
  return catalogosEnCache;
};

export const obtenerUsuarios = (rol) => pedir(`/usuarios${aQuery({ rol })}`);
export const obtenerEvaluadores = () => obtenerUsuarios('evaluador');

// ---------- Candidatos ----------
export const buscarCandidatos = (q = '') => pedir(`/candidatos${aQuery({ q: q.trim() })}`);
export const obtenerCandidato = (candidatoId) => pedir(`/candidatos/${id(candidatoId)}`);
/** datos: { nombre, correo, telefono, origen } */
export const crearCandidato = (datos) => pedir('/candidatos', { metodo: 'POST', json: datos });
export const actualizarCandidato = (candidatoId, cambios) =>
  pedir(`/candidatos/${id(candidatoId)}`, { metodo: 'PUT', json: cambios });
export const eliminarCandidato = (candidatoId) => pedir(`/candidatos/${id(candidatoId)}`, { metodo: 'DELETE' });

// ---------- Solicitudes ----------
/** filtros: { etapa, familiaCargo, evaluadorId, candidatoId, desde, hasta, q } */
export const listarSolicitudes = (filtros) => pedir(`/solicitudes${aQuery(filtros)}`);
export const obtenerSolicitud = (solicitudId) => pedir(`/solicitudes/${id(solicitudId)}`);
/** formData: lo arma construirFormData() de utils/solicitud.js */
export const crearSolicitud = (formData) => pedir('/solicitudes', { metodo: 'POST', formData });
export const actualizarSolicitud = (solicitudId, cambios) =>
  pedir(`/solicitudes/${id(solicitudId)}`, { metodo: 'PUT', json: cambios });
export const cambiarEtapa = (solicitudId, etapa) =>
  pedir(`/solicitudes/${id(solicitudId)}/etapa`, { metodo: 'PATCH', json: { etapa } });
export const guardarEvaluacion = (solicitudId, evaluacion) =>
  pedir(`/solicitudes/${id(solicitudId)}/evaluacion`, { metodo: 'PUT', json: evaluacion });
export const eliminarSolicitud = (solicitudId) => pedir(`/solicitudes/${id(solicitudId)}`, { metodo: 'DELETE' });

/** Descarga el CV o el descriptor con su nombre original (lleva el token, por eso no es un <a href>) */
export async function descargarAdjunto(solicitud, tipo = 'cv') {
  const res = await pedir(`/solicitudes/${id(solicitud.id)}/${tipo}`, { respuesta: 'blob' });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = solicitud[tipo]?.nombre || `${tipo}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Indicadores ----------
export const obtenerIndicadores = () => pedir('/indicadores');
