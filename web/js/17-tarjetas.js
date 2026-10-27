/* ================== 17-tarjetas.js — tarjeta TNPS completa y «Personalizar tarjetas» ==================
   Jose (2026-10-08): «este sistema tiene mucho foco en el TNPS, los promotores, detractores y neutros… me gustaría
   una opción como en ATC de personalizar etiquetas o cards… o mejor aún una sola etiqueta con estos datos».

   1) tarjetaTnps(o, metaPct): UNA tarjeta con el TNPS, la barra Promotores / Neutros / Detractores (cantidad y %),
      las encuestas y el % de respuesta. La usan Diario, Intervalos, Supervisores y Asesores. Ocupa 2 columnas.
   2) tarjetasTnpsOpcionales(o): Promotores, Neutros, Detractores y % Respuesta como tarjetas sueltas. Vienen OCULTAS
      por defecto; cada usuario las agrega desde «🎛 Personalizar tarjetas».
   3) tarjetasPersonalizadas(tira, cards): aplica lo que el usuario eligió (qué tarjetas ve y en qué orden) y
      recuerda la lista completa para el panel. Se guarda por tira en localStorage (hfc_tarjetas_<tira>), igual que
      «🎛 Personalizar KPIs» de ATC. Si cambia el diseño de una tira, las tarjetas nuevas aparecen al final.

   Cada tarjeta es {k, ico, l, v, cls, s, ancha?}: k = id estable (no cambiarlo: es la clave guardada). */

/* ---------- 1) Tarjeta TNPS completa ---------- */
function tarjetaTnps(o, metaPct){
  const t = tnpsDe(o), meta = (metaPct||METAS_HFC.TNPS)/100;
  const pct = x => (x*100).toFixed(1)+'%';
  const ancho = x => (x*100).toFixed(2)+'%';
  const barra = t.enc
    ? `<div class="tnps-barra" role="img" aria-label="Promotores ${pct(t.pProm)}, neutros ${pct(t.pNeu)}, detractores ${pct(t.pDet)}">`+
        `<span class="p" style="width:${ancho(t.pProm)}"></span><span class="n" style="width:${ancho(t.pNeu)}"></span><span class="d" style="width:${ancho(t.pDet)}"></span></div>`
    : '<div class="tnps-barra vacia"></div>';
  const s =
    barra+
    `<div class="tnps-leyenda">`+
      `<span class="p"><i></i>Promotores <b>${fmtN(t.prom)}</b> ${pct(t.pProm)}</span>`+
      `<span class="n"><i></i>Neutros <b>${fmtN(t.neu)}</b> ${pct(t.pNeu)}</span>`+
      `<span class="d"><i></i>Detractores <b>${fmtN(t.det)}</b> ${pct(t.pDet)}</span>`+
    `</div>`+
    `<div class="tnps-pie"><b>${fmtN(t.enc)}</b> encuestas · <b>${pct(t.pResp)}</b> respondió (de ${fmtN(t.trans)} transferidas) · meta ${(meta*100).toFixed(0)}%</div>`;
  return { k:'tnps', ico:'⭐', l:'TNPS', v: t.enc ? pct(t.tnps) : '—', cls: t.enc ? sem(t.tnps, meta, meta-.10) : '', s, ancha:true };
}

/* ---------- 2) Tarjetas sueltas opcionales ---------- */
function tarjetasTnpsOpcionales(o){
  const t = tnpsDe(o), pct = x => (x*100).toFixed(1)+'%';
  return [
    { k:'prom', ico:'😀', l:'Promotores',  v:fmtN(t.prom), cls:'verde', s:`<b>${pct(t.pProm)}</b> de ${fmtN(t.enc)} encuestas` },
    { k:'neu',  ico:'😐', l:'Neutros',     v:fmtN(t.neu),  cls:'',      s:`<b>${pct(t.pNeu)}</b> de ${fmtN(t.enc)} encuestas` },
    { k:'det',  ico:'☹️', l:'Detractores', v:fmtN(t.det),  cls:'rojo',  s:`<b>${pct(t.pDet)}</b> de ${fmtN(t.enc)} encuestas` },
    { k:'resp', ico:'🗳️', l:'% Respuesta', v:pct(t.pResp), cls:'',      s:`<b>${fmtN(t.enc)}</b> respondidas de ${fmtN(t.trans)} transferidas a encuesta` },
  ];
}
const TARJETAS_OCULTAS_POR_DEFECTO = new Set(['prom','neu','det','resp']);

/* ---------- 3) Personalización (qué tarjetas y en qué orden) ---------- */
const _TARJETAS_DISP = {};   // tira -> [{k,l}] todas las tarjetas posibles, para armar el panel
function _tarjetasPref(tira){
  try{ const v = JSON.parse(localStorage.getItem('hfc_tarjetas_'+tira)||'null'); if(v && Array.isArray(v.orden)) return v; }catch(e){}
  return null;
}
function _guardarTarjetasPref(tira, pref){
  try{ pref ? localStorage.setItem('hfc_tarjetas_'+tira, JSON.stringify(pref)) : localStorage.removeItem('hfc_tarjetas_'+tira); }catch(e){}
}
function tarjetasPersonalizadas(tira, cards){
  _TARJETAS_DISP[tira] = cards.map(c=>({k:c.k, l:c.l}));
  const pref = _tarjetasPref(tira);
  if(!pref) return cards.filter(c=>!TARJETAS_OCULTAS_POR_DEFECTO.has(c.k));
  const pos = new Map(pref.orden.map((k,i)=>[k,i])), ocultas = new Set(pref.ocultas||[]);
  return cards
    .map((c,i)=>({c, p: pos.has(c.k) ? pos.get(c.k) : 1000+i}))   // las que no están en la preferencia van al final
    .sort((a,b)=>a.p-b.p).map(x=>x.c)
    .filter(c=> pos.has(c.k) ? !ocultas.has(c.k) : !TARJETAS_OCULTAS_POR_DEFECTO.has(c.k));
}
/* HTML de una tira ya personalizada (mismo marcado que usaban las pestañas; data-spark solo si la tarjeta lo usa). */
function htmlTarjetas(cards, conSpark){
  return cards.map(c=>`<div class="kpi-card${c.ancha?' kpi-ancha':''}"${conSpark?` data-spark="${c.k}"`:''}><div class="kl"><span class="ico">${kpiIco(c.ico)}</span>${c.l}</div><div class="kv ${c.cls||''}">${c.v}</div><div class="ks">${c.s||''}</div></div>`).join('');
}

/* Panel lateral (mismo cajón y estilos que «Columnas · KPIs», 10-columnas.js). */
let _tarjetasPanel = null, _tarjetasPanelTira = null;
function _estadoTarjetas(tira){
  const disp = _TARJETAS_DISP[tira] || [], pref = _tarjetasPref(tira);
  if(!pref) return { orden: disp.map(d=>d.k), ocultas: disp.filter(d=>TARJETAS_OCULTAS_POR_DEFECTO.has(d.k)).map(d=>d.k) };
  const orden = pref.orden.filter(k=>disp.some(d=>d.k===k)).concat(disp.map(d=>d.k).filter(k=>!pref.orden.includes(k)));
  const ocultas = disp.map(d=>d.k).filter(k=> pref.orden.includes(k) ? (pref.ocultas||[]).includes(k) : TARJETAS_OCULTAS_POR_DEFECTO.has(k));
  return { orden, ocultas };
}
function _pintarTarjetasPanel(){
  const tira = _tarjetasPanelTira, disp = _TARJETAS_DISP[tira] || [];
  const est = _estadoTarjetas(tira), nombre = k => (disp.find(d=>d.k===k)||{}).l || k;
  const filas = est.orden.map((k,i)=>`
    <div class="col-toggle-item tarj-item">
      <input type="checkbox" ${est.ocultas.includes(k)?'':'checked'} onchange="tarjetaVisible('${k}',this.checked)" aria-label="Mostrar ${nombre(k)}">
      <span>${nombre(k)}</span>
      <button class="tarj-mover" type="button" ${i===0?'disabled':''} onclick="moverTarjeta('${k}',-1)" aria-label="Subir ${nombre(k)}">↑</button>
      <button class="tarj-mover" type="button" ${i===est.orden.length-1?'disabled':''} onclick="moverTarjeta('${k}',1)" aria-label="Bajar ${nombre(k)}">↓</button>
    </div>`).join('');
  _tarjetasPanel.innerHTML = `
    <div class="col-panel-head">
      <div class="col-panel-title"><div class="col-toggle-hdr">Personalizar tarjetas</div><button class="dias-btn" type="button" onclick="cerrarColPanels()">✕ Cerrar</button></div>
      <p class="tarj-ayuda">Marca las tarjetas que quieres ver y ordénalas con ↑ ↓. Se guarda en este navegador.</p>
      <div class="col-toggle-actions"><button class="dias-btn" style="color:var(--accent)" onclick="tarjetasDefaults()">↺ Defaults</button></div>
    </div>
    <div class="col-panel-scroll">${filas || '<p class="tarj-ayuda">Abre la pestaña con datos para ver sus tarjetas.</p>'}</div>`;
}
function _cambiarTarjetas(f){
  const est = _estadoTarjetas(_tarjetasPanelTira); f(est);
  _guardarTarjetasPref(_tarjetasPanelTira, est);
  renderAll(); _pintarTarjetasPanel();
}
function tarjetaVisible(k, visible){
  _cambiarTarjetas(est=>{ est.ocultas = est.ocultas.filter(x=>x!==k); if(!visible) est.ocultas.push(k); });
}
function moverTarjeta(k, d){
  _cambiarTarjetas(est=>{ const i = est.orden.indexOf(k), j = i+d; if(i<0 || j<0 || j>=est.orden.length) return; [est.orden[i], est.orden[j]] = [est.orden[j], est.orden[i]]; });
}
function tarjetasDefaults(){
  _guardarTarjetasPref(_tarjetasPanelTira, null); renderAll(); _pintarTarjetasPanel();
}
function toggleTarjetasPanel(tira){
  if(!_tarjetasPanel || !document.body.contains(_tarjetasPanel)){
    _tarjetasPanel = document.createElement('div'); _tarjetasPanel.className = 'col-toggle-panel';
    document.body.appendChild(_tarjetasPanel);
  }
  if(_tarjetasPanel.classList.contains('open') && _tarjetasPanelTira===tira){ cerrarColPanels(); return; }
  _tarjetasPanelTira = tira; _pintarTarjetasPanel(); abrirColPanel(_tarjetasPanel);
}
