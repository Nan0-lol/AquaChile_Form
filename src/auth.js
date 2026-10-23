import { API_BASE } from './config';

// La sesión dura mientras la pestaña esté abierta (sessionStorage).
// El servidor es quien valida usuario y contraseña: aquí solo se guarda el token.
const CLAVE_TOKEN = 'aquachile_token';
const CLAVE_USUARIO = 'aquachile_usuario';

const leer = (clave) => {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
};

export const obtenerToken = () => leer(CLAVE_TOKEN);

export const obtenerUsuario = () => leer(CLAVE_USUARIO);

export const haySesion = () => Boolean(obtenerToken());

const borrarSesionLocal = () => {
  try {
    sessionStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_USUARIO);
  } catch {
    /* sin acceso al almacenamiento: no hay nada que borrar */
  }
};

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
  if (!res.ok || !datos.token) {
    return { ok: false, mensaje: datos.mensaje };
  }

  sessionStorage.setItem(CLAVE_TOKEN, datos.token);
  sessionStorage.setItem(CLAVE_USUARIO, datos.usuario);
  return { ok: true };
}