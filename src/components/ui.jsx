// =====================================================================
// COMPONENTES BASE DE LA INTERFAZ (Tailwind CSS)
// Botones, campos, tarjetas y avisos que comparten todas las pantallas.
// Así cada estilo se escribe una sola vez y todo el sistema se ve igual.
// Los colores (bg-superficie, text-tenue, border-borde…) vienen de index.css
// y cambian solos con el modo oscuro.
// =====================================================================
import React, { useEffect, useRef } from 'react';
import { FaChevronDown, FaExclamationTriangle, FaRedo, FaInbox } from 'react-icons/fa';
import { iniciales } from '../utils/proceso';

/** Une clases ignorando las vacías: cx('a', cond && 'b') */
export const cx = (...clases) => clases.filter(Boolean).join(' ');

/** Anillo de foco visible y consistente (accesibilidad con teclado) */
export const FOCO = 'outline-none focus-visible:ring-3 focus-visible:ring-anillo';

// ---------------------------------------------------------------------
// BOTONES
// ---------------------------------------------------------------------
const VARIANTES_BOTON = {
  primario: 'bg-acento-solido text-white hover:bg-acento-hover',
  contorno: 'border border-borde-fuerte bg-superficie text-acento hover:border-acento hover:bg-acento-suave',
  fantasma: 'bg-transparent text-tenue hover:bg-superficie-3 hover:text-texto',
  peligro: 'bg-peligro-solido text-white hover:bg-rose-800',
  'peligro-suave': 'bg-transparent text-peligro hover:bg-peligro-suave',
};
const TAMANOS_BOTON = {
  sm: 'h-[34px] px-3 text-[13px]',
  md: 'h-10 px-[18px] text-sm',
  lg: 'h-[46px] min-w-[190px] px-6 text-[15px]',
};

export const claseBoton = (variante = 'primario', tamano = 'md', extra) =>
  cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold no-underline transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55',
    FOCO,
    VARIANTES_BOTON[variante],
    TAMANOS_BOTON[tamano],
    extra
  );

/** <Boton variante="contorno" tamano="sm">…</Boton>. Con `as={Link}` se comporta como enlace. */
export const Boton = ({ as: Componente = 'button', variante, tamano, className, type, ...props }) => (
  <Componente
    type={Componente === 'button' ? type ?? 'button' : undefined}
    className={claseBoton(variante, tamano, className)}
    {...props}
  />
);

/** Spinner pequeño para botones ("Enviando…") */
export const Spinner = ({ className }) => (
  <span
    aria-hidden="true"
    className={cx('inline-block size-4 animate-spin rounded-full border-2 border-white/40 border-t-white', className)}
  />
);

// ---------------------------------------------------------------------
// CAMPOS DE FORMULARIO
// ---------------------------------------------------------------------
/** Tamaño normal de un campo de una línea (alto, márgenes internos y letra) */
export const TAMANO_ENTRADA = 'h-[42px] px-3 text-[14.5px]';

/**
 * Clase de input, select y textarea. Con error, el borde se pone rojo.
 * `tamano` reemplaza al tamaño normal (así nunca quedan dos alturas compitiendo).
 */
export const claseEntrada = (error, tamano = TAMANO_ENTRADA) =>
  cx(
    'w-full rounded-lg border bg-superficie text-texto transition-[border-color,box-shadow]',
    'placeholder:text-sutil focus:outline-none focus:ring-3',
    'disabled:cursor-default disabled:bg-superficie-2 disabled:opacity-100',
    error ? 'border-error focus:ring-error/20' : 'border-borde-fuerte focus:border-acento focus:ring-anillo',
    tamano
  );

export const Asterisco = () => (
  <span className="ml-0.5 font-bold text-peligro" aria-hidden="true">
    *
  </span>
);

export const Opcional = () => <span className="ml-1.5 text-[12.5px] font-normal text-sutil">(opcional)</span>;

export const claseEtiqueta = 'mb-[7px] block text-[13.5px] font-semibold text-texto';

export const MensajeError = ({ id, texto }) =>
  texto ? (
    <p id={id} role="alert" className="mt-1.5 text-[13px] font-medium text-peligro">
      {texto}
    </p>
  ) : null;

export const Ayuda = ({ id, children }) => (
  <p id={id} className="mt-1.5 text-[12.5px] leading-snug text-sutil">
    {children}
  </p>
);

/**
 * Campo con su etiqueta, ayuda y error. El input va como hijo:
 *   <Campo id="correo" etiqueta="Correo" obligatorio error={errores.correo}>
 *     <input id="correo" className={claseEntrada(errores.correo, 'h-[42px]')} … />
 *   </Campo>
 */
export const Campo = ({ id, etiqueta, obligatorio, opcional, ayuda, error, className, children }) => (
  <div className={cx('flex min-w-0 flex-col', className)}>
    <label htmlFor={id} className={claseEtiqueta}>
      {etiqueta}
      {obligatorio && <Asterisco />}
      {opcional && <Opcional />}
    </label>
    {children}
    {ayuda && !error && <Ayuda id={`${id}-ayuda`}>{ayuda}</Ayuda>}
    <MensajeError id={`${id}-error`} texto={error} />
  </div>
);

/** Props de accesibilidad para un campo: aria-invalid y a qué texto apunta */
export const ariaCampo = (id, error, conAyuda) => ({
  'aria-invalid': error ? 'true' : 'false',
  'aria-describedby': error ? `${id}-error` : conAyuda ? `${id}-ayuda` : undefined,
});

/** Lista desplegable con flecha propia (igual en claro, oscuro y en todos los navegadores) */
export const Selector = ({ error, alto = 'h-[42px]', className, children, ...props }) => (
  <div className="relative">
    <select {...props} className={claseEntrada(error, cx(alto, 'cursor-pointer appearance-none pr-9 pl-3 text-[14.5px]'))}>
      {children}
    </select>
    <FaChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-tenue"
    />
  </div>
);

/** Celular chileno con el prefijo +56 fijo a la izquierda */
export const EntradaCelular = ({ error, className, ...props }) => (
  <div
    className={cx(
      'flex overflow-hidden rounded-lg border bg-superficie transition-[border-color,box-shadow] focus-within:ring-3',
      error ? 'border-error focus-within:ring-error/20' : 'border-borde-fuerte focus-within:border-acento focus-within:ring-anillo'
    )}
  >
    <span aria-hidden="true" className="flex items-center border-r border-borde-fuerte bg-superficie-3 px-3 text-sm font-semibold text-tenue">
      +56
    </span>
    <input
      type="tel"
      inputMode="numeric"
      placeholder="9 1234 5678"
      maxLength={11}
      autoComplete="off"
      {...props}
      className="h-[42px] min-w-0 flex-1 border-0 bg-transparent px-3 text-[14.5px] text-texto outline-none placeholder:text-sutil"
    />
  </div>
);

/** Interruptor (sí/no) accesible: por debajo es un checkbox normal */
export const Interruptor = ({ checked, onChange, titulo, detalle }) => (
  <label className="relative flex cursor-pointer items-start gap-3">
    <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
    <span
      aria-hidden="true"
      className={cx(
        'relative mt-px h-[22px] w-10 shrink-0 rounded-full bg-borde-fuerte transition-colors',
        "after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-['']",
        'peer-checked:bg-acento-solido peer-checked:after:translate-x-[18px]',
        'peer-focus-visible:ring-3 peer-focus-visible:ring-anillo'
      )}
    />
    <span className="flex flex-col gap-0.5">
      <strong className="text-sm font-semibold text-texto">{titulo}</strong>
      {detalle && <small className="text-[12.5px] text-tenue">{detalle}</small>}
    </span>
  </label>
);

/** Opción grande de un grupo de radios (Interno / Externo) */
export const OpcionRadio = ({ id, name, value, checked, onChange, titulo, detalle }) => (
  <label
    className={cx(
      'flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3.5 py-3 transition-colors hover:border-acento',
      checked ? 'border-acento bg-acento-suave' : 'border-borde-fuerte'
    )}
  >
    <input
      type="radio"
      id={id}
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="mt-[3px] size-4 accent-acento-solido focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
    />
    <span className="flex flex-col gap-0.5">
      <strong className="text-sm text-texto">{titulo}</strong>
      {detalle && <small className="text-[12.5px] text-tenue">{detalle}</small>}
    </span>
  </label>
);

/** Contador de caracteres para textos largos */
export const Contador = ({ largo, maximo }) => (
  <span
    className={cx(
      'mt-1.5 shrink-0 text-[12.5px] tabular-nums',
      largo > maximo * 0.9 ? 'font-semibold text-e-recibida' : 'text-sutil'
    )}
  >
    {largo.toLocaleString('es-CL')} / {maximo.toLocaleString('es-CL')}
  </span>
);

// ---------------------------------------------------------------------
// ESTRUCTURA
// ---------------------------------------------------------------------
export const claseTarjeta = 'rounded-[14px] border border-borde bg-superficie shadow-suave';

/** Contenedor principal de cada página del panel */
export const Pagina = ({ ancho = 'normal', className, children }) => (
  <main
    className={cx(
      'mx-auto w-full px-4 pt-5 pb-14 sm:px-6 sm:pt-7 sm:pb-[72px]',
      ancho === 'angosto' ? 'max-w-[920px]' : 'max-w-[1240px]',
      className
    )}
  >
    {children}
  </main>
);

/** Título de la página con descripción y botones a la derecha */
export const Titulo = ({ titulo, children, acciones }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <h1 className="mb-1.5 text-[1.45rem] font-bold text-titulo sm:text-[1.75rem]">{titulo}</h1>
      {children && <p className="m-0 text-[14.5px] leading-relaxed text-tenue">{children}</p>}
    </div>
    {acciones && <div className="flex w-full flex-wrap gap-2.5 sm:w-auto [&>*]:grow sm:[&>*]:grow-0">{acciones}</div>}
  </div>
);

/** Tarjeta con encabezado (ícono + título + acción opcional) */
export const Tarjeta = ({ titulo, Icono, descripcion, accion, className, cuerpo = 'px-4 pt-[18px] pb-5 sm:px-5', children }) => (
  <section className={cx(claseTarjeta, className)}>
    {titulo && (
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-borde px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          {Icono && (
            <span className="mt-0.5 shrink-0 text-[15px] text-acento" aria-hidden="true">
              <Icono />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="m-0 text-base font-bold text-titulo">{titulo}</h2>
            {descripcion && <p className="mt-0.5 mb-0 text-[13px] text-tenue">{descripcion}</p>}
          </div>
        </div>
        {accion}
      </header>
    )}
    <div className={cuerpo}>{children}</div>
  </section>
);

/** Volver a la sección anterior (ej. "← Solicitudes") */
export const claseVolver = cx(
  'mb-4 inline-flex items-center gap-2 rounded text-sm font-semibold text-tenue no-underline hover:text-acento',
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-acento'
);

/** Círculo con iniciales ("María José González" -> "MJ") */
export { iniciales };

export const Avatar = ({ nombre, grande }) => (
  <span
    aria-hidden="true"
    className={cx(
      'inline-flex shrink-0 items-center justify-center rounded-full bg-acento-suave font-bold text-acento',
      grande ? 'size-[46px] text-base' : 'size-[34px] text-[12.5px]'
    )}
  >
    {iniciales(nombre)}
  </span>
);

/** Píldora pequeña (ej. "Externo") */
export const Chip = ({ children }) => (
  <span className="inline-block rounded-full border border-borde-fuerte bg-superficie px-2.5 py-0.5 text-xs font-semibold text-acento">
    {children}
  </span>
);

/** Datos en modo lectura: <ListaDatos><Dato etiqueta="Cargo">…</Dato></ListaDatos> */
export const ListaDatos = ({ una, children }) => (
  <dl className={cx('m-0 grid gap-x-5 gap-y-3.5', una ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>{children}</dl>
);

export const Dato = ({ etiqueta, ancho, children }) => (
  <div className={cx('min-w-0', ancho && 'sm:col-span-2')}>
    <dt className="mb-[3px] text-xs font-semibold tracking-[0.03em] text-sutil uppercase">{etiqueta}</dt>
    <dd className="m-0 text-[14.5px] [overflow-wrap:anywhere] text-texto">{children ?? <SinDato />}</dd>
  </div>
);

export const SinDato = ({ children = '—' }) => <span className="text-sutil italic">{children}</span>;

// ---------------------------------------------------------------------
// ESTADOS DE CARGA, VACÍO Y ERROR
// ---------------------------------------------------------------------
export const Cargando = ({ texto = 'Cargando…' }) => (
  <div role="status" className="flex flex-col items-center gap-3.5 px-6 py-[72px] text-center text-[15px] text-tenue">
    <span aria-hidden="true" className="size-[26px] animate-spin rounded-full border-3 border-borde-fuerte border-t-acento" />
    {texto}
  </div>
);

export const ErrorCarga = ({ mensaje, onReintentar }) => (
  <div role="alert" className="flex flex-col items-center gap-3.5 px-6 py-[72px] text-center text-[15px] text-tenue">
    <FaExclamationTriangle aria-hidden="true" className="text-[28px] text-peligro" />
    <p className="m-0 max-w-[440px]">{mensaje || 'No pudimos cargar la información.'}</p>
    {onReintentar && (
      <Boton variante="contorno" onClick={onReintentar}>
        <FaRedo aria-hidden="true" /> Reintentar
      </Boton>
    )}
  </div>
);

export const Vacio = ({ titulo, texto, children }) => (
  <div className="flex flex-col items-center gap-1.5 px-5 py-12 text-center text-tenue">
    <span aria-hidden="true" className="mb-1.5 inline-flex size-[52px] items-center justify-center rounded-full bg-acento-suave text-xl text-acento">
      <FaInbox />
    </span>
    <strong className="text-[15px] text-texto">{titulo}</strong>
    {texto && <p className="mt-0 mb-2 text-sm">{texto}</p>}
    {children}
  </div>
);

/** Franja de error en rojo (bajo un formulario) */
export const Alerta = ({ children }) => (
  <p
    role="alert"
    className="m-0 flex w-full basis-full items-center gap-2.5 rounded-[10px] border border-peligro-borde bg-peligro-suave px-3.5 py-3 text-sm font-medium text-peligro"
  >
    <FaExclamationTriangle aria-hidden="true" className="shrink-0" /> {children}
  </p>
);

// ---------------------------------------------------------------------
// DIÁLOGO DE CONFIRMACIÓN Y AVISO FLOTANTE
// ---------------------------------------------------------------------
/**
 * Ventana de confirmación accesible (usa <dialog>: Escape la cierra y el foco
 * queda dentro mientras está abierta).
 */
export const Confirmar = ({ abierto, titulo, children, textoConfirmar = 'Confirmar', peligro, ocupado, onConfirmar, onCancelar }) => {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal?.();
    if (!abierto && dialogo.open) dialogo.close?.();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialogo-titulo"
      onCancel={(e) => {
        e.preventDefault();
        if (!ocupado) onCancelar();
      }}
      className="m-auto w-[min(460px,calc(100vw-32px))] rounded-[14px] border border-borde bg-superficie p-6 text-texto shadow-alta"
    >
      <h2 id="dialogo-titulo" className="mt-0 mb-2.5 text-lg font-bold text-titulo">
        {titulo}
      </h2>
      <div className="text-[14.5px] leading-relaxed text-tenue">{children}</div>
      <div className="mt-[22px] flex justify-end gap-2.5">
        <Boton variante="fantasma" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </Boton>
        <Boton variante={peligro ? 'peligro' : 'primario'} onClick={onConfirmar} disabled={ocupado}>
          {ocupado ? 'Procesando…' : textoConfirmar}
        </Boton>
      </div>
    </dialog>
  );
};

/** Aviso breve abajo de la pantalla ("Cambios guardados"). Desaparece solo. */
export const Aviso = ({ aviso, onCerrar }) => {
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(onCerrar, 3500);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);
  if (!aviso) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-32px)] -translate-x-1/2 animate-aparecer rounded-[10px] px-[18px] py-3 text-sm font-semibold text-white shadow-alta',
        aviso.tipo === 'error' ? 'bg-peligro-solido' : 'bg-green-700'
      )}
    >
      {aviso.texto}
    </div>
  );
};
