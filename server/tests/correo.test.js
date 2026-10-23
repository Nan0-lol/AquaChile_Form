import { describe, test, expect, vi } from 'vitest';
import {
  construirAvisoNuevaSolicitud,
  construirAvisoInformeEnviado,
  escaparHtml,
  crearServicioCorreo,
} from '../correo.js';

const SOLICITUD = {
  candidato: { nombre: 'Valentina Ortega' },
  analista: { nombre: 'Carla Rojas' },
  evaluador: { nombre: 'Paula Vidal' },
  familiaCargo: 'operario_calificado',
  nombreCargo: 'Operador de máquina',
  ubicacion: 'Planta Calbuco',
  evaluacion: { resultado: 'recomendado_obs' },
};

describe('Contenido de los avisos', () => {
  test('nueva solicitud: saluda al evaluador y muestra candidato, cargo y familia', () => {
    const { asunto, texto, html } = construirAvisoNuevaSolicitud(SOLICITUD);
    expect(asunto).toBe('Nueva solicitud de evaluación psicolaboral');
    expect(texto).toContain('Hola Paula,');
    expect(texto).toContain('Carla Rojas');
    expect(html).toContain('Operario Calificado');
  });

  test('informe enviado: avisa al analista con el resultado legible', () => {
    const { texto } = construirAvisoInformeEnviado(SOLICITUD);
    expect(texto).toContain('Hola Carla,');
    expect(texto).toContain('Recomendado con observaciones');
  });

  test('escapa el HTML que haya escrito un usuario y el asunto nunca lleva su texto', () => {
    const malicioso = { ...SOLICITUD, candidato: { nombre: '<script>alert(1)</script>' }, nombreCargo: 'GANASTE' };
    const { asunto, html } = construirAvisoNuevaSolicitud(malicioso);
    expect(html).not.toContain('<script>');
    expect(asunto).not.toContain('GANASTE');
    expect(escaparHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });
});

describe('Envío', () => {
  test('envía al destinatario indicado', async () => {
    const sendMail = vi.fn(async () => ({}));
    const correo = crearServicioCorreo({ obtenerTransporte: async () => ({ transporte: { sendMail }, desde: 'sistema@ejemplo.cl' }) });
    const r = await correo.avisarNuevaSolicitud(SOLICITUD, 'paula@ejemplo.cl');
    expect(r.ok).toBe(true);
    expect(sendMail.mock.calls[0][0].to).toBe('paula@ejemplo.cl');
  });

  test('sin destinatario no intenta enviar', async () => {
    const sendMail = vi.fn(async () => ({}));
    const correo = crearServicioCorreo({ obtenerTransporte: async () => ({ transporte: { sendMail } }) });
    expect((await correo.avisarInformeEnviado(SOLICITUD, '')).motivo).toBe('sin-destinatario');
    expect(sendMail).toHaveBeenCalledTimes(0);
  });

  test('si el servidor de correo falla, no se cae nada', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const correo = crearServicioCorreo({
      obtenerTransporte: async () => ({ transporte: { sendMail: async () => { throw new Error('SMTP caído'); } } }),
    });
    expect((await correo.avisarInformeEnviado(SOLICITUD, 'carla@ejemplo.cl')).ok).toBe(false);
    consola.mockRestore();
  });
});
