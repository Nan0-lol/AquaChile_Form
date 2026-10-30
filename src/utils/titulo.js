// Nombre de la pestaña del navegador según la página ("Solicitudes · AquaChile").
// Las rutas más específicas van primero (ej. /solicitudes/nueva antes que /solicitudes/:id).
const TITULOS = [
  [/^\/postular/, 'Postula'],
  [/^\/login/, 'Ingreso'],
  [/^\/postulaciones/, 'Postulaciones'],
  [/^\/solicitudes\/nueva$/, 'Nueva solicitud'],
  [/^\/solicitudes\/.+/, 'Detalle de solicitud'],
  [/^\/solicitudes/, 'Solicitudes'],
  [/^\/candidatos\/nuevo$/, 'Registrar candidato'],
  [/^\/candidatos\/.+/, 'Ficha del candidato'],
  [/^\/candidatos/, 'Candidatos'],
  [/^\/dashboard/, 'Panel'],
];

export const tituloDeRuta = (pathname = '') => {
  const encontrado = TITULOS.find(([patron]) => patron.test(pathname));
  return encontrado ? `${encontrado[1]} · AquaChile` : 'AquaChile';
};
