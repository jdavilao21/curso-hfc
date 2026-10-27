/* ================== 18-tnps-asesores.js — análisis TNPS por asesor (Fase 2, 2026-10-08) ==================
   Pedido de Jose sobre el Excel TNPS_12Mayo-20Sep.xlsx (tablero TNPS de la campaña MDY), en la pestaña Asesores:
   1) Cuartil TNPS de cada asesor sobre el PERÍODO filtrado (no por día: por día hay muy pocas encuestas).
      Rangos del Excel y nombres decididos por Jose (Q1 = el mejor, como RETE FIJA):
        Q1 Élite ≥ 85 % · Q2 Sólido 70–85 % · Q3 Riesgo 65–70 % · Q4 Crítico < 65 % · Vol. bajo < 5 encuestas.
      Columna «Cuartil TNPS» + dona que filtra la tabla (motor renderDonaFiltro, 20-agentes-comun.js).
   2) % de los detractores («Detractor Density» del Excel): detractores del asesor ÷ detractores de TODOS los asesores
      del período filtrado (antes de los filtros propios de la tabla), para ver quién concentra el daño. Columna + Top 10.
   3) Días críticos: días con TNPS < 65 % y al menos 5 encuestas ese día. Se muestra «n de m», m = días con ≥ 5 encuestas.
   4) Tarjeta «Q4 Crítico»: cuántos asesores están en Crítico y qué % de los detractores concentran.
   No se replican las «brechas» ni el feedback cualitativo del Excel: ese dato no existe en el sistema. */

const TNPS_MIN_ENC = 5;          // menos encuestas = «Vol. bajo» (también es el mínimo para contar un día crítico)
const TNPS_CRITICO = 0.65;       // umbral de día crítico y de Q4
const TNPS_CUARTILES = [
  { q:'Q1', label:'Q1 · Élite',   desde:0.85, color:()=>_cssVar('--good') },
  { q:'Q2', label:'Q2 · Sólido',  desde:0.70, color:()=>'#4f8fd6' },   // azul propio: el gris de --accent2 se confundía con «Vol. bajo»
  { q:'Q3', label:'Q3 · Riesgo',  desde:0.65, color:()=>_cssVar('--warn') },
  { q:'Q4', label:'Q4 · Crítico', desde:-Infinity, color:()=>_cssVar('--bad') },
  { q:'VB', label:'Vol. bajo',    desde:null, color:()=>_cssVar('--dim') },
];
/* Cuartil de un agregado (asesor o grupo) con campos CANT_PROMOTOR / CANT_PASIVO / CANT_DETRACTOR. */
function cuartilTnps(o){
  const t = tnpsDe(o);
  if(t.enc < TNPS_MIN_ENC) return TNPS_CUARTILES[4];
  return TNPS_CUARTILES.find(c=>c.desde!==null && t.tnps >= c.desde);
}
const _TNPS_CLS = { Q1:'cb-ft', Q2:'cb-tnps-q2', Q3:'cb-pt', Q4:'cb-ojt', VB:'cb-def' };   // clases de color de Cond. Laboral + azul propio para Q2
function cuartilTnpsBadge(o){
  const c = cuartilTnps(o), t = tnpsDe(o);
  return `<span class="cond-badge ${_TNPS_CLS[c.q]}" title="TNPS ${(t.tnps*100).toFixed(1)}% · ${t.enc} encuestas">${c.label}</span>`;
}
/* Orden de la columna: Q1 primero; dentro del cuartil, mayor TNPS primero; Vol. bajo al final. */
function ordenCuartilTnps(o){
  const c = cuartilTnps(o), t = tnpsDe(o);
  return c.q==='VB' ? -10 : (5 - +c.q.slice(1)) + t.tnps;
}

/* ---------- Contexto del período: detractores totales y días críticos por asesor ----------
   Se calcula una vez por render sobre las filas YA filtradas por la barra superior (día × asesor). */
let _AS_TNPS_CTX = { totDet:0, dias:new Map() };
function prepararTnpsAsesores(rows){
  const porDia = new Map();   // usuario|fecha -> {P,N,D}
  let totDet = 0;
  rows.forEach(r=>{
    const u = r.USUARIO || 'SIN USUARIO', k = u+'|'+String(r.FECHA).slice(0,10);
    const d = porDia.get(k) || { u, CANT_PROMOTOR:0, CANT_PASIVO:0, CANT_DETRACTOR:0 };
    d.CANT_PROMOTOR += +r.CANT_PROMOTOR||0; d.CANT_PASIVO += +r.CANT_PASIVO||0; d.CANT_DETRACTOR += +r.CANT_DETRACTOR||0;
    totDet += +r.CANT_DETRACTOR||0;
    porDia.set(k, d);
  });
  const dias = new Map();     // usuario -> {crit, conVol}
  porDia.forEach(d=>{
    const t = tnpsDe(d), e = dias.get(d.u) || { crit:0, conVol:0 };
    if(t.enc >= TNPS_MIN_ENC){ e.conVol++; if(t.tnps < TNPS_CRITICO) e.crit++; }
    dias.set(d.u, e);
  });
  _AS_TNPS_CTX = { totDet, dias };
}
const aporteDetractores = o => _AS_TNPS_CTX.totDet>0 ? (+o.CANT_DETRACTOR||0)/_AS_TNPS_CTX.totDet : 0;
const diasCriticos = o => _AS_TNPS_CTX.dias.get(o.USUARIO||'SIN USUARIO') || { crit:0, conVol:0 };
function diasCriticosHTML(o){
  const d = diasCriticos(o);
  if(!d.conVol) return '<span style="opacity:.45">—</span>';
  return `<span class="sv ${d.crit ? (d.crit>=2 ? 'r' : 'a') : 'v'}" title="Días con TNPS < 65% (y ≥ ${TNPS_MIN_ENC} encuestas) de ${d.conVol} días con ≥ ${TNPS_MIN_ENC} encuestas">${d.crit} de ${d.conVol}</span>`;
}

/* ---------- Filtro por cuartil (clic en la dona o en su leyenda) ---------- */
let _asTnpsSel = null;
function toggleAsTnps(q){ _asTnpsSel = (_asTnpsSel===q) ? null : q; renderAsesores(); }
function limpiarFiltroAsTnps(){ _asTnpsSel = null; renderAsesores(); }
function _renderFiltroChipAsTnps(){
  const c = TNPS_CUARTILES.find(x=>x.q===_asTnpsSel);
  pintarChip('as-filtro-chip-tnps', c ? `🔎 Cuartil TNPS: ${c.label}  ✕` : null);
}

/* ---------- Dona «Asesores por cuartil TNPS» ----------
   Fuente: asesores de las filas de la barra (sin su propio filtro), igual que la dona de Estado. */
const _AS_DONA_TNPS = { chart:null, prev:undefined };
function renderDonaTnpsAs(rows){
  const porAs = aggByAsesor(rows), n = {}, det = {};
  TNPS_CUARTILES.forEach(c=>{ n[c.q]=0; det[c.q]=0; });
  porAs.forEach(o=>{ const q = cuartilTnps(o).q; n[q]++; det[q] += +o.CANT_DETRACTOR||0; });
  const totDet = Object.values(det).reduce((a,b)=>a+b,0);
  const pDet = q => totDet ? (det[q]/totDet*100).toFixed(0)+'%' : '0%';
  renderDonaFiltro({
    ids:{ canvas:'ch-as-tnps-donut', leyenda:'as-tnps-donut-leyenda', card:'as-tnps-donut-card', filtro:'as-tnps-donut-filtro' },
    registro:_AS_DONA_TNPS, sel:_asTnpsSel, alTocar:toggleAsTnps, onclick:'toggleAsTnps', total:porAs.length,
    segmentos: TNPS_CUARTILES.map(c=>({ clave:c.q, etiqueta:c.label, color:c.color(), n:n[c.q], def:c })),
    pill: sg => sg.def.label,
    titulo: sg => `${sg.def.label}: clic para filtrar la tabla`,
    tooltip: (sg, cant, pct) => `${sg.etiqueta}: ${cant} asesor${cant!==1?'es':''} (${pct}%) · ${pDet(sg.clave)} de los detractores`,
    fila: (sg, cant, pct) => `<span style="flex:1;min-width:0;color:${sg.color};font-weight:800">${sg.def.label}</span>
        <b style="color:var(--text)">${cant}</b>
        <span style="color:var(--muted);min-width:38px;text-align:right">${pct}%</span>
        <span style="color:var(--muted);min-width:70px;text-align:right" title="Parte de los detractores del período">Det. ${pDet(sg.clave)}</span>`
  });
}

/* ---------- Top 10 · concentración de detractores ---------- */
let _AS_TOPDET_CHART = null;
function renderTopDetractoresAs(rows){
  if(_AS_TOPDET_CHART){ try{ _AS_TOPDET_CHART.destroy(); }catch(e){} _AS_TOPDET_CHART = null; }
  const canvas = document.getElementById('ch-as-top-det');
  if(!canvas || typeof Chart==='undefined') return;
  const items = aggByAsesor(rows).filter(o=>(+o.CANT_DETRACTOR||0)>0)
    .sort((a,b)=>(+b.CANT_DETRACTOR||0)-(+a.CANT_DETRACTOR||0)).slice(0,10)
    .map(o=>({ nombre:o.NOMBRE_ASESOR||o.USUARIO, det:+o.CANT_DETRACTOR||0, aporte:aporteDetractores(o), color:cuartilTnps(o).color() }));
  const acum = items.reduce((s,x)=>s+x.aporte,0);
  const pie = document.getElementById('as-top-det-pie');
  if(pie) pie.textContent = items.length ? `Estos ${items.length} asesores concentran el ${(acum*100).toFixed(1)}% de los ${fmtN(_AS_TNPS_CTX.totDet)} detractores del período · color = su cuartil TNPS` : 'Sin detractores en el período filtrado';
  const cTick = _cssVar('--text'), cGrid = _cssVar('--border');
  _AS_TOPDET_CHART = new Chart(canvas, {
    type:'bar',
    data:{ labels:items.map(x=>x.nombre), datasets:[{ data:items.map(x=>x.det), backgroundColor:items.map(x=>x.color), borderRadius:5, maxBarThickness:18 }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>`${ctx.parsed.x} detractores · ${(items[ctx.dataIndex].aporte*100).toFixed(1)}% del total` } } },
      scales:{ x:{ beginAtZero:true, grid:{color:cGrid}, ticks:{color:cTick, font:{size:10}, precision:0} }, y:{ grid:{display:false}, ticks:{color:cTick, font:{size:10}} } } }
  });
}

/* ---------- Tarjeta «Q4 Crítico» (Asesores) ---------- */
function tarjetaCriticosAs(porAsesor){
  const crit = porAsesor.filter(o=>cuartilTnps(o).q==='Q4');
  const detCrit = crit.reduce((s,o)=>s+(+o.CANT_DETRACTOR||0),0), tot = _AS_TNPS_CTX.totDet;
  const elite = porAsesor.filter(o=>cuartilTnps(o).q==='Q1').length;
  return { k:'criticos', ico:'⚠️', l:'Q4 · Crítico (TNPS < 65%)', v:fmtN(crit.length), cls: crit.length ? 'rojo' : 'verde',
    s:`Concentran <b>${tot ? (detCrit/tot*100).toFixed(0) : 0}%</b> de los detractores (${fmtN(detCrit)} de ${fmtN(tot)}) · Q1 Élite: <b>${fmtN(elite)}</b>` };
}
