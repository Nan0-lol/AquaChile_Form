// =====================================================================
// INDICADORES DEL DASHBOARD
// Los mismos que hoy entrega Power BI: evaluaciones por mes y por familia
// de cargo, estado del proceso, resultados y el "timing" promedio
// (días desde que llega la solicitud hasta que se envía el informe).
// =====================================================================
import { ETAPAS, ORDEN_ETAPAS, FAMILIAS_CARGO, RESULTADOS } from '../modelos/catalogos.js';
import { calcularTiming } from './formato.js';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** @param {Date} ahora  (se puede fijar en las pruebas) */
export function calcularIndicadores(repo, { ahora = new Date(), meses = 6 } = {}) {
  const filas = repo.solicitudes.listar();

  const porEtapa = Object.fromEntries(ORDEN_ETAPAS.map((e) => [e, 0]));
  const porFamilia = Object.fromEntries(Object.keys(FAMILIAS_CARGO).map((f) => [f, 0]));
  const porResultado = Object.fromEntries(Object.keys(RESULTADOS).map((r) => [r, 0]));
  const timings = [];
  let sinResponsable = 0;

  for (const f of filas) {
    if (Object.hasOwn(porEtapa, f.etapa)) porEtapa[f.etapa] += 1;
    if (Object.hasOwn(porFamilia, f.familia_cargo)) porFamilia[f.familia_cargo] += 1;
    if (f.etapa === 'informe_enviado') {
      if (f.resultado && Object.hasOwn(porResultado, f.resultado)) porResultado[f.resultado] += 1;
      const t = calcularTiming(f.fecha_solicitud, f.fecha_informe);
      if (t !== null) timings.push(t);
    } else if (!f.evaluador_id) {
      sinResponsable += 1;
    }
  }

  // Últimos N meses, del más antiguo al actual (incluye meses sin solicitudes)
  const porMes = Array.from({ length: meses }, (_, i) => {
    const ref = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1 - i), 1);
    const clave = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
    return { mes: clave, etiqueta: MESES.at(ref.getMonth()), cantidad: 0, actual: i === meses - 1 };
  });
  const indiceMes = new Map(porMes.map((m, i) => [m.mes, i]));
  for (const f of filas) {
    const d = new Date(f.fecha_solicitud);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (indiceMes.has(clave)) porMes[indiceMes.get(clave)].cantidad += 1;
  }

  const promedio = timings.length
    ? Math.round((timings.reduce((a, b) => a + b, 0) / timings.length) * 10) / 10
    : null;

  return {
    totalCandidatos: repo.candidatos.contar(),
    totalSolicitudes: filas.length,
    enProceso: porEtapa.recibida + porEtapa.agendada + porEtapa.realizada,
    sinResponsable,
    porEtapa: ORDEN_ETAPAS.map((e) => ({ clave: e, etiqueta: ETAPAS[e], cantidad: porEtapa[e] })),
    porFamilia: Object.entries(porFamilia)
      .map(([clave, cantidad]) => ({ clave, etiqueta: FAMILIAS_CARGO[clave], cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    porResultado: Object.entries(porResultado).map(([clave, cantidad]) => ({
      clave,
      etiqueta: RESULTADOS[clave],
      cantidad,
    })),
    porMes,
    timingPromedioDias: promedio,
    informesConTiming: timings.length,
  };
}
