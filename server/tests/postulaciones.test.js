import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { repoConUsuarios, SOLICITUD, ARCHIVO_CV } from './ayudas.js';
import {
  recibirPostulacion,
  listarPostulaciones,
  obtenerPostulacion,
  cambiarEstadoPostulacion,
  eliminarPostulacion,
} from '../servicios/postulaciones.js';
import { crearSolicitud } from '../servicios/solicitudes.js';
import { crearCandidato } from '../servicios/candidatos.js';
import { calcularIndicadores } from '../servicios/indicadores.js';
import { validarPostulacion } from '../validaciones.js';
import { ErrorServicio } from '../servicios/errores.js';
import { crearApp } from '../app.js';
import { crearAutenticador } from '../seguridad.js';
import { crearPdfSimple } from '../seed.js';
import { crearRepositorio } from '../db.js';
import { createRequire } from 'node:module';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

// Lo que manda el formulario público /postular (datos ficticios)
const POSTULACION = {
  nombre: 'Camila Henríquez',
  rut: '152348762',
  correo: 'Camila.Henriquez@Ejemplo.cl',
  telefono: '9 8765 4321',
  area: 'piscicultura',
  carta: 'Me interesa trabajar en pisciculturas.\nTengo experiencia en terreno.',
  consentimiento: 'true',
  sitioWeb: '',
};
// Lo que el analista agrega al pasarla a evaluación (el formulario público no lo pide)
const PARA_SOLICITUD = { origen: 'externo', ...SOLICITUD };
const datosCandidato = () => {
  const { nombre, correo, telefono } = validarPostulacion(POSTULACION).datos;
  return { nombre, correo, telefono };
};
const CV = { filename: 'cv-postulacion.pdf', originalname: 'CV_Camila.pdf', size: 3000 };

const errorDe = (fn) => {
  try {
    fn();
  } catch (err) {
    if (err instanceof ErrorServicio) return err;
    throw err;
  }
  throw new Error('Se esperaba un error y no hubo ninguno');
};

describe('Validación de la postulación', () => {
  test('una postulación correcta no tiene errores y se normaliza', () => {
    const { errores, datos } = validarPostulacion(POSTULACION);
    expect(errores).toEqual({});
    expect(datos.correo).toBe('camila.henriquez@ejemplo.cl');
    expect(datos.telefono).toBe('+56987654321');
    expect(datos.rut).toBe('15.234.876-2');
    expect(datos.carta).toContain('\n');
  });

  test('revisa el dígito verificador del RUT', () => {
    expect(validarPostulacion({ ...POSTULACION, rut: '15.234.876-3' }).errores.rut).toBeTruthy();
    expect(validarPostulacion({ ...POSTULACION, rut: '20.456.789-1' }).errores.rut).toBe(undefined);
  });

  test('la carta es opcional, pero con límite', () => {
    expect(validarPostulacion({ ...POSTULACION, carta: '' }).errores).toEqual({});
    expect(validarPostulacion({ ...POSTULACION, carta: 'a'.repeat(3001) }).errores.carta).toBeTruthy();
  });

  test('exige aceptar el uso de los datos', () => {
    const { errores } = validarPostulacion({ ...POSTULACION, consentimiento: 'false' });
    expect(Object.keys(errores)).toEqual(['consentimiento']);
  });

  test('marca cada campo obligatorio y solo acepta áreas del catálogo', () => {
    const { errores } = validarPostulacion({ consentimiento: 'true' });
    expect(Object.keys(errores).sort()).toEqual(['area', 'correo', 'nombre', 'rut', 'telefono']);
    expect(validarPostulacion({ ...POSTULACION, area: 'toString' }).errores.area).toBeTruthy();
  });
});

describe('Base de datos', () => {
  test('rehace la tabla de una versión de prueba anterior (sin RUT)', () => {
    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'aquachile-migracion-'));
    const ruta = path.join(carpeta, 'vieja.db');
    const vieja = new DatabaseSync(ruta);
    vieja.exec('CREATE TABLE postulaciones (id TEXT PRIMARY KEY, nombre TEXT, familia_cargo TEXT)');
    vieja.close();
    const repo = crearRepositorio(ruta);
    expect(repo.postulaciones.contar()).toBe(0);
    repo.postulaciones.crear({ nombre: 'A', rut: '1-9', correo: 'a@ejemplo.cl', telefono: '+56911111111', area: 'planta', cvArchivo: 'x.pdf', cvNombreOriginal: 'x.pdf', cvBytes: 1 });
    expect(repo.postulaciones.contar()).toBe(1);
    repo.cerrar();
    fs.rmSync(carpeta, { recursive: true, force: true });
  });
});

describe('Postulaciones (servicio)', () => {
  let ctx;
  let repo;
  beforeEach(() => {
    ctx = repoConUsuarios();
    repo = ctx.repo;
  });
  afterEach(() => repo.cerrar());

  test('una postulación nueva queda "por revisar" y suma en el panel', () => {
    const { id, ignorada } = recibirPostulacion(repo, POSTULACION, CV);
    expect(ignorada).toBe(false);
    const p = obtenerPostulacion(repo, id);
    expect(p.estado).toBe('nueva');
    expect(p.cv).toEqual({ nombre: 'CV_Camila.pdf', bytes: 3000 });
    expect(p.candidatoId).toBe(null);
    expect(calcularIndicadores(repo).postulacionesPorRevisar).toBe(1);
  });

  test('sin CV no se guarda', () => {
    const err = errorDe(() => recibirPostulacion(repo, POSTULACION, null));
    expect(err.estado).toBe(400);
    expect(err.extra.errores.cv).toBeTruthy();
    expect(repo.postulaciones.contar()).toBe(0);
  });

  test('si un bot llena el campo trampa, se ignora sin guardar nada', () => {
    const r = recibirPostulacion(repo, { ...POSTULACION, sitioWeb: 'http://spam.example' }, CV);
    expect(r).toEqual({ id: null, ignorada: true });
    expect(repo.postulaciones.contar()).toBe(0);
  });

  test('avisa si la persona ya está registrada como candidata (mismo correo)', () => {
    const c = crearCandidato(repo, { nombre: 'Camila Henríquez', correo: 'camila.henriquez@ejemplo.cl', telefono: '987654321', origen: 'externo' });
    const { id } = recibirPostulacion(repo, POSTULACION, CV);
    expect(obtenerPostulacion(repo, id).candidatoId).toBe(c.id);
  });

  test('filtra por estado y busca por nombre, correo o cargo', () => {
    recibirPostulacion(repo, POSTULACION, CV);
    const { id } = recibirPostulacion(repo, { ...POSTULACION, nombre: 'Diego Fuentealba', correo: 'diego.f@ejemplo.cl', rut: '17.890.123-0' }, CV);
    cambiarEstadoPostulacion(repo, ctx.analista, id, 'descartada');
    expect(listarPostulaciones(repo, { estado: 'nueva' })).toHaveLength(1);
    expect(listarPostulaciones(repo, { estado: 'descartada' })[0].revisadoPor).toBe('Carla Rojas');
    expect(listarPostulaciones(repo, { q: '17.890' })).toHaveLength(1);
    expect(listarPostulaciones(repo, { estado: 'cualquiera' })).toHaveLength(2); // filtro inválido se ignora
  });

  test('se puede descartar y volver a dejar por revisar', () => {
    const { id } = recibirPostulacion(repo, POSTULACION, CV);
    expect(cambiarEstadoPostulacion(repo, ctx.analista, id, 'descartada').estado).toBe('descartada');
    expect(cambiarEstadoPostulacion(repo, ctx.analista, id, 'nueva').estado).toBe('nueva');
    expect(errorDe(() => cambiarEstadoPostulacion(repo, ctx.analista, id, 'en_evaluacion')).estado).toBe(400);
  });

  test('al crear la solicitud desde la postulación, esta queda "En evaluación"', () => {
    const { id } = recibirPostulacion(repo, POSTULACION, CV);
    const s = crearSolicitud(repo, ctx.analista, { ...datosCandidato(), ...PARA_SOLICITUD, postulacionId: id }, { cv: ARCHIVO_CV });
    const p = obtenerPostulacion(repo, id);
    expect(p.estado).toBe('en_evaluacion');
    expect(p.solicitudId).toBe(s.id);
    expect(s.historial[0].detalle).toContain('postulación web');
    // No se puede usar dos veces, ni descartarla después
    expect(errorDe(() => crearSolicitud(repo, ctx.analista, { ...SOLICITUD, candidatoId: s.candidato.id, postulacionId: id }, { cv: ARCHIVO_CV })).estado).toBe(422);
    expect(errorDe(() => cambiarEstadoPostulacion(repo, ctx.analista, id, 'descartada')).estado).toBe(422);
  });

  test('una postulación descartada no pasa a evaluación', () => {
    const { id } = recibirPostulacion(repo, POSTULACION, CV);
    cambiarEstadoPostulacion(repo, ctx.analista, id, 'descartada');
    const err = errorDe(() => crearSolicitud(repo, ctx.analista, { ...datosCandidato(), ...PARA_SOLICITUD, postulacionId: id }, { cv: ARCHIVO_CV }));
    expect(err.message).toContain('descartada');
    expect(repo.solicitudes.contar()).toBe(0);
  });

  test('eliminar devuelve el CV para borrarlo del disco', () => {
    const { id } = recibirPostulacion(repo, POSTULACION, CV);
    expect(eliminarPostulacion(repo, id)).toEqual({ archivos: ['cv-postulacion.pdf'] });
    expect(errorDe(() => obtenerPostulacion(repo, id)).estado).toBe(404);
  });
});

// ---------------------------------------------------------------------
// De punta a punta por HTTP: lo que de verdad ve el navegador
// ---------------------------------------------------------------------
describe('API del formulario público', () => {
  const CORREO_FALSO = { avisarNuevaSolicitud() {}, avisarInformeEnviado() {} };
  const PDF = crearPdfSimple('CV de prueba', ['Documento ficticio.']);
  let ctx;
  let carpeta;
  let app;
  let servidor;
  let base;
  let auth;

  beforeAll(async () => {
    ctx = repoConUsuarios();
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'aquachile-postulaciones-'));
    auth = crearAutenticador({ repo: ctx.repo });
    app = crearApp({ repo: ctx.repo, auth, correo: CORREO_FALSO, carpetaArchivos: carpeta, limites: { postulaciones: 6 } });
    servidor = await new Promise((listo) => {
      const s = app.listen(0, () => listo(s));
    });
    base = `http://127.0.0.1:${servidor.address().port}/api`;
  });
  afterAll(() => {
    servidor.close();
    app.detener();
    auth.detener();
    ctx.repo.cerrar();
    fs.rmSync(carpeta, { recursive: true, force: true });
  });

  const formulario = (campos, archivo = PDF, nombre = 'CV_Camila.pdf') => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.append(k, v);
    if (archivo) fd.append('cv', new Blob([archivo]), nombre);
    return fd;
  };
  const postular = (campos, archivo, nombre) =>
    fetch(`${base}/publico/postulaciones`, { method: 'POST', body: formulario(campos, archivo, nombre) });
  const archivosEnDisco = () => fs.readdirSync(carpeta).length;

  test('las opciones públicas no muestran nada interno', async () => {
    const opciones = await (await fetch(`${base}/publico/opciones`)).json();
    expect(Object.keys(opciones)).toEqual(['areas']);
  });

  test('una persona sin cuenta puede postular', async () => {
    const res = await postular(POSTULACION);
    expect(res.status).toBe(201);
    const cuerpo = await res.json();
    expect(Object.keys(cuerpo).sort()).toEqual(['mensaje', 'ok']); // no devuelve datos guardados
    expect(ctx.repo.postulaciones.contar()).toBe(1);
    expect(archivosEnDisco()).toBe(1);
  });

  test('un archivo que no es PDF de verdad se rechaza y no queda en disco', async () => {
    const res = await postular({ ...POSTULACION, correo: 'otra@ejemplo.cl' }, Buffer.from('no soy un pdf'));
    expect(res.status).toBe(400);
    expect((await res.json()).errores.cv).toBeTruthy();
    expect(archivosEnDisco()).toBe(1);
  });

  test('solo acepta el CV en PDF', async () => {
    const res = await postular({ ...POSTULACION, correo: 'otra@ejemplo.cl' }, PDF, 'CV.docx');
    expect(res.status).toBe(400);
    expect((await res.json()).errores.cv).toBe('El CV debe estar en formato PDF.');
    expect(archivosEnDisco()).toBe(1);
  });

  test('sin aceptar el uso de datos no se guarda ni deja el CV', async () => {
    const res = await postular({ ...POSTULACION, consentimiento: 'false' });
    expect(res.status).toBe(400);
    expect((await res.json()).errores.consentimiento).toBeTruthy();
    expect(archivosEnDisco()).toBe(1);
  });

  test('a un bot se le responde igual, pero no se guarda nada', async () => {
    const res = await postular({ ...POSTULACION, sitioWeb: 'spam' });
    expect(res.status).toBe(201);
    expect(ctx.repo.postulaciones.contar()).toBe(1);
    expect(archivosEnDisco()).toBe(1);
  });

  test('la bandeja exige sesión y el permiso del rol', async () => {
    expect((await fetch(`${base}/postulaciones`)).status).toBe(401);
    const { token } = auth.iniciar('evaluador', 'evaluador-clave');
    const res = await fetch(`${base}/postulaciones`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(403);
  });

  test('el analista crea la solicitud reutilizando una copia del CV', async () => {
    const { token } = auth.iniciar('analista', 'analista-clave');
    const cabeceras = { Authorization: `Bearer ${token}` };
    const [p] = await (await fetch(`${base}/postulaciones?estado=nueva`, { headers: cabeceras })).json();

    const fd = new FormData();
    const campos = { ...datosCandidato(), ...PARA_SOLICITUD, postulacionId: p.id };
    for (const [k, v] of Object.entries(campos)) fd.append(k, v);
    const res = await fetch(`${base}/solicitudes`, { method: 'POST', headers: cabeceras, body: fd });
    expect(res.status).toBe(201);
    const solicitud = await res.json();
    expect(solicitud.cv.nombre).toBe('CV_Camila.pdf');
    expect(archivosEnDisco()).toBe(2); // el de la postulación y su copia

    const despues = await (await fetch(`${base}/postulaciones/${p.id}`, { headers: cabeceras })).json();
    expect(despues.estado).toBe('en_evaluacion');
    expect(despues.solicitudId).toBe(solicitud.id);
  });

  test('frena muchos envíos seguidos desde la misma conexión', async () => {
    // Ya van 5 envíos de 6 permitidos
    await postular({ ...POSTULACION, consentimiento: 'false' });
    const res = await postular(POSTULACION);
    expect(res.status).toBe(429);
  });
});
