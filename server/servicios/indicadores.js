// =====================================================================
// INDICADORES DEL DASHBOARD
// Los mismos que hoy entrega Power BI (evaluaciones por mes, por familia de
// cargo y "timing" promedio: días desde la solicitud hasta el informe) más los
// que pide el caso: total de candidatos, pendientes, en proceso y finalizadas.
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
    return { mes: clave, etiqueta: MESES.at(ref.getMonth()), cantidad: 0, informes: 0, actual: i === meses - 1 };
  });
  const indiceMes = new Map(porMes.map((m, i) => [m.mes, i]));
  const claveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  for (const f of filas) {
    // cantidad = solicitudes recibidas ese mes
    const recibida = claveMes(new Date(f.fecha_solicitud));
    if (indiceMes.has(recibida)) porMes[indiceMes.get(recibida)].cantidad += 1;
    // informes = evaluaciones terminadas ese mes (lo que hoy cuenta el Power BI)
    if (f.etapa === 'informe_enviado' && f.fecha_informe) {
      const enviado = String(f.fecha_informe).slice(0, 7);
      if (indiceMes.has(enviado)) porMes[indiceMes.get(enviado)].informes += 1;
    }
  }

  const promedio = timings.length
    ? Math.round((timings.reduce((a, b) => a + b, 0) / timings.length) * 10) / 10
    : null;

  return {
    totalCandidatos: repo.candidatos.contar(),
    totalSolicitudes: filas.length,
    // Los 3 estados que sugiere el caso (RF08), a partir de las 4 etapas reales
    pendientes: porEtapa.recibida,
    enProceso: porEtapa.agendada + porEtapa.realizada,
    finalizadas: porEtapa.informe_enviado,
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
