// Funciones "puras" del proceso de evaluación: reciben datos y devuelven
// datos o texto, sin tocar la pantalla. Por eso se pueden probar con Vitest.
// Las reglas de etapas son las mismas del servidor (server/servicios/solicitudes.js);
// aquí solo sirven para avisar antes de intentar.

export const ORDEN_ETAPAS = ['recibida', 'agendada', 'realizada', 'informe_enviado'];

// El caso sugiere 3 estados (RF08). Nuestras 4 etapas reales se agrupan así:
export const ESTADO_GENERAL = {
  recibida: 'Pendiente',
  agendada: 'En proceso',
  realizada: 'En proceso',
  informe_enviado: 'Finalizada',
};

export const estadoGeneral = (etapa) => ESTADO_GENERAL[etapa] ?? '—';

/** Etapa que sigue, o null si ya está en la última */
export const siguienteEtapa = (etapa) => {
  const i = ORDEN_ETAPAS.indexOf(etapa);
  return i >= 0 && i < ORDEN_ETAPAS.length - 1 ? ORDEN_ETAPAS[i + 1] : null;
};

/** Fecha y hora local actual en el formato de los formularios: "2026-10-23T17:30" */
export const ahoraLocal = (d = new Date()) => `${d.toLocaleDateString('sv-SE')}T${d.toTimeString().slice(0, 5)}`;

const sumarDias = (dia, dias) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

/**
 * ¿Qué falta para poder pasar la solicitud a `etapa`?
 * Devuelve el mensaje, o '' si se puede.
 */
export const requisitoEtapa = (solicitud, etapa, ahora = ahoraLocal()) => {
  const evaluacion = solicitud?.evaluacion ?? {};
  if (ORDEN_ETAPAS.indexOf(etapa) >= ORDEN_ETAPAS.indexOf('agendada') && !evaluacion.fechaEntrevista) {
    return 'Primero registra la fecha y hora de la entrevista.';
  }
  if ((etapa === 'realizada' || etapa === 'informe_enviado') && evaluacion.fechaEntrevista > ahora) {
    return 'La entrevista todavía no ocurre: márcala como realizada después de la fecha agendada.';
  }
  if (etapa === 'informe_enviado' && !evaluacion.resultado) {
    return 'Registra el resultado de la evaluación antes de enviar el informe.';
  }
  return '';
};

/**
 * Revisa que las fechas de la evaluación tengan sentido (mismas reglas del servidor).
 * Devuelve { campo: mensaje } solo con los errores.
 */
export const validarFechasEvaluacion = (solicitud, evaluacion, ahora = ahoraLocal()) => {
  const errores = {};
  const diaSolicitud = diaLocal(solicitud.fechaSolicitud);
  const hoy = ahora.slice(0, 10);
  const { fechaEntrevista, fechaInforme } = evaluacion;
  const entrevistaHecha = solicitud.etapa === 'realizada' || solicitud.etapa === 'informe_enviado';

  if (fechaEntrevista) {
    const dia = fechaEntrevista.slice(0, 10);
    if (dia < diaSolicitud) errores.fechaEntrevista = 'La entrevista no puede ser anterior a la fecha de la solicitud.';
    else if (dia > sumarDias(diaSolicitud, 365)) errores.fechaEntrevista = 'La entrevista debe quedar dentro del año siguiente a la solicitud.';
    else if (entrevistaHecha && fechaEntrevista > ahora) errores.fechaEntrevista = 'La entrevista ya figura como realizada: su fecha no puede ser futura.';
  }
  if (fechaInforme) {
    if (fechaInforme < diaSolicitud) errores.fechaInforme = 'El informe no puede ser anterior a la fecha de la solicitud.';
    else if (fechaInforme > hoy) errores.fechaInforme = 'La fecha del informe no puede ser futura.';
    else if (fechaEntrevista && !errores.fechaEntrevista && fechaInforme < fechaEntrevista.slice(0, 10)) {
      errores.fechaInforme = 'El informe no puede ser anterior a la entrevista.';
    }
  }
  return errores;
};

/** "Múñoz" -> "munoz" (para buscar sin importar tildes ni mayúsculas) */
export const normalizar = (texto = '') =>
  String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Fecha ISO -> "2026-10-23" según la hora local (para comparar con filtros de fecha) */
export const diaLocal = (valor) => {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('sv-SE') : '';
};

/**
 * Filtra solicitudes en el navegador (la lista completa ya está cargada).
 * filtros: { etapa, familiaCargo, responsable ('' | 'sin' | id), q, desde, hasta }
 */
// "En proceso" (uno de los 3 estados del caso) junta dos etapas reales
export const ETAPAS_EN_PROCESO = ['agendada', 'realizada'];

/** etapa puede ser una etapa real o 'en_proceso' (agendada + realizada) */
export const filtrarSolicitudes = (lista = [], filtros = {}) => {
  const { etapa, familiaCargo, responsable, q, desde, hasta } = filtros;
  const busqueda = normalizar(q);
  return lista.filter((s) => {
    if (etapa === 'en_proceso') {
      if (!ETAPAS_EN_PROCESO.includes(s.etapa)) return false;
    } else if (etapa && s.etapa !== etapa) return false;
    if (familiaCargo && s.familiaCargo !== familiaCargo) return false;
    if (responsable === 'sin' && s.evaluador) return false;
    if (responsable && responsable !== 'sin' && s.evaluador?.id !== responsable) return false;
    const dia = diaLocal(s.fechaSolicitud);
    if (desde && dia < desde) return false;
    if (hasta && dia > hasta) return false;
    if (busqueda) {
      const texto = normalizar(`${s.candidato?.nombre} ${s.candidato?.correo} ${s.nombreCargo} ${s.ubicacion}`);
      if (!texto.includes(busqueda)) return false;
    }
    return true;
  });
};

/** { todas: 12, recibida: 2, agendada: 1, ... } */
export const contarPorEtapa = (lista = []) => {
  const conteo = { todas: lista.length };
  for (const etapa of ORDEN_ETAPAS) conteo[etapa] = 0;
  for (const s of lista) if (s.etapa in conteo) conteo[s.etapa] += 1;
  return conteo;
};

const DIA_MS = 86_400_000;

/** "2026-10-23T..." -> "23-10-2026" */
export const formatearFecha = (valor) => {
  const d = valor ? new Date(String(valor).length === 10 ? `${valor}T12:00:00` : valor) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
};

/** "2026-10-28T10:00" -> "28-10-2026, 10:00" */
export const formatearFechaHora = (valor) => {
  const d = valor ? new Date(valor) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${formatearFecha(valor)}, ${hora}`;
};

/** "Hoy", "Ayer", "Hace 3 días", "Hace 2 semanas", "Hace 1 mes"… */
export const hace = (valor, ahora = Date.now()) => {
  const d = valor ? new Date(valor) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
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

/** "+56912345678" -> "+56 9 1234 5678" */
export const telefonoLegible = (tel = '') => {
  const d = String(tel).replace(/\D/g, '').slice(-9);
  return /^9\d{8}$/.test(d) ? `+56 ${d[0]} ${d.slice(1, 5)} ${d.slice(5)}` : tel;
};

/** "+56 9 1234 5678" -> "56912345678" (para el enlace de WhatsApp) */
export const telefonoWhatsapp = (tel = '') => {
  const d = String(tel).replace(/\D/g, '').slice(-9);
  return /^9\d{8}$/.test(d) ? `56${d}` : '';
};

export const iniciales = (nombre = '') =>
  String(nombre).trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

/**
 * Solo los campos que cambiaron (para mandar al servidor lo justo).
 * Compara como texto, así '' y null cuentan igual.
 */
export const cambios = (original = {}, editado = {}) => {
  const resultado = {};
  for (const [campo, valor] of Object.entries(editado)) {
    const antes = original[campo] ?? '';
    const ahora = valor ?? '';
    if (typeof ahora === 'boolean' ? ahora !== Boolean(antes) : String(ahora) !== String(antes)) {
      resultado[campo] = valor;
    }
  }
  return resultado;
};

/**
 * CSV para abrir en Excel en español: separado por punto y coma y con BOM
 * para que se vean bien las tildes.
 */
export const construirCsvSolicitudes = (lista = [], catalogos = {}) => {
  const columnas = [
    'Candidato', 'Correo', 'Origen', 'Familia de cargo', 'Cargo', 'Ubicación', 'Unidad',
    'Responsable', 'Fecha solicitud', 'Etapa', 'Estado', 'Resultado', 'Fecha informe', 'Timing (días)',
  ];
  const escapar = (v) => {
    let texto = String(v ?? '');
    // Evita que Excel interprete el texto como fórmula (=, +, -, @)
    if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replace(/"/g, '""')}"`;
  };
  const de = (catalogo, clave) => catalogos[catalogo]?.[clave] ?? clave ?? '';
  const filas = lista.map((s) =>
    [
      s.candidato?.nombre,
      s.candidato?.correo,
      de('origenes', s.candidato?.origen),
      de('familiasCargo', s.familiaCargo),
      s.nombreCargo,
      s.ubicacion,
      de('unidades', s.unidad),
      s.evaluador?.nombre ?? 'Sin asignar',
      formatearFecha(s.fechaSolicitud),
      de('etapas', s.etapa),
      estadoGeneral(s.etapa),
      s.evaluacion?.resultado ? de('resultados', s.evaluacion.resultado) : '',
      s.evaluacion?.fechaInforme ? formatearFecha(s.evaluacion.fechaInforme) : '',
      s.timingDias ?? '',
    ]
      .map(escapar)
      .join(';')
  );
  return '﻿' + [columnas.join(';'), ...filas].join('\r\n');
};
