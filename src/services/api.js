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

/** Descarga un archivo protegido con su nombre original (lleva el token, por eso no es un <a href>) */
async function descargar(ruta, nombre) {
  const res = await pedir(ruta, { respuesta: 'blob' });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CV o descriptor de una solicitud */
export const descargarAdjunto = (solicitud, tipo = 'cv') =>
  descargar(`/solicitudes/${id(solicitud.id)}/${tipo}`, solicitud[tipo]?.nombre || `${tipo}.pdf`);

// ---------- Postulaciones (bandeja del analista) ----------
/** filtros: { estado, q } */
export const listarPostulaciones = (filtros) => pedir(`/postulaciones${aQuery(filtros)}`);
export const obtenerPostulacion = (postulacionId) => pedir(`/postulaciones/${id(postulacionId)}`);
/** estado: 'descartada' o 'nueva' (reabrir) */
export const cambiarEstadoPostulacion = (postulacionId, estado) =>
  pedir(`/postulaciones/${id(postulacionId)}/estado`, { metodo: 'PATCH', json: { estado } });
export const eliminarPostulacion = (postulacionId) => pedir(`/postulaciones/${id(postulacionId)}`, { metodo: 'DELETE' });
export const descargarCvPostulacion = (postulacion) =>
  descargar(`/postulaciones/${id(postulacion.id)}/cv`, postulacion.cv?.nombre || 'cv.pdf');

// ---------- Formulario público /postular (sin sesión) ----------
// Van directo con fetch, sin token: la página pública no sabe nada de sesiones.
async function pedirPublico(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/publico${ruta}`, opciones);
  } catch {
    throw new ErrorApi('No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.', 0);
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(datos.mensaje || 'No pudimos enviar tu postulación. Inténtalo más tarde.', res.status, datos);
  return datos;
}

/** { familiasCargo } */
export const obtenerOpcionesPublicas = () => pedirPublico('/opciones');
/** formData: lo arma construirFormDataPostulacion() de utils/postulacion.js */
export const enviarPostulacion = (formData) => pedirPublico('/postulaciones', { method: 'POST', body: formData });

// ---------- Indicadores ----------
export const obtenerIndicadores = () => pedir('/indicadores');
