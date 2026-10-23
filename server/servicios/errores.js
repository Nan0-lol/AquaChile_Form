// Errores de la lógica de negocio. La capa de rutas los convierte en respuestas HTTP.

export class ErrorServicio extends Error {
  /**
   * @param {number} estado  código HTTP (400, 404, 409…)
   * @param {string} mensaje texto para mostrar a la persona
   * @param {object} [extra] datos adicionales (ej. { errores: { campo: 'mensaje' } })
   */
  constructor(estado, mensaje, extra = {}) {
    super(mensaje);
    this.estado = estado;
    this.extra = extra;
  }
}

export const noEncontrado = (que = 'El registro') =>
  new ErrorServicio(404, `${que} no existe o fue eliminado.`);

export const datosInvalidos = (errores, mensaje = 'Revisa los campos marcados.') =>
  new ErrorServicio(400, mensaje, { errores });

export const reglaNegocio = (mensaje, campo) =>
  new ErrorServicio(422, mensaje, campo ? { errores: { [campo]: mensaje } } : {});
