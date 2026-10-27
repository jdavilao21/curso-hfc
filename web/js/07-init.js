/* ================== 07-init.js — filtros globales, selects, orquestación de render ================== */

let filtPeriodo='ALL', filtSemana='ALL', filtDias='ALL';
let diaVista='dia';
/* Pill "Mostrar fecha actual" (Sí/No), junto a Meta TNPS (Jose, 2026-09-17) — "No" por defecto:
   excluye la fecha de hoy de Diario (solo hasta ayer). "Sí" muestra hasta la fecha más actual
   (hoy). Mismo patrón/helpers que el pill Todos/Día-1 de Asesores (js/14-asesores.js). */
let _diaMostrarHoy = false;
/* Pill "TMG: Ambos/TMG Solo" (Jose, 2026-09-17) — compartido entre Diario e Intervalos (misma
   columna TMG P/RQ en ambas tablas, mismo rowHTML() de 04-diario.js). "Ambos" (default) deja la
   columna igual que siempre (Real / Rq., fila TOTAL en "—"). "TMG Solo" muestra únicamente TMG
   Real (sin el " / Rq.") y, a diferencia de "Ambos", sí calcula un total real en la fila TOTAL
   (antes esa celda quedaba en "—" en los dos modos). La columna "TMG Δ" no cambia en ningún modo
   — el pedido fue puntual sobre "el TMG RQ" del combinado, no sobre el delta. */
let _tmgSolo = false;
function setTmgVista(modo, btn){
  const solo = modo==='solo';
  if(_tmgSolo===solo) return;
  _tmgSolo = solo;
  document.querySelectorAll('.tmg-vista-tgl button').forEach(b=>b.classList.toggle('on', b.dataset.tmg===modo));
  document.querySelectorAll('th[data-col="TMG"]').forEach(th=>{ th.textContent = solo ? 'TMG' : 'TMG P/RQ'; });
  renderAll();
}
let FILTRADO_DIARIO = [];

function buildSelects(){
  /* Período de mayor a menor (Jose, 2026-09-17) — antes ascendente. */
  const periodos=[...new Set(RAW_DATA.map(r=>r.PERIODO))].sort().reverse();
  const semanas=[...new Set(RAW_DATA.map(r=>r.SEMANA))].sort();
  const selP=document.getElementById('sel-periodo');
  selP.innerHTML = '<option value="ALL">Todos</option>' + periodos.map(p=>`<option value="${p}">${p}</option>`).join('');
  selP.value = periodos[0] || 'ALL';
  filtPeriodo = selP.value;

  const selS=document.getElementById('sel-semana');
  selS.innerHTML = '<option value="ALL">Todas</option>' + semanas.map(s=>`<option value="${s}">${s}</option>`).join('');
  selS.value='ALL';
}

function aplicarFiltroDias(rowsPorFecha){
  if(filtDias==='ALL') return rowsPorFecha;
  const n=parseInt(filtDias,10);
  return rowsPorFecha.slice(-n);
}

function datosBase(){
  let rows = RAW_DATA;
  if(filtPeriodo!=='ALL') rows = rows.filter(r=>String(r.PERIODO)===String(filtPeriodo));
  return rows;
}

const DIA_VISTA_LABEL = {dia:'Fecha', semana:'Semana', mes:'Mes'};
const DIA_VISTA_TITLE = {dia:'Detalle diario', semana:'Detalle semanal', mes:'Detalle mensual'};

function setDiaVista(v, btn){
  diaVista = v;
  document.querySelectorAll('#dia-vista-tgl button').forEach(b=>b.classList.toggle('on', b===btn));
  document.getElementById('dia-dias-seg').style.display = v==='dia' ? 'flex' : 'none';
  document.getElementById('dia-th-eje').textContent = DIA_VISTA_LABEL[v];
  document.getElementById('dia-tbl-title').textContent = DIA_VISTA_TITLE[v];
  renderAll();
}

function setDiaFechaHoy(modo, btn){
  const on = modo==='si';
  if(_diaMostrarHoy===on) return;
  _diaMostrarHoy = on;
  if(btn) document.querySelectorAll('#dia-fecha-hoy-tgl button').forEach(b=>b.classList.toggle('on', b===btn));
  renderAll();
}

function renderDiario(){
  let rows = datosBase();
  /* "No" (default): excluye solo la fecha MÁS RECIENTE cargada en el período (Jose, 2026-09-17
     ronda 2: "no debería considerar el 17" — con 15/16/17 cargados, ocultar solo el 17, dejar
     15 y 16). Corrige la versión anterior, que usaba `_fechaAyerISO()` (reloj real del navegador,
     `new Date()`) — si el reloj local del navegador no coincide exactamente con la fecha del
     servidor/dato (distinto huso horario, por ejemplo), "ayer" podía calcular un día de más y
     terminaba ocultando también el 16. Calcularlo desde la fecha máxima de `rows` es inmune a
     ese desfase: siempre oculta exactamente el último día cargado, sea cual sea. */
  if(!_diaMostrarHoy){
    const fechas = [...new Set(rows.map(r=>r.FECHA))].filter(Boolean).sort();
    const maxFecha = fechas.length ? fechas[fechas.length-1] : null;
    if(maxFecha) rows = rows.filter(r=>String(r.FECHA)!==maxFecha);
  }
  if(filtSemana!=='ALL') rows = rows.filter(r=>r.SEMANA===filtSemana);

  let porFila, rowsVisibles;
  if(diaVista==='semana'){
    porFila = aggBySemana(rows);
    rowsVisibles = rows;
  } else if(diaVista==='mes'){
    porFila = aggByMes(rows);
    rowsVisibles = rows;
  } else {
    porFila = aplicarFiltroDias(aggByFecha(rows));
    const fechasVisibles = new Set(porFila.map(o=>o.FECHA));
    rowsVisibles = rows.filter(r=>fechasVisibles.has(r.FECHA));
  }
  FILTRADO_DIARIO = porFila;
  renderKPIStrip(filasKpiDiario(rowsVisibles, porFila), 'kpi-strip-dia');   // clic en fila = filtro cruzado (23-filtro-fila-diario.js)
  renderTable(porFila, true, 'tbody-dia', 'dia');
  marcarFilaDiario();

  const pillDia = document.getElementById('dia-periodo-pill');
  if(pillDia) pillDia.textContent = filtPeriodo==='ALL' ? 'Todos los períodos' : filtPeriodo;
}

function renderAll(){
  if(currentTab==='diario') renderDiario();
  else if(currentTab==='intervalos') renderIntervalos(datosBase());
  else if(currentTab==='supervisores') renderSupervisores();
  else if(currentTab==='asesores') renderAsesores();
}

function cargarDatos(){
  buildSelects();
  buildSelectPeriodoSup();
  buildSelectPeriodoAs();
  applyHiddenCols('dia'); applyHiddenCols('int'); applyHiddenCols('sup'); applyHiddenCols('as');
  document.getElementById('sel-periodo').onchange = e=>{ filtPeriodo=e.target.value; renderAll(); };
  document.getElementById('sel-semana').onchange  = e=>{ filtSemana=e.target.value; renderAll(); };
  document.getElementById('sel-fecha-int').onchange = ()=> renderAll();
  document.getElementById('sel-periodo-sup').onchange = ()=> renderAll();
  document.getElementById('sel-periodo-as').onchange = ()=> renderAll();
  document.querySelectorAll('[data-dias]').forEach(b=>{
    b.onclick = ()=>{
      document.querySelectorAll('[data-dias]').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      filtDias = b.dataset.dias;
      renderAll();
    };
  });
  document.querySelectorAll('[data-cant]').forEach(b=>{
    b.onclick = ()=>{
      document.querySelectorAll('[data-cant]').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      filtCantInt = b.dataset.cant;
      renderAll();
    };
  });
  document.querySelectorAll('.inp-tnps-meta').forEach(i=>i.addEventListener('input', renderAll));
  renderAll();
}
