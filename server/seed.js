// =====================================================================
// DATOS FICTICIOS PARA LA DEMO
//   npm run seed            → carga los datos solo si no hay candidatos
//   npm run seed -- --reset → borra TODOS los candidatos y solicitudes y los vuelve a cargar
//
// Todas las personas, correos, teléfonos y CVs son inventados (lo exige el caso:
// nunca usar datos reales de candidatos).
// =====================================================================
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { crearRepositorio } from './db.js';
import { asegurarUsuariosIniciales, crearUsuario, USUARIOS_DEMO } from './servicios/usuarios.js';
import { ETAPAS } from './modelos/catalogos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARPETA_ARCHIVOS = path.join(__dirname, 'uploads');
const DIA_MS = 86_400_000;

// ---------------------------------------------------------------------
// PDF mínimo de una página (para que el CV de ejemplo se pueda descargar y abrir)
// ---------------------------------------------------------------------
export function crearPdfSimple(titulo, lineas) {
  const escapar = (t) => String(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const contenido = [
    'BT',
    '/F1 20 Tf 60 770 Td',
    `(${escapar(titulo)}) Tj`,
    '/F1 12 Tf 0 -34 Td 18 TL',
    ...lineas.map((l) => `(${escapar(l)}) Tj T*`),
    'ET',
  ].join('\n');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(contenido, 'latin1')} >>\nstream\n${contenido}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const posiciones = [];
  objetos.forEach((obj, i) => {
    posiciones.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

// ---------------------------------------------------------------------
// Datos ficticios (diasAtras = cuándo llegó la solicitud)
// ---------------------------------------------------------------------
const OBS = {
  recomendado:
    'Demuestra conocimiento técnico del proceso y buena disposición al trabajo en equipo. Comunica con claridad y mantiene la calma ante imprevistos.',
  recomendado_obs:
    'Cumple con el perfil técnico. Se sugiere reforzar en la inducción el trabajo bajo presión y la planificación de tareas en turnos rotativos.',
  no_recomendado:
    'Muestra baja tolerancia a la frustración frente a cambios de turno y dificultad para seguir procedimientos de seguridad. No se ajusta al perfil del cargo.',
};

const CASOS = [
  { nombre: 'Valentina Ortega', origen: 'externo', familia: 'operario_calificado', cargo: 'Operador de máquina', ubicacion: 'Planta Calbuco', unidad: 'industrial', etapa: 'informe_enviado', diasAtras: 150, timing: 9, resultado: 'recomendado', evaluador: 'evaluador' },
  { nombre: 'Benjamín Salgado', origen: 'interno', familia: 'supervisor_b', cargo: 'Supervisor de turno', ubicacion: 'Planta Cailín', unidad: 'industrial', etapa: 'informe_enviado', diasAtras: 128, timing: 7, resultado: 'recomendado_obs', evaluador: 'evaluador2' },
  { nombre: 'Josefa Navarro', origen: 'externo', familia: 'profesional_a', cargo: 'Analista de control de gestión', ubicacion: 'Oficina Central', unidad: 'corporativo', ceco: 'C100200300', etapa: 'informe_enviado', diasAtras: 110, timing: 11, resultado: 'recomendado', evaluador: 'evaluador', requiereReferencias: true },
  { nombre: 'Matías Cárcamo', origen: 'externo', familia: 'tecnico_bc', cargo: 'Técnico de mantención', ubicacion: 'AM Melinka', unidad: 'produccion_am', etapa: 'informe_enviado', diasAtras: 95, timing: 6, resultado: 'no_recomendado', evaluador: 'evaluador2' },
  { nombre: 'Antonia Barrientos', origen: 'interno', familia: 'jefatura', cargo: 'Jefa de área piscicultura', ubicacion: 'Codihue', unidad: 'produccion_ad', etapa: 'informe_enviado', diasAtras: 80, timing: 12, resultado: 'recomendado', evaluador: 'evaluador', referido: true },
  { nombre: 'Ignacio Vera', origen: 'externo', familia: 'operario_calificado', cargo: 'Operador sala de control', ubicacion: 'Pargua PA', unidad: 'otros_produccion', etapa: 'informe_enviado', diasAtras: 62, timing: 8, resultado: 'recomendado', evaluador: 'evaluador2' },
  { nombre: 'Catalina Oyarzo', origen: 'externo', familia: 'profesional_bc', cargo: 'Coordinadora de servicios generales', ubicacion: 'Planta Magallanes', unidad: 'industrial', etapa: 'informe_enviado', diasAtras: 45, timing: 10, resultado: 'recomendado_obs', evaluador: 'evaluador' },
  { nombre: 'Felipe Andrade', origen: 'interno', familia: 'tecnico_a', cargo: 'Técnico de mantención senior', ubicacion: 'AM Melinka', unidad: 'produccion_am', etapa: 'informe_enviado', diasAtras: 30, timing: 5, resultado: 'recomendado', evaluador: 'evaluador2' },
  { nombre: 'Martina Gallardo', origen: 'externo', familia: 'profesional_a', cargo: 'Líder de desarrollo de producción', ubicacion: 'Oficina Central', unidad: 'corporativo', etapa: 'realizada', diasAtras: 14, entrevistaEn: -6, evaluador: 'evaluador', requiereReferencias: true, aspectos: 'Liderazgo de equipos multidisciplinarios y manejo de proyectos simultáneos.' },
  { nombre: 'Tomás Riquelme', origen: 'externo', familia: 'operario_calificado', cargo: 'Operador de máquina', ubicacion: 'Planta Magallanes', unidad: 'industrial', etapa: 'agendada', diasAtras: 6, entrevistaEn: 2, evaluador: 'evaluador2' },
  { nombre: 'Sofía Paredes', origen: 'interno', familia: 'tecnico_bc', cargo: 'Asistente de bodega', ubicacion: 'Pargua PA', unidad: 'otros_produccion', etapa: 'recibida', diasAtras: 3, evaluador: 'evaluador', aspectos: 'Orden, manejo de inventario y cumplimiento de normas de seguridad.' },
  { nombre: 'Joaquín Leiva', origen: 'externo', familia: 'supervisor_b', cargo: 'Supervisor de planta', ubicacion: 'Planta Magallanes', unidad: 'industrial', etapa: 'recibida', diasAtras: 1, evaluador: null },
];

const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const correoDe = (nombre) => `${sinTildes(nombre).toLowerCase().replace(/\s+/g, '.')}@ejemplo.cl`;
const fechaIso = (ms) => new Date(ms).toISOString();
const fechaDia = (ms) => new Date(ms).toLocaleDateString('sv-SE');
// Entrevista a las 10:00 hora local, formato YYYY-MM-DDTHH:MM
const fechaHora = (ms) => `${fechaDia(ms)}T10:00`;

export function cargarDatosDemo(repo, { carpetaArchivos = CARPETA_ARCHIVOS, ahora = Date.now() } = {}) {
  fs.mkdirSync(carpetaArchivos, { recursive: true });
  const usuario = (u) => repo.usuarios.buscarPorUsuario(u);

  // Asegura que existan los usuarios de demo que se usan como analista y evaluadores
  for (const demo of USUARIOS_DEMO.filter((u) => ['analista', 'evaluador', 'evaluador2'].includes(u.usuario))) {
    if (!usuario(demo.usuario)) crearUsuario(repo, demo);
  }
  const analista = usuario('analista');

  return repo.transaccion(() =>
    CASOS.map((caso, i) => {
      const telefono = `+5699000${String(1001 + i).padStart(4, '0')}`;
      const candidatoId = repo.candidatos.crear({
        nombre: caso.nombre,
        correo: correoDe(caso.nombre),
        telefono,
        origen: caso.origen,
      });

      const cvArchivo = `${crypto.randomUUID()}.pdf`;
      const pdf = crearPdfSimple(`CV de ejemplo - ${caso.nombre}`, [
        'Documento ficticio generado para la demostración del sistema.',
        `Cargo al que postula: ${caso.cargo}`,
        `Correo: ${correoDe(caso.nombre)}`,
        'Experiencia: 4 años en el área (dato inventado).',
      ]);
      fs.writeFileSync(path.join(carpetaArchivos, cvArchivo), pdf);

      const inicio = ahora - caso.diasAtras * DIA_MS;
      const evaluador = caso.evaluador ? usuario(caso.evaluador) : null;
      const solicitudId = repo.solicitudes.crear({
        candidatoId,
        analistaId: analista.id,
        evaluadorId: evaluador?.id ?? null,
        familiaCargo: caso.familia,
        nombreCargo: caso.cargo,
        ubicacion: caso.ubicacion,
        unidad: caso.unidad,
        ceco: caso.ceco ?? '',
        requiereReferencias: Boolean(caso.requiereReferencias),
        referido: Boolean(caso.referido),
        aspectosIndagar: caso.aspectos ?? '',
        cvArchivo,
        cvNombreOriginal: `CV_${sinTildes(caso.nombre).replace(/\s+/g, '_')}.pdf`,
        cvBytes: pdf.length,
        etapa: caso.etapa,
        fechaSolicitud: fechaIso(inicio),
      });
      repo.historial.registrar(solicitudId, analista.id, 'Solicitud creada', 'Datos de demostración');

      if (caso.etapa !== 'recibida') {
        const entrevista = caso.entrevistaEn !== undefined
          ? ahora + caso.entrevistaEn * DIA_MS
          : inicio + Math.max(1, Math.floor(caso.timing / 2)) * DIA_MS;
        const evaluacion = { fechaEntrevista: fechaHora(entrevista) };
        if (caso.etapa === 'informe_enviado') {
          evaluacion.resultado = caso.resultado;
          evaluacion.observaciones = OBS[caso.resultado];
          evaluacion.fechaInforme = fechaDia(inicio + caso.timing * DIA_MS);
        } else if (caso.etapa === 'realizada') {
          evaluacion.observaciones = 'Entrevista realizada. Informe en preparación.';
        }
        repo.evaluaciones.guardar(solicitudId, evaluacion);
        repo.historial.registrar(solicitudId, evaluador?.id, 'Etapa cambiada', `→ ${ETAPAS[caso.etapa]}`);
      }
      return solicitudId;
    })
  );
}

// ---------------------------------------------------------------------
// Ejecución desde la terminal
// ---------------------------------------------------------------------
const ejecutadoDirecto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (ejecutadoDirecto) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Los datos de demostración no se cargan en producción.');
    process.exit(1);
  }
  const repo = crearRepositorio();
  asegurarUsuariosIniciales(repo, { produccion: false, env: {} });

  const reiniciar = process.argv.includes('--reset');
  if (repo.candidatos.contar() > 0 && !reiniciar) {
    console.log('Ya hay candidatos en la base. Para borrarlos y cargar la demo de nuevo: npm run seed -- --reset');
    process.exit(0);
  }

  if (reiniciar) {
    for (const c of repo.candidatos.listar()) {
      for (const f of repo.candidatos.archivos(c.id)) {
        for (const nombre of [f.cv_archivo, f.descriptor_archivo].filter(Boolean)) {
          fs.rmSync(path.join(CARPETA_ARCHIVOS, path.basename(nombre)), { force: true });
        }
      }
      repo.candidatos.eliminar(c.id);
    }
    console.log('Candidatos y solicitudes anteriores eliminados.');
  }

  const ids = cargarDatosDemo(repo);
  console.log(`Listo: ${ids.length} candidatos ficticios con sus solicitudes en distintas etapas.`);
  console.table(USUARIOS_DEMO.map(({ usuario, password, rol }) => ({ usuario, contraseña: password, rol })));
  repo.cerrar();
}
