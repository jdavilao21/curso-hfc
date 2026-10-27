/* ================== 09-supervisores.js — agregación y render de la pestaña Supervisores ==================
   Fuente: KPI_ASESORES_HFC (grano PERIODO+FECHA+FRANJA+USUARIO), agregado por SUPERVISOR.
   KPIs (decididos con Jose, ver memoria project-v2-atc-style): Atendidas, CAT, %CAT, %Ocup, TMG, Hrs.Prod, %TNPS.
   %NS/%NA no aplican a nivel supervisor (cola general, no por equipo). */

const SUMK_SUP=['CANT_ATENDIDA','CORTE_AGENTE','TMG_TOTAL_SEG','TPM_TOTAL','TMP_HABLADO','TMP_PROD','CANT_PROMOTOR','CANT_DETRACTOR','CANT_PASIVO',
  'TRANS_VICIO','TRANS_IVR_123','TRANS_OTROS_BPO','TRANS_OTROS_GEA','CORTE_CLIENTE','TRANS_ENCU','ENCU_CAL'];

function blankSup(){const o={};SUMK_SUP.forEach(k=>o[k]=0);return o;}
/* Suma de filas ya agregadas (salida de aggBySupervisor/aggByAsesor) — TOTAL de tablas y buckets. */
function _sumAgg(arr){
  const t = blankSup();
  arr.forEach(o=>{
    SUMK_SUP.forEach(k=>t[k]+=(+o[k]||0));
  });
  return t;
}
function addIntoSup(o,r){
  SUMK_SUP.forEach(k=>o[k]+=(parseFloat(r[k])||0));
}

function aggBySupervisor(rows){
  const m={};
  rows.forEach(r=>{
    const k=r.SUPERVISOR||'SIN SUPERVISOR';
    if(!m[k]){m[k]=blankSup();m[k].SUPERVISOR=k;}
    addIntoSup(m[k],r);
  });
  return Object.values(m).sort((a,b)=>b.CANT_ATENDIDA-a.CANT_ATENDIDA);
}

function MSup(o){
  const transfTot = o.TRANS_VICIO+o.TRANS_IVR_123+o.TRANS_OTROS_BPO+o.TRANS_OTROS_GEA;
  const T = tnpsDe(o);   // TNPS completo (02-engine.js)
  return {
    catP: o.CANT_ATENDIDA>0 ? o.CORTE_AGENTE/o.CANT_ATENDIDA : 0,
    ocup: o.TMP_PROD>0 ? o.TMP_HABLADO/o.TMP_PROD : 0,
    /* %Utilización — mismo par Ocup/Util que Diario/Intervalos (project-kpis.md): Ocup mide
       cuánto del tiempo productivo se habla, Util mide cuánto del tiempo logueado es productivo. */
    util: o.TPM_TOTAL>0 ? o.TMP_PROD/o.TPM_TOTAL : 0,
    tmg:  o.CANT_ATENDIDA>0 ? o.TMG_TOTAL_SEG/o.CANT_ATENDIDA : 0,
    hrs:  o.TMP_PROD/3600, /* Horas Prod. real, no TPM_TOTAL (tiempo total logueado incl. dispo/tipif) */
    tnps: T.tnps, enc: T.enc, pProm: T.pProm, pNeu: T.pNeu, pDet: T.pDet, pResp: T.pResp,
    /* %Transferencia — no incluye TRANS_ENCU (transferencia a encuesta, concepto aparte). */
    transfTot, transf: o.CANT_ATENDIDA>0 ? transfTot/o.CANT_ATENDIDA : 0,
    /* %Corte Cliente — mismo cálculo que ATC (CORTE_CLIENTE/Atendidas). */
    corteCl: o.CANT_ATENDIDA>0 ? o.CORTE_CLIENTE/o.CANT_ATENDIDA : 0,
    /* Encuestas — ya agregadas por Jose a KPI_ASESORES_HFC (v5, 2026-08-31). */
    pEncu: o.CANT_ATENDIDA>0 ? o.TRANS_ENCU/o.CANT_ATENDIDA : 0,
    ind: (o.TRANS_ENCU+o.ENCU_CAL)>0 ? o.TRANS_ENCU/(o.TRANS_ENCU+o.ENCU_CAL) : 0,
    /* % de cada categoría de transferencia sobre Atendidas. */
    pTransVicio: o.CANT_ATENDIDA>0 ? o.TRANS_VICIO/o.CANT_ATENDIDA : 0,
    pTransIvr:   o.CANT_ATENDIDA>0 ? o.TRANS_IVR_123/o.CANT_ATENDIDA : 0,
    pTransBpo:   o.CANT_ATENDIDA>0 ? o.TRANS_OTROS_BPO/o.CANT_ATENDIDA : 0,
    pTransGea:   o.CANT_ATENDIDA>0 ? o.TRANS_OTROS_GEA/o.CANT_ATENDIDA : 0
  };
}

/* Fecha/Semana/Coordinador se pueblan sobre el período activo, conservando la selección
   previa si sigue existiendo (mismo patrón que ATC — _poblarDependientesSup).
   Fecha usa el mismo sentinel "ALL" que Intervalos (05-intervalos.js:buildSelectFechaIntervalos):
   si no hay selección previa válida, cae por default a la fecha más reciente del período — nunca
   se queda "pegada" en Todas por accidente en cada re-render. */
function _poblarDependientesSup(rows){
  poblarFechaMulti('sup', rows, renderSupervisores);
  const selS = document.getElementById('sel-semana-sup');
  if(selS){
    const prev = selS.value;
    const sems=[...new Set(rows.map(r=>r.SEMANA))].filter(Boolean).sort();
    selS.innerHTML = '<option value="">Todas</option>' + sems.map(s=>`<option value="${s}">${s}</option>`).join('');
    if(sems.includes(prev)) selS.value = prev;
  }
  const selC = document.getElementById('sel-coord-sup');
  if(selC){
    const prev = selC.value;
    const coords=[...new Set(rows.map(r=>r.COORDINADOR))].filter(Boolean).sort();
    selC.innerHTML = '<option value="">Todos</option>' + coords.map(c=>`<option value="${c}">${c}</option>`).join('');
    if(coords.includes(prev)) selC.value = prev;
  }
}

let FILTRADO_SUPERVISORES = [];

function renderKPIStripSup(rows){
  const el=document.getElementById('kpi-strip-sup');
  if(!rows.length){el.innerHTML='';return;}
  const T=blankSup(); rows.forEach(r=>addIntoSup(T,r));
  const m=MSup(T);
  const meta=parseFloat((document.getElementById('inp-tnps-meta-sup')||{}).value)||METAS_HFC.TNPS;
  const porSupCount = new Set(rows.map(r=>r.SUPERVISOR||'SIN SUPERVISOR')).size;
  /* TNPS completo primero (foco de HFC) + tarjetas opcionales; el usuario elige cuáles ve (17-tarjetas.js). */
  const cards=[
    tarjetaTnps(T, meta),
    {k:'atend', ico:'📞', l:'Atendidas',   v:fmtN(T.CANT_ATENDIDA), cls:'',
      s:`Sobre <b>${porSupCount}</b> supervisor${porSupCount!==1?'es':''}`},
    {k:'cat', ico:'✂️', l:'% CAT',       v:fmtPct(m.catP),        cls:sem(m.catP,TH.CAT.v,TH.CAT.a,true),
      s:`CAT: <b>${fmtN(T.CORTE_AGENTE)}</b> llamadas`},
    {k:'ocup', ico:'🔄', l:'% Ocupación', v:fmtPct(m.ocup),        cls:sem(m.ocup,TH.OCUP.v,TH.OCUP.a),
      s:`Hablado/Prod. del equipo`},
    {k:'tmg', ico:'⏱️', l:'TMG',         v:fmtSeg(m.tmg),         cls:sem(m.tmg,TH.TMG.v,TH.TMG.a,true),
      s:`Promedio ponderado`},
    {k:'hrs', ico:'💪', l:'Horas Prod.', v:fmtHrs(m.hrs),         cls:'',
      s:`Suma de todo el equipo`},
    {k:'util', ico:'⚙️', l:'% Utilización', v:fmtPct(m.util),      cls:sem(m.util,TH.UTIL.v,TH.UTIL.a),
      s:`Prod./Logueado del equipo`},
    /* %Transf Encu (Jose, 2026-09-17) — mismo cambio que Diario/Intervalos/Asesores: pasa de
       "% Transferencia" (m.transf, excluye TRANS_ENCU) a TRANS_ENCU ÷ Atendidas (m.pEncu). La
       columna "%Transf" de la tabla (SUP_TRANSF) y su tooltip NO cambian — siguen siendo el
       %Transferencia que excluye encuesta, es una métrica distinta de esta tarjeta. */
    {k:'transf', ico:'↪️', l:'%Transf Encu', v:fmtPct(m.pEncu),  cls:sem(m.pEncu,TH.PENCU.v,TH.PENCU.a),
      s:`Trans. a encuesta: <b>${fmtN(T.TRANS_ENCU)}</b> de ${fmtN(T.CANT_ATENDIDA)} atendidas`},
    ...tarjetasTnpsOpcionales(T),
  ];
  el.innerHTML = htmlTarjetas(tarjetasPersonalizadas('sup', cards), false);
}

/* Orden por clic en encabezado (igual que ATC) — cada índice mapea a una columna de la tabla. */
const ORDEN_SUP = {col:null, dir:1};         // columna/dirección del orden de #tbl-sup (alternarOrden, 01-core.js)
const SUP_SORT_KEYS=[
  o=>o.SUPERVISOR||'',
  o=>o.CANT_ATENDIDA,
  o=>o.CORTE_AGENTE,
  o=>MSup(o).catP,
  o=>MSup(o).ocup,
  o=>MSup(o).tmg,
  o=>MSup(o).hrs,
  o=>o.CANT_PROMOTOR,
  o=>o.CANT_DETRACTOR,
  o=>o.CANT_PASIVO,
  o=>MSup(o).tnps,
  o=>MSup(o).util,
  o=>MSup(o).transf,
  o=>MSup(o).transfTot,
  o=>o.TRANS_VICIO,
  o=>o.TRANS_IVR_123,
  o=>o.TRANS_OTROS_BPO,
  o=>o.TRANS_OTROS_GEA,
  o=>MSup(o).corteCl,
  o=>o.TRANS_ENCU,
  o=>MSup(o).pEncu,
  o=>MSup(o).ind,
  o=>MSup(o).pTransVicio,
  o=>MSup(o).pTransIvr,
  o=>MSup(o).pTransBpo,
  o=>MSup(o).pTransGea,
  /* 26-30: TNPS completo (2026-10-08) */
  o=>MSup(o).enc, o=>MSup(o).pProm, o=>MSup(o).pNeu, o=>MSup(o).pDet, o=>MSup(o).pResp
];
function sortSup(col){ alternarOrden(ORDEN_SUP, col); renderSupervisores(); }

function rowHTMLSup(o,isTotal){
  const m=MSup(o);
  const meta=parseFloat((document.getElementById('inp-tnps-meta-sup')||{}).value)||METAS_HFC.TNPS;
  return `<tr class="${isTotal?'fila-total':''}">
    <td>${o.SUPERVISOR}</td>
    <td>${fmtN(o.CANT_ATENDIDA)}</td>
    <td>${fmtN(o.CORTE_AGENTE)}</td>
    <td><span class="sv ${sem(m.catP,TH.CAT.v,TH.CAT.a,true)}">${fmtPct(m.catP)}</span></td>
    <td><span class="sv ${sem(m.ocup,TH.OCUP.v,TH.OCUP.a)}">${fmtPct(m.ocup)}</span></td>
    <td><span class="sv ${sem(m.tmg,TH.TMG.v,TH.TMG.a,true)}">${fmtSeg(m.tmg)}</span></td>
    <td>${fmtHrs(m.hrs)}</td>
    <td>${fmtN(o.CANT_PROMOTOR)}</td>
    <td>${fmtN(o.CANT_DETRACTOR)}</td>
    <td>${fmtN(o.CANT_PASIVO)}</td>
    <td><span class="sv ${sem(m.tnps,meta/100,(meta-10)/100)}">${fmtPct(m.tnps)}</span></td>
    <td><span class="sv ${sem(m.util,TH.UTIL.v,TH.UTIL.a)}">${fmtPct(m.util)}</span></td>
    <td><span class="sv ${sem(m.transf,TH.TRANSF.v,TH.TRANSF.a,true)}">${fmtPct(m.transf)}</span></td>
    <td>${fmtN(m.transfTot)}</td>
    <td>${fmtN(o.TRANS_VICIO)}</td>
    <td>${fmtN(o.TRANS_IVR_123)}</td>
    <td>${fmtN(o.TRANS_OTROS_BPO)}</td>
    <td>${fmtN(o.TRANS_OTROS_GEA)}</td>
    <td><span class="sv ${sem(m.corteCl,TH.CORTE_CLIENTE.v,TH.CORTE_CLIENTE.a,true)}">${fmtPct(m.corteCl)}</span></td>
    <td>${fmtN(o.TRANS_ENCU)}</td>
    <td><span class="sv ${sem(m.pEncu,TH.PENCU.v,TH.PENCU.a)}">${fmtPct(m.pEncu)}</span></td>
    <td><span class="sv ${sem(m.ind,TH.IND.v,TH.IND.a)}">${fmtPct(m.ind)}</span></td>
    <td>${fmtPct(m.pTransVicio)}</td>
    <td>${fmtPct(m.pTransIvr)}</td>
    <td>${fmtPct(m.pTransBpo)}</td>
    <td>${fmtPct(m.pTransGea)}</td>
    <td>${fmtN(m.enc)}</td><td>${fmtPct(m.pProm)}</td><td>${fmtPct(m.pNeu)}</td><td><span class="sv ${m.enc?sem(m.pDet,.10,.15,true):''}">${fmtPct(m.pDet)}</span></td><td>${fmtPct(m.pResp)}</td>
  </tr>`;
}

function renderTableSup(porSupervisor, totalRow){
  const tbody=document.getElementById('tbody-sup');
  if(!porSupervisor.length){tbody.innerHTML='<tr><td colspan="32" style="text-align:center;padding:32px;color:var(--dim)">Sin datos para los filtros seleccionados</td></tr>';return;}
  const filas=porSupervisor.map(o=>rowHTMLSup(o,false)).join('');
  tbody.innerHTML=filas+rowHTMLSup(Object.assign({SUPERVISOR:'▸ TOTAL'},totalRow),true);
}

function buildSelectPeriodoSup(){ llenarSelectPeriodo(document.getElementById('sel-periodo-sup'), RAW_ASESORES.map(r=>r.PERIODO), {asc:true}); }

function renderSupervisores(){
  let rows = RAW_ASESORES;
  const selP = document.getElementById('sel-periodo-sup');
  if(selP.value && selP.value!=='ALL') rows = rows.filter(r=>String(r.PERIODO)===String(selP.value));

  // Fecha/Semana/Coordinador dependen del período activo (repobla conservando selección).
  _poblarDependientesSup(rows);
  const fechasSel = fechasElegidas('sup');
  const semSel   = (document.getElementById('sel-semana-sup')||{}).value || '';
  const coordSel = (document.getElementById('sel-coord-sup')||{}).value || '';
  if(fechasSel) rows = rows.filter(r=>fechasSel.has(r.FECHA));
  if(semSel)   rows = rows.filter(r=>r.SEMANA===semSel);
  if(coordSel) rows = rows.filter(r=>r.COORDINADOR===coordSel);

  FILTRADO_SUPERVISORES = rows;
  let porSup = aggBySupervisor(rows);
  const buscarTxt = (document.getElementById('txt-buscar-sup')||{}).value?.trim().toUpperCase() || '';
  if(buscarTxt) porSup = porSup.filter(o=>(o.SUPERVISOR||'').toUpperCase().includes(buscarTxt));
  porSup = ordenarFilas(porSup, ORDEN_SUP, SUP_SORT_KEYS);
  const total = blankSup(); rows.forEach(r=>addIntoSup(total,r));
  renderKPIStripSup(rows);
  renderTableSup(porSup, total);
  marcarOrden('#tbl-sup thead th.sortable', ORDEN_SUP);

  const pillSup = document.getElementById('sup-periodo-pill');
  if(pillSup) pillSup.textContent = (selP.value==='ALL') ? 'Todos los períodos' : selP.value;
}
