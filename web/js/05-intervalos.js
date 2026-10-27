/* ================== 05-intervalos.js — pestaña Intervalos (fecha única o "Todas", eje FRANJA_GTR) ================== */

function buildSelectFechaIntervalos(rows){
  const sel = document.getElementById('sel-fecha-int');
  const fechas = [...new Set(rows.map(r=>r.FECHA))].sort().reverse(); // más reciente primero
  const prev = sel.value;
  let opts = '<option value="ALL">Todas</option>';
  opts += fechas.map(f=>{
    const r = rows.find(x=>x.FECHA===f);
    return `<option value="${f}">${r?r.FECHA_VISUAL:f}</option>`;
  }).join('');
  sel.innerHTML = opts;
  if(prev && (prev==='ALL' || fechas.includes(prev))) sel.value = prev;
  else if(fechas.length) sel.value = fechas[0]; // por default: la fecha más reciente del período
}

let FILTRADO_INTERVALOS = [];

/* Pill "9/18/27/36 interv" — corte acumulativo por cantidad de franjas del día (o de la
   fecha más temprana en modo "Todas"), para leer el avance del día sin esperar las 36. */
let filtCantInt = '36';
function aplicarFiltroCant(rows){
  const n = parseInt(filtCantInt, 10);
  return isNaN(n) ? rows : rows.slice(0, n);
}

function renderIntervalos(rowsPeriodo){
  buildSelectFechaIntervalos(rowsPeriodo);
  const fecha = document.getElementById('sel-fecha-int').value;

  let rows, kpiRows, axisFecha;
  if(fecha==='ALL'){
    rows = aplicarFiltroCant(aggByFranja(rowsPeriodo));
    const franjasIncluidas = new Set(rows.map(r=>r.FRANJA_GTR));
    kpiRows = rowsPeriodo.filter(r=>franjasIncluidas.has((r.FRANJA_GTR||'').toString().trim().slice(0,5)));
    axisFecha = true;
  } else {
    rows = aplicarFiltroCant(trimTrailingEmpty(rowsPeriodo.filter(r=>r.FECHA===fecha).sort((a,b)=>a.FRANJA_GTR<b.FRANJA_GTR?-1:1)));
    kpiRows = rows;
    axisFecha = false;
  }

  FILTRADO_INTERVALOS = rows;
  renderKPIStrip(kpiRows, 'kpi-strip-int');
  renderTable(rows, axisFecha, 'tbody-int', 'int');
  renderChartIntervalos(rows);

  const pillInt = document.getElementById('int-fecha-pill');
  if(pillInt){
    if(fecha==='ALL'){
      const nDias = new Set(rowsPeriodo.map(r=>r.FECHA)).size;
      pillInt.textContent = `Todas · ${nDias} días`;
    } else {
      const r0 = rowsPeriodo.find(x=>x.FECHA===fecha);
      pillInt.textContent = r0 ? r0.FECHA_VISUAL : fecha;
    }
  }
}
