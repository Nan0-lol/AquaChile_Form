import { API_BASE } from './config';

// =====================================================================
// SESIÓN DEL USUARIO
// Se guarda en sessionStorage (dura mientras la pestaña esté abierta):
//   { token, usuario: { id, usuario, nombre, rol }, permisos: [...], venceEn }
// Ojo: los permisos aquí solo deciden qué se MUESTRA. Quien de verdad
// protege los datos es el servidor, que revisa el rol en cada petición.
// =====================================================================
const CLAVE_SESION = 'aquachile_sesion';

export const NOMBRES_ROL = {
  admin: 'Administrador',
  analista: 'Analista de Reclutamiento',
  evaluador: 'Profesional Evaluador',
  jefatura: 'Jefatura',
};

const leerSesion = () => {
  try {
    const sesion = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null');
    if (!sesion?.token || !sesion.usuario) return null;
    // Si ya venció, se descarta sin preguntarle al servidor
    if (sesion.venceEn && Date.parse(sesion.venceEn) <= Date.now()) return null;
    return sesion;
  } catch {
    return null;
  }
};

const guardarSesion = (sesion) => {
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch {
    /* sin acceso al almacenamiento: la sesión no sobrevive a una recarga */
  }
};

/** Borra la sesión solo en este navegador (sin avisar al servidor). */
export const borrarSesionLocal = () => {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
    // Claves de la versión anterior del sistema
    sessionStorage.removeItem('aquachile_token');
    sessionStorage.removeItem('aquachile_usuario');
  } catch {
    /* nada que borrar */
  }
};

export const obtenerToken = () => leerSesion()?.token ?? null;

/** { id, usuario, nombre, rol } o null */
export const obtenerUsuario = () => leerSesion()?.usuario ?? null;

export const haySesion = () => Boolean(leerSesion());

/** true si el rol del usuario permite la acción (ej. 'solicitud:crear') */
export const puede = (accion) => Boolean(leerSesion()?.permisos?.includes(accion));

/** Primera pantalla después de entrar, según lo que puede hacer cada rol */
export const rutaInicio = () => (puede('solicitud:crear') ? '/solicitudes/nueva' : '/dashboard');

/**
 * Valida las credenciales contra el backend.
 * Devuelve { ok: true } o { ok: false, mensaje }.
 * Si el servidor no responde, lanza un error (el login muestra "No pudimos conectarnos").
 */
export async function iniciarSesion(usuario, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });

  const datos = await res.json().catch(() => ({}));
  if (!res.ok || !datos.token || !datos.usuario) {
    return { ok: false, mensaje: datos.mensaje };
  }

  borrarSesionLocal();
  guardarSesion({
    token: datos.token,
    usuario: datos.usuario,
    permisos: Array.isArray(datos.permisos) ? datos.permisos : [],
    venceEn: datos.venceEn ?? null,
  });
  return { ok: true };
}

/**
 * Pregunta al servidor si la sesión sigue viva (por ejemplo, después de reiniciarlo)
 * y actualiza el rol y los permisos. Devuelve false solo si el servidor la rechazó.
 */
export async function verificarSesion() {
  const sesion = leerSesion();
  if (!sesion) return false;
  try {
    const res = await fetch(`${API_BASE}/sesion`, { headers: { Authorization: `Bearer ${sesion.token}` } });
    if (res.status === 401) {
      borrarSesionLocal();
      return false;
    }
    if (res.ok) {
      const datos = await res.json();
      guardarSesion({ ...sesion, usuario: datos.usuario, permisos: datos.permisos ?? sesion.permisos });
    }
    return true;
  } catch {
    // Sin conexión no se cierra la sesión: cada pantalla mostrará su propio aviso
    return true;
  }
}

/** Cierra la sesión aquí y avisa al servidor para que invalide el token. */
export const cerrarSesion = () => {
  const token = obtenerToken();
  borrarSesionLocal();
  if (token) {
    fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
};
