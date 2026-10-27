/* ================== 26-grafico-cumplimiento.js — Modal "Gráfico de Cumplimiento", pestaña Diario ==================
   Botón al final del recuadro de filtros de Diario (fx-tools, junto a Oportunidades de migración y
   Personalizar tarjetas): abre un modal con un gráfico de línea con área sombreada (mismo look que los de
   Intervalos, 12-charts-intervalos.js) donde se elige qué KPI ver, por día:
     · Tráfico Dim. vs Recibido   · TMG Real vs Dim.   · Agentes Real vs Dim.
   El % Cumplimiento (AGENTE_NETO_IDLE/AGENT_DIM = agentes real ÷ requerido, regla CUMP_RQ_OK — 02-engine.js)
   ya no es un KPI del gráfico: se ve en el tooltip de Agentes Real vs Dim.
   En Tráfico se grafican las llamadas RECIBIDAS (LLAM_RECIBIDAS) contra el tráfico dimensionado; el tooltip suma las
   atendidas y el nivel de servicio (M(o).ns = ATENDIDA_UMBR ÷ LLAM_RECIBIDAS).
   Los datos son los mismos de Diario (datos reales vía API hfc-api, 11-remote.js) y respetan Período/Semana/Rango
   del recuadro. El toggle "Día actual / Hasta el día anterior" es propio del modal (no toca el de la tabla,
   dia-fecha-hoy-tgl) pero arranca igualado a él para que el gráfico abra mostrando lo mismo que ya se ve en
   pantalla. Portado de retefija/js/28-grafico-cumplimiento.js (mismo motor 02-engine.js/07-init.js). */

let _cumplDiaKpi = 'trafico';
let _cumplDiaInclHoy = false;
let _cumplDiaChart = null;
let _cumplDiaEtiq = true;                    // etiquetas de valor sobre los puntos (plugin datalabels)
let _cumplDiaOff = new Set();                // series apagadas del KPI actual (chips)

const _cumplHms = v=>{const s=Math.round(v||0);return [Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(x=>String(x).padStart(2,'0')).join(':');};

/* Definición de cada KPI: título, formato de valor y series (chip = una serie). 'real' va con etiqueta arriba,
   'dim' (meta/dimensionado) abajo, para que no se pisen cuando las líneas se acercan. */
function _cumplDefs(){
  const good=_cssVar('--good'), bad=_cssVar('--bad'), acc=_cssVar('--accent2-ink'), warn=_cssVar('--warn'), mut=_cssVar('--muted');
  return {
    trafico:{ tit:'Tráfico Dimensionado vs Recibido por día', sub:'· llamadas por día', fmt:v=>fmtN(v),
      series:[ {k:'real', l:'Recibidas', c:good, get:o=>o.LLAM_RECIBIDAS||0, area:true},
               {k:'dim',  l:'Tráf. Dim.', c:mut, get:o=>o.TRAF_DIM||0, dash:true, areaSuave:true} ],
      extra:o=>[`Atendidas: ${fmtN(o.CANT_ATENDIDA)}`, `Nivel de servicio: ${((M(o).ns||0)*100).toFixed(1)}%`] },
    tmg:{ tit:'TMG Real vs Dimensionado por día', sub:'· hh:mm:ss', fmt:_cumplHms,
      series:[ {k:'real', l:'TMG Real', c:warn, get:o=>M(o).tmgProm, area:true},
               {k:'dim',  l:'TMG Dim.', c:mut,  get:o=>M(o).tmgRq, dash:true, areaSuave:true} ] },
    agentes:{ tit:'Agentes Real vs Dimensionado por día', sub:'· agentes por día', fmt:v=>fmtN(v),
      series:[ {k:'real', l:'Ag. Real', c:good, get:o=>Math.round(M(o).agReal), area:true},
               {k:'dim',  l:'Ag. Dim.', c:bad,  get:o=>Math.round(M(o).agRq), dash:true, areaSuave:true} ],
      extra:o=>`% Cumplimiento: ${((M(o).cumpRq||0)*100).toFixed(1)}% (meta ${(CUMP_RQ_OK*100).toFixed(0)}%)` }
  };
}

function _cumplDiaRows(){
  let rows = datosBase();                                     // ya filtra por Período
  if(!_cumplDiaInclHoy){
    const fechas = [...new Set(rows.map(r=>r.FECHA))].filter(Boolean).sort();
    const maxFecha = fechas.length ? fechas[fechas.length-1] : null;
    if(maxFecha) rows = rows.filter(r=>String(r.FECHA)!==maxFecha);
  }
  if(filtSemana!=='ALL') rows = rows.filter(r=>r.SEMANA===filtSemana);
  return aplicarFiltroDias(aggByFecha(rows));                  // aplica Rango (7D/14D/31D/Todo)
}

function abrirModalCumplDia(){
  _cumplDiaInclHoy = _diaMostrarHoy;                            // arranca igual que el toggle de la tabla
  document.querySelectorAll('#cumpl-fh-tgl button').forEach(b=>b.classList.toggle('on', b.dataset.fh===(_cumplDiaInclHoy?'si':'no')));
  document.getElementById('modal-cumpl-dia').classList.add('open');
  _renderCumplDiaChart();
}
function cerrarModalCumplDia(){
  document.getElementById('modal-cumpl-dia').classList.remove('open');
  if(_cumplDiaChart){ try{ _cumplDiaChart.destroy(); }catch(e){} _cumplDiaChart=null; }
}
function setCumplDiaKpi(kpi, btn){
  _cumplDiaKpi = kpi; _cumplDiaOff = new Set();
  document.querySelectorAll('#cumpl-kpi-tgl button').forEach(b=>b.classList.toggle('on', b===btn));
  _renderCumplDiaChart(true);
}
function setCumplDiaFechaHoy(modo, btn){
  _cumplDiaInclHoy = modo==='si';
  document.querySelectorAll('#cumpl-fh-tgl button').forEach(b=>b.classList.toggle('on', b===btn));
  _renderCumplDiaChart();
}
function toggleCumplDiaSerie(k){
  if(_cumplDiaOff.has(k)) _cumplDiaOff.delete(k); else _cumplDiaOff.add(k);
  const def = _cumplDefs()[_cumplDiaKpi];
  if(def.series.every(x=>_cumplDiaOff.has(x.k))) _cumplDiaOff.delete(k);   // siempre queda al menos una
  _renderCumplDiaChart();
}
function toggleCumplDiaEtiq(){ _cumplDiaEtiq = !_cumplDiaEtiq; _renderCumplDiaChart(); }

/* Variación con signo, con el mismo formato del KPI (TMG en hh:mm:ss). */
function _cumplDelta(def, d){
  const sg = d>0?'+':d<0?'−':'';
  const a = Math.abs(d);
  return sg + def.fmt(a);
}

/* Línea vertical que acompaña al cursor (la del índice activo del tooltip). */
const _cumplCrosshair = {
  id:'cumplCrosshair',
  afterDatasetsDraw(chart){
    const act = chart.tooltip && chart.tooltip.getActiveElements ? chart.tooltip.getActiveElements() : [];
    if(!act.length) return;
    const x = act[0].element.x, a = chart.chartArea, c = chart.ctx;
    c.save(); c.beginPath(); c.moveTo(x,a.top); c.lineTo(x,a.bottom);
    c.lineWidth=1; c.strokeStyle=_cumplAlpha(_cssVar('--muted'),.75); c.setLineDash([4,3]); c.stroke(); c.restore();
  }
};

function _cumplAlpha(color, a){
  const c = String(color||'').trim();
  if(/^#([0-9a-f]{6})$/i.test(c)){ const n = parseInt(c.slice(1),16); return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`; }
  return c;
}

/* Animación de onda: al cambiar de KPI, cada punto sube desde la base del eje con un retraso
   proporcional a su posición (izquierda → derecha) y cada serie arranca un poco después de la anterior; el área
   sombreada y las etiquetas siguen a los puntos. Con «reducir movimiento» se omite. Abrir el modal, la fecha,
   los chips y Etiquetas solo hacen el fundido corto de antes. */
function _cumplAnim(onda){
  const quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(quieto) return false;
  if(!onda) return { duration:300 };
  return {
    duration:300,
    y:{ duration:650, easing:'easeOutCubic',
        from:c=>c.chart.scales.y ? c.chart.scales.y.bottom : 0,
        delay:c=>(c.type==='data' && c.mode==='default') ? c.dataIndex*28 + c.datasetIndex*140 : 0 }
  };
}

function _renderCumplDiaChart(onda){
  const canvas = document.getElementById('ch-cumpl-dia-modal');
  if(_cumplDiaChart){ try{ _cumplDiaChart.destroy(); }catch(e){} _cumplDiaChart=null; }
  const def = _cumplDefs()[_cumplDiaKpi];

  // título + chips (series y etiquetas)
  const tt=document.getElementById('cumpl-tit'), st=document.getElementById('cumpl-sub'), ch=document.getElementById('cumpl-chips');
  if(tt) tt.textContent = def.tit;
  if(st) st.textContent = def.sub;
  if(ch) ch.innerHTML = def.series.map(x=>`<button type="button" class="cmo-chip${_cumplDiaOff.has(x.k)?'':' on'}" style="--c:${x.c}" aria-pressed="${!_cumplDiaOff.has(x.k)}" onclick="toggleCumplDiaSerie('${x.k}')"><i></i>${x.l}</button>`).join('')
    + `<button type="button" class="cmo-chip cmo-chip-etq${_cumplDiaEtiq?' on':''}" style="--c:var(--accent)" aria-pressed="${_cumplDiaEtiq}" onclick="toggleCumplDiaEtiq()" title="Mostrar el valor sobre cada punto">🏷 Etiquetas</button>`;

  if(typeof Chart==='undefined' || !canvas) return;
  const porFila = _cumplDiaRows();
  if(!porFila.length) return;

  const labels = porFila.map(o=>o.FECHA_VISUAL || o.FECHA);
  const n = labels.length, paso = Math.max(1, Math.ceil(n/20));
  const cGrid=_cssVar('--border'), cTick=_cssVar('--muted'), cText=_cssVar('--text');
  const ds = def.series.filter(x=>!_cumplDiaOff.has(x.k)).map(x=>{
    const real = x.k==='real';
    // Degradado del alto del área de dibujo (no del canvas): fuerte pegado a la línea, suave abajo.
    // La serie real lleva sombra marcada; la dimensionada, una más suave para que ambas se noten.
    const grad = c=>{ const ca=c.chart.chartArea; if(!ca) return 'transparent';
      const g=c.chart.ctx.createLinearGradient(0,ca.top,0,ca.bottom);
      g.addColorStop(0,_cumplAlpha(x.c, real?.62:.30)); g.addColorStop(1,_cumplAlpha(x.c, real?.10:.04)); return g; };
    return { type:'line', label:x.l, data:porFila.map(x.get), borderColor:x.c,
      backgroundColor: (x.area||x.areaSuave) ? grad : 'transparent', fill: (x.area||x.areaSuave) ? 'origin' : false,
      borderDash: x.dash ? [6,4] : [], borderWidth: x.dash ? 1.5 : 1.8, tension:.38, cubicInterpolationMode:'monotone',
      pointRadius: x.sinEtiq ? 0 : (n>40?1.5:3), pointHoverRadius: x.sinEtiq ? 0 : 5.5, pointBackgroundColor:x.c, pointBorderColor:_cssVar('--surface'), pointBorderWidth:1, spanGaps:true,
      datalabels:{ display:c=>_cumplDiaEtiq && !x.sinEtiq && c.dataIndex%paso===0 && c.dataset.data[c.dataIndex]!=null,
        align: real?'top':'bottom', anchor: real?'end':'start', offset:4, color: real?cText:x.c,
        font:{size:10.5, weight:'700'}, formatter:v=>v==null?'':def.fmt(v) } };
  });

  _cumplDiaChart = new Chart(canvas, {
    data:{ labels, datasets:ds },
    options:{ responsive:true, maintainAspectRatio:false, animation:_cumplAnim(onda),
      interaction:{ mode:'index', intersect:false }, layout:{ padding:{ top:18, right:8 } },
      plugins:{ legend:{ display:false },
        tooltip:{ callbacks:{
          label:c=>` ${c.dataset.label}: ${c.raw==null?'—':def.fmt(c.raw)}`,
          afterBody:items=>{
            const i = items[0].dataIndex, out = [];
            const real = def.series[0], dim = def.series[1];
            const vr = real.get(porFila[i]), vd = dim ? dim.get(porFila[i]) : null;
            if(vr!=null && vd!=null) out.push(`Dif. Real − Dim.: ${_cumplDelta(def, vr-vd)}`);
            if(def.extra) out.push(...[].concat(def.extra(porFila[i])));
            if(i>0){ const va = real.get(porFila[i-1]);
              if(vr!=null && va!=null){ const d = vr-va, pc = va ? ' ('+(d>=0?'+':'−')+Math.abs(d/va*100).toFixed(1)+'%)' : '';
                out.push(`Vs día ant.: ${_cumplDelta(def, d)}${pc}`); } }
            return out;
          } } } },
      scales:{
        x:{ grid:{ display:true, color:_cumplAlpha(cGrid,.4) }, ticks:{ color:cTick, font:{size:11}, maxRotation:45, minRotation:0, autoSkip:true } },
        y:{ grid:{color:_cumplAlpha(cGrid,.55)}, beginAtZero:true, grace:'10%',
            ticks:{ color:cTick, font:{size:11}, callback:v=>def.fmt(v) } } } },
    plugins:[_cumplCrosshair].concat(typeof ChartDataLabels!=='undefined' ? [ChartDataLabels] : [])
  });
}

document.addEventListener('keydown', e=>{ if(e.key==='Escape' && document.getElementById('modal-cumpl-dia')?.classList.contains('open')) cerrarModalCumplDia(); });
