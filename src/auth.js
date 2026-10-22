const CLAVE_SESION = 'aquachile_sesion';

export const haySesion = () => sessionStorage.getItem(CLAVE_SESION) === '1';

export const cerrarSesion = () => sessionStorage.removeItem(CLAVE_SESION);

/**
 * Valida las credenciales.
 *
 * TODO: reemplazar el cuerpo por una llamada real a tu backend, por ejemplo:
 *   const res = await fetch('/api/login', { method: 'POST', ... });
 *   if (!res.ok) return { ok: false };
 *
 * Mientras tanto, las credenciales de prueba SOLO funcionan con `npm run dev`.
 * En una build de producción (`npm run build`) nadie puede entrar con ellas.
 */
export async function iniciarSesion(usuario, password) {
  if (import.meta.env.DEV && usuario === 'admin' && password === 'admin123') {
    sessionStorage.setItem(CLAVE_SESION, '1');
    return { ok: true };
  }
  return { ok: false };
}