/* ================== 04-diario.js — KPI strip + tabla, pestaña Diario ================== */

function getTnpsMeta(){
  const id = currentTab==='intervalos' ? 'inp-tnps-meta-int' : 'inp-tnps-meta-dia';
  return parseFloat((document.getElementById(id)||{}).value)||METAS_HFC.TNPS;
}

/* Tarjetas «kpi-v2» (HFC, 2026-10-08): todas las pestañas (Diario, Intervalos, Supervisores, Asesores y Horas) usan
   íconos de línea en un recuadro del color de la tarjeta (css/kpi-v2.css) en vez de emojis. kpiIco(emoji) traduce el
   emoji de cada tarjeta; si no hay equivalente, deja el emoji. */
const _I = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const _ICO = {
  diana:   _I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  check:   _I('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.6L16 9.6"/>'),
  entrante:_I('<path d="M5 4h3l1.6 4.2-2 1.3a11 11 0 0 0 6.9 6.9l1.3-2L20 16v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/><path d="M15 3v6h6M21 3l-6 6"/>'),
  fono:    _I('<path d="M5 4h3l1.6 4.2-2 1.3a11 11 0 0 0 6.9 6.9l1.3-2L20 16v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>'),
  tijera:  _I('<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.2 7.6 20 18M8.2 16.4 20 6"/>'),
  timer:   _I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>'),
  estrella:_I('<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>'),
  pulso:   _I('<path d="M3 12h4l3-7 4 14 3-7h4"/>'),
  grupo:   _I('<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M18.5 14.2a6.5 6.5 0 0 1 3 5.8"/>'),
  transf:  _I('<path d="M4 18v-3a5 5 0 0 1 5-5h11"/><path d="m15 5 5 5-5 5"/>'),
  rayo:    _I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  medidor: _I('<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/><circle cx="12" cy="18" r="1.4"/>'),
  audif:   _I('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20a3 3 0 0 1-3 2h-2"/>'),
  senal:   _I('<path d="M5 20v-4M10 20v-8M15 20V8M20 20V4"/>'),
  reloj:   _I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  taza:    _I('<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>'),
  alerta:  _I('<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.2"/>'),
  arena:   _I('<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>'),
  wifi:    _I('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.2" r="1.1"/>'),
  feliz:   _I('<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
  neutra:  _I('<circle cx="12" cy="12" r="9"/><path d="M8.5 15h7"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
  triste:  _I('<circle cx="12" cy="12" r="9"/><path d="M8 16a4.5 4.5 0 0 1 8 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
  urna:    _I('<path d="M5 11h14v9H5z"/><path d="M8 11V5h8v6"/><path d="M10 8h4"/>'),
};
const _ICO_EMOJI = {
  '🎯':'diana','✅':'check','📥':'entrante','📞':'fono','✂️':'tijera','⏱️':'timer','⭐':'estrella','🔄':'pulso',
  '👥':'grupo','↪️':'transf','💪':'rayo','⚙️':'medidor','🎧':'audif','📶':'senal','🕐':'reloj','☕':'taza',
  '⚠️':'alerta','⏳':'arena','🛰️':'wifi','😀':'feliz','😐':'neutra','☹️':'triste','🗳️':'urna',
};
function kpiIco(emoji){ return _ICO[_ICO_EMOJI[emoji]] || emoji; }

function renderKPIStrip(src, elId){
  const el=document.getElementById(elId);
  if(!src.length){el.innerHTML='';return;}
  /* Forzado dayGrain=true (Jose, 2026-09-17): AG.REAL/AG.RQ deben salir con el mismo divisor de
     turno (16 franjas) en Diario e Intervalos, para que el mismo día cuadre en ambas vistas — antes
     Intervalos forzaba `false` (divisor = nf, cantidad real de franjas cargadas), lo que daba un
     AG.REAL/AG.RQ distinto al de Diario para el mismo rango de fechas. Ver 02-engine.js:M(). */
  const T=aggAll(src, true), m=M(T);
  const meta=getTnpsMeta();
  const tmgVar = m.tmgRq>0 ? (m.tmgProm/m.tmgRq-1)*100 : 0;
  /* %Transf Encu — la tarjeta superior pasa de "% Transferencia" (m.transf, excluye TRANS_ENCU)
     a "%Transf Encu" (m.pEncu, TRANS_ENCU ÷ Atendidas), la misma métrica que ya usa la columna
     "%Transf Encu." de la tabla y la tarjeta homóloga de Asesores. Jose, 2026-09-17 ronda 3:
     "también en Intervalos" — antes solo se había cambiado en Diario. */
  const transfCard = {k:'transf',ico:'↪️', l:'%Transf Encu', v:fmtPct(m.pEncu), cls:sem(m.pEncu,TH.PENCU.v,TH.PENCU.a),
    s:`Trans. a encuesta: <b>${fmtN(T.TRANS_ENCU)}</b> de ${fmtN(T.CANT_ATENDIDA)} atendidas`};
  /* TNPS completo primero (foco de HFC) + tarjetas opcionales; el usuario elige cuáles ve (17-tarjetas.js). */
  const cards=[
    tarjetaTnps(T, meta),
    {k:'ns',    ico:'🎯', l:'% Nivel Servicio', v:fmtPct(m.ns),   cls:sem(m.ns,TH.NS.v,TH.NS.a),
      s:`Umbral ≥ ${(TH.NS.v*100).toFixed(0)}% · <b>${fmtN(T.ATENDIDA_UMBR)}</b> umbral`},
    {k:'na',    ico:'✅', l:'% Atención', v:fmtPct(m.na),   cls:sem(m.na,TH.NA.v,TH.NA.a),
      s:`Meta ≥ ${(TH.NA.v*100).toFixed(0)}% · Aban.: <b>${fmtN(T.CANT_ABANDONADA)}</b>`},
    {k:'recib', ico:'📥', l:'Llam. Recibidas', v:fmtN(T.LLAM_RECIBIDAS), cls:'',
      s:`Tráf.dim.: <b>${fmtN(T.TRAF_DIM)}</b> · Cump.Tráf: ${fmtPct(m.cumpTraf)}`},
    {k:'cat',   ico:'✂️', l:'% CAT', v:fmtPct(m.catP), cls:sem(m.catP,TH.CAT.v,TH.CAT.a,true),
      s:`Corte agente: <b>${fmtN(T.CORTE_AGENTE)}</b> llamadas`},
    {k:'tmg',   ico:'⏱️', l:'TMG Real · Var.', v:fmtSeg(m.tmgProm), cls:sem(m.tmgProm,TH.TMG.v,TH.TMG.a,true),
      s:`Meta ≤ ${fmtSeg(TH.TMG.v)} · Req.: <b>${fmtSeg(m.tmgRq)}</b> · Var: ${tmgVar>=0?'+':''}${tmgVar.toFixed(1)}%`},
    {k:'ocup',  ico:'🔄', l:'% Ocupación', v:fmtPct(m.ocup), cls:sem(m.ocup,TH.OCUP.v,TH.OCUP.a),
      s:`Ag.Real: <b>${Math.round(m.agReal)}</b> · Ag.Rq: ${Math.round(m.agRq)}`},
    {k:'agreal',ico:'👥', l:'Ag. Real · Cumpl.', v:Math.round(m.agReal), cls:m.agD>=0?'v':'r',
      s:`Cumpl. RQ: <b>${fmtPct(m.cumpRq)}</b> · RQ: ${Math.round(m.agRq)}`},
    transfCard,
    ...tarjetasTnpsOpcionales(T),
  ];
  el.innerHTML = htmlTarjetas(tarjetasPersonalizadas(elId==='kpi-strip-dia' ? 'dia' : 'int', cards), true);
  if(elId==='kpi-strip-dia') dibujarSparks();
}

/* ---------- Sparklines (solo pestaña Diario) — mismo algoritmo que 13-spark.js de ATC ---------- */
const SPARK_CFG = {
  ns:    { v:o=>M(o).ns,      mejor:1,  d:'pp',  f:v=>fmtPct(v) },
  na:    { v:o=>M(o).na,      mejor:1,  d:'pp',  f:v=>fmtPct(v) },
  recib: { v:o=>o.LLAM_RECIBIDAS||0, mejor:0,  d:'pct', f:v=>fmtN(v) },
  cat:   { v:o=>M(o).catP,    mejor:-1, d:'pp',  f:v=>fmtPct(v) },
  tmg:   { v:o=>M(o).tmgProm, mejor:-1, d:'seg', f:v=>fmtSeg(v) },
  tnps:  { v:o=>M(o).tnps,    mejor:1,  d:'pp',  f:v=>fmtPct(v) },
  ocup:  { v:o=>M(o).ocup,    mejor:1,  d:'pp',  f:v=>fmtPct(v) },
  agreal:{ v:o=>M(o).agReal,  mejor:1,  d:'pct', f:v=>Math.round(v) },
  /* La tarjeta 'transf' de Diario ahora muestra %Transf Encu (m.pEncu, mayor es mejor) — el
     sparkline sigue la misma métrica que la tarjeta, si no el chip de variación no cuadraría
     con el valor mostrado. */
  transf:{ v:o=>M(o).pEncu,  mejor:1, d:'pp',  f:v=>fmtPct(v) },
};

function _spkSerie(key){
  const cfg=SPARK_CFG[key];
  return (FILTRADO_DIARIO||[]).map(o=>{const v=cfg.v(o);return isFinite(v)?v:0;});
}
function _spkSvg(vals,color,uid,idx){
  const n=vals.length;
  if(idx===undefined||idx<0||idx>=n) idx=n-1;   // punto: la fila elegida en Diario o, si no hay, el último
  const min=Math.min(...vals), max=Math.max(...vals);
  const span=(max-min)||1;
  const W=100,H=24,pad=3;
  const px=i=>(n===1?W/2:(i/(n-1))*W);
  const py=v=>H-pad-((v-min)/span)*(H-pad*2);
  const pts=vals.map((v,i)=>px(i).toFixed(2)+','+py(v).toFixed(2));
  const area='M'+pts[0]+' '+pts.slice(1).map(p=>'L'+p).join(' ')+' L'+W+','+H+' L0,'+H+' Z';
  return {
    svg:'<svg class="spk-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+
      '<defs><linearGradient id="'+uid+'" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0" stop-color="'+color+'" stop-opacity=".38"/>'+
      '<stop offset="1" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
      '<path d="'+area+'" fill="url(#'+uid+')"/>'+
      '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="1.6" '+
      'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>',
    topPct:(py(vals[idx])/H)*100,
    leftPct:(px(idx)/W)*100,
    min, max
  };
}
function _spkChip(vals,cfg){
  if(vals.length<2) return '';
  const a=vals[vals.length-2], b=vals[vals.length-1];
  let diff,txt;
  if(cfg.d==='pp'){diff=(b-a)*100;txt=(diff>=0?'+':'')+diff.toFixed(1)+' pp';}
  else if(cfg.d==='seg'){diff=b-a;txt=(diff>=0?'+':'')+Math.round(diff)+'s';}
  else{diff=a?(b/a-1)*100:0;txt=(diff>=0?'+':'')+diff.toFixed(1)+'%';}
  const plano=Math.abs(diff)<0.05;
  const cls=(plano||cfg.mejor===0)?'spk-neutro':(diff*cfg.mejor>0?'spk-up':'spk-down');
  const flecha=plano?'→':(diff>0?'▲':'▼');
  return `<span class="spk-delta ${cls}" title="Último punto vs. anterior">${flecha} ${txt}</span>`;
}
/* Fila «minigráfico + chip de variación» que se agrega al pie de las tarjetas de Retenciones y Reporte
   Cliente. tituloDelta (opcional) reemplaza la ayuda genérica del chip por una que dice qué dos puntos compara. */
function spkFila(vals, def, uidPrefijo, tituloDelta){
  const g = _spkSvg(vals, '#fff', uidPrefijo+'-'+def.key+'-'+Math.random().toString(36).slice(2,7));
  const row = document.createElement('div');
  row.className = 'spk-row';
  row.innerHTML = `<div class="spk">${g.svg}<i class="spk-dot" style="top:${g.topPct.toFixed(1)}%;background:#fff"></i></div>${_spkChip(vals,def)}`;
  const chip = row.querySelector('.spk-delta');
  if(chip && tituloDelta) chip.title = tituloDelta;
  return row;
}

function dibujarSparks(){
  const grid=document.getElementById('kpi-strip-dia');
  if(!grid) return;
  grid.querySelectorAll('.kpi-card[data-spark]').forEach(card=>{
    const cfg=SPARK_CFG[card.dataset.spark];
    if(!cfg) return;
    const vals=_spkSerie(card.dataset.spark);
    if(vals.length<3) return;
    const valEl=card.querySelector('.kv');
    const color=valEl?getComputedStyle(valEl).color:'currentColor';
    const uid='spk-'+card.dataset.spark+'-'+Math.random().toString(36).slice(2,7);
    const sel=_diaFilaSel?(FILTRADO_DIARIO||[]).findIndex(o=>claveFilaDia(o)===_diaFilaSel):-1;
    const g=_spkSvg(vals,color,uid,sel);
    const row=document.createElement('div');
    row.className='spk-row';
    const tip=`${vals.length} días · mín ${cfg.f(g.min)} · máx ${cfg.f(g.max)}`;
    const dotPos=sel>=0?`left:calc(${g.leftPct.toFixed(1)}% - 2.5px);right:auto;`:'';
    row.innerHTML=`<div class="spk" title="${tip}">${g.svg}<i class="spk-dot" style="${dotPos}top:${g.topPct.toFixed(1)}%;background:${color}"></i></div>${_spkChip(sel>=0?vals.slice(0,sel+1):vals,cfg)}`;
    card.appendChild(row);
  });
}

function rowHTML(label,o,isTotal,estCell,tabla){
  const m=M(o);
  const meta=getTnpsMeta();
  /* Pill "TMG: Ambos/TMG Solo" (js/07-init.js:_tmgSolo). "Ambos" (default) no cambia nada de lo
     que había — celda "Real / Rq.", "—" en la fila TOTAL. "TMG Solo" muestra únicamente TMG Real
     y, a diferencia de "Ambos", SÍ calcula un total real en la fila TOTAL (m.tmgProm ya sale bien
     calculado ahí, solo que antes se mostraba "—" a propósito). "TMG Δ" no cambia con el pill. */
  const tmgCell = _tmgSolo
    ? `<td><span class="sv ${sem(m.tmgProm,TH.TMG.v,TH.TMG.a,true)}">${fmtSeg(m.tmgProm)}</span></td>`
    : (isTotal ? `<td>—</td>` : `<td>${fmtSeg(m.tmgProm)} / ${fmtSeg(m.tmgRq)}</td>`);
  const tmgDeltaCell = isTotal
    ? `<td>—</td>`
    : `<td class="${(m.tmgProm-m.tmgRq)<=0?'pos':'neg'}">${fmtSegSigned(m.tmgProm-m.tmgRq)}</td>`;
  const tmg = tmgCell + tmgDeltaCell;
  return `<tr class="${isTotal?'fila-total':''}">
    <td>${label}</td>
    ${estCell||''}
    <td><span class="sv ${sem(m.ns,TH.NS.v,TH.NS.a)}">${fmtPct(m.ns)}</span></td>
    <td><span class="sv ${sem(m.na,TH.NA.v,TH.NA.a)}">${fmtPct(m.na)}</span></td>
    <td><span class="sv ${sem(m.aban,TH.ABAN.v,TH.ABAN.a,true)}">${fmtPct(m.aban)}</span></td>
    <td>${fmtN(o.TRAF_DIM)}</td>
    <td>${fmtN(o.LLAM_RECIBIDAS)}</td>
    <td>${fmtN(o.CANT_ATENDIDA)}</td>
    <td class="${(!isTotal&&m.aban>TH.ABAN.a)?'neg':''}">${fmtN(o.CANT_ABANDONADA)}</td>
    <td>${fmtN(o.CORTE_AGENTE)}</td>
    <td><span class="sv ${sem(m.catP,TH.CAT.v,TH.CAT.a,true)}">${fmtPct(m.catP)}</span></td>
    <td><span class="sv ${sem(m.ocup,TH.OCUP.v,TH.OCUP.a)}">${fmtPct(m.ocup)}</span></td>
    <td class="${m.agReal>=m.agRq?'pos':'neg'}">${Math.round(m.agReal)}</td>
    <td>${Math.round(m.agRq)}</td>
    <td class="${m.agD>=0?'pos':'neg'}">${m.agD>=0?'+':''}${Math.round(m.agD)}</td>
    <td><span class="sv ${sem(m.util,TH.UTIL.v,TH.UTIL.a)}">${fmtPct(m.util)}</span></td>
    ${tmg}
    <td>${fmtHrs(m.hrs)}</td>
    <td>${fmtPct(m.cumpTraf)}</td>
    <td><span class="sv ${sem(m.tnps,meta/100,(meta-10)/100)}">${fmtPct(m.tnps)}</span></td>
    <td><span class="sv ${sem(m.transf,TH.TRANSF.v,TH.TRANSF.a,true)}">${fmtPct(m.transf)}</span></td>
    <td>${fmtN(m.transfTot)}</td>
    <td>${fmtN(o.TRANS_VICIO)}</td>
    <td>${fmtN(o.TRANS_IVR_123)}</td>
    <td>${fmtN(o.TRANS_OTROS_BPO)}</td>
    <td>${fmtN(o.TRANS_OTROS_GEA)}</td>
    <td>${fmtN(o.TRANS_ENCU)}</td>
    <td><span class="sv ${sem(m.pEncu,TH.PENCU.v,TH.PENCU.a)}">${fmtPct(m.pEncu)}</span></td>
    <td><span class="sv ${sem(m.ind,TH.IND.v,TH.IND.a)}">${fmtPct(m.ind)}</span></td>
    <td>${fmtPct(m.pTransVicio)}</td>
    <td>${fmtPct(m.pTransIvr)}</td>
    <td>${fmtPct(m.pTransBpo)}</td>
    <td>${fmtPct(m.pTransGea)}</td>
    <td class="${m.varTraf>=0?'pos':'neg'}">${m.varTraf>=0?'+':''}${fmtPct(m.varTraf)}</td>
    <td>${fmtN(m.enc)}</td><td>${fmtN(o.CANT_PROMOTOR||0)}</td><td>${fmtN(o.CANT_PASIVO||0)}</td><td>${fmtN(o.CANT_DETRACTOR||0)}</td>
    <td>${fmtPct(m.pProm)}</td><td>${fmtPct(m.pNeu)}</td><td><span class="sv ${m.enc?sem(m.pDet,.10,.15,true):''}">${fmtPct(m.pDet)}</span></td><td>${fmtPct(m.pResp)}</td>
  </tr>`;
}

const COLS_DIARIO = ['FECHA','CUMPL.','%NS','%NA','%ABANDONO','TRÁF.DIM','RECIBIDAS','ATENDIDAS','ABANDON.','CAT','%CAT','%OCUP','AG.REAL','AG.RQ','AG.Δ','%UTIL','TMG P/RQ','TMG Δ','HRS.PROD','CUMP.TRÁF','%TNPS','%TRANSF','TRANSF.TOT','T.VICIO','T.IVR123','T.OTRO BPO','T.OTRO GEA','TRANS.ENC','%PARTIC.','%IND.ENC','%T.VICIO','%T.IVR123','%T.OTRO BPO','%T.OTRO GEA','VAR.TRAF','ENCUESTAS','PROMOTORES','NEUTROS','DETRACTORES','%PROM.','%NEU.','%DET.','%RESP.'];

/* Orden por clic en encabezado — mismo patrón que Supervisores (09-supervisores.js:sortSup),
   pero un solo motor genérico porque Diario e Intervalos comparten las mismas columnas
   (COLS_DIARIO) y el mismo motor M(). Estado separado por tabla ('dia'/'int'). */
const TBL_SORT_KEYS = [
  (o,axisFecha)=> axisFecha ? o.FECHA : o.FRANJA_GTR,
  (o,axisFecha)=> (axisFecha?rangoApr(o):intervalApr(o)) ? 1 : 0,
  o=>M(o).ns, o=>M(o).na, o=>M(o).aban,
  o=>o.TRAF_DIM, o=>o.LLAM_RECIBIDAS, o=>o.CANT_ATENDIDA, o=>o.CANT_ABANDONADA, o=>o.CORTE_AGENTE,
  o=>M(o).catP, o=>M(o).ocup, o=>M(o).agReal, o=>M(o).agRq, o=>M(o).agD, o=>M(o).util,
  o=>M(o).tmgProm, o=>{const m=M(o);return m.tmgProm-m.tmgRq;}, o=>M(o).hrs, o=>M(o).cumpTraf, o=>M(o).tnps,
  o=>M(o).transf, o=>M(o).transfTot, o=>o.TRANS_VICIO, o=>o.TRANS_IVR_123, o=>o.TRANS_OTROS_BPO, o=>o.TRANS_OTROS_GEA,
  o=>o.TRANS_ENCU, o=>M(o).pEncu, o=>M(o).ind,
  o=>M(o).pTransVicio, o=>M(o).pTransIvr, o=>M(o).pTransBpo, o=>M(o).pTransGea,
  /* 34: Var.Tráf — última columna compartida por Diario e Intervalos (Jose, 2026-09-17 ronda 3:
     "revisa si tenemos la variación de tráfico... este KPI también debe estar en columnas KPIs").
     Va al final del bloque compartido (COLS_DIA_INT) para no correr los índices 2-33 ya en uso. */
  o=>M(o).varTraf,
  /* 35-42: TNPS completo (2026-10-08) — Encuestas, Promotores, Neutros, Detractores, %Prom., %Neu., %Det., %Resp. */
  o=>M(o).enc, o=>o.CANT_PROMOTOR||0, o=>o.CANT_PASIVO||0, o=>o.CANT_DETRACTOR||0, o=>M(o).pProm, o=>M(o).pNeu, o=>M(o).pDet, o=>M(o).pResp
];
const _tblSort = { dia:{col:null,dir:1}, int:{col:null,dir:1} };   // orden de #tbl-dia y #tbl-int (alternarOrden, 01-core.js)
function sortTabla(tabla,col){ alternarOrden(_tblSort[tabla], col); renderAll(); }

function renderTable(records,axisFecha,tbodyId,tabla){
  const tbody=document.getElementById(tbodyId);
  const colCount = tabla==='dia' ? COLS_DIARIO.length+6 : COLS_DIARIO.length;
  if(!records.length){tbody.innerHTML=`<tr><td colspan="${colCount}" style="text-align:center;padding:32px;color:var(--dim)">Sin datos para los filtros seleccionados</td></tr>`;return;}
  const ordenados = tabla ? ordenarFilas(records, _tblSort[tabla], TBL_SORT_KEYS, axisFecha) : records;
  const filas=ordenados.map(o=>{
    const ok=axisFecha?rangoApr(o):intervalApr(o);
    const html=rowHTML(axisFecha?o.FECHA_VISUAL:o.FRANJA_GTR,o,false,estTd(ok),tabla);
    /* Diario: cada fila lleva su clave para el filtro cruzado de las tarjetas (js/23-filtro-fila-diario.js). */
    return tabla==='dia' ? html.replace('<tr ', `<tr data-fila="${claveFilaDia(o)}" tabindex="0" title="Clic para filtrar las tarjetas con esta fila" `) : html;
  }).join('');
  /* dayGrain=true forzado (Jose, 2026-09-17): la fila TOTAL de Intervalos debe usar el mismo
     divisor de turno (16 franjas × días) que Diario para AG.REAL/AG.RQ, así el mismo rango de
     fechas cuadra en ambas tablas. En Diario ya salía true por inferencia (aggByFecha/Semana/Mes
     marcan _dayGrain), acá se vuelve explícito para las dos tablas. Ver 02-engine.js:M(). */
  const tot=aggAll(records, true);
  const totOk=rangoApr(tot);
  tbody.innerHTML=filas+rowHTML('▸ TOTAL',tot,true,estTd(totOk),tabla);
  if(tabla) marcarOrden(`#${tabla==='dia'?'tbl-dia':'tbl-int'} thead th.sortable`, _tblSort[tabla]);
}
