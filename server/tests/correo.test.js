import { describe, test, expect, vi } from 'vitest';
import { construirCorreo, escaparHtml, crearServicioCorreo } from '../correo.js';

const DATOS = {
  nombreCompleto: 'María González',
  correo: 'maria@gmail.com',
  area: 'planta',
  nombreCargo: 'Operaria de planta',
};

describe('Contenido del correo de confirmación', () => {
  test('saluda por el primer nombre y muestra cargo y área', () => {
    const { asunto, texto, html } = construirCorreo(DATOS);
    expect(asunto).toBe('Recibimos tu postulación');
    expect(texto).toContain('Hola María,');
    expect(texto).toContain('Operaria de planta');
    expect(html).toContain('Plantas de Proceso');
  });

  test('escapa el HTML que escriba el postulante', () => {
    const { html } = construirCorreo({ ...DATOS, nombreCompleto: '<script>alert(1)</script> Ana' });
    expect(html).not.toContain('<script>');
    expect(escaparHtml('<b>"hola"</b>')).toBe('&lt;b&gt;&quot;hola&quot;&lt;/b&gt;');
  });

  test('el asunto nunca lleva texto del usuario', () => {
    const { asunto } = construirCorreo({ ...DATOS, nombreCargo: 'GANASTE UN PREMIO' });
    expect(asunto).toBe('Recibimos tu postulación');
  });
});

describe('Envío del correo', () => {
  test('envía al correo del postulante', async () => {
    const sendMail = vi.fn(async () => ({}));
    const servicio = crearServicioCorreo({
      obtenerTransporte: async () => ({ transporte: { sendMail }, desde: 'rrhh@aquachile.cl' }),
    });
    const resultado = await servicio.enviarConfirmacion(DATOS);
    expect(resultado.ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe('maria@gmail.com');
  });

  test('si el servidor de correo falla, no rompe la postulación', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const servicio = crearServicioCorreo({
      obtenerTransporte: async () => ({
        transporte: { sendMail: async () => { throw new Error('SMTP caído'); } },
      }),
    });
    await expect(servicio.enviarConfirmacion(DATOS)).resolves.toEqual({ ok: false, motivo: 'error' });
    consola.mockRestore();
  });
});
