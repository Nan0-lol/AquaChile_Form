// =====================================================================
// AVISOS POR CORREO (mismo flujo que hoy hacen con Forms y correo):
//   1. Nueva solicitud  → aviso al profesional evaluador asignado.
//   2. Informe enviado  → aviso al analista que pidió la evaluación.
//
// Por defecto funciona en MODO PRUEBA (Ethereal): no se envía ningún correo
// real, y en la terminal aparece un enlace para ver cómo habría llegado.
// Para enviar correos reales, define las variables SMTP_* en server/.env.
// =====================================================================
import { FAMILIAS_CARGO, RESULTADOS } from './modelos/catalogos.js';

// Todo lo que escribió un usuario se escapa antes de entrar al HTML del correo.
export function escaparHtml(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const primerNombre = (nombre = '') => String(nombre).trim().split(/\s+/)[0] || '';

const plantilla = (titulo, parrafos, pie) => `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">
      <div style="background:#3e5463;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold;">
        ${escaparHtml(titulo)}
      </div>
      <div style="padding:24px;font-size:15px;line-height:1.55;">
        ${parrafos.map((p) => `<p style="margin:0 0 14px;">${p}</p>`).join('\n        ')}
      </div>
      <div style="padding:12px 24px;background:#f8fafc;color:#64748b;font-size:12px;">
        ${escaparHtml(pie)}
      </div>
    </div>
  </body>
</html>`;

const PIE = 'Mensaje automático del Sistema de Evaluaciones Psicolaborales.';

/** Aviso al evaluador: llegó una solicitud nueva */
export function construirAvisoNuevaSolicitud(solicitud) {
  const evaluador = solicitud.evaluador?.nombre ?? '';
  const familia = FAMILIAS_CARGO[solicitud.familiaCargo] ?? solicitud.familiaCargo;
  const datos = `${solicitud.candidato.nombre} · ${solicitud.nombreCargo} (${familia}) · ${solicitud.ubicacion}`;
  const texto = [
    `Hola ${primerNombre(evaluador)},`,
    '',
    `${solicitud.analista.nombre} te asignó una nueva evaluación psicolaboral:`,
    datos,
    '',
    'Ingresa al sistema para revisar el CV y agendar la entrevista.',
    '',
    PIE,
  ].join('\n');
  const html = plantilla(
    'Nueva solicitud de evaluación',
    [
      `Hola ${escaparHtml(primerNombre(evaluador))},`,
      `<strong>${escaparHtml(solicitud.analista.nombre)}</strong> te asignó una nueva evaluación psicolaboral:`,
      `<strong>${escaparHtml(datos)}</strong>`,
      'Ingresa al sistema para revisar el CV y agendar la entrevista.',
    ],
    PIE
  );
  // El asunto es fijo: nunca lleva texto escrito por un usuario.
  return { asunto: 'Nueva solicitud de evaluación psicolaboral', texto, html };
}

/** Aviso al analista: el informe está listo */
export function construirAvisoInformeEnviado(solicitud) {
  const resultado = RESULTADOS[solicitud.evaluacion?.resultado] ?? 'Sin resultado';
  const datos = `${solicitud.candidato.nombre} · ${solicitud.nombreCargo}`;
  const texto = [
    `Hola ${primerNombre(solicitud.analista.nombre)},`,
    '',
    `La evaluación psicolaboral de ${datos} está finalizada.`,
    `Resultado: ${resultado}.`,
    '',
    'Ingresa al sistema para ver el detalle.',
    '',
    PIE,
  ].join('\n');
  const html = plantilla(
    'Evaluación finalizada',
    [
      `Hola ${escaparHtml(primerNombre(solicitud.analista.nombre))},`,
      `La evaluación psicolaboral de <strong>${escaparHtml(datos)}</strong> está finalizada.`,
      `Resultado: <strong>${escaparHtml(resultado)}</strong>.`,
      'Ingresa al sistema para ver el detalle.',
    ],
    PIE
  );
  return { asunto: 'Evaluación psicolaboral finalizada', texto, html };
}

// --- Conexión con el servidor de correo ---
async function crearTransporteDesdeEntorno() {
  let nodemailer;
  try {
    ({ default: nodemailer } = await import('nodemailer'));
  } catch {
    console.warn('Correo desactivado: falta instalar nodemailer (en la carpeta server: npm install nodemailer).');
    return null;
  }

  const tiempos = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 };

  // Correo real: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y MAIL_FROM
  if (process.env.SMTP_HOST) {
    const puerto = Number(process.env.SMTP_PORT) || 587;
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      ...tiempos,
    });
    return { transporte, desde: process.env.MAIL_FROM || process.env.SMTP_USER, vistaPrevia: null };
  }

  // Modo prueba: cuenta temporal de Ethereal, no llega nada a ninguna bandeja real.
  const cuenta = await nodemailer.createTestAccount();
  const transporte = nodemailer.createTransport({
    host: cuenta.smtp.host,
    port: cuenta.smtp.port,
    secure: cuenta.smtp.secure,
    auth: { user: cuenta.user, pass: cuenta.pass },
    ...tiempos,
  });
  return {
    transporte,
    desde: `"Evaluaciones Psicolaborales" <${cuenta.user}>`,
    vistaPrevia: (info) => nodemailer.getTestMessageUrl(info) || null,
  };
}

/**
 * Servicio de correo. Un fallo al enviar NUNCA lanza error:
 * la operación ya quedó guardada y eso es lo importante.
 * Para pruebas se puede pasar { obtenerTransporte } con un transporte falso.
 */
export function crearServicioCorreo({ obtenerTransporte = crearTransporteDesdeEntorno } = {}) {
  let guardado = null;
  const obtener = async () => {
    if (!guardado) guardado = await obtenerTransporte();
    return guardado;
  };

  const enviar = async (para, { asunto, texto, html }) => {
    if (!para) return { ok: false, motivo: 'sin-destinatario' };
    try {
      const conexion = await obtener();
      if (!conexion) return { ok: false, motivo: 'sin-transporte' };
      const info = await conexion.transporte.sendMail({ from: conexion.desde, to: para, subject: asunto, text: texto, html });
      const vista = conexion.vistaPrevia?.(info);
      console.log(vista ? `Correo de prueba (no se envió a nadie). Vista previa: ${vista}` : `Aviso enviado a ${para}.`);
      return { ok: true };
    } catch (err) {
      console.error('No se pudo enviar el aviso por correo:', err.message);
      return { ok: false, motivo: 'error' };
    }
  };

  return {
    /** solicitud con el formato de servicios/formato.js; correoEvaluador viene de la base */
    avisarNuevaSolicitud: (solicitud, correoEvaluador) =>
      enviar(correoEvaluador, construirAvisoNuevaSolicitud(solicitud)),
    avisarInformeEnviado: (solicitud, correoAnalista) =>
      enviar(correoAnalista, construirAvisoInformeEnviado(solicitud)),
  };
}
