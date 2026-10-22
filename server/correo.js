// Correo de confirmación al postulante.
//
// Por defecto funciona en MODO PRUEBA (Ethereal): no se envía ningún correo real,
// y en la terminal aparece un enlace para ver cómo habría llegado.
// Para enviar correos reales, define las variables SMTP_* (ver más abajo).

const NOMBRES_FAMILIA = {
  tecnologia: 'Tecnología / TI',
  recursos_humanos: 'Recursos Humanos',
  ventas: 'Ventas / Comercial',
  operaciones: 'Operaciones',
  finanzas: 'Finanzas',
};

// Todo lo que escribió el usuario se escapa antes de entrar al HTML del correo.
export function escaparHtml(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function construirCorreo(datos, empresa = 'Equipo de Reclutamiento') {
  const primerNombre = (datos.nombreCompleto || '').trim().split(/\s+/)[0] || '';
  const familia = NOMBRES_FAMILIA[datos.familiaCargo] || datos.familiaCargo || '';
  const cargo = datos.nombreCargo || '';

  const saludo = primerNombre ? `Hola ${primerNombre},` : 'Hola,';

  const texto = [
    saludo,
    '',
    `Recibimos tu postulación al cargo "${cargo}" (${familia}).`,
    '',
    'Revisaremos tu CV y, si tu perfil avanza en el proceso, nos pondremos en contacto contigo por correo o al número que registraste.',
    '',
    'Gracias por tu interés.',
    '',
    empresa,
    '',
    'Este es un mensaje automático; no es necesario responderlo.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">
      <div style="background:#002A54;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold;">
        Recibimos tu postulación
      </div>
      <div style="padding:24px;font-size:15px;line-height:1.55;">
        <p style="margin:0 0 14px;">${escaparHtml(saludo)}</p>
        <p style="margin:0 0 14px;">Recibimos tu postulación al cargo
          <strong>${escaparHtml(cargo)}</strong> (${escaparHtml(familia)}).</p>
        <p style="margin:0 0 14px;">Revisaremos tu CV y, si tu perfil avanza en el proceso,
          nos pondremos en contacto contigo por correo o al número que registraste.</p>
        <p style="margin:0 0 4px;">Gracias por tu interés.</p>
        <p style="margin:0;font-weight:bold;">${escaparHtml(empresa)}</p>
      </div>
      <div style="padding:12px 24px;background:#f8fafc;color:#64748b;font-size:12px;">
        Este es un mensaje automático; no es necesario responderlo.
      </div>
    </div>
  </body>
</html>`;

  // El asunto es fijo: nunca lleva texto escrito por el usuario.
  return { asunto: 'Recibimos tu postulación', texto, html };
}

// --- Conexión con el servidor de correo ---
async function crearTransporteDesdeEntorno() {
  let nodemailer;
  try {
    ({ default: nodemailer } = await import('nodemailer'));
  } catch {
    console.warn(
      'Correo desactivado: falta instalar nodemailer (en la carpeta server: npm install nodemailer).'
    );
    return null;
  }

  const tiempos = {
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };

  // Correo real: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y MAIL_FROM
  if (process.env.SMTP_HOST) {
    const puerto = Number(process.env.SMTP_PORT) || 587;
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
      ...tiempos,
    });
    return {
      transporte,
      desde: process.env.MAIL_FROM || process.env.SMTP_USER,
      vistaPrevia: null,
    };
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
    desde: `"Reclutamiento" <${cuenta.user}>`,
    vistaPrevia: (info) => nodemailer.getTestMessageUrl(info) || null,
  };
}

/**
 * Servicio de correo. Un fallo al enviar NUNCA lanza error:
 * la postulación ya está guardada y eso es lo importante.
 * Para pruebas se puede pasar { obtenerTransporte } con un transporte falso.
 */
export function crearServicioCorreo({
  obtenerTransporte = crearTransporteDesdeEntorno,
  empresa = process.env.NOMBRE_EMPRESA || 'Equipo de Reclutamiento',
} = {}) {
  let guardado = null;
  const obtener = async () => {
    if (!guardado) guardado = await obtenerTransporte();
    return guardado;
  };

  return {
    async enviarConfirmacion(datos) {
      try {
        const conexion = await obtener();
        if (!conexion) return { ok: false, motivo: 'sin-transporte' };

        const { asunto, texto, html } = construirCorreo(datos, empresa);
        const info = await conexion.transporte.sendMail({
          from: conexion.desde,
          to: datos.correo,
          subject: asunto,
          text: texto,
          html,
        });

        const vista = conexion.vistaPrevia?.(info);
        console.log(
          vista
            ? `Correo de prueba generado (no se envió a nadie). Vista previa: ${vista}`
            : `Correo de confirmación enviado a ${datos.correo}.`
        );
        return { ok: true };
      } catch (err) {
        console.error('No se pudo enviar el correo de confirmación:', err.message);
        return { ok: false, motivo: 'error' };
      }
    },
  };
}