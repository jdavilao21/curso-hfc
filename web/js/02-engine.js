/* ================== 02-engine.js — Formatters, umbrales, motor de KPIs ==================
   KPIs replicados 1:1 de ATC V2 donde la estructura de datos es la misma.
   Ver memoria del proyecto (project-kpis.md) para la comparación completa ATC vs HFC. */

const fmtPct = v=>(v*100).toFixed(2)+'%';
const fmtN   = v=>Math.round(parseFloat(v)||0).toLocaleString('es-PE');
const fmtHrs = v=>{const p=(v||0).toFixed(1).split('.');p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return p.join('.');};
const fmtSeg = s=>{s=Math.round(s||0);const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return [h,m,sc].map(x=>String(x).padStart(2,'0')).join(':');};
const fmtSegSigned = s=>{const sign=s<0?'-':'+';s=Math.abs(Math.round(s||0));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return sign+[h,m,sc].map(x=>String(x).padStart(2,'0')).join(':');};

/* 'v'=verde 'a'=amarillo 'r'=rojo */
const sem=(val,verde,amarillo,inv=false)=>{
  if(inv){if(val<=verde)return 'v';if(val<=amarillo)return 'a';return 'r';}
  if(val>=verde)return 'v';if(val>=amarillo)return 'a';return 'r';
};

/* Umbrales — NS/NA confirmados por Jose; resto heredado de ATC/CROSS como punto de partida */
/* Objetivos de la campaña HFC (Jose, 08-oct-2026): TNPS 85 % · Transferencia (a encuesta) 75 % · TMG 550 s.
   Reductores: Utilización 95 % · Ocupación 79 % · NS 85 % · NA 95 % (Absentismo 8 % y «Por programación 6.6» aún no
   tienen dato en el sistema). Es el ÚNICO lugar donde se definen: los umbrales TH de abajo y la «Meta TNPS %» de cada
   pestaña salen de aquí. La API (projects/hfc.py, hfc-mi-panel) repite TNPS, TMG y Transferencia para el panel del asesor. */
const METAS_HFC = { TNPS:85, TRANSF_ENCU:75, TMG_SEG:550, UTIL:95, OCUP:79, NS:85, NA:95 };

const TH={
  NS:{v:METAS_HFC.NS/100,a:.80}, NA:{v:METAS_HFC.NA/100,a:.90}, ABAN:{v:.03,a:.05,inv:true},
  CAT:{v:.02,a:.04,inv:true}, OCUP:{v:METAS_HFC.OCUP/100,a:METAS_HFC.OCUP/100-.10}, UTIL:{v:METAS_HFC.UTIL/100,a:.85},
  TNPS:{v:METAS_HFC.TNPS/100,a:METAS_HFC.TNPS/100-.10},
  /* TMG en segundos, menor es mejor: verde ≤ meta · ámbar hasta +50 s · rojo más. */
  TMG:{v:METAS_HFC.TMG_SEG,a:METAS_HFC.TMG_SEG+50,inv:true},
  /* %Ind.Enc — mismo umbral de referencia que ATC (sfSem(val,0.75,0.70,0.60)), mayor=mejor. */
  IND:{v:.75,a:.70},
  /* %Transf Encu. (antes "%Partic.") — mayor es mejor: de las atendidas, cuántas llegaron a
     ofrecer encuesta. Meta de la campaña (Jose, 08-oct-2026): 75 % · ámbar desde 65 %. */
  PENCU:{v:METAS_HFC.TRANSF_ENCU/100,a:METAS_HFC.TRANSF_ENCU/100-.10},
  /* %Transferencia — menor es mejor (Jose, 2026-08-31): transferir es indicio de no resolución
     en el mismo contacto. Umbral PROVISIONAL, sin validar con datos reales — ajustar con Jose. */
  TRANSF:{v:.05,a:.10,inv:true},
  /* %Corte Cliente — mismo umbral que usa ATC para CORTE_CLIENTE (atc_v2/js/06-asesores.js:
     sfSemInv(val,0.05,0.10,0.15)). HFC solo tiene 2 tramos (sem() es verde/ámbar/rojo,
     no 3 cortes explícitos como ATC) — se usa el mismo par verde/ámbar, el rojo queda desde >10%
     en vez de >15% de ATC (más estricto). Solo aplica a Supervisores/Asesores, igual que ATC. */
  CORTE_CLIENTE:{v:.05,a:.10,inv:true},
  /* Umbrales de Control de Tiempos (pestaña Horas) — provisionales, heredados de ATC como
     punto de partida. Distintos de OCUP/UTIL de arriba (esos son a nivel franja/AGENTE_NETO,
     estos son a nivel agente-día/TMP_*, escalas y semántica distintas). */
  OCUP_H:{v:.70,a:.55}, ADH_H:{v:.85,a:.70}, UTIL_H:{v:.85,a:.70}, ADHJ_H:{v:.75,a:.60}
};

/* Regla de aprobación CUMPL. del panel viejo de HFC (NO es la de ATC — se probó
   copiar la de ATC por NS/varTráfico y no cuadraba con lo que Jose validó originalmente):
   se basa solo en AG.REAL vs AG.RQ, por franja. Ver hfc.md §3.7. */
const CUMP_RQ_OK  = 0.95;

/* Campos sumables del motor */
const SUMK=['LLAM_RECIBIDAS','CANT_ATENDIDA','CANT_ABANDONADA','TRANS_ENCU','ATENDIDA_UMBR',
  'ENCU_CAL','CANT_PROMOTOR','CANT_DETRACTOR','CANT_PASIVO','TRAF_DIM','CORTE_AGENTE',
  'AGENT_DIM','AGENTE_BR','AGENTE_NETO','AGENTE_NETO_IDLE','TMP_PROD','TMP_HABLADO',
  'TMG_TOTAL_SEG','TMG_DIM','HORAS_DIM','MENOR_90SEG',
  'TRANS_VICIO','TRANS_IVR_123','TRANS_OTROS_BPO','TRANS_OTROS_GEA'];

function blank(){const o={};SUMK.forEach(k=>o[k]=0);o._nf=0;o._apr=0;o._tot=0;o._days=new Set();o._dayGrain=false;return o;}
function addInto(o,r){
  SUMK.forEach(k=>o[k]+=(parseFloat(r[k])||0));
  o._nf+=(r._nf||1);
  if(r._days instanceof Set){ r._days.forEach(d=>o._days.add(d)); }
  else if(r.FECHA){ o._days.add(r.FECHA); }
}

/* Plegado de intervalos: hasta el 13-jul-2026 solo 08:00–17:30 (20 franjas);
   <08:00 se suma a 08:00 y >17:30 se suma a 17:30. Desde el 13-jul: 36 franjas completas. */
function foldIntervals(rows){
  const CUT='2026-07-13';
  const FK=SUMK.filter(k=>k!=='HORAS_DIM').concat(['HORAS_DIM']);
  const keep=[],m={};
  (rows||[]).forEach(r=>{
    if(String(r.FECHA)>=CUT){keep.push(r);return;}
    let fr=String(r.FRANJA_GTR||'').trim().slice(0,5);
    if(!fr) return;
    if(fr<'08:00')fr='08:00'; else if(fr>'17:30')fr='17:30';
    const k=r.FECHA+'|'+fr;
    if(!m[k]){m[k]=Object.assign({},r,{FRANJA_GTR:fr});FK.forEach(x=>m[k][x]=0);}
    FK.forEach(x=>m[k][x]+=(parseFloat(r[x])||0));
  });
  return keep.concat(Object.values(m));
}

/* Intervalo aprobado = AGENTE_NETO_IDLE/AGENT_DIM >= 95% (AG.REAL cubre el AG.RQ dimensionado
   de esa franja). Sin AG.RQ dimensionado (AGENT_DIM<=0) se asume OK — no hay con qué comparar. */
function intervalApr(r){
  const dim=parseFloat(r.AGENT_DIM)||0, idle=parseFloat(r.AGENTE_NETO_IDLE)||0;
  if(dim<=0) return true;
  return (idle/dim) >= CUMP_RQ_OK;
}
function estTd(ok){return `<td><span class="estado ${ok?'ap':'des'}">${ok?'APROB.':'DESAPROB.'}</span></td>`;}

function aggByFecha(rows){
  const m={};
  rows.forEach(r=>{
    const k=r.FECHA;
    if(!m[k]){m[k]=blank();m[k].PERIODO=r.PERIODO;m[k].FECHA=r.FECHA;m[k].FECHA_VISUAL=r.FECHA_VISUAL;m[k].SEMANA=r.SEMANA;m[k]._dayGrain=true;}
    addInto(m[k],r);
    if(intervalApr(r))m[k]._apr++;
    m[k]._tot++;
  });
  return Object.values(m).sort((a,b)=>a.FECHA<b.FECHA?-1:1);
}
/* dayGrain: si se pasa explícito, fuerza el modo (true=Diario/Semana/Mes, false=Intervalos).
   Si se omite, se infiere del primer record (los buckets de aggByFecha/Semana/Mes ya vienen
   marcados) — cubre el caso de re-agregar buckets ya aggregados (ej. TOTAL de una tabla). */
function aggAll(records, dayGrain){
  const o=blank();
  o._dayGrain = dayGrain!==undefined ? dayGrain : !!(records[0] && records[0]._dayGrain);
  records.forEach(r=>{addInto(o,r);if(r._apr!==undefined){o._apr+=r._apr;o._tot+=r._tot;}else{if(intervalApr(r))o._apr++;o._tot++;}});
  return o;
}

function aggBySemana(rows){
  const m={};
  rows.forEach(r=>{
    const k=r.PERIODO+'|'+r.SEMANA;
    if(!m[k]){m[k]=blank();m[k].PERIODO=r.PERIODO;m[k].SEMANA=r.SEMANA;m[k].FECHA=r.FECHA;m[k].FECHA_VISUAL=r.SEMANA;m[k]._dayGrain=true;}
    addInto(m[k],r);
    if(intervalApr(r))m[k]._apr++;
    m[k]._tot++;
    if(r.FECHA<m[k].FECHA) m[k].FECHA=r.FECHA;
  });
  return Object.values(m).sort((a,b)=>a.SEMANA<b.SEMANA?-1:1);
}

function aggByFranja(rows){
  const m={};
  rows.forEach(r=>{
    const k=(r.FRANJA_GTR||'').toString().trim().slice(0,5);
    if(!k) return;
    if(!m[k]){m[k]=blank();m[k].FRANJA_GTR=k;m[k].FECHA_VISUAL=k;}
    addInto(m[k],r);
    if(intervalApr(r))m[k]._apr++;
    m[k]._tot++;
  });
  return Object.values(m).sort((a,b)=>a.FRANJA_GTR<b.FRANJA_GTR?-1:1);
}

const MESES_CORTOS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_LARGO=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function labelMes(periodo){
  const p=String(periodo);
  return `${MESES_LARGO[+p.slice(4,6)-1]||'—'} ${p.slice(0,4)}`;
}
function aggByMes(rows){
  const m={};
  rows.forEach(r=>{
    const k=String(r.PERIODO);
    if(!m[k]){m[k]=blank();m[k].PERIODO=r.PERIODO;m[k].FECHA=r.FECHA;m[k].FECHA_VISUAL=labelMes(r.PERIODO);m[k]._dayGrain=true;}
    addInto(m[k],r);
    if(intervalApr(r))m[k]._apr++;
    m[k]._tot++;
    if(r.FECHA<m[k].FECHA) m[k].FECHA=r.FECHA;
  });
  return Object.values(m).sort((a,b)=>a.PERIODO<b.PERIODO?-1:1);
}

/* Día/rango aprobado si >=95% de sus intervalos lo están — regla del panel viejo (hfc.md §3.7),
   no la proporción 27/36 de ATC que se había copiado por error. */
const DIA_APR_RATIO = 0.95;
function rangoApr(o){ return o._tot>0 ? (o._apr/o._tot)>=DIA_APR_RATIO : true; }

function trimTrailingEmpty(rows){
  let li=-1;
  for(let j=rows.length-1;j>=0;j--){if((parseFloat(rows[j].LLAM_RECIBIDAS)||0)>0||(parseFloat(rows[j].CANT_ATENDIDA)||0)>0){li=j;break;}}
  return li>=0?rows.slice(0,li+1):rows;
}

/* Motor grano-agnóstico: calcula todos los KPIs desde los acumulados */
/* Divisor de Ag.Real/Ag.Rq — jornada completa (16 franjas de 30min = 8h), igual que ATC
   (atc_v2/js/02-diario.js: r.AGENTE_NETO_IDLE/(16*dias)). Jose, 2026-08-31: "como está ATC" —
   confirmado que ATC usa un 16 FIJO (jornada de 8h, no la cantidad real de franjas operadas),
   distinto del `nf` dinámico que ya usa TMG_DIM/nf (ese no cambia, sigue igual).
   Corrección (Jose, 2026-09-17): "AG.REAL y AG.RQ deben ser lo mismo en un día que en
   Intervalos" — antes el KPI strip y la fila TOTAL de Intervalos forzaban `_dayGrain=false`
   (divisor = nf, la cantidad real de franjas cargadas ese rango, ej. 36/día), mientras Diario
   usaba el 16 fijo para el mismo rango de fechas: dos resultados distintos para el mismo día.
   Ahora `renderKPIStrip()` y la fila TOTAL de `renderTable()` (04-diario.js) fuerzan
   `_dayGrain=true` en AMBAS pestañas, así el divisor 16×días es el mismo en Diario e Intervalos.
   Esto NO cambia las filas individuales de franja de Intervalos (aggByFranja, `_dayGrain` queda
   `false` ahí): esas siguen usando `nf` = cantidad de días con esa franja — es un promedio por
   franja específica entre días, un cálculo distinto al total del día/rango, y no es lo que había
   que igualar. */
const FRANJAS_TURNO = 16;
/* TNPS completo (Jose, 2026-10-08: «este sistema tiene mucho foco en el TNPS: promotores, detractores y neutros»).
   Neutros = CANT_PASIVO. Encuestas = respondidas (P + N + D). %Respuesta = encuestas ÷ transferidas a encuesta
   (TRANS_ENCU = respondidas + NO_RESPONDIO, verificado en BD_HFC: 1,345 = 728 + 617). Lo usan M() y MSup(). */
function tnpsDe(o){
  const P = +o.CANT_PROMOTOR||0, N = +o.CANT_PASIVO||0, D = +o.CANT_DETRACTOR||0, enc = P+N+D, trans = +o.TRANS_ENCU||0;
  return { prom:P, neu:N, det:D, enc, trans,
    tnps:  enc>0 ? (P-D)/enc : 0,
    pProm: enc>0 ? P/enc : 0, pNeu: enc>0 ? N/enc : 0, pDet: enc>0 ? D/enc : 0,
    pResp: trans>0 ? Math.min(1, enc/trans) : 0 };
}

function M(o){
  const T = tnpsDe(o);
  const nf=o._nf||1;
  const dias=(o._days&&o._days.size)?o._days.size:1;
  const agDiv = o._dayGrain ? (FRANJAS_TURNO*dias) : nf;
  const varTraf = o.TRAF_DIM>0 ? (o.LLAM_RECIBIDAS/o.TRAF_DIM - 1) : 0;
  const cumpTraf = o.TRAF_DIM>0 ? o.LLAM_RECIBIDAS/o.TRAF_DIM : 0;
  return {
    ns:  o.LLAM_RECIBIDAS>0?o.ATENDIDA_UMBR/o.LLAM_RECIBIDAS:0,
    na:  o.LLAM_RECIBIDAS>0?o.CANT_ATENDIDA/o.LLAM_RECIBIDAS:0,
    aban:o.LLAM_RECIBIDAS>0?o.CANT_ABANDONADA/o.LLAM_RECIBIDAS:0,
    catP:o.CANT_ATENDIDA>0?o.CORTE_AGENTE/o.CANT_ATENDIDA:0,
    p90: o.CANT_ATENDIDA>0?o.MENOR_90SEG/o.CANT_ATENDIDA:0,
    ocup:o.AGENTE_NETO_IDLE>0?o.AGENTE_NETO/o.AGENTE_NETO_IDLE:0,
    util:o.AGENTE_BR>0?o.AGENTE_NETO_IDLE/o.AGENTE_BR:0,
    tnps:T.tnps, enc:T.enc, pProm:T.pProm, pNeu:T.pNeu, pDet:T.pDet, pResp:T.pResp,
    ind: (o.TRANS_ENCU+o.ENCU_CAL)>0?o.TRANS_ENCU/(o.TRANS_ENCU+o.ENCU_CAL):0,
    /* %Participación — de las atendidas, cuántas fueron transferidas a encuesta. */
    pEncu: o.CANT_ATENDIDA>0?o.TRANS_ENCU/o.CANT_ATENDIDA:0,
    varTraf, cumpTraf,
    cumpRq: o.AGENT_DIM>0?o.AGENTE_NETO_IDLE/o.AGENT_DIM:1,
    agReal:o.AGENTE_NETO_IDLE/agDiv,
    agRq:o.AGENT_DIM/agDiv,
    agD:(o.AGENTE_NETO_IDLE-o.AGENT_DIM)/agDiv,
    hrs:o.TMP_PROD/3600, /* Horas Prod. — TMP_PROD (solo estado "producción"), no TPM_TOTAL (que suma hablado+dispo+prod+tipif). Réplica de ATC: AGENTE_NETO_IDLE*0.5 == TMP_PROD/3600. */
    hrsDim:o.HORAS_DIM,
    tmgProm:o.CANT_ATENDIDA>0?o.TMG_TOTAL_SEG/o.CANT_ATENDIDA:0,
    tmgRq:o.TMG_DIM/nf,
    /* %Transferencia — Vicio/Validación + IVR 123 + otro BPO + otra cola GEA, sobre Atendidas.
       NO incluye TRANS_ENCU (esa es la transferencia a encuesta, un concepto aparte — Jose,
       2026-08-31: "no deberían tener transferencia salvo las transferencias a encuestas"). */
    transfTot:o.TRANS_VICIO+o.TRANS_IVR_123+o.TRANS_OTROS_BPO+o.TRANS_OTROS_GEA,
    transf:o.CANT_ATENDIDA>0?(o.TRANS_VICIO+o.TRANS_IVR_123+o.TRANS_OTROS_BPO+o.TRANS_OTROS_GEA)/o.CANT_ATENDIDA:0,
    /* % de cada categoría de transferencia sobre Atendidas (mismo patrón que %Transf, por categoría). */
    pTransVicio:o.CANT_ATENDIDA>0?o.TRANS_VICIO/o.CANT_ATENDIDA:0,
    pTransIvr:  o.CANT_ATENDIDA>0?o.TRANS_IVR_123/o.CANT_ATENDIDA:0,
    pTransBpo:  o.CANT_ATENDIDA>0?o.TRANS_OTROS_BPO/o.CANT_ATENDIDA:0,
    pTransGea:  o.CANT_ATENDIDA>0?o.TRANS_OTROS_GEA/o.CANT_ATENDIDA:0
  };
}
