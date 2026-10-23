import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { repoConUsuarios, CANDIDATO, SOLICITUD, ARCHIVO_CV } from './ayudas.js';
import {
  crearCandidato,
  actualizarCandidato,
  obtenerCandidato,
  listarCandidatos,
  eliminarCandidato,
} from '../servicios/candidatos.js';
import {
  crearSolicitud,
  actualizarSolicitud,
  cambiarEtapa,
  guardarEvaluacion,
  listarSolicitudes,
  obtenerSolicitud,
  eliminarSolicitud,
  archivoDeSolicitud,
} from '../servicios/solicitudes.js';
import { ErrorServicio } from '../servicios/errores.js';

// Fechas relativas a hoy (así las pruebas sirven cualquier día que se corran)
const diaMas = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('sv-SE');
};
const HOY = diaMas(0);
const ENTREVISTA_HECHA = `${HOY}T00:00`; // hoy temprano: ya ocurrió
const ENTREVISTA_FUTURA = `${diaMas(5)}T10:00`;

// Ejecuta y devuelve el error de servicio (o falla si no hubo error)
const errorDe = (fn) => {
  try {
    fn();
  } catch (err) {
    if (err instanceof ErrorServicio) return err;
    throw err;
  }
  throw new Error('Se esperaba un error y no hubo ninguno');
};

let ctx;
let repo;
beforeEach(() => {
  ctx = repoConUsuarios();
  repo = ctx.repo;
});
afterEach(() => repo.cerrar());

const solicitudNueva = (extra = {}) =>
  crearSolicitud(repo, ctx.analista, { ...CANDIDATO, ...SOLICITUD, ...extra }, { cv: ARCHIVO_CV });

describe('Candidatos', () => {
  test('registra y lista candidatos', () => {
    const c = crearCandidato(repo, CANDIDATO);
    expect(c.correo).toBe('valentina.ortega@ejemplo.cl');
    expect(listarCandidatos(repo, { q: 'valen' })).toHaveLength(1);
  });

  test('no permite dos candidatos con el mismo correo (409) y sugiere el existente', () => {
    crearCandidato(repo, CANDIDATO);
    const err = errorDe(() => crearCandidato(repo, { ...CANDIDATO, nombre: 'Otra Persona' }));
    expect(err.estado).toBe(409);
    expect(err.extra.candidatoExistente.nombre).toBe('Valentina Ortega');
  });

  test('edita solo lo que cambia y devuelve 400 con errores por campo', () => {
    const c = crearCandidato(repo, CANDIDATO);
    expect(actualizarCandidato(repo, c.id, { telefono: '9 8765 4321' }).telefono).toBe('+56987654321');
    const err = errorDe(() => actualizarCandidato(repo, c.id, { correo: 'malo' }));
    expect(err.estado).toBe(400);
    expect(err.extra.errores.correo).toBeTruthy();
  });

  test('el detalle muestra todas sus solicitudes', () => {
    const s = solicitudNueva();
    expect(obtenerCandidato(repo, s.candidato.id).solicitudes).toHaveLength(1);
  });

  test('borrar un candidato devuelve sus archivos para eliminarlos del disco', () => {
    const s = solicitudNueva();
    expect(eliminarCandidato(repo, s.candidato.id).archivos).toEqual(['archivo-interno.pdf']);
    expect(errorDe(() => obtenerCandidato(repo, s.candidato.id)).estado).toBe(404);
  });
});

describe('Crear solicitud (formulario del analista)', () => {
  test('con candidato nuevo: crea ambos y deja registro en el historial', () => {
    const s = solicitudNueva({ evaluadorId: ctx.evaluador.id });
    expect(s.candidato.nombre).toBe('Valentina Ortega');
    expect(s.analista.nombre).toBe('Carla Rojas');
    expect(s.evaluador.nombre).toBe('Paula Vidal');
    expect(s.etapa).toBe('recibida');
    expect(s.cv.nombre).toBe('CV_Valentina.pdf');
    expect(s.requiereReferencias).toBe(true);
    expect(s.historial[0].accion).toBe('Solicitud creada');
    expect(s.historial[0].usuario).toBe('Carla Rojas');
  });

  test('con candidato ya registrado: no lo duplica', () => {
    const primera = solicitudNueva();
    const segunda = crearSolicitud(
      repo,
      ctx.analista,
      { ...SOLICITUD, nombreCargo: 'Supervisor', candidatoId: primera.candidato.id },
      { cv: ARCHIVO_CV }
    );
    expect(segunda.candidato.id).toBe(primera.candidato.id);
    expect(repo.candidatos.contar()).toBe(1);
  });

  test('si el correo ya existe, avisa con 409 para elegir al candidato existente', () => {
    solicitudNueva();
    const err = errorDe(() => solicitudNueva());
    expect(err.estado).toBe(409);
    expect(err.extra.candidatoExistente).toBeTruthy();
  });

  test('exige el CV y junta todos los errores en una sola respuesta', () => {
    const err = errorDe(() => crearSolicitud(repo, ctx.analista, { nombre: 'A', familiaCargo: 'x' }, {}));
    expect(err.estado).toBe(400);
    for (const campo of ['cv', 'nombre', 'correo', 'telefono', 'origen', 'familiaCargo', 'nombreCargo', 'ubicacion', 'unidad']) {
      expect(Object.hasOwn(err.extra.errores, campo)).toBe(true);
    }
  });

  test('el responsable debe ser un evaluador (no un analista ni alguien inventado)', () => {
    expect(errorDe(() => solicitudNueva({ evaluadorId: ctx.analista.id })).extra.errores.evaluadorId).toBeTruthy();
    expect(errorDe(() => solicitudNueva({ evaluadorId: 'inventado' })).extra.errores.evaluadorId).toBeTruthy();
  });

  test('si algo falla, no queda un candidato a medio crear', () => {
    errorDe(() => crearSolicitud(repo, ctx.analista, { ...CANDIDATO, ...SOLICITUD }, {}));
    expect(repo.candidatos.contar()).toBe(0);
  });
});

describe('Editar solicitud', () => {
  test('cambia el cargo y queda en el historial qué se editó', () => {
    const s = solicitudNueva();
    const editada = actualizarSolicitud(repo, ctx.evaluador, s.id, { nombreCargo: 'Operador sala de control' });
    expect(editada.nombreCargo).toBe('Operador sala de control');
    expect(editada.historial[0].accion).toBe('Datos editados');
    expect(editada.historial[0].detalle).toBe('cargo');
  });

  test('reasigna el responsable', () => {
    const s = solicitudNueva({ evaluadorId: ctx.evaluador.id });
    expect(actualizarSolicitud(repo, ctx.analista, s.id, { evaluadorId: ctx.evaluador2.id }).evaluador.nombre).toBe(
      'Rodrigo Saavedra'
    );
  });

  test('404 si la solicitud no existe', () => {
    expect(errorDe(() => actualizarSolicitud(repo, ctx.analista, 'no-existe', { nombreCargo: 'X' })).estado).toBe(404);
  });
});

describe('Reglas del proceso (etapas)', () => {
  test('no se puede agendar sin fecha de entrevista', () => {
    const s = solicitudNueva();
    const err = errorDe(() => cambiarEtapa(repo, ctx.evaluador, s.id, 'agendada'));
    expect(err.estado).toBe(422);
    expect(err.extra.errores.fechaEntrevista).toBeTruthy();
  });

  test('con fecha de entrevista se agenda, y el evaluador queda como responsable', () => {
    const s = solicitudNueva();
    guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_FUTURA });
    const { solicitud } = cambiarEtapa(repo, ctx.evaluador, s.id, 'agendada');
    expect(solicitud.etapa).toBe('agendada');
    expect(solicitud.evaluador.nombre).toBe('Paula Vidal');
    expect(solicitud.historial.some((h) => h.detalle === 'Evaluación recibida → Entrevista agendada')).toBe(true);
  });

  test('no se puede enviar el informe sin resultado', () => {
    const s = solicitudNueva();
    guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_HECHA });
    const err = errorDe(() => cambiarEtapa(repo, ctx.evaluador, s.id, 'informe_enviado'));
    expect(err.extra.errores.resultado).toBeTruthy();
  });

  test('al enviar el informe se pone la fecha de hoy si falta, se calcula el timing y se avisa', () => {
    const s = solicitudNueva();
    guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_HECHA, resultado: 'recomendado' });
    const { solicitud, informeEnviado } = cambiarEtapa(repo, ctx.evaluador, s.id, 'informe_enviado');
    expect(informeEnviado).toBe(true);
    expect(solicitud.evaluacion.fechaInforme).toBe(new Date().toLocaleDateString('sv-SE'));
    expect(solicitud.timingDias).toBe(0);
  });

  test('repetir la misma etapa no hace nada ni avisa de nuevo', () => {
    const s = solicitudNueva();
    const { informeEnviado } = cambiarEtapa(repo, ctx.evaluador, s.id, 'recibida');
    expect(informeEnviado).toBe(false);
    expect(obtenerSolicitud(repo, s.id).historial).toHaveLength(1);
  });

  test('rechaza etapas que no existen', () => {
    const s = solicitudNueva();
    expect(errorDe(() => cambiarEtapa(repo, ctx.evaluador, s.id, 'aprobada')).estado).toBe(400);
  });
});

describe('Reglas de fechas (la línea de tiempo debe tener sentido)', () => {
  test('no se puede marcar como realizada una entrevista que todavía no ocurre', () => {
    const s = solicitudNueva();
    guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_FUTURA });
    cambiarEtapa(repo, ctx.evaluador, s.id, 'agendada');
    const err = errorDe(() => cambiarEtapa(repo, ctx.evaluador, s.id, 'realizada'));
    expect(err.estado).toBe(422);
    expect(err.extra.errores.fechaEntrevista).toContain('todavía no ocurre');
  });

  test('la entrevista no puede ser antes de la solicitud ni más de un año después', () => {
    const s = solicitudNueva();
    expect(errorDe(() => guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: `${diaMas(-3)}T10:00` })).extra.errores.fechaEntrevista).toContain('anterior');
    expect(errorDe(() => guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: `${diaMas(400)}T10:00` })).extra.errores.fechaEntrevista).toContain('año');
  });

  test('el informe no puede ser futuro ni anterior a la entrevista', () => {
    const s = solicitudNueva();
    expect(errorDe(() => guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaInforme: diaMas(30) })).extra.errores.fechaInforme).toContain('futura');
    // Entrevista en 5 días + informe hoy = informe antes de la entrevista
    const err = errorDe(() =>
      guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_FUTURA, fechaInforme: HOY })
    );
    expect(err.extra.errores.fechaInforme).toBe('El informe no puede ser anterior a la entrevista.');
  });

  test('con la entrevista ya realizada, su fecha no puede moverse al futuro', () => {
    const s = solicitudNueva();
    guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_HECHA });
    cambiarEtapa(repo, ctx.evaluador, s.id, 'realizada');
    const err = errorDe(() => guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_FUTURA }));
    expect(err.extra.errores.fechaEntrevista).toContain('no puede ser futura');
  });
});

describe('Registrar la evaluación', () => {
  test('guarda observaciones y resultado, y lo deja en el historial', () => {
    const s = solicitudNueva();
    const r = guardarEvaluacion(repo, ctx.evaluador, s.id, { observaciones: 'Buen perfil.', resultado: 'recomendado_obs' });
    expect(r.evaluacion.resultado).toBe('recomendado_obs');
    expect(r.historial[0].detalle).toContain('Recomendado con observaciones');
  });

  test('el informe no puede tener fecha anterior a la solicitud', () => {
    const s = solicitudNueva();
    const err = errorDe(() => guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaInforme: '2020-01-01' }));
    expect(err.extra.errores.fechaInforme).toBeTruthy();
  });

  test('con el informe enviado, el resultado no se puede borrar', () => {
    const s = solicitudNueva();
    guardarEvaluacion(repo, ctx.evaluador, s.id, { fechaEntrevista: ENTREVISTA_HECHA, resultado: 'recomendado' });
    cambiarEtapa(repo, ctx.evaluador, s.id, 'informe_enviado');
    expect(errorDe(() => guardarEvaluacion(repo, ctx.evaluador, s.id, { resultado: '' })).extra.errores.resultado).toBeTruthy();
  });
});

describe('Consultar y eliminar', () => {
  test('filtra solicitudes e ignora filtros inválidos', () => {
    solicitudNueva();
    expect(listarSolicitudes(repo, { etapa: 'recibida' })).toHaveLength(1);
    expect(listarSolicitudes(repo, { etapa: 'inventada', desde: 'ayer' })).toHaveLength(1);
    expect(listarSolicitudes(repo, { q: 'operador' })).toHaveLength(1);
    expect(listarSolicitudes(repo, { familiaCargo: 'jefatura' })).toHaveLength(0);
  });

  test('el detalle incluye evaluación vacía y no expone rutas internas de archivos', () => {
    const s = obtenerSolicitud(repo, solicitudNueva().id);
    expect(s.evaluacion).toEqual({ fechaEntrevista: null, observaciones: '', resultado: null, fechaInforme: null });
    expect(JSON.stringify(s)).not.toContain('archivo-interno');
  });

  test('descargar un adjunto que no existe responde 404', () => {
    const s = solicitudNueva();
    expect(archivoDeSolicitud(repo, s.id, 'cv').archivo).toBe('archivo-interno.pdf');
    expect(errorDe(() => archivoDeSolicitud(repo, s.id, 'descriptor')).estado).toBe(404);
  });

  test('eliminar una solicitud mantiene al candidato y devuelve el CV a borrar', () => {
    const s = solicitudNueva();
    expect(eliminarSolicitud(repo, s.id).archivos).toEqual(['archivo-interno.pdf']);
    expect(repo.candidatos.contar()).toBe(1);
    expect(repo.solicitudes.contar()).toBe(0);
  });
});
