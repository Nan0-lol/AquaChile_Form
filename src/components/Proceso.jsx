// Piezas pequeñas que comparten las páginas del proceso (solicitudes y candidatos).
import React, { useEffect, useRef } from 'react';
import { FaExclamationTriangle, FaRedo, FaInbox } from 'react-icons/fa';
import { estadoGeneral } from '../utils/proceso';
import './Proceso.css';

/** Etiqueta de color con la etapa (y, si se pide, el estado general del caso) */
export const EtapaBadge = ({ etapa, etapas = {}, conEstado = false }) => (
  <span className={`pr-badge pr-badge--${etapa}`}>
    <span className="pr-badge-dot" aria-hidden="true" />
    {etapas[etapa] ?? etapa}
    {conEstado && <span className="pr-badge-estado"> · {estadoGeneral(etapa)}</span>}
  </span>
);

export const Cargando = ({ texto = 'Cargando…' }) => (
  <div className="pr-estado" role="status">
    <span className="pr-spinner" aria-hidden="true" />
    {texto}
  </div>
);

export const ErrorCarga = ({ mensaje, onReintentar }) => (
  <div className="pr-estado pr-estado--error" role="alert">
    <FaExclamationTriangle aria-hidden="true" />
    <p>{mensaje || 'No pudimos cargar la información.'}</p>
    {onReintentar && (
      <button type="button" className="ns-btn ns-btn--outline" onClick={onReintentar}>
        <FaRedo aria-hidden="true" /> Reintentar
      </button>
    )}
  </div>
);

export const Vacio = ({ titulo, texto, children }) => (
  <div className="pr-vacio">
    <span className="pr-vacio-icon" aria-hidden="true">
      <FaInbox />
    </span>
    <strong>{titulo}</strong>
    {texto && <p>{texto}</p>}
    {children}
  </div>
);

/**
 * Ventana de confirmación accesible (usa <dialog>: Escape la cierra y el foco
 * queda atrapado dentro mientras está abierta).
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
      className="pr-dialog"
      aria-labelledby="pr-dialog-titulo"
      onCancel={(e) => {
        e.preventDefault();
        if (!ocupado) onCancelar();
      }}
    >
      <h2 id="pr-dialog-titulo">{titulo}</h2>
      <div className="pr-dialog-body">{children}</div>
      <div className="pr-dialog-actions">
        <button type="button" className="ns-btn ns-btn--ghost" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </button>
        <button
          type="button"
          className={`ns-btn ${peligro ? 'pr-btn--danger' : 'ns-btn--primary'}`}
          onClick={onConfirmar}
          disabled={ocupado}
        >
          {ocupado ? 'Procesando…' : textoConfirmar}
        </button>
      </div>
    </dialog>
  );
};

/** Aviso flotante breve ("Cambios guardados") */
export const Aviso = ({ aviso, onCerrar }) => {
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(onCerrar, 3500);
    return () => clearTimeout(t);
  }, [aviso, onCerrar]);
  if (!aviso) return null;
  return (
    <div className={`pr-toast${aviso.tipo === 'error' ? ' pr-toast--error' : ''}`} role="status" aria-live="polite">
      {aviso.texto}
    </div>
  );
};
