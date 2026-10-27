/* ================== 16-tooltips.js — Tooltips de fórmulas en cabeceras de tabla ==================
   Réplica de atc_v2/js/11-ux.js (sección 1, "Tooltips de fórmulas") adaptada a las columnas y
   fórmulas reales de HFC (motor M()/MSup() en 02-engine.js, 09-supervisores.js, 15-horas.js).
   Objetivo: que la operación sepa, pasando el mouse sobre cualquier encabezado, cómo se calcula
   cada KPI — sin tener que preguntar o adivinar.
   Clave = atributo data-col (Diario/Intervalos/Supervisores/Asesores) o data-col-id (Horas, que ya
   lo usa para el panel "Columnas · KPIs" — se reutiliza tal cual, sin duplicar atributos).
   Formato: [título, fórmula, meta/umbral opcional] */
const FX_FORMULAS = {
  // Diario / Intervalos — Estado
  CUMPL: ['Cumplimiento', 'Diario: % de intervalos del día con AG.Real/AG.Rq ≥ 95% · Intervalos: AG.Real/AG.Rq ≥ 95% en esa franja', 'Meta ≥ 95% de intervalos aprobados · APROB. / DESAPROB.'],
  // Nivel de servicio
  NS:   ['% Nivel de Servicio', 'Atendidas en umbral (ATENDIDA_UMBR) ÷ Recibidas', 'Meta ≥ 85% · Ámbar 80–85%'],
  NA:   ['% Nivel de Atención', 'Atendidas ÷ Recibidas', 'Meta ≥ 95% · Ámbar 90–95%'],
  ABAN: ['% Abandono', 'Abandonadas ÷ Recibidas', 'Menor es mejor · Verde ≤ 3% · Ámbar ≤ 5%'],
  // Tráfico
  TRAF_DIM:     ['Tráfico dimensionado', 'Llamadas previstas por Claro para el día/franja (TRAF_DIM)', null],
  RECIBIDAS:    ['Llamadas recibidas', 'Total de llamadas entrantes (LLAM_RECIBIDAS)', null],
  ATENDIDAS:    ['Llamadas atendidas', 'Llamadas contestadas por un agente (CANT_ATENDIDA)', null],
  ABANDONADAS:  ['Llamadas abandonadas', 'Recibidas que no llegaron a ser atendidas (CANT_ABANDONADA)', null],
  CUMP_TRAF:    ['Cumplimiento de tráfico', 'Recibidas ÷ Tráfico dimensionado', null],
  VAR_TRAF:     ['Var. Tráfico', '(Recibidas ÷ Tráfico dimensionado) − 1', 'Positivo = más llamadas que lo dimensionado (verde) · Negativo = menos (rojo) — igual que VAR.TRAF de ATC'],
  // Corte de agente
  CAT:     ['CAT (cortes de agente)', 'Total de llamadas cortadas por el agente (CORTE_AGENTE)', null],
  PCT_CAT: ['% CAT', 'Cortes de agente ÷ Atendidas', 'Menor es mejor · Verde ≤ 2% · Ámbar ≤ 4%'],
  // Agentes
  AG_REAL:  ['Agentes Real', 'Σ AGENTE_NETO_IDLE ÷ divisor de turno (16 franjas × días)', 'Fila de franja en Intervalos = promedio de esa franja entre días · KPI strip y TOTAL = igual que Diario para el mismo rango'],
  AG_RQ:    ['Agentes Requeridos', 'Σ AGENT_DIM ÷ divisor de turno (16 franjas × días)', 'Dimensionamiento entregado por Claro · mismo divisor que AG.Real'],
  AG_DELTA: ['Δ Agentes', 'Agentes Real − Agentes Requeridos', 'Verde si ≥ 0'],
  OCUP:     ['% Ocupación', 'Agente Neto ÷ Agente Real (idle)', 'Meta ≥ 79% (objetivo de la campaña) · Ámbar ≥ 69%'],
  UTIL:     ['% Utilización', 'Agente Real (idle) ÷ Agente Bruto', 'Meta ≥ 95% · Ámbar ≥ 85%'],
  // Tiempos
  TMG:       ['TMG Real / Requerido', 'Real: Σ TMG_TOTAL_SEG ÷ Atendidas · Requerido: Σ TMG_DIM ÷ nº de franjas', 'Meta ≤ 550 s (9:10, objetivo de la campaña) · ámbar hasta 600 s'],
  TMG_DELTA: ['Δ TMG', 'TMG Real − TMG Requerido', 'Verde si ≤ 0 (más rápido que lo requerido)'],
  HRS_PROD:  ['Horas productivas', 'TMP_PROD ÷ 3600 (tiempo en estado Producción)', null],
  // Encuestas / TNPS
  TNPS: ['% TNPS', '(Promotores − Detractores) ÷ (Promotores + Detractores + Neutros)', 'Meta según el campo "Meta TNPS %"'],
  TNPS_ENC:   ['Encuestas', 'Encuestas respondidas: Promotores + Neutros + Detractores', null],
  TNPS_PROM:  ['Promotores', 'Encuestas con calificación de promotor', null],
  TNPS_NEU:   ['Neutros', 'Encuestas con calificación neutral (pasivos)', null],
  TNPS_DET:   ['Detractores', 'Encuestas con calificación de detractor', null],
  TNPS_PPROM: ['% Promotores', 'Promotores ÷ Encuestas', null],
  TNPS_PNEU:  ['% Neutros', 'Neutros ÷ Encuestas', null],
  TNPS_PDET:  ['% Detractores', 'Detractores ÷ Encuestas', 'Verde ≤ 10% · ámbar ≤ 15% · rojo más'],
  TNPS_PRESP: ['% Respuesta', 'Encuestas respondidas ÷ Transferidas a encuesta', 'Cuántos clientes transferidos sí contestaron'],
  // Transferencias (KPI_ASESORES_HFC / KPIS_PENALIDADES_HFC — Vicio/Validación + IVR 123 + otro BPO + otra cola GEA)
  TRANSF: ['% Transferencia', '(Vicio/Validación + IVR 123 + Otro BPO + Otra cola GEA) ÷ Atendidas — NO incluye transferencias a encuesta (TRANS_ENCU)', 'Menor es mejor · umbral provisional Verde ≤5% · Ámbar ≤10%, a confirmar con datos reales'],
  TRANSF_TOT: ['Transferencias — total', 'Suma de las 4 categorías (Vicio/Validación + IVR 123 + Otro BPO + Otra cola GEA)', null],
  TRANS_VICIO: ['Transferencia — Vicio/Validación', 'Llamadas transferidas a BlackListChecking (DESCRIP_TRANSF)', null],
  TRANS_IVR: ['Transferencia — IVR 123', 'Llamadas transferidas al flujo PeruClaro_123Flow (DESCRIP_TRANSF)', null],
  TRANS_BPO: ['Transferencia — Otro BPO', 'Llamadas transferidas a otro BPO (técnico/admin/prepago/servicio móvil, DESCRIP_TRANSF)', null],
  TRANS_GEA: ['Transferencia — Otra cola GEA', 'Llamadas transferidas a otra cola interna de GEA (Postpago123/Convergencia/Sup/Bloqueos, DESCRIP_TRANSF)', null],
  // Encuestas (TRANS_ENCU / ENCU_CAL, ya existían en la vista sin usar en el front)
  TRANS_ENC: ['Transferencias a encuesta', 'Llamadas transferidas al IVR de encuesta (TRANS_ENCU)', null],
  PARTIC:    ['% Transf Encu.', 'Transferencias a encuesta ÷ Atendidas — qué % de las llamadas atendidas llegó a ofrecer encuesta', 'Mayor es mejor · Meta ≥ 75% (objetivo de la campaña) · Ámbar ≥ 65%'],
  IND_ENC:   ['% Ind. Encuesta', 'Trans. a encuesta ÷ (Trans. a encuesta + Encuestas calificables no transferidas)', 'Mayor es mejor · Meta ≥ 75% · Ámbar ≥ 70% (misma referencia que ATC)'],
  PCT_T_VICIO: ['% Transferencia — Vicio/Validación', 'T.Vicio ÷ Atendidas', null],
  PCT_T_IVR:   ['% Transferencia — IVR 123', 'T.IVR123 ÷ Atendidas', null],
  PCT_T_BPO:   ['% Transferencia — Otro BPO', 'T.Otro BPO ÷ Atendidas', null],
  PCT_T_GEA:   ['% Transferencia — Otra cola GEA', 'T.Otro GEA ÷ Atendidas', null],

  // Supervisores (agregado por equipo desde KPI_ASESORES_HFC)
  SUP_ATEND: ['Atendidas', 'Suma de llamadas atendidas del equipo (CANT_ATENDIDA)', null],
  SUP_CAT:   ['CAT del equipo', 'Suma de cortes de agente del equipo (CORTE_AGENTE)', null],
  SUP_PCAT:  ['% CAT', 'CAT del equipo ÷ Atendidas del equipo', 'Menor es mejor'],
  SUP_OCUP:  ['% Ocupación', 'TMP_HABLADO ÷ TMP_PROD, sumados por todo el equipo', 'Meta ≥ 79% (objetivo de la campaña) · Ámbar ≥ 69%'],
  SUP_TMG:   ['TMG', 'Σ TMG_TOTAL_SEG ÷ Atendidas (promedio ponderado del equipo)', 'Meta ≤ 550 s (9:10) · ámbar hasta 600 s'],
  SUP_HRS:   ['Horas Prod.', 'Σ TMP_PROD ÷ 3600 de todo el equipo', null],
  SUP_PROM:  ['Promotores', 'Encuestas con calificación de promotor', null],
  SUP_DETR:  ['Detractores', 'Encuestas con calificación de detractor', null],
  SUP_PAS:   ['Pasivos', 'Encuestas con calificación neutral', null],
  SUP_ENC:   ['Encuestas', 'Promotores + Neutros + Detractores del equipo', null],
  SUP_PPROM: ['% Promotores', 'Promotores ÷ Encuestas del equipo', null],
  SUP_PNEU:  ['% Neutros', 'Neutros ÷ Encuestas del equipo', null],
  SUP_PDET:  ['% Detractores', 'Detractores ÷ Encuestas del equipo', 'Verde ≤ 10% · ámbar ≤ 15% · rojo más'],
  SUP_PRESP: ['% Respuesta', 'Encuestas respondidas ÷ Transferidas a encuesta', null],
  SUP_TNPS:  ['% TNPS', '(Promotores − Detractores) ÷ Total de encuestas del equipo', 'Meta según el campo "Meta TNPS %"'],
  SUP_UTIL:  ['% Utilización', 'TMP_PROD ÷ TPM_TOTAL, sumados por todo el equipo — cuánto del tiempo logueado es productivo', 'Meta ≥ 95% · Ámbar ≥ 85%'],
  SUP_TRANSF:['% Transferencia', 'Transferencias del equipo (Vicio/IVR123/BPO/GEA) ÷ Atendidas', 'Menor es mejor · umbral provisional Verde ≤5% · Ámbar ≤10%'],
  SUP_TRANSF_TOT: ['Transferencias — total', 'Suma de las 4 categorías, del equipo', null],
  SUP_TRANS_VICIO:['Transferencia — Vicio/Validación', 'Llamadas del equipo transferidas a BlackListChecking', null],
  SUP_TRANS_IVR:  ['Transferencia — IVR 123', 'Llamadas del equipo transferidas al flujo PeruClaro_123Flow', null],
  SUP_TRANS_BPO:  ['Transferencia — Otro BPO', 'Llamadas del equipo transferidas a otro BPO', null],
  SUP_TRANS_GEA:  ['Transferencia — Otra cola GEA', 'Llamadas del equipo transferidas a otra cola interna de GEA', null],
  SUP_CORTE_CL:   ['% Corte Cliente', 'Llamadas cortadas por el cliente ÷ Atendidas, del equipo (mismo cálculo que ATC)', 'Menor es mejor · umbral provisional Verde ≤5% · Ámbar ≤10%'],
  SUP_TRANS_ENC: ['Transferencias a encuesta', 'Llamadas del equipo transferidas al IVR de encuesta (TRANS_ENCU)', null],
  SUP_PARTIC:    ['% Transf Encu.', 'Transferencias a encuesta ÷ Atendidas, del equipo', 'Mayor es mejor · Meta ≥ 75% (objetivo de la campaña) · Ámbar ≥ 65%'],
  SUP_IND_ENC:   ['% Ind. Encuesta', 'Trans. a encuesta ÷ (Trans. a encuesta + Encuestas calificables no transferidas), del equipo', 'Mayor es mejor · Meta ≥ 75% · Ámbar ≥ 70%'],
  SUP_PCT_T_VICIO: ['% Transferencia — Vicio/Validación', 'T.Vicio ÷ Atendidas, del equipo', null],
  SUP_PCT_T_IVR:   ['% Transferencia — IVR 123', 'T.IVR123 ÷ Atendidas, del equipo', null],
  SUP_PCT_T_BPO:   ['% Transferencia — Otro BPO', 'T.Otro BPO ÷ Atendidas, del equipo', null],
  SUP_PCT_T_GEA:   ['% Transferencia — Otra cola GEA', 'T.Otro GEA ÷ Atendidas, del equipo', null],

  // Asesores (mismo origen que Supervisores, agregado por USUARIO)
  AS_ATEND:   ['Atendidas', 'Total de llamadas atendidas por el asesor (CANT_ATENDIDA)', null],
  AS_DIAS:    ['Días gestionados', 'Cantidad de fechas distintas con gestión del asesor, en el filtro activo', null],
  AS_PROM_AT: ['Prom. atendidas', 'Atendidas ÷ Días gestionados', 'Promedio diario del asesor'],
  AS_TMG:     ['TMG Real', 'Σ TMG_TOTAL_SEG ÷ Atendidas del asesor', 'Meta ≤ 550 s (9:10) · ámbar hasta 600 s'],
  AS_CAT:     ['Cat.Ag.', 'Total de cortes de agente del asesor (CORTE_AGENTE)', null],
  AS_PCAT:    ['% Cat.Ag.', 'Cortes de agente ÷ Atendidas del asesor', 'Menor es mejor'],
  AS_PROM:    ['Promotor', 'Encuestas con calificación de promotor', null],
  AS_DETR:    ['Detractor', 'Encuestas con calificación de detractor', null],
  AS_PAS:     ['Neutros', 'Encuestas con calificación neutral (pasivos)', null],
  AS_ENC:     ['Encuestas', 'Promotores + Neutros + Detractores del asesor', null],
  AS_PPROM:   ['% Promotores', 'Promotores ÷ Encuestas del asesor', null],
  AS_PNEU:    ['% Neutros', 'Neutros ÷ Encuestas del asesor', null],
  AS_PDET:    ['% Detractores', 'Detractores ÷ Encuestas del asesor', 'Verde ≤ 10% · ámbar ≤ 15% · rojo más'],
  AS_CUARTIL_TNPS: ['Cuartil TNPS', 'TNPS del asesor en el período: Q1 Élite ≥ 85% · Q2 Sólido 70–85% · Q3 Riesgo 65–70% · Q4 Crítico < 65%', 'Vol. bajo = menos de 5 encuestas'],
  AS_APORTE_DET:   ['% de los detractores', 'Detractores del asesor ÷ detractores de todos los asesores del período filtrado', 'Muestra quién concentra el daño (Pareto)'],
  AS_DIAS_CRIT:    ['Días críticos', 'Días con TNPS < 65% (y ≥ 5 encuestas ese día) de los días con ≥ 5 encuestas', 'Rojo = 2 o más días críticos'],
  AS_PRESP:   ['% Respuesta', 'Encuestas respondidas ÷ Transferidas a encuesta', null],
  AS_TNPS:    ['% TNPS', '(Promotores − Detractores) ÷ Total de encuestas del asesor', 'Meta según el campo "Meta TNPS %"'],
  AS_TRANSF:  ['% Transferencia', 'Transferencias del asesor (Vicio/IVR123/BPO/GEA) ÷ Atendidas — NO incluye transferencias a encuesta (TRANS_ENCU); esas van en las columnas separadas "Trans.Enc" y "%Transf Encu." de más adelante', 'Menor es mejor · umbral provisional Verde ≤5% · Ámbar ≤10%'],
  AS_TRANSF_TOT: ['Transferencias — total', 'Suma de las 4 categorías, del asesor', null],
  AS_TRANS_VICIO:['Transferencia — Vicio/Validación', 'Llamadas del asesor transferidas a BlackListChecking', null],
  AS_TRANS_IVR:  ['Transferencia — IVR 123', 'Llamadas del asesor transferidas al flujo PeruClaro_123Flow', null],
  AS_TRANS_BPO:  ['Transferencia — Otro BPO', 'Llamadas del asesor transferidas a otro BPO', null],
  AS_TRANS_GEA:  ['Transferencia — Otra cola GEA', 'Llamadas del asesor transferidas a otra cola interna de GEA', null],
  AS_CORTE_CL:   ['% Corte Cliente', 'Llamadas cortadas por el cliente ÷ Atendidas del asesor (mismo cálculo que ATC)', 'Menor es mejor · umbral provisional Verde ≤5% · Ámbar ≤10%'],
  AS_TRANS_ENC: ['Transferencias a encuesta', 'Llamadas del asesor transferidas al IVR de encuesta (TRANS_ENCU)', null],
  AS_PARTIC:    ['% Transf Encu.', 'Transferencias a encuesta ÷ Atendidas del asesor', 'Mayor es mejor · Meta ≥ 75% (objetivo de la campaña) · Ámbar ≥ 65%'],
  AS_IND_ENC:   ['% Ind. Encuesta', 'Trans. a encuesta ÷ (Trans. a encuesta + Encuestas calificables no transferidas), del asesor', 'Mayor es mejor · Meta ≥ 75% · Ámbar ≥ 70%'],
  AS_PCT_T_VICIO: ['% Transferencia — Vicio/Validación', 'T.Vicio ÷ Atendidas del asesor', null],
  AS_PCT_T_IVR:   ['% Transferencia — IVR 123', 'T.IVR123 ÷ Atendidas del asesor', null],
  AS_PCT_T_BPO:   ['% Transferencia — Otro BPO', 'T.Otro BPO ÷ Atendidas del asesor', null],
  AS_PCT_T_GEA:   ['% Transferencia — Otra cola GEA', 'T.Otro GEA ÷ Atendidas del asesor', null],

  // Horas — Control de Tiempos (VW_ESTADO_AGENTE_FECHA), claves = data-col-id ya usados por 10-columnas.js
  'col-h-cond':       ['Cond. Laboral', 'Full Time / Mini Full Time / Part Time / Posible OJT — desde nómina', 'Posible OJT = sin match en nómina'],
  'col-h-antig':      ['Antigüedad', 'Tiempo del agente en la campaña, desde nómina', null],
  'col-h-estop':      ['Estado Operativo', 'Estado del agente en nómina (activo/inactivo/etc.)', null],
  'col-h-contrato':   ['Contrato', 'Tipo de contrato del agente, desde nómina', null],
  'col-h-dias':       ['Días', 'Cantidad de días con dato de estados en el rango filtrado', null],
  'col-h-jornada':    ['Jornada Teórica', 'Full Time 8h · Mini Full 5h · Part Time 4h, prorrateado por los días con dato', 'Si no hay match en nómina, Jornada = T.Total (no genera Debe Horas)'],
  'col-h-total':      ['T.Total Logueado', 'Suma de todos los estados: Productivos + auxiliares (menos Almuerzo y Capa. no pagada)', null],
  'col-h-debe':       ['Debe Horas', 'Jornada Teórica − T.Total (nunca negativo)', 'Si T.Total ≥ Jornada, el resultado es 0'],
  'col-h-ocup':       ['% Ocupación', 'T.Neto ÷ T.Neto Idle', 'Meta ≥ 70% · Ámbar ≥ 55%'],
  'col-h-adh':        ['% Adherencia', 'T.Neto Idle ÷ T.Total', 'Meta ≥ 85% · Ámbar ≥ 70%'],
  'col-h-util':       ['% Utilización', 'T.Total ÷ Jornada Teórica', 'Meta ≥ 85% · Ámbar ≥ 70%'],
  'col-h-adhjor':     ['% Adherencia a jornada', 'T.Neto Idle ÷ Jornada Teórica', 'Meta ≥ 75% · Ámbar ≥ 60%'],
  'col-h-netoidle':   ['T.Neto Idle', 'Disponible + Hablando + Tipificación', null],
  'col-h-neto':       ['T.Neto', 'Hablando + Tipificación', null],
  'col-h-aux':        ['T.Auxiliares', 'Suma de los auxiliares (sin Almuerzo ni Capa. no pagada)', null],
  'col-h-paux':       ['% Auxiliares', 'T.Auxiliares ÷ T.Total', 'Menor es mejor · rojo desde 15%'],
  'col-h-tip':        ['Tipificación', 'Tiempo en estado Tipificación', null],
  'col-h-ocupado':    ['Ocupado', 'Tiempo en estado Ocupado', null],
  'col-h-hablando':   ['Hablando', 'Tiempo hablando con el cliente', null],
  'col-h-esttrab':    ['Estado Trab.', 'Tiempo en Estado de Trabajo', null],
  'col-h-disp':       ['Disponible', 'Tiempo disponible para recibir llamadas', null],
  'col-h-almuerzo':   ['Almuerzo', 'Tiempo en Almuerzo (auxiliar no pagado)', null],
  'col-h-backoffice': ['BackOffice', 'Tiempo en labores de BackOffice', null],
  'col-h-capanopag':  ['Capa. No Pagada', 'Tiempo en capacitación no pagada', null],
  'col-h-capapag':    ['Capa. Pagada', 'Tiempo en capacitación pagada', null],
  'col-h-conscal':    ['Cons. Calidad', 'Tiempo en consulta con el área de Calidad', null],
  'col-h-conssup':    ['Cons. Supervisor', 'Tiempo en consulta con el supervisor', null],
  'col-h-descanso':   ['Descanso', 'Tiempo en descanso/refrigerio', null],
  'col-h-feedback':   ['Feedback', 'Tiempo en feedback con el supervisor', null],
  'col-h-sshh':       ['SSHH', 'Tiempo en SSHH', null],
  'col-h-topico':     ['Tópico', 'Tiempo en Tópico (salud)', null],
  'col-h-errapp':     ['Error App', 'Tiempo perdido por error del aplicativo de Claro', null],
};

function _fxKey(th){ return th.dataset.col || th.dataset.colId; }
let _fxTip = null;

function _fxGetTip() {
  if (_fxTip && document.body.contains(_fxTip)) return _fxTip;
  _fxTip = document.createElement('div');
  _fxTip.className = 'fx-tip';
  document.body.appendChild(_fxTip);
  return _fxTip;
}

function _fxShow(th) {
  const ent = FX_FORMULAS[_fxKey(th)];
  if (!ent) return;
  const tip = _fxGetTip();
  tip.innerHTML =
    '<div class="fx-tip-t">🧮 ' + ent[0] + '</div>' +
    '<div class="fx-tip-f">' + ent[1] + '</div>' +
    (ent[2] ? '<div class="fx-tip-m">' + ent[2] + '</div>' : '');
  tip.classList.add('show');
  const r = th.getBoundingClientRect();
  const tw = Math.min(300, tip.offsetWidth || 300);
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  let top = r.bottom + 8;
  if (top + tip.offsetHeight > window.innerHeight - 8) top = r.top - tip.offsetHeight - 8;
  tip.style.left = left + 'px';
  tip.style.top  = top + 'px';
}

function _fxHide() { if (_fxTip) _fxTip.classList.remove('show'); }

document.addEventListener('mouseover', e => {
  const th = e.target.closest && e.target.closest('th[data-col], th[data-col-id]');
  if (th && FX_FORMULAS[_fxKey(th)]) _fxShow(th);
});
document.addEventListener('mouseout', e => {
  const th = e.target.closest && e.target.closest('th[data-col], th[data-col-id]');
  if (th) _fxHide();
});
document.addEventListener('scroll', _fxHide, true);

/* Subrayado punteado + cursor de ayuda en las cabeceras que SÍ tienen fórmula (pista visual).
   Los <thead> de todas las tablas son HTML estático (solo el <tbody> se reescribe en cada
   render), así que basta con marcarlos una vez al cargar — igual que ATC (js/11-ux.js). */
(function marcarThsConFormula() {
  document.querySelectorAll('th[data-col], th[data-col-id]').forEach(th => {
    if (FX_FORMULAS[_fxKey(th)]) th.classList.add('has-fx');
  });
})();
