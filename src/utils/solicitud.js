// Validaciones y ayudas del formulario "Nueva solicitud" (lado del navegador).
// El servidor repite estas mismas reglas (server/validaciones.js): aquí solo
// sirven para avisar al instante, sin esperar la respuesta.

export const MAX_ARCHIVO_BYTES = 5 * 1024 * 1024; // 5 MB
export const EXTENSIONES_ARCHIVO = ['.pdf', '.docx'];
export const MAX_ASPECTOS = 2000;

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGEX_CECO = /^[A-Z0-9-]{1,20}$/;

/** "9 1234 5678", "+56 9 1234 5678" o "56912345678" -> "912345678" */
export const digitosCelular = (valor = '') => {
  const digitos = String(valor).replace(/\D/g, '');
  return digitos.startsWith('56') && digitos.length === 11 ? digitos.slice(2) : digitos;
};

/** "912345678" -> "9 1234 5678" (para mostrarlo ordenado) */
export const formatearCelular = (valor = '') => {
  const d = digitosCelular(valor);
  return /^9\d{8}$/.test(d) ? `${d[0]} ${d.slice(1, 5)} ${d.slice(5)}` : String(valor);
};

export const formatearTamano = (bytes = 0) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const esWord = (nombre = '') => nombre.toLowerCase().endsWith('.docx');

/** Devuelve el mensaje de error del archivo, o '' si sirve. */
export const validarAdjunto = (archivo, { obligatorio = false, que = 'el archivo' } = {}) => {
  if (!archivo) return obligatorio ? `Adjunta ${que} (PDF o DOCX).` : '';
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES_ARCHIVO.some((ext) => nombre.endsWith(ext))) return 'El archivo debe ser PDF o DOCX.';
  if (archivo.size === 0) return 'El archivo está vacío.';
  if (archivo.size > MAX_ARCHIVO_BYTES) return 'El archivo supera los 5 MB.';
  return '';
};

/** Devuelve el mensaje de error del campo, o '' si está correcto. */
export const validarCampoSolicitud = (campo, valor = '') => {
  const texto = typeof valor === 'string' ? valor.trim() : valor;
  switch (campo) {
    case 'nombre':
      return texto.length < 3 || texto.length > 100 ? 'Ingresa el nombre completo del candidato.' : '';
    case 'correo':
      if (!texto) return 'Ingresa el correo del candidato.';
      return REGEX_CORREO.test(texto) && texto.length <= 254 ? '' : 'El correo no tiene un formato válido.';
    case 'telefono':
      if (!texto) return 'Ingresa el celular del candidato.';
      return /^9\d{8}$/.test(digitosCelular(texto)) ? '' : 'Debe tener 9 dígitos y empezar con 9.';
    case 'origen':
      return texto === 'interno' || texto === 'externo' ? '' : 'Indica si es interno o externo.';
    case 'familiaCargo':
      return texto ? '' : 'Selecciona la familia del cargo.';
    case 'nombreCargo':
      return texto.length < 2 || texto.length > 100 ? 'Indica el nombre del cargo (2 a 100 caracteres).' : '';
    case 'ubicacion':
      return texto.length < 2 || texto.length > 100 ? 'Indica la ubicación del cargo.' : '';
    case 'unidad':
      return texto ? '' : 'Selecciona la unidad.';
    case 'ceco':
      return !texto || REGEX_CECO.test(texto.toUpperCase()) ? '' : 'Solo letras, números o guion (máx. 20).';
    case 'aspectosIndagar':
      return texto.length > MAX_ASPECTOS ? `Puede tener hasta ${MAX_ASPECTOS.toLocaleString('es-CL')} caracteres.` : '';
    default:
      return '';
  }
};

export const CAMPOS_CANDIDATO = ['nombre', 'correo', 'telefono', 'origen'];
export const CAMPOS_CARGO = ['familiaCargo', 'nombreCargo', 'ubicacion', 'unidad', 'ceco', 'aspectosIndagar'];

/**
 * Revisa todo el formulario de una vez.
 * @param {object} valores   lo que escribió el analista
 * @param {object} opciones  { candidatoExistente, cv, descriptor }
 * @returns {object} { campo: mensaje } solo con los campos que tienen error
 */
export const validarSolicitudCompleta = (valores, { candidatoExistente = null, cv = null, descriptor = null } = {}) => {
  const errores = {};
  const campos = candidatoExistente ? CAMPOS_CARGO : [...CAMPOS_CANDIDATO, ...CAMPOS_CARGO];
  for (const campo of campos) {
    const error = validarCampoSolicitud(campo, valores[campo]);
    if (error) errores[campo] = error;
  }
  const errorCv = validarAdjunto(cv, { obligatorio: true, que: 'el CV del candidato' });
  if (errorCv) errores.cv = errorCv;
  const errorDescriptor = validarAdjunto(descriptor);
  if (errorDescriptor) errores.descriptor = errorDescriptor;
  return errores;
};

/**
 * Arma el FormData con los nombres que espera POST /api/solicitudes.
 * Si se eligió un candidato ya registrado, solo se manda su id.
 * Si viene de una postulación web, se manda su id; sin cv nuevo, el servidor usa el de la postulación.
 */
export const construirFormData = (valores, { candidatoExistente = null, cv, descriptor = null, postulacionId = null }) => {
  const datos = new FormData();
  if (postulacionId) datos.append('postulacionId', postulacionId);
  if (candidatoExistente) {
    datos.append('candidatoId', candidatoExistente.id);
  } else {
    datos.append('nombre', valores.nombre.trim());
    datos.append('correo', valores.correo.trim());
    datos.append('telefono', `+56${digitosCelular(valores.telefono)}`);
    datos.append('origen', valores.origen);
  }
  datos.append('familiaCargo', valores.familiaCargo);
  datos.append('nombreCargo', valores.nombreCargo.trim());
  datos.append('ubicacion', valores.ubicacion.trim());
  datos.append('unidad', valores.unidad);
  datos.append('ceco', valores.ceco.trim().toUpperCase());
  datos.append('evaluadorId', valores.evaluadorId || '');
  datos.append('requiereReferencias', valores.requiereReferencias ? 'true' : 'false');
  datos.append('referido', valores.referido ? 'true' : 'false');
  datos.append('aspectosIndagar', valores.aspectosIndagar.trim());
  // Los archivos van al final: así el servidor ya conoce los datos al recibirlos
  if (cv) datos.append('cv', cv);
  if (descriptor) datos.append('descriptor', descriptor);
  return datos;
};
