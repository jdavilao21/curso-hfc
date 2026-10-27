/* ================== 12-charts-intervalos.js — 4 gráficos Chart.js en la pestaña Intervalos ==================
   Mismo patrón que ATC (js/03-intervalos.js:renderChartIntervalos), adaptado a los nombres
   de columna de HFC (que son los mismos, ambas campañas comparten la misma vista base)
   y a la paleta Placa de Cobre (colores leídos de las variables CSS activas). */

/* _cssVar(): en js/01-core.js (utilidades comunes). */

const _INT_CHARTS = {};
function _destroyIntCharts(){
  Object.values(_INT_CHARTS).forEach(c=>{ try{ c.destroy(); }catch(e){} });
  Object.keys(_INT_CHARTS).forEach(k=>delete _INT_CHARTS[k]);
}

function renderChartIntervalos(sorted){
  if(typeof Chart==='undefined') return;
  const grid=document.getElementById('charts-int-grid');
  if(!grid || !sorted || !sorted.length){ if(grid) grid.style.display='none'; return; }
  grid.style.display='grid';
  _destroyIntCharts();

  const labels = sorted.map(r=>(r.FRANJA_GTR||'').slice(0,5));
  const cGrid  = _cssVar('--border');
  const cTick  = _cssVar('--muted');
  const cLeg   = _cssVar('--text');
  const cGood  = _cssVar('--good');
  const cBad   = _cssVar('--bad');
  const cAccent2 = _cssVar('--accent2-ink');
  const cWarn  = _cssVar('--warn');
  const fontFam = "'Consolas','SFMono-Regular',monospace";

  const scaleBase = { grid:{color:cGrid}, ticks:{color:cTick, font:{size:9, family:fontFam}} };
  const scaleX = { grid:{color:cGrid}, ticks:{color:cTick, font:{size:9, family:fontFam}, maxRotation:45, minRotation:45} };
  const legendOpts = { labels:{color:cLeg, font:{size:10, family:fontFam}, boxWidth:12, padding:10} };
  const base = {
    responsive:true, maintainAspectRatio:false, animation:{duration:300},
    plugins:{legend:legendOpts}, scales:{x:scaleX, y:scaleBase}
  };

  const hhmmss = v=>{const s=Math.round(v||0);const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return [h,m,sc].map(x=>String(x).padStart(2,'0')).join(':');};

  /* Chart 1: %NS · %Atención */
  _INT_CHARTS.ns = new Chart(document.getElementById('ch-int-ns'), {
    type:'line',
    data:{labels, datasets:[
      {label:'%NS', data:sorted.map(r=>+((r.ATENDIDA_UMBR||0)*100/(r.LLAM_RECIBIDAS||1)).toFixed(1)),
        borderColor:cAccent2, backgroundColor:cAccent2+'22', tension:.3, borderWidth:1.5, pointRadius:1.5, pointHoverRadius:3, fill:true},
      {label:'%Atenc.', data:sorted.map(r=>+((r.CANT_ATENDIDA||0)*100/(r.LLAM_RECIBIDAS||1)).toFixed(1)),
        borderColor:cGood, backgroundColor:'transparent', tension:.3, borderWidth:1.5, pointRadius:1.5, pointHoverRadius:3, fill:false},
      {label:'Meta NS 85%', data:sorted.map(()=>85), datalabels:{display:false},
        borderColor:cBad, backgroundColor:'transparent', borderWidth:1.5, borderDash:[6,3], pointRadius:0, pointHoverRadius:0, fill:false}
    ]},
    options:{...base,
      plugins:{...base.plugins, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y+'%'}}},
      /* Eje hasta 110 % (Jose, 08-oct-2026): con máximo 100 % las líneas que llegan a 100 % chocaban con el borde de arriba.
         La marca de 110 % no se rotula, para que la escala siga leyéndose de 0 a 100 %. */
      scales:{...base.scales, y:{...scaleBase, min:0, max:110,
        afterBuildTicks:ax=>{ ax.ticks = [0,20,40,60,80,100].map(value=>({value})); },
        ticks:{...scaleBase.ticks, callback:v=>v<=100?v+'%':''}}}
    }
  });
  _INT_CHARTS.ns._modalCallbacks = { yTick: v=>v<=100?v+'%':'', dataLabel: v=>Math.round(v)+'%',
    yAfterBuildTicks: _INT_CHARTS.ns.options.scales.y.afterBuildTicks };

  /* Chart 2: Llamadas por franja */
  _INT_CHARTS.llam = new Chart(document.getElementById('ch-int-llam'), {
    type:'bar',
    data:{labels, datasets:[
      {label:'Recibidas', data:sorted.map(r=>r.LLAM_RECIBIDAS||0), backgroundColor:cAccent2+'b3', borderRadius:3},
      {label:'Atendidas', data:sorted.map(r=>r.CANT_ATENDIDA||0), backgroundColor:cGood+'b3', borderRadius:3},
      {label:'Aban.', data:sorted.map(r=>(r.LLAM_RECIBIDAS||0)-(r.CANT_ATENDIDA||0)), backgroundColor:cBad+'99', borderRadius:3}
    ]},
    options:base
  });
  _INT_CHARTS.llam._modalCallbacks = { dataLabel: v=>Math.round(v||0) };

  /* Chart 3: TMG Real vs Dim (eje Y en hh:mm:ss)
     Usa M(r).tmgProm / M(r).tmgRq (no los campos crudos) porque en modo "Todas" `sorted`
     viene de aggByFranja() — un objeto acumulado (suma de N días), no un TMG_PROMSEG directo.
     M() ya normaliza por _nf, así que da el promedio por franja tanto en 1 día como en N días. */
  _INT_CHARTS.tmg = new Chart(document.getElementById('ch-int-tmg'), {
    type:'line',
    data:{labels, datasets:[
      {label:'TMG Real', data:sorted.map(r=>M(r).tmgProm),
        borderColor:cWarn, backgroundColor:cWarn+'1a', tension:.3, borderWidth:1.5, pointRadius:1.5, pointHoverRadius:3, fill:true},
      {label:'TMG Dim', data:sorted.map(r=>M(r).tmgRq),
        borderColor:cTick, borderDash:[4,3], tension:.3, borderWidth:1.5, pointRadius:1, pointHoverRadius:2.5, fill:false}
    ]},
    options:{...base,
      plugins:{...base.plugins, tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+hhmmss(ctx.raw ?? ctx.parsed?.y ?? 0)}}},
      scales:{...base.scales, y:{...scaleBase, ticks:{...scaleBase.ticks, callback:v=>hhmmss(v)}}}
    }
  });
  _INT_CHARTS.tmg._modalCallbacks = {
    yTick:        v   => hhmmss(v),
    tooltipLabel: ctx => ctx.dataset.label+': '+hhmmss(ctx.raw ?? ctx.parsed?.y ?? 0),
    dataLabel:    v   => hhmmss(v)
  };

  /* Chart 4: Agentes Real vs Rq. — mismo motivo: usa M(r).agReal/agRq, no los SUMK crudos. */
  _INT_CHARTS.ag = new Chart(document.getElementById('ch-int-ag'), {
    type:'line',
    data:{labels, datasets:[
      {label:'Ag. Real', data:sorted.map(r=>Math.round(M(r).agReal)),
        borderColor:cGood, backgroundColor:cGood+'1a', tension:.3, borderWidth:1.5, pointRadius:1.5, pointHoverRadius:3, fill:true},
      {label:'Ag. Rq.', data:sorted.map(r=>Math.round(M(r).agRq)),
        borderColor:cBad, borderDash:[4,3], tension:.3, borderWidth:1.5, pointRadius:1, pointHoverRadius:2.5, fill:false}
    ]},
    options:base
  });
  _INT_CHARTS.ag._modalCallbacks = { dataLabel: v=>Math.round(v) };
}

/* ---------- Modal "ampliar gráfico" (equivalente a ATC: js/10-ventas.js:openChartModal) ----------
   Clona la data/options del chart pequeño en un canvas grande dentro de un modal, restaurando
   los callbacks (ticks/tooltip con formato hh:mm:ss) que JSON.stringify no puede serializar.
   Los colores/tamaños de texto del modal se recalculan en caliente (no se clonan tal cual del
   chart chico): así siempre se ven bien aunque el tema haya cambiado desde que se dibujó la
   tarjeta, y con mejor contraste/tamaño porque el modal es para leer de cerca. */
let _modalChart = null;
let _modalCurrent = null;
let _modalLabelsOn = false;
let _modalLabelAnimT = 1; /* 0→1, multiplicador que "hace correr" los números de las etiquetas */
const _reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Etiquetas "que corren" — mismo criterio que el count-up de las tarjetas KPI de ATC
   (js/11-ux.js:_cuAnimar): ease-out cúbico, 550ms. En vez de animar un <span>, acá se
   re-dibuja el chart en cada frame con _modalLabelAnimT creciendo de 0→1; el formatter
   de cada dataset multiplica el valor real por ese factor, así el texto de la etiqueta
   "cuenta" hacia arriba a la vez que aparece el punto/barra. */
function _animarEtiquetasModal(chart){
  if(_reduceMotion){ _modalLabelAnimT = 1; return; }
  const dur = 550, t0 = performance.now();
  _modalLabelAnimT = 0;
  const paso = now=>{
    if(chart !== _modalChart) return; // el modal cambió de gráfico o se cerró a mitad de camino
    const t = Math.min(1, (now-t0)/dur);
    _modalLabelAnimT = 1 - Math.pow(1-t, 3);
    chart.update('none');
    if(t < 1) requestAnimationFrame(paso);
    else { _modalLabelAnimT = 1; chart.update('none'); }
  };
  requestAnimationFrame(paso);
}

function openChartModal(key, title, dict){
  const src = (dict || _INT_CHARTS)[key];
  if(!src) return;
  _modalCurrent = {key, title, dict};
  document.getElementById('cmo-title').textContent = title;
  document.getElementById('chart-modal').classList.add('open');
  const btnLbl = document.getElementById('btn-modal-labels');
  if(btnLbl) btnLbl.classList.toggle('on', _modalLabelsOn);
  setTimeout(()=>{
    if(_modalChart){ try{ _modalChart.destroy(); }catch(e){} _modalChart=null; }
    const canvas = document.getElementById('ch-modal');
    const cloneData = JSON.parse(JSON.stringify(src.data));
    const cloneOpts = JSON.parse(JSON.stringify(src.options));
    cloneOpts.animation = {duration:400};
    cloneOpts.maintainAspectRatio = false;
    cloneOpts.responsive = true;

    const mText = _cssVar('--text');
    const mGrid = _cssVar('--border');
    cloneOpts.scales = cloneOpts.scales || {};
    ['x','y'].forEach(ax=>{
      const prevTicks = (cloneOpts.scales[ax] && cloneOpts.scales[ax].ticks) || {};
      cloneOpts.scales[ax] = {...(cloneOpts.scales[ax]||{}), grid:{...((cloneOpts.scales[ax]||{}).grid||{}), color:mGrid}};
      cloneOpts.scales[ax].ticks = {...prevTicks, color:mText, font:{...(prevTicks.font||{}), size:12.5}};
    });
    cloneOpts.plugins = cloneOpts.plugins || {};
    if(cloneOpts.plugins.legend){
      cloneOpts.plugins.legend.display = true;
      cloneOpts.plugins.legend.labels = {...(cloneOpts.plugins.legend.labels||{}), color:mText, font:{...((cloneOpts.plugins.legend.labels||{}).font||{}), size:13}};
    }

    if(src._modalCallbacks){
      const cb = src._modalCallbacks;
      if(cb.yTick) cloneOpts.scales.y.ticks.callback = cb.yTick;
      if(cb.yAfterBuildTicks) cloneOpts.scales.y.afterBuildTicks = cb.yAfterBuildTicks;   // las funciones no sobreviven al JSON
      if(cb.tooltipLabel){
        cloneOpts.plugins.tooltip = cloneOpts.plugins.tooltip||{};
        cloneOpts.plugins.tooltip.callbacks = {label:cb.tooltipLabel};
      }
    }

    /* Toggle "🏷 Etiquetas" — valores encima de cada punto/barra, igual que CROSS/ATC.
       Solo se activa en el modal (la tarjeta chica queda limpia). */
    const plugins = [];
    let labelsAnimating = false;
    if(_modalLabelsOn && typeof ChartDataLabels !== 'undefined'){
      plugins.push(ChartDataLabels);
      labelsAnimating = true;
      const dlFmt = (src._modalCallbacks && src._modalCallbacks.dataLabel) || (v=>v);
      cloneOpts.plugins.datalabels = {
        display:true, color:mText, font:{size:10.5, family:"'Consolas','SFMono-Regular',monospace", weight:'bold'},
        backgroundColor:_cssVar('--surface')+'e6', borderRadius:4, padding:{top:1,bottom:1,left:4,right:4},
        anchor:'end', align:'top', offset:4, formatter:(v,ctx)=>dlFmt(v*_modalLabelAnimT, ctx)
      };
    }

    _modalChart = new Chart(canvas, {type:src.config.type, data:cloneData, options:cloneOpts, plugins});
    _modalChart.resize(); // asegura que tome el tamaño real del modal ya visible, no uno intermedio
    if(labelsAnimating) _animarEtiquetasModal(_modalChart);
  }, 60);
}

function toggleModalLabels(){
  _modalLabelsOn = !_modalLabelsOn;
  if(_modalCurrent) openChartModal(_modalCurrent.key, _modalCurrent.title, _modalCurrent.dict);
}

function closeChartModal(){
  document.getElementById('chart-modal').classList.remove('open');
  if(_modalChart){ try{ _modalChart.destroy(); }catch(e){} _modalChart=null; }
  _modalCurrent = null;
}

document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeChartModal(); });
