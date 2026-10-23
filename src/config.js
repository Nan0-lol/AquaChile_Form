// Dirección del backend (carpeta server/). Se usa en todo el frontend.
// Para cambiarla sin tocar código, crea un archivo .env en la raíz con:
//   VITE_API_URL=https://tu-servidor.cl/api
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';