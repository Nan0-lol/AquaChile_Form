// Muestra en la terminal las postulaciones guardadas.
// Uso (desde la carpeta server/):  node ver-postulaciones.js
import { crearRepositorio } from './db.js';

const repo = crearRepositorio();
const filas = repo.listar({ limite: 50 });

console.log(`\nTotal: ${repo.contar()} postulación(es). Mostrando las últimas ${filas.length}:\n`);

if (filas.length > 0) {
  console.table(
    filas.map((f) => ({
      fecha: f.creado_en,
      nombre: f.nombre_completo,
      rut: f.rut,
      correo: f.correo,
      celular: f.celular,
      area: f.familia_cargo,
      cargo: f.nombre_cargo,
      estado: f.estado,
      cv: f.cv_archivo,
    }))
  );
}

repo.cerrar();