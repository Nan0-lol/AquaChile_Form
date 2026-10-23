// Funciones de formato que usa el dashboard. Son "puras": reciben datos y
// devuelven texto, sin tocar la pantalla. Por eso se pueden probar con Vitest.
import { AREAS, ESTADOS } from './catalogos';

const DIA_MS = 86_400_000;

/** "María José González" -> "MJ" */
export const iniciales = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Convierte a Date; devuelve null si el valor no es una fecha válida. */
export const aFecha = (valor) => {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

/** "2026-10-22T..." -> "22-10-2026" */
export const formatearFecha = (valor) => {
  const d = aFecha(valor);
  return d
    ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
};

/** "Hoy", "Ayer", "Hace 3 días", "Hace 2 semanas", "Hace 1 mes"... */
export const tiempoRelativo = (valor, ahora = Date.now()) => {
  const d = aFecha(valor);
  if (!d) return '';
  const dias = Math.floor((ahora - d.getTime()) / DIA_MS);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return `Hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }
  const meses = Math.floor(dias / 30);
  return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
};

/** "+56 9 1234 5678" o "912345678" -> "56912345678" (formato de WhatsApp) */
export const telefonoInternacional = (tel = '') => {
  const digitos = tel.replace(/\D/g, '');
  if (!digitos) return '';
  return digitos.startsWith('56') ? digitos : `56${digitos}`;
};

/** "Múñoz" -> "munoz" (para buscar sin importar tildes ni mayúsculas) */
export const sinAcentos = (t = '') =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Arma el contenido del CSV para Excel en español:
 * separado por punto y coma, con BOM para que se vean bien las tildes.
 */
export const construirCsv = (filas) => {
  const columnas = ['Nombre', 'RUT', 'Correo', 'Teléfono', 'Cargo', 'Área', 'Fecha', 'Estado'];
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = filas.map((p) =>
    [
      p.nombre,
      p.rut,
      p.correo,
      p.telefono,
      p.cargo,
      AREAS[p.area] ?? p.area,
      formatearFecha(p.fecha),
      ESTADOS[p.estado]?.label,
    ]
      .map(escapar)
      .join(';')
  );
  return '﻿' + [columnas.join(';'), ...lineas].join('\r\n');
};
