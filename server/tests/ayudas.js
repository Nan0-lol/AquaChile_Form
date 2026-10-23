// Ayudas compartidas por las pruebas: una base en memoria con usuarios de cada rol.
import { crearRepositorio } from '../db.js';
import { crearUsuario } from '../servicios/usuarios.js';

export function repoConUsuarios() {
  const repo = crearRepositorio(':memory:');
  const crear = (usuario, rol, nombre) => {
    const id = crearUsuario(repo, { usuario, password: `${usuario}-clave`, nombre, rol, correo: `${usuario}@ejemplo.cl` });
    return { id, usuario, nombre, rol };
  };
  return {
    repo,
    admin: crear('admin', 'admin', 'Admin Prueba'),
    analista: crear('analista', 'analista', 'Carla Rojas'),
    evaluador: crear('evaluador', 'evaluador', 'Paula Vidal'),
    evaluador2: crear('evaluador2', 'evaluador', 'Rodrigo Saavedra'),
    jefatura: crear('jefatura', 'jefatura', 'Andrés Pino'),
  };
}

export const CANDIDATO = {
  nombre: 'Valentina Ortega',
  correo: 'Valentina.Ortega@Ejemplo.cl',
  telefono: '+56 9 1234 5678',
  origen: 'externo',
};

export const SOLICITUD = {
  familiaCargo: 'operario_calificado',
  nombreCargo: 'Operador de máquina',
  ubicacion: 'Planta Calbuco',
  unidad: 'industrial',
  ceco: 'c100200300',
  requiereReferencias: 'true',
  referido: 'false',
  aspectosIndagar: 'Trabajo en turnos rotativos.\nManejo de presión.',
};

export const ARCHIVO_CV = { filename: 'archivo-interno.pdf', originalname: 'CV_Valentina.pdf', size: 2048 };
