// Piezas propias del proceso de evaluación. Las genéricas (Cargando, Confirmar,
// Aviso…) viven en ui.jsx; se reexportan aquí para importarlas desde un solo lugar.
import React from 'react';
import { estadoGeneral } from '../utils/proceso';
import { cx } from './ui';

export { Cargando, ErrorCarga, Vacio, Confirmar, Aviso } from './ui';

// Color de cada etapa (texto + fondo, con contraste AA en ambos temas)
const COLOR_ETAPA = {
  recibida: 'bg-e-recibida-bg text-e-recibida',
  agendada: 'bg-e-agendada-bg text-e-agendada',
  realizada: 'bg-e-realizada-bg text-e-realizada',
  informe_enviado: 'bg-e-enviado-bg text-e-enviado',
};

/** Etiqueta de color con la etapa (y, si se pide, el estado general del caso) */
export const EtapaBadge = ({ etapa, etapas = {}, conEstado = false }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap',
      COLOR_ETAPA[etapa] ?? 'bg-superficie-3 text-tenue'
    )}
  >
    <span aria-hidden="true" className="size-[7px] rounded-full bg-current" />
    {etapas[etapa] ?? etapa}
    {conEstado && <span className="font-medium opacity-85"> · {estadoGeneral(etapa)}</span>}
  </span>
);
