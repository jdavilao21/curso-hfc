/* ================== 10-columnas.js — panel "Columnas · KPIs" (mostrar/ocultar columnas) ==================
   Mismo patrón que ATC (js/05-filtros-columnas.js: toggleColPanel/initColPanel/_hiddenCols),
   adaptado con CSS por nth-child en vez de data-col-id por celda (menos cambios en el render). */

const COLS_DIA_INT = [
  {i:2,l:'Cumpl.',g:'Estado'},
  {i:3,l:'%NS',g:'Nivel servicio'},{i:4,l:'%NA',g:'Nivel servicio'},{i:5,l:'%Aband.',g:'Nivel servicio'},
  {i:6,l:'Tráf.Dim',g:'Tráfico'},{i:7,l:'Recibidas',g:'Tráfico'},{i:8,l:'Atendidas',g:'Tráfico'},
  {i:9,l:'Abandon.',g:'Tráfico'},{i:20,l:'Cump.Tráf',g:'Tráfico'},
  {i:13,l:'Ag.Real',g:'Agentes'},{i:14,l:'Ag.Rq',g:'Agentes'},{i:15,l:'Ag.Δ',g:'Agentes'},
  {i:12,l:'%Ocup',g:'Agentes'},{i:16,l:'%Util',g:'Agentes'},
  {i:17,l:'TMG P/RQ',g:'Tiempos'},{i:18,l:'TMG Δ',g:'Tiempos'},{i:19,l:'Hrs.Prod',g:'Tiempos'},
  {i:10,l:'CAT',g:'Calidad'},{i:11,l:'%CAT',g:'Calidad'},{i:21,l:'%TNPS',g:'TNPS'},
  {i:36,l:'Encuestas',g:'TNPS'},{i:37,l:'Promotores',g:'TNPS'},{i:38,l:'Neutros',g:'TNPS'},{i:39,l:'Detractores',g:'TNPS'},
  {i:40,l:'%Prom.',g:'TNPS'},{i:41,l:'%Neu.',g:'TNPS'},{i:42,l:'%Det.',g:'TNPS'},{i:43,l:'%Resp.',g:'TNPS'},
  {i:22,l:'%Transf',g:'Transferencias'},{i:23,l:'Transf.Tot',g:'Transferencias'},{i:24,l:'T.Vicio',g:'Transferencias'},
  {i:25,l:'T.IVR123',g:'Transferencias'},{i:26,l:'T.Otro BPO',g:'Transferencias'},{i:27,l:'T.Otro GEA',g:'Transferencias'},
  {i:28,l:'Trans.Enc',g:'Encuestas'},{i:29,l:'%Transf Encu.',g:'Encuestas'},{i:30,l:'%Ind.Enc',g:'Encuestas'},
  {i:31,l:'%T.Vicio',g:'Transferencias'},{i:32,l:'%T.IVR123',g:'Transferencias'},{i:33,l:'%T.Otro BPO',g:'Transferencias'},{i:34,l:'%T.Otro GEA',g:'Transferencias'},
  /* Var.Tráf (i:35, Jose 2026-09-17 ronda 3) — Recibidas ÷ Tráf.Dim − 1, como VAR.TRAF de ATC.
     Va al final del bloque compartido Diario/Intervalos para no correr los índices 2-34 ya en
     uso (mismo criterio que el resto de columnas agregadas en este proyecto). */
  {i:35,l:'Var.Tráf',g:'Tráfico'}
];

/* Columnas ocultas por defecto (primer ingreso, sin preferencia guardada) — criterio de ATC: ocultar conteos crudos
   cuando existe su versión en %, y métricas secundarias (deltas, desglose fino de transferencias, Var.Tráf). El usuario
   puede mostrarlas desde «Columnas · KPIs», y «↺ Defaults» vuelve a esta lista. Los números son la posición de la
   columna en la tabla (nth-child). */
const DEFAULT_HIDDEN_DIA_INT = [6,9,20, 12,16, 18,19, 10, 23,24,25,26,27, 28, 31,32,33,34, 35, 36,37,38,39,43];
const DEFAULT_HIDDEN_SUP     = [3, 8,9,10, 14,15,16,17,18, 20, 23,24,25,26, 27,31];
const DEFAULT_HIDDEN_AS      = [9, 11,12,13, 16,17,18,19,20, 22, 25,26,27,28, 29,33];

const COL_META = {
  dia: {tableId:'tbl-dia', cols:COLS_DIA_INT, lsKey:'hfc_cols_dia_v2', defaults:DEFAULT_HIDDEN_DIA_INT},
  int: {tableId:'tbl-int', cols:COLS_DIA_INT, lsKey:'hfc_cols_int_v2', defaults:DEFAULT_HIDDEN_DIA_INT},
  sup: {tableId:'tbl-sup', lsKey:'hfc_cols_sup_v2', defaults:DEFAULT_HIDDEN_SUP, cols:[
    {i:2,l:'Atendidas',g:'Producción'},{i:3,l:'CAT',g:'Producción'},{i:4,l:'%CAT',g:'Producción'},
    {i:6,l:'TMG',g:'Tiempos'},{i:7,l:'Hrs.Prod',g:'Tiempos'},{i:5,l:'%Ocup',g:'Tiempos'},{i:12,l:'%Util',g:'Tiempos'},
    {i:8,l:'Prom.',g:'TNPS'},{i:9,l:'Detr.',g:'TNPS'},{i:10,l:'Neu.',g:'TNPS'},{i:11,l:'%TNPS',g:'TNPS'},
    {i:27,l:'Encuestas',g:'TNPS'},{i:28,l:'%Prom.',g:'TNPS'},{i:29,l:'%Neu.',g:'TNPS'},{i:30,l:'%Det.',g:'TNPS'},{i:31,l:'%Resp.',g:'TNPS'},
    {i:13,l:'%Transf',g:'Transferencias'},{i:14,l:'Transf.Tot',g:'Transferencias'},{i:15,l:'T.Vicio',g:'Transferencias'},
    {i:16,l:'T.IVR123',g:'Transferencias'},{i:17,l:'T.Otro BPO',g:'Transferencias'},{i:18,l:'T.Otro GEA',g:'Transferencias'},
    {i:19,l:'%Corte Cl.',g:'Calidad'},
    {i:20,l:'Trans.Enc',g:'Encuestas'},{i:21,l:'%Transf Encu.',g:'Encuestas'},{i:22,l:'%Ind.Enc',g:'Encuestas'},
    {i:23,l:'%T.Vicio',g:'Transferencias'},{i:24,l:'%T.IVR123',g:'Transferencias'},{i:25,l:'%T.Otro BPO',g:'Transferencias'},{i:26,l:'%T.Otro GEA',g:'Transferencias'}
  ]},
  as: {tableId:'tbl-as', lsKey:'hfc_cols_as_v5', defaults:DEFAULT_HIDDEN_AS, cols:[
    /* Si se reordenan las columnas de #tbl-as, subir la versión de lsKey (_v4 → _v5): una preferencia guardada con
       los índices viejos ocultaría la columna equivocada. */
    {i:3,l:'Cond. Laboral',g:'Producción'},
    {i:4,l:'Estado',g:'Producción'},
    {i:5,l:'Atendidas',g:'Producción'},{i:6,l:'Días',g:'Producción'},{i:7,l:'Prom.At.',g:'Producción'},
    {i:8,l:'TMG Real',g:'Tiempos'},
    {i:9,l:'Cat.Ag.',g:'CAT'},{i:10,l:'%Cat.Ag.',g:'CAT'},
    {i:11,l:'Promotor',g:'TNPS'},{i:12,l:'Detractor',g:'TNPS'},{i:13,l:'Neutros',g:'TNPS'},{i:14,l:'%TNPS',g:'TNPS'},
    {i:29,l:'Encuestas',g:'TNPS'},{i:30,l:'%Prom.',g:'TNPS'},{i:31,l:'%Neu.',g:'TNPS'},{i:32,l:'%Det.',g:'TNPS'},{i:33,l:'%Resp.',g:'TNPS'},
    {i:34,l:'Cuartil TNPS',g:'TNPS'},{i:35,l:'% de Detract.',g:'TNPS'},{i:36,l:'Días crít.',g:'TNPS'},
    {i:15,l:'%Transf',g:'Transferencias'},{i:16,l:'Transf.Tot',g:'Transferencias'},{i:17,l:'T.Vicio',g:'Transferencias'},
    {i:18,l:'T.IVR123',g:'Transferencias'},{i:19,l:'T.Otro BPO',g:'Transferencias'},{i:20,l:'T.Otro GEA',g:'Transferencias'},
    {i:21,l:'%Corte Cl.',g:'Calidad'},
    {i:22,l:'Trans.Enc',g:'Encuestas'},{i:23,l:'%Transf Encu.',g:'Encuestas'},{i:24,l:'%Ind.Enc',g:'Encuestas'},
    {i:25,l:'%T.Vicio',g:'Transferencias'},{i:26,l:'%T.IVR123',g:'Transferencias'},{i:27,l:'%T.Otro BPO',g:'Transferencias'},{i:28,l:'%T.Otro GEA',g:'Transferencias'}
  ]}
};

function _hiddenCols(tabla){
  const s = localStorage.getItem(COL_META[tabla].lsKey);
  if(s===null) return new Set(COL_META[tabla].defaults||[]);
  try{ return new Set(JSON.parse(s)); }catch(e){ return new Set(COL_META[tabla].defaults||[]); }
}
function _saveHidden(tabla, set){ localStorage.setItem(COL_META[tabla].lsKey, JSON.stringify([...set])); }
function colDefaults(tabla){
  _saveHidden(tabla, new Set(COL_META[tabla].defaults||[]));
  applyHiddenCols(tabla);
  initColPanel(tabla);
}

function applyHiddenCols(tabla){
  const meta = COL_META[tabla];
  const hidden = _hiddenCols(tabla);
  let styleEl = document.getElementById('style-cols-'+tabla);
  if(!styleEl){ styleEl=document.createElement('style'); styleEl.id='style-cols-'+tabla; document.head.appendChild(styleEl); }
  // c.i numérico = posición de la columna (nth-child); texto = nombre en data-col-id (tabla de Horas).
  styleEl.textContent = meta.cols.filter(c=>hidden.has(c.i)).map(c=>c.i)
    .map(i=> typeof i==='string'
      ? `#${meta.tableId} [data-col-id="${i}"]{display:none}`
      : `#${meta.tableId} th:nth-child(${i}), #${meta.tableId} td:nth-child(${i}){display:none}`)
    .join('\n');
}

function toggleColVis(tabla, idx, visible){
  const hidden = _hiddenCols(tabla);
  visible ? hidden.delete(idx) : hidden.add(idx);
  _saveHidden(tabla, hidden);
  applyHiddenCols(tabla);
  initColPanel(tabla);
}

function colTodos(tabla, visible){
  _saveHidden(tabla, visible ? new Set() : new Set(COL_META[tabla].cols.map(c=>c.i)));
  applyHiddenCols(tabla);
  initColPanel(tabla);
}

let _colPanel=null, _colPanelTabla=null;
function cerrarColPanels(){
  document.querySelectorAll('.col-toggle-panel.open').forEach(p=>p.classList.remove('open'));
}
function abrirColPanel(panel){
  cerrarColPanels();
  panel.classList.add('open');
}
document.addEventListener('wheel',e=>{
  const list=e.target.closest('.col-panel-scroll');
  if(!list || !list.closest('.col-toggle-panel.open')) return;
  const atEnd=e.deltaY>0 && list.scrollTop+list.clientHeight>=list.scrollHeight-1;
  const atStart=e.deltaY<0 && list.scrollTop<=0;
  if(atEnd || atStart){
    const main=document.querySelector('.main');
    if(main && main.scrollHeight>main.clientHeight){
      main.scrollTop+=e.deltaY;
      e.preventDefault();
    }
  }
},{passive:false});
document.addEventListener('keydown',e=>{ if(e.key==='Escape') cerrarColPanels(); });
document.addEventListener('click',e=>{
  // Un clic sobre algo que ya no está en la página (p. ej. «Todas/Ninguna/Defaults», que redibujan el panel
  // entero) no cuenta como «afuera»: antes eso cerraba el panel solo (corregido en la Fase 3, 2026-09-24).
  if(!e.target.isConnected) return;
  if(!e.target.closest('.col-toggle-panel') && !e.target.closest('[onclick^="toggleColPanel"],[onclick^="toggleTarjetasPanel"]')) cerrarColPanels();
});
function _getColPanel(){
  if(_colPanel && document.body.contains(_colPanel)) return _colPanel;
  _colPanel=document.createElement('div');
  _colPanel.className='col-toggle-panel';
  document.body.appendChild(_colPanel);
  return _colPanel;
}
/* Buscar KPI (Jose, 2026-09-17 ronda 3: "es que tenemos muchos") — filtra en vivo los
   .col-toggle-item por texto (sin acentos, sin distinguir mayúsculas) y oculta los .col-grp-hdr
   que se quedan sin ítems visibles. No toca qué columnas están marcadas/desmarcadas, solo qué
   filas se VEN en la lista — Todas/Ninguna/Defaults siguen operando sobre el set completo,
   filtrado o no, igual que antes. */
function _normBuscar(s){
  return (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}
function filtrarColPanel(q){
  const panel=_getColPanel();
  const scroll=panel.querySelector('.col-panel-scroll');
  if(!scroll) return;
  const nq=_normBuscar(q);
  const nodes=[...scroll.children];
  nodes.forEach(el=>{
    if(!el.classList.contains('col-toggle-item')) return;
    const label=el.querySelector('span')?.textContent||'';
    el.style.display = (!nq || _normBuscar(label).includes(nq)) ? '' : 'none';
  });
  nodes.forEach((el,i)=>{
    if(!el.classList.contains('col-grp-hdr')) return;
    let hayVisible=false;
    for(let j=i+1;j<nodes.length;j++){
      if(nodes[j].classList.contains('col-grp-hdr')) break;
      if(nodes[j].style.display!=='none'){ hayVisible=true; break; }
    }
    el.style.display = hayVisible ? '' : 'none';
  });
}
function initColPanel(tabla){
  const panel=_getColPanel();
  const previousScroll=panel.querySelector('.col-panel-scroll')?.scrollTop || 0;
  const previousQuery=panel.querySelector('#col-panel-buscar')?.value || '';
  const hidden=_hiddenCols(tabla);
  let lastGrp=null, items='';
  COL_META[tabla].cols.forEach(c=>{
    if(c.g!==lastGrp){ items+=`<div class="col-grp-hdr">${c.g}</div>`; lastGrp=c.g; }
    const idx = typeof c.i==='string' ? `'${c.i}'` : c.i;
    items+=`<label class="col-toggle-item"><input type="checkbox" ${hidden.has(c.i)?'':'checked'} onchange="toggleColVis('${tabla}',${idx},this.checked)"><span>${c.l}</span></label>`;
  });
  panel.innerHTML = `
    <div class="col-panel-head">
      <div class="col-panel-title"><div class="col-toggle-hdr">Personalizar columnas · KPIs</div><button class="dias-btn" type="button" onclick="cerrarColPanels()">✕ Cerrar</button></div>
      <input type="text" class="ctl" id="col-panel-buscar" placeholder="🔍 Buscar KPI…" oninput="filtrarColPanel(this.value)" style="width:100%;box-sizing:border-box;margin-bottom:10px">
      <div class="col-toggle-actions">
        <button class="dias-btn" onclick="colTodos('${tabla}',true)">Todas</button>
        <button class="dias-btn" style="color:var(--accent)" onclick="colDefaults('${tabla}')">↺ Defaults</button>
        <button class="dias-btn" onclick="colTodos('${tabla}',false)">Ninguna</button>
      </div>
    </div>
    <div class="col-panel-scroll">${items}</div>
  `;
  panel.querySelector('.col-panel-scroll').scrollTop=previousScroll;
  if(previousQuery){
    const inp=panel.querySelector('#col-panel-buscar');
    if(inp){ inp.value=previousQuery; filtrarColPanel(previousQuery); }
  }
}
function toggleColPanel(tabla, btn){
  const panel=_getColPanel();
  if(panel.classList.contains('open') && _colPanelTabla===tabla){
    cerrarColPanels();
    return;
  }
  _colPanelTabla = tabla;
  initColPanel(tabla);
  abrirColPanel(panel);
}
