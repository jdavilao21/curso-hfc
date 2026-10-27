/* ================== 14-asesores.js — agregación y render de la pestaña Asesores ==================
   Misma fuente que Supervisores: RAW_ASESORES (hfc-supervisores), grano PERIODO+FECHA+USUARIO.
   Se agrega por asesor en vez de por supervisor — los campos sumables son idénticos a Supervisores,
   así que se reutilizan blankSup()/addIntoSup()/MSup() de 09-supervisores.js tal cual.
   Estructura de tabla y filtros calcados de la pestaña Asesores de ATC (atc_v2/js/06-asesores.js +
   index.html #tab-asesores), recortada a las columnas que HFC sí tiene datos para calcular
   (sin Obj./%Alcance/At.Umbr./≤90seg/Encuestas/Cross/No Resp./Corte Cliente/Calidad/Cuartiles —
   ninguna de esas fuentes existe hoy en KPI_ASESORES_HFC). */

function aggByAsesor(rows){
  const m={};
  rows.forEach(r=>{
    const k=r.USUARIO||'SIN USUARIO';
    if(!m[k]){
      m[k]=blankSup();
      m[k].USUARIO=k;
      m[k].NOMBRE_ASESOR=r.NOMBRE_ASESOR||'';
      m[k].SUPERVISOR=r.SUPERVISOR||'SIN SUPERVISOR';
      m[k].COORDINADOR=r.COORDINADOR||'';
      m[k].CONDICION_LAB=r.CONDICION_LAB||'';
      m[k].ESTADO='';
      m[k].ESTADO_OP='';
      m[k]._fechas=new Set();
      m[k]._estadoFecha=null;
    }
    addIntoSup(m[k],r);
    if(r.FECHA) m[k]._fechas.add(r.FECHA);
    /* Estado (activo/cese, Jose 2026-09-17) — viene de TBL_NOMINA_HFC.ESTADO ('ACTIVO'/
       'CESE'; NO confundir con ESTADO_OP, que en esa misma tabla es la modalidad de trabajo:
       REMOTO/PRESENCIAL/TELETRABAJO). Se toma el de la fecha MÁS RECIENTE del rango, no la primera
       fila que llegue: un asesor puede cesar a mitad de período y lo que importa para "¿está
       activo?" es su situación actual, no la del día 1 (confirmado con datos reales: 40 usuarios
       cambiaron de valor dentro del mismo rango de fechas consultado). ESTADO_OP (modalidad de
       trabajo, Jose 2026-09-17 ronda 3) se resuelve con el mismo criterio de fecha más reciente,
       porque viene de la misma fila/misma tabla — OJO: no está confirmado que RAW_ASESORES
       (hfc-supervisores) traiga esta columna; si el backend no la incluye, `r.ESTADO_OP`
       siempre llega undefined y el resumen de abajo lo refleja como "sin dato" en vez de asumir. */
    if(r.FECHA && (!m[k]._estadoFecha || r.FECHA>=m[k]._estadoFecha)){
      m[k].ESTADO = r.ESTADO || m[k].ESTADO || '';
      m[k].ESTADO_OP = r.ESTADO_OP || m[k].ESTADO_OP || '';
      m[k]._estadoFecha = r.FECHA;
    }
  });
  return Object.values(m).map(o=>{
    o.DIAS_GEST = o._fechas.size || 1;
    o.PROM_AT = o.CANT_ATENDIDA / o.DIAS_GEST;
    delete o._fechas;
    delete o._estadoFecha;
    return o;
  }).sort((a,b)=>b.CANT_ATENDIDA-a.CANT_ATENDIDA);
}

let FILTRADO_ASESORES = [];

/* ---------- Dona «Asesores por Estado» (ACTIVO / CESE de la nómina) ----------
   Clic en un segmento filtra la tabla, el Top 10 y el Top 5 (_asEstadoSel). Solo cuenta asesores con nómina: los que
   no tienen match (ESTADO vacío) siguen en la tabla con Estado «—», pero no entran a la dona, así que su total puede
   ser menor que el de la tabla. Cada segmento muestra su %TNPS (sumando promotores/detractores del grupo, no
   promediando los % de cada asesor). Motor común: renderDonaFiltro (20-agentes-comun.js). */
const AS_ESTADO_DEFS = [
  {q:'ACTIVO', label:'Activos', ico:'🟢', color:()=>_cssVar('--good')},
  {q:'CESE',   label:'Ceses',   ico:'🔴', color:()=>_cssVar('--bad')}
];
let _asEstadoSel = null;
function toggleAsEstado(q){ _asEstadoSel = (_asEstadoSel===q) ? null : q; renderAsesores(); }
function limpiarFiltroAsEstado(){ _asEstadoSel = null; renderAsesores(); }
function _renderFiltroChipAsEstado(){
  const def = AS_ESTADO_DEFS.find(d=>d.q===_asEstadoSel);
  pintarChip('as-filtro-chip-estado', _asEstadoSel!=null ? `🔎 Estado: ${def?def.label:_asEstadoSel}  ✕` : null);
}

const _AS_DONA_ESTADO = { chart:null, prev:undefined };
function _renderEstadoDonutAs(rows){
  const conDato = aggByAsesor(rows).filter(o=>String(o.ESTADO||'').trim()!=='');
  const buckets = {ACTIVO:[], CESE:[]};
  conDato.forEach(o=>{ buckets[estadoBucket(o.ESTADO)].push(o); });
  const tnps = {};
  AS_ESTADO_DEFS.forEach(d=>{ tnps[d.q] = buckets[d.q].length ? MSup(_sumAgg(buckets[d.q])).tnps : 0; });

  renderDonaFiltro({
    ids:{ canvas:'ch-as-estado-donut', leyenda:'as-estado-donut-leyenda', card:'as-estado-donut-card', filtro:'as-estado-donut-filtro' },
    registro:_AS_DONA_ESTADO, sel:_asEstadoSel, alTocar:toggleAsEstado, onclick:'toggleAsEstado', total:conDato.length,
    segmentos: AS_ESTADO_DEFS.map(d=>({ clave:d.q, etiqueta:d.label, color:d.color(), n:buckets[d.q].length, def:d })),
    pill: sg => `${sg.def.ico} ${sg.def.label}`,
    titulo: sg => sg.def.label,
    tooltip: (sg, n, pct) => `${sg.etiqueta}: ${n} asesor${n!==1?'es':''} (${pct}%) · TNPS ${fmtPct(tnps[sg.clave])}`,
    fila: (sg, n, pct) => `<span style="flex:1;min-width:0"><span>${sg.def.ico}</span> <span style="color:${sg.color};font-weight:800">${sg.def.label}</span></span>
        <b style="color:var(--text)">${n}</b>
        <span style="color:var(--muted);min-width:38px;text-align:right">${pct}%</span>
        <span style="color:var(--muted);min-width:56px;text-align:right">TNPS ${fmtPct(tnps[sg.clave])}</span>`
  });
}

/* ---------- Top 10 Agentes / Top 5 Supervisores por %TNPS (barraTop, 20-agentes-comun.js) ----------
   Respetan los filtros de arriba y además el de Estado y Modalidad: el %TNPS de cada supervisor sale solo de los
   asesores que quedan después de filtrar. */
let _AS_TOP10_CHART = null, _AS_TOP5SUP_CHART = null;
function _rowsPorAsEstado(rows){
  if(!_asEstadoSel) return rows;
  return rows.filter(r=>estadoBucket(r.ESTADO)===_asEstadoSel);
}
function _renderTop10AgentesAs(rows){
  if(_AS_TOP10_CHART){ try{ _AS_TOP10_CHART.destroy(); }catch(e){} }
  const items = aggByAsesor(_rowsPorAsEstadoOp(_rowsPorAsEstado(rows)))
    .map(o=>({nombre:o.NOMBRE_ASESOR||o.USUARIO, pct:MSup(o).tnps}))
    .sort((a,b)=>b.pct-a.pct).slice(0,10);
  _AS_TOP10_CHART = barraTop('ch-as-top10-agentes', items);
}
function _renderTop5SupervisoresAs(rows){
  if(_AS_TOP5SUP_CHART){ try{ _AS_TOP5SUP_CHART.destroy(); }catch(e){} }
  const items = aggBySupervisor(_rowsPorAsEstadoOp(_rowsPorAsEstado(rows)))
    .map(o=>({nombre:o.SUPERVISOR, pct:MSup(o).tnps}))
    .sort((a,b)=>b.pct-a.pct).slice(0,5);
  _AS_TOP5SUP_CHART = barraTop('ch-as-top5-sup', items);
}

/* ---------- Checkbox "Día -1" junto al filtro Fecha ----------
   Rediseño (Jose, 2026-09-18 ronda 4: "el pill de todos y día -1 no me convence... como en la
   fecha hay la opción todos ya no necesito el pill, solo un check") — reemplaza el pill de 2
   botones (Todos/Día -1) por un solo checkbox, porque el selector de Fecha ya tiene su propia
   opción "Todas" y duplicaba el concepto.
   - Desmarcado (default): comportamiento normal — Fecha queda activo/editable.
   - Marcado ("Día -1"): acumulado de todo el período hasta ayer (excluye hoy). El selector de
     Fecha se BLOQUEA (Jose: "las fechas... al activar día-1 deberían desactivarse") y se fuerza
     a su estado "Todas" — no es una fecha puntual, es el acumulado del rango completo hasta ayer.
     Solo Fecha se bloquea; Semana/Coordinador/Supervisor/Cond.Laboral/Modalidad siguen activos.
   - Al desmarcar: Fecha se reactiva y vuelve a caer en la fecha más reciente (Jose: "si lo
     desmarco se activa las fechas y se pone en la última fecha") — se fuerza limpiando
     `fechaMultiState.as` para que `poblarFechaMulti()` la recalcule desde cero, en vez de
     arrastrar el "Todas" forzado de cuando estaba marcado. */
let _asFechaCorte = 'hoy';
function setAsFechaCorte(checked){
  const modo = checked ? 'd1' : 'hoy';
  if(_asFechaCorte===modo) return;
  _asFechaCorte = modo;
  fechaMultiState.as = modo==='d1' ? {all:true, selected:new Set()} : null;
  renderAsesores();
}
/* _fechaHoyISO() / _fechaAyerISO(): en js/01-core.js (utilidades comunes). */

/* Casilla «Día -1», bloqueo de Fecha y ayuda con el rango acumulado: sincronizarDiaMenos1() (01-core.js).
   rowsPeriodo = filas del período ANTES del corte, para conocer el primer día real. */
function _actualizarTooltipFechaCorte(rowsPeriodo){
  sincronizarDiaMenos1('chk-as-dia1', 'sel-fecha-as', _asFechaCorte==='d1', rowsPeriodo.map(r=>r.FECHA));
}

/* Período de mayor a menor (Jose, 2026-09-18) — mismo cambio que ya tiene Diario, antes ascendente. */
function buildSelectPeriodoAs(){ llenarSelectPeriodo(document.getElementById('sel-periodo-as'), RAW_ASESORES.map(r=>r.PERIODO)); }

/* Fecha/Semana se puebla sobre el período activo (antes de fecha/semana/coord/supervisor).
   Fecha usa el mismo sentinel "ALL" que Intervalos/Supervisores: sin selección previa válida,
   cae por default a la fecha más reciente del período (nunca se queda pegada en "Todas"). */
function _poblarFechaSemanaAs(rows){
  poblarFechaMulti('as', rows, renderAsesores);
  const selS = document.getElementById('sel-semana-as');
  if(selS){
    const prev = selS.value;
    const sems=[...new Set(rows.map(r=>r.SEMANA))].filter(Boolean).sort();
    selS.innerHTML = '<option value="">Todas</option>' + sems.map(s=>`<option value="${s}">${s}</option>`).join('');
    if(sems.includes(prev)) selS.value = prev;
  }
}

/* Filtro Estado Operativo (Remoto/Presencial, Jose 2026-09-18 ronda 2: "agrega un filtro más por
   estado_op ... que no afecte a la etiqueta Remoto / Presencial"). Mismo campo ESTADO_OP que ya
   usa esa tarjeta (_estadoOpCardAs) — filtra la tabla y el resto del KPI strip, pero la tarjeta
   Remoto/Presencial en sí queda excluida a propósito (ver renderAsesores(): se le pasa `rows` sin
   este filtro aplicado, mismo criterio que la dona de Estado con el suyo propio
   — el widget "fuente" de una dimensión no se autofiltra por esa misma dimensión).
   `_asEstadoOpSel` es global (no solo el valor del <select>) porque Top10 Agentes/Top5
   Supervisores lo necesitan vía _rowsPorAsEstadoOp(), igual que ya hace _asEstadoSel. */
let _asEstadoOpSel = '';
function _poblarEstadoOpAs(rows){
  const sel = document.getElementById('sel-estadoop-as');
  if(!sel) return;
  const prev = sel.value;
  const vals = [...new Set(rows.map(r=>(r.ESTADO_OP||'').toString().trim().toUpperCase()).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Todos</option>' + vals.map(v=>`<option value="${v}">${v.charAt(0)+v.slice(1).toLowerCase()}</option>`).join('');
  if(vals.includes(prev)) sel.value = prev;
}
function _rowsPorAsEstadoOp(rows){
  if(!_asEstadoOpSel) return rows;
  return rows.filter(r=>(r.ESTADO_OP||'').toString().trim().toUpperCase()===_asEstadoOpSel);
}

/* Cond. Laboral — puebla sobre el período activo (Jose agregó CONDICION_LAB a la vista 2026-08-23). */
function _poblarCondAs(rows){
  const selCond = document.getElementById('sel-cond-as');
  if(!selCond) return;
  const prev = selCond.value;
  const conds = [...new Set(rows.map(r=>(r.CONDICION_LAB||'').toString().trim()).filter(Boolean))].sort();
  selCond.innerHTML = '<option value="">Todas</option>' + conds.map(c=>`<option value="${c}">${c}</option>`).join('');
  if(conds.includes(prev)) selCond.value = prev;
}

/* Contrato (OPERACIONES / OJT, Jose 2026-09-29) — TBL_NOMINA_HFC.CONTRATO, que la API manda
   en hfc-supervisores. Filtro base igual que Cond. Laboral: afecta tabla, tarjetas y donas.
   Asesores sin nómina llegan sin CONTRATO y quedan fuera al elegir un valor. */
function _poblarContratoAs(rows){
  const sel = document.getElementById('sel-contrato-as');
  if(!sel) return;
  const prev = sel.value;
  const vals = [...new Set(rows.map(r=>(r.CONTRATO||'').toString().trim().toUpperCase()).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Todos</option>' + vals.map(v=>`<option value="${v}">${v}</option>`).join('');
  if(vals.includes(prev)) sel.value = prev;
}

/* Resumen "N asesores por Cond. Laboral" — badges tipo ATC (FULL TIME/MINI FULL TIME/PART TIME/
   POSIBLE OJT + contador), solo título y cantidad (sin íconos, sin fuente de íconos externa). */
const AS_COND_ORDEN = ['FULL TIME','MINI FULL TIME','PART TIME','POSIBLE OJT'];
const AS_COND_CLS = {'FULL TIME':'cb-ft','MINI FULL TIME':'cb-mft','PART TIME':'cb-pt','POSIBLE OJT':'cb-ojt'};
function _renderCondResumenAs(porAsesor){
  const el = document.getElementById('as-cond-resumen');
  if(!el) return;
  const counts = new Map();
  porAsesor.forEach(o=>{
    const c = (o.CONDICION_LAB||'').toString().trim().toUpperCase();
    if(!c) return;
    counts.set(c, (counts.get(c)||0)+1);
  });
  if(!counts.size){ el.innerHTML=''; return; }
  const claves = [...counts.keys()].sort((a,b)=>{
    const ia=AS_COND_ORDEN.indexOf(a), ib=AS_COND_ORDEN.indexOf(b);
    if(ia===-1 && ib===-1) return a.localeCompare(b);
    if(ia===-1) return 1;
    if(ib===-1) return -1;
    return ia-ib;
  });
  el.innerHTML = claves.map(c=>{
    const cls = AS_COND_CLS[c] || 'cb-def';
    return `<span class="cond-badge ${cls}">${c}: ${counts.get(c)}</span>`;
  }).join('');
}

/* Badge de Cond. Laboral para la columna de la tabla (Jose 2026-09-17 ronda 3: "dale un color,
   Full Time verde, Part Time naranja, Mini Full Time a tu criterio") — reusa las mismas clases
   .cond-badge/AS_COND_CLS de arriba (ya usadas en el resumen "N asesores por Cond. Laboral"):
   cb-ft=verde (--good), cb-pt=ámbar/naranja (--warn), cb-mft=azul (--accent2, criterio propio),
   cb-ojt=rojo (--bad). Mismo patrón que estadoBadge() (20-agentes-comun.js). */
function condBadge(cond){
  const c = (cond||'').toString().trim().toUpperCase();
  if(!c) return '<span class="cond-badge cb-def">—</span>';
  const cls = AS_COND_CLS[c] || 'cb-def';
  return `<span class="cond-badge ${cls}">${c}</span>`;
}

/* Badge informativo con el rango de fechas que cubren los filtros activos (Período/Fecha/
   Semana/Coordinador/Supervisor/Cond.Laboral, todo lo que ya angostó `rows`). Con Semana en
   "Todas" muestra desde la primera fecha hasta la más reciente del filtro; con una semana
   puntual, el rango real de esa semana; con Fecha puntual, un solo día (min=max). */
function _renderRangoFechasAs(rows){
  const el = document.getElementById('as-rango-fechas');
  if(!el) return;
  if(!rows.length){ el.style.display='none'; return; }
  const fechas = [...new Set(rows.map(r=>r.FECHA))].filter(Boolean).sort();
  if(!fechas.length){ el.style.display='none'; return; }
  const minF = fechas[0], maxF = fechas[fechas.length-1];
  const visualDe = f => (rows.find(r=>r.FECHA===f)?.FECHA_VISUAL || f);
  el.textContent = '📅 ' + (minF===maxF ? visualDe(minF) : `${visualDe(minF)} — ${visualDe(maxF)}`);
  el.style.display = 'inline-flex';
}

/* Coordinador→Supervisor: dependiente (elegir un coordinador limita el <select> de Supervisor
   a sus propios supervisores), mismo patrón que ATC (_poblarSupAs). */
function _poblarSupCoordAs(rows){
  const selCoord=document.getElementById('sel-coord-as');
  let coordVal = '';
  if(selCoord){
    const prev=selCoord.value;
    const coords=[...new Set(rows.map(r=>r.COORDINADOR).filter(Boolean))].sort();
    selCoord.innerHTML='<option value="">Todos</option>'+coords.map(c=>`<option value="${c}">${c}</option>`).join('');
    if(coords.includes(prev)) selCoord.value=prev;
    coordVal = selCoord.value;
  }
  const selSup=document.getElementById('sel-sup-as');
  if(selSup){
    const prev=selSup.value;
    const rowsForSup = coordVal ? rows.filter(r=>r.COORDINADOR===coordVal) : rows;
    const sups=[...new Set(rowsForSup.map(r=>r.SUPERVISOR).filter(Boolean))].sort();
    selSup.innerHTML='<option value="">Todos</option>'+sups.map(s=>`<option value="${s}">${s}</option>`).join('');
    if(sups.includes(prev)) selSup.value=prev;
  }
}

/* `rowsRemotoPresencial` (Jose, 2026-09-18 ronda 2: "que no afecte a la etiqueta Remoto /
   Presencial") — set de filas específico para _estadoOpCardAs(), que excluye el filtro nuevo
   sel-estadoop-as pero SÍ respeta el filtro de Estado (comportamiento que esta tarjeta ya tenía antes
   del filtro nuevo). Si no se pasa, cae a `rows` (mismo comportamiento de siempre). */
/* Activos / Bajas en la tarjeta Asesores (Jose, 2026-09-29): mismo criterio que la dona Activos/Ceses
   (estadoBucket sobre el ESTADO más reciente del asesor en el rango); sin nómina no cuenta en ninguno. */
function _activosBajasAs(porAsesor){
  let act = 0, baj = 0;
  porAsesor.forEach(o=>{
    if(String(o.ESTADO||'').trim()==='') return;
    if(estadoBucket(o.ESTADO)==='ACTIVO') act++; else baj++;
  });
  return `<span style="color:var(--good)">Activos: <b style="color:inherit">${fmtN(act)}</b></span> · <span style="color:var(--bad)">Bajas: <b style="color:inherit">${fmtN(baj)}</b></span>`;
}
function renderKPIStripAs(rows, porAsesor, rowsRemotoPresencial){
  const el=document.getElementById('kpi-strip-as');
  if(!el) return;
  if(!rows.length){el.innerHTML='';return;}
  const T=blankSup(); rows.forEach(r=>addIntoSup(T,r));
  const m=MSup(T);
  const meta=parseFloat((document.getElementById('inp-tnps-meta-as')||{}).value)||METAS_HFC.TNPS;
  /* TNPS completo primero (foco de HFC) + tarjetas opcionales; el usuario elige cuáles ve (17-tarjetas.js). */
  const cards=[
    tarjetaTnps(T, meta),
    tarjetaCriticosAs(porAsesor),
    {k:'asesores', ico:'🎧', l:'Asesores',  v:fmtN(porAsesor.length), cls:'',
      s:_activosBajasAs(porAsesor)},
    {k:'atend', ico:'📞', l:'Atendidas', v:fmtN(T.CANT_ATENDIDA), cls:'',
      s:'Suma del período filtrado'},
    {k:'cat', ico:'✂️', l:'% CAT',     v:fmtPct(m.catP),        cls:sem(m.catP,TH.CAT.v,TH.CAT.a,true),
      s:`CAT: <b>${fmtN(T.CORTE_AGENTE)}</b> llamadas`},
    {k:'tmg', ico:'⏱️', l:'TMG',       v:fmtSeg(m.tmg),         cls:sem(m.tmg,TH.TMG.v,TH.TMG.a,true),
      s:`Promedio ponderado`},
    {k:'transf', ico:'↪️', l:'%Transf Encu', v:fmtPct(m.pEncu), cls:sem(m.pEncu,TH.PENCU.v,TH.PENCU.a),
      s:`Trans. a encuesta: <b>${fmtN(T.TRANS_ENCU)}</b> de ${fmtN(T.CANT_ATENDIDA)} atendidas`},
    _estadoOpCardAs(rowsRemotoPresencial || rows),
    ...tarjetasTnpsOpcionales(T),
  ];
  el.innerHTML = htmlTarjetas(tarjetasPersonalizadas('as', cards), false);
}

/* Tarjeta "Remoto / Presencial" (Jose 2026-09-17 ronda 3: "una etiqueta para ver el Q de asesores
   por remoto y presencial que sale de ESTADO_OP") — última tarjeta de `cards` en renderKPIStripAs().
   Cuenta por ASESOR (aggByAsesor), no por fila cruda: un asesor con varias filas en el rango no
   debe contarse varias veces. Si ESTADO_OP no trae ningún valor (columna no disponible en esta
   instalación de RAW_ASESORES — ver nota en aggByAsesor), muestra "sin dato" en vez de 0/0, para
   no aparentar que la modalidad de todos es cero. Muestra cualquier categoría adicional que
   aparezca (p.ej. TELETRABAJO) en el subtítulo, no solo Remoto/Presencial. */
function _estadoOpCardAs(rows){
  return _estadoOpCardDesdePorAs(aggByAsesor(rows));
}
/* Misma tarjeta pero recibiendo filas YA agregadas por asesor (aggByAsesor). */
function _estadoOpCardDesdePorAs(porAs){
  const counts = new Map();
  porAs.forEach(o=>{
    const v = (o.ESTADO_OP||'').toString().trim().toUpperCase();
    if(!v) return;
    counts.set(v, (counts.get(v)||0)+1);
  });
  const conDato = [...counts.values()].reduce((a,b)=>a+b,0);
  if(!conDato){
    return {k:'modalidad', ico:'🛰️', l:'Remoto / Presencial', v:'—', cls:'',
      s:'Sin dato de modalidad (ESTADO_OP) en este período'};
  }
  const remotoN = counts.get('REMOTO')||0, presN = counts.get('PRESENCIAL')||0;
  /* %Participación de cada modalidad (Jose, 2026-09-18: "dice que hay 64 remotos de 92 y quiero
     su participación, lo mismo para presencial") — sobre `conDato` (asesores CON dato de
     ESTADO_OP), no sobre el total de asesores del período, mismo criterio que ya usa este mismo
     bloque para "de N asesores con dato". */
  const pRemoto = conDato ? remotoN/conDato : 0, pPres = conDato ? presN/conDato : 0;
  const extra = [...counts.entries()].filter(([k])=>k!=='REMOTO'&&k!=='PRESENCIAL');
  const extraTxt = extra.map(([k,n])=>`${k.charAt(0)+k.slice(1).toLowerCase()}: <b>${fmtN(n)}</b>`).join(' · ');
  return {k:'modalidad', ico:'🛰️', l:'Remoto / Presencial', v:`${fmtN(remotoN)} / ${fmtN(presN)}`, cls:'',
    s:`Remoto: <b>${fmtPct(pRemoto)}</b> · Presencial: <b>${fmtPct(pPres)}</b> · de <b>${fmtN(conDato)}</b> asesores${extraTxt?' · '+extraTxt:''}`};
}

/* Orden por clic en encabezado — mismo patrón que Supervisores (09-supervisores.js:sortSup). Índices de columna:
   0 Usuario · 1 Nombre · 2 Cond. Laboral · 3 Estado · 4 Atendidas · 5 Días · 6 Prom.At. · 7 TMG Real · 8 Cat.Ag. ·
   9 %Cat.Ag. · 10 Promotor · 11 Detractor · 12 Pasivo · 13 %TNPS · 14 %Transf · 15 Transf.Tot · 16 T.Vicio ·
   17 T.IVR123 · 18 T.Otro BPO · 19 T.Otro GEA · 20 %Corte Cl. · 21 Trans.Enc · 22 %Transf Encu. · 23 %Ind.Enc ·
   24 %T.Vicio · 25 %T.IVR123 · 26 %T.Otro BPO · 27 %T.Otro GEA · 28 Encuestas · 29 %Prom. · 30 %Neu. · 31 %Det. ·
   32 %Resp. · 33 Cuartil TNPS · 34 % de Detract. · 35 Días crít.
   Una columna nueva conviene agregarla al final: insertar en medio corre los índices (y obliga a subir la versión de
   lsKey en 10-columnas.js). */
const ORDEN_AS = {col:null, dir:1};          // columna/dirección del orden de #tbl-as (alternarOrden, 01-core.js)
const AS_SORT_KEYS=[
  o=>o.USUARIO||'',
  o=>o.NOMBRE_ASESOR||'',
  o=>o.CONDICION_LAB||'',
  o=>o.ESTADO||'',
  o=>o.CANT_ATENDIDA,
  o=>o.DIAS_GEST,
  o=>o.PROM_AT,
  o=>MSup(o).tmg,
  o=>o.CORTE_AGENTE,
  o=>MSup(o).catP,
  o=>o.CANT_PROMOTOR,
  o=>o.CANT_DETRACTOR,
  o=>o.CANT_PASIVO,
  o=>MSup(o).tnps,
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
  /* 28-32: TNPS completo (2026-10-08) */
  o=>MSup(o).enc, o=>MSup(o).pProm, o=>MSup(o).pNeu, o=>MSup(o).pDet, o=>MSup(o).pResp,
  /* 33-35: análisis TNPS (Fase 2, 18-tnps-asesores.js) */
  /* envueltas en o=>…: 18-tnps-asesores.js se carga después de este archivo */
  o=>ordenCuartilTnps(o), o=>aporteDetractores(o), o=>diasCriticos(o).crit
];
function sortAs(col){ alternarOrden(ORDEN_AS, col); renderAsesores(); }
const aplicarSortAs = filas => ordenarFilas(filas, ORDEN_AS, AS_SORT_KEYS);   // también lo usa js/06-export.js

/* Resalta con borde de acento (.filtro-activo, css/estilos.css) los <select> de la barra de
   filtros que tienen un valor distinto de su default "Todos/Todas" (Jose, 2026-09-18: "que se
   muestre qué filtro estoy aplicando"). No incluye Período (siempre trae un período puntual por
   diseño) ni Fecha (ya muestra su estado en el botón "📅 ..."), ni Estado (ya tiene su chip `as-filtro-chip-estado`). */
function _marcarFiltrosActivosAs(){
  ['sel-semana-as','sel-coord-as','sel-sup-as','sel-cond-as','sel-estadoop-as','sel-contrato-as'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.toggle('filtro-activo', !!el.value);
  });
}

/* "↺ Restablecer filtros" (Jose, 2026-09-18: "los de arriba" + "los que se generan con los
   gráficos") — vuelve a los defaults tanto los <select>/buscador/Día-1 de la barra como los
   filtros cruzados que nacen de un clic en la dona de Estado. Período queda afuera a
   propósito: no es un filtro "apagable", siempre trae un período puntual por diseño (igual
   criterio que _marcarFiltrosActivosAs(), que tampoco lo resalta). Fecha vuelve a su default
   (la fecha más reciente) limpiando `fechaMultiState.as` — mismo mecanismo que ya usa
   setAsFechaCorte() al desmarcar Día -1. */
function resetFiltrosAs(){
  ['sel-semana-as','sel-coord-as','sel-sup-as','sel-cond-as','sel-estadoop-as','sel-contrato-as'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  const buscar = document.getElementById('txt-buscar-as');
  if(buscar) buscar.value = '';
  _asFechaCorte = 'hoy';
  fechaMultiState.as = null;
  _asEstadoSel = null;
  _asTnpsSel = null;
  renderAsesores();
}

function rowHTMLAs(o,isTotal){
  const m=MSup(o);
  const meta=parseFloat((document.getElementById('inp-tnps-meta-as')||{}).value)||METAS_HFC.TNPS;
  return `<tr class="${isTotal?'fila-total':''}">
    <td style="text-align:left">${isTotal?'▸ TOTAL':(o.USUARIO||'—')}</td>
    <td style="text-align:left">${isTotal?'':(o.NOMBRE_ASESOR||'—')}</td>
    <td style="text-align:left">${isTotal?'':condBadge(o.CONDICION_LAB)}</td>
    <td>${isTotal?'':estadoBadge(o.ESTADO)}</td>
    <td>${fmtN(o.CANT_ATENDIDA)}</td>
    <td>${fmtN(o.DIAS_GEST)}</td>
    <td>${(o.PROM_AT||0).toFixed(1)}</td>
    <td><span class="sv ${sem(m.tmg,TH.TMG.v,TH.TMG.a,true)}">${fmtSeg(m.tmg)}</span></td>
    <td>${fmtN(o.CORTE_AGENTE)}</td>
    <td><span class="sv ${sem(m.catP,TH.CAT.v,TH.CAT.a,true)}">${fmtPct(m.catP)}</span></td>
    <td>${fmtN(o.CANT_PROMOTOR)}</td>
    <td>${fmtN(o.CANT_DETRACTOR)}</td>
    <td>${fmtN(o.CANT_PASIVO)}</td>
    <td><span class="sv ${sem(m.tnps,meta/100,(meta-10)/100)}">${fmtPct(m.tnps)}</span></td>
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
    <td>${cuartilTnpsBadge(o)}</td><td>${fmtPct(aporteDetractores(o))}</td><td>${isTotal ? '—' : diasCriticosHTML(o)}</td>
  </tr>`;
}

function renderTableAs(porAsesor, totalRow){
  const tbody=document.getElementById('tbody-as');
  if(!tbody) return;
  if(!porAsesor.length){tbody.innerHTML='<tr><td colspan="36" style="text-align:center;padding:32px;color:var(--dim)">Sin datos para los filtros seleccionados</td></tr>';return;}
  const filas=porAsesor.map(o=>rowHTMLAs(o,false)).join('');
  tbody.innerHTML=filas+rowHTMLAs(totalRow,true);
}

/* ── Render de la pestaña Asesores ──
   Orden (importa: cada paso usa el resultado del anterior):
   1) _asFiltrosBarra   — Período, «Día -1», Fecha/Semana, Coordinador/Supervisor/Cond. Laboral (y repuebla los
                          selectores que dependen de los anteriores).
   2) gráficos          — dona de Estado y Top 10 / Top 5 sobre las filas del paso 1, SIN su propio filtro ni el
                          buscador (son el punto de partida para filtrar).
   3) _asFiltrosPropios — Estado, Estado operativo, buscador y orden de la tabla.
   4) _asTotal          — fila TOTAL.
   5) pintar            — tarjetas KPI, resumen por condición, rango de fechas, tabla, chips y encabezado. */
function renderAsesores(){
  const f = _asFiltrosBarra();
  FILTRADO_ASESORES = f.rows;
  prepararTnpsAsesores(f.rows);          // detractores totales y días críticos del período (18-tnps-asesores.js)

  renderDonaTnpsAs(f.rows);
  _renderEstadoDonutAs(f.rows);
  _renderTop10AgentesAs(f.rows);
  _renderTop5SupervisoresAs(f.rows);
  renderTopDetractoresAs(f.rows);

  const a = _asFiltrosPropios(f.rows);
  const { total, rowsTotal } = _asTotal(f.rows, a);

  renderKPIStripAs(rowsTotal, a.porAsesor, a.rowsRemotoPresencial);
  _renderCondResumenAs(a.porAsesor);
  _renderRangoFechasAs(f.rows);
  renderTableAs(a.porAsesor, total);
  _renderFiltroChipAsEstado();
  _renderFiltroChipAsTnps();
  _marcarFiltrosActivosAs();
  marcarOrden('#tbl-as thead th.sortable', ORDEN_AS);
  _asEncabezado(f, a.porAsesor, total);
}

/* 1) Filtros de la barra superior. Devuelve { rows, selP, fechasSel }. */
function _asFiltrosBarra(){
  let rows = RAW_ASESORES;
  const selP = document.getElementById('sel-periodo-as');
  if(selP && selP.value && selP.value!=='ALL') rows = rows.filter(r=>String(r.PERIODO)===String(selP.value));

  // Rango real para el tooltip del checkbox Día -1: se calcula sobre `rows` recién filtradas por
  // Período, ANTES del corte de abajo (así el inicio del rango sigue siendo el primer día real
  // del período aunque el corte ya esté aplicado más abajo).
  const rowsPeriodoAs = rows;

  // Corte "Día -1": acota `rows` a hasta ayer ANTES de poblar Fecha, así el día de hoy no aparece
  // ni como opción del selector.
  if(_asFechaCorte==='d1'){
    const ayer = _fechaAyerISO();
    rows = rows.filter(r=>String(r.FECHA).slice(0,10)<=ayer);
  }

  // Fecha/Semana dependen del período activo (repobla conservando selección). Fecha usa el
  // sentinel "ALL" (no cadena vacía) para "Todas" — ver _poblarFechaSemanaAs.
  _poblarFechaSemanaAs(rows);
  // Sincroniza el checkbox y bloquea/desbloquea el selector de Fecha DESPUÉS de poblarlo — si se
  // hiciera antes, _poblarFechaSemanaAs() reconstruye el <button> del selector (innerHTML) y se
  // perdería el disabled/title recién puesto.
  _actualizarTooltipFechaCorte(rowsPeriodoAs);
  const fechasSel = fechasElegidas('as');
  const semSel   = (document.getElementById('sel-semana-as')||{}).value || '';
  if(fechasSel) rows = rows.filter(r=>fechasSel.has(r.FECHA));
  if(semSel)   rows = rows.filter(r=>r.SEMANA===semSel);

  // Coordinador→Supervisor y Cond. Laboral dependen de período+fecha+semana activos.
  _poblarSupCoordAs(rows);
  _poblarCondAs(rows);
  _poblarEstadoOpAs(rows);
  _poblarContratoAs(rows);
  const supSel   = (document.getElementById('sel-sup-as')||{}).value   || '';
  const coordSel = (document.getElementById('sel-coord-as')||{}).value || '';
  const condSel  = (document.getElementById('sel-cond-as')||{}).value  || '';
  if(supSel)   rows = rows.filter(r=>r.SUPERVISOR===supSel);
  if(coordSel) rows = rows.filter(r=>r.COORDINADOR===coordSel);
  if(condSel)  rows = rows.filter(r=>(r.CONDICION_LAB||'').toString().trim()===condSel);
  const contratoSel = (document.getElementById('sel-contrato-as')||{}).value || '';
  if(contratoSel) rows = rows.filter(r=>(r.CONTRATO||'').toString().trim().toUpperCase()===contratoSel);
  return { rows, selP, fechasSel };
}

/* 3) Filtros propios de la pestaña y orden. Devuelve { porAsesorFull, porAsesor, rowsRemotoPresencial, estadoOpSel }:
   porAsesorFull = con Estado/Estado operativo (base del TOTAL); porAsesor = además buscador y orden. */
function _asFiltrosPropios(rows){
  let porAsesorFull = aggByAsesor(rows);
  if(_asEstadoSel) porAsesorFull = porAsesorFull.filter(o=>estadoBucket(o.ESTADO)===_asEstadoSel);
  if(_asTnpsSel)   porAsesorFull = porAsesorFull.filter(o=>cuartilTnps(o).q===_asTnpsSel);

  // Filas para la tarjeta Remoto/Presencial (Jose, 2026-09-18 ronda 2): snapshot ANTES del filtro
  // sel-estadoop-as, tomado acá porque `porAsesorFull` todavía no lo tiene aplicado — sí respeta
  // el filtro de Estado (comportamiento que la tarjeta ya tenía). Ver renderKPIStripAs().
  const usuariosSinEstadoOp = new Set(porAsesorFull.map(o=>o.USUARIO));
  const rowsRemotoPresencial = (_asEstadoSel || _asTnpsSel) ? rows.filter(r=>usuariosSinEstadoOp.has(r.USUARIO||'SIN USUARIO')) : rows;

  const estadoOpSel = (document.getElementById('sel-estadoop-as')||{}).value || '';
  _asEstadoOpSel = estadoOpSel;
  if(estadoOpSel) porAsesorFull = porAsesorFull.filter(o=>(o.ESTADO_OP||'').toString().trim().toUpperCase()===estadoOpSel);

  const buscarTxt = (document.getElementById('txt-buscar-as')||{}).value?.trim().toUpperCase() || '';
  let porAsesor = buscarTxt
    ? porAsesorFull.filter(o=>(o.NOMBRE_ASESOR||'').toUpperCase().includes(buscarTxt) || (o.USUARIO||'').toUpperCase().includes(buscarTxt))
    : porAsesorFull;
  porAsesor = aplicarSortAs(porAsesor);
  return { porAsesorFull, porAsesor, rowsRemotoPresencial, estadoOpSel };
}

/* 4) Fila TOTAL: respeta Estado y Estado operativo (no el buscador). Se recalcula desde las filas día×usuario de los asesores que calzan (no desde
   porAsesorFull), porque blankSup()/addIntoSup() suman fila a fila. Devuelve { total, rowsTotal }. */
function _asTotal(rows, a){
  const usuariosFiltro = (_asEstadoSel || _asTnpsSel || a.estadoOpSel) ? new Set(a.porAsesorFull.map(o=>o.USUARIO)) : null;
  const rowsTotal = usuariosFiltro ? rows.filter(r=>usuariosFiltro.has(r.USUARIO||'SIN USUARIO')) : rows;
  const total = blankSup(); rowsTotal.forEach(r=>addIntoSup(total,r));
  total.DIAS_GEST = new Set(rowsTotal.map(r=>r.FECHA)).size || 1;
  total.PROM_AT = total.CANT_ATENDIDA / total.DIAS_GEST;
  return { total, rowsTotal };
}

/* 5b) Encabezado: pill del período y subtítulo «N asesores · fecha · atendidas» (mismo patrón que ATC). */
function _asEncabezado({ rows, selP, fechasSel }, porAsesor, total){
  const pillAs = document.getElementById('as-periodo-pill');
  if(pillAs) pillAs.textContent = (selP && selP.value==='ALL') ? 'Todos los períodos' : (selP?selP.value:'—');
  const subAs = document.getElementById('as-subtitulo');
  if(subAs){
    const fechaLabel = fechasSel ? (fechasSel.size===1 ? (rows.find(r=>r.FECHA===[...fechasSel][0])?.FECHA_VISUAL || [...fechasSel][0]) : `${fechasSel.size} fechas`)
      : (selP && selP.value==='ALL' ? 'Todos los períodos' : (selP?selP.value:'—'));
    subAs.textContent = `${porAsesor.length} asesor${porAsesor.length!==1?'es':''} · ${fechaLabel} · ${fmtN(total.CANT_ATENDIDA)} atendidas`;
  }
}
