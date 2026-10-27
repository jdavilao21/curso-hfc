/* ================== 23-filtro-fila-diario.js — filtro cruzado de Diario (clic en una fila → tarjetas) ==================
   Pedido de Jose (08-oct-2026): «en la hoja Diario, si doy clic en una fila de la tabla, que se filtren los cards
   superiores como un Power BI». Al hacer clic en una fila (un día, una semana o un mes, según la vista):
     - las tarjetas de arriba se recalculan solo con esa fila, con la transición de 22-transicion-filtros.js
       (cifras que suben con fundido, ~300 ms; respeta «reducir movimiento»);
     - la fila queda resaltada y las demás atenuadas, como el resaltado de Power BI;
     - aparece la etiqueta «🔎 Tarjetas filtradas: …  ✕» junto a «Personalizar tarjetas».
   Se quita con otro clic en la misma fila, con clic en la etiqueta o con Escape. Al cambiar de vista o de filtros,
   si la fila elegida ya no está en la tabla, la selección se borra sola. La fila TOTAL no filtra.
   Los minigráficos de las tarjetas siguen mostrando toda la serie, con el punto sobre la fila elegida. */

let _diaFilaSel = null;      // clave de la fila elegida (ver claveFilaDia) o null
let _diaFilaUltRows = [];    // filas crudas visibles del último renderDiario (para recalcular sin redibujar la tabla)

/* Clave de una fila agregada o de una fila cruda, según la vista de la tabla (día / semana / mes). */
function claveFilaDia(o){
  if(diaVista==='semana') return o.PERIODO+'|'+o.SEMANA;
  if(diaVista==='mes')    return String(o.PERIODO);
  return String(o.FECHA);
}

/* Llamada desde renderDiario: guarda las filas visibles, borra la selección si su fila ya no existe y devuelve
   las filas con las que se calculan las tarjetas. */
function filasKpiDiario(rowsVisibles, porFila){
  _diaFilaUltRows = rowsVisibles;
  if(_diaFilaSel && !porFila.some(o=>claveFilaDia(o)===_diaFilaSel)) _diaFilaSel = null;
  return _diaFilaSel ? rowsVisibles.filter(r=>claveFilaDia(r)===_diaFilaSel) : rowsVisibles;
}

/* Resalta la fila elegida, atenúa las demás y muestra / oculta la etiqueta del filtro. */
function marcarFilaDiario(){
  const tbody = document.getElementById('tbody-dia');
  if(tbody){
    tbody.classList.toggle('xf-activo', !!_diaFilaSel);
    tbody.querySelectorAll('tr[data-fila]').forEach(tr=>{
      const sel = tr.dataset.fila===_diaFilaSel;
      tr.classList.toggle('xf-sel', sel);
      tr.setAttribute('aria-selected', sel ? 'true' : 'false');
    });
  }
  const chip = document.getElementById('dia-fila-chip');
  if(!chip) return;
  if(!_diaFilaSel){ chip.hidden = true; return; }
  const o = (FILTRADO_DIARIO||[]).find(x=>claveFilaDia(x)===_diaFilaSel);
  chip.textContent = `🔎 Tarjetas filtradas: ${o ? o.FECHA_VISUAL : _diaFilaSel}  ✕`;
  chip.hidden = false;
}

/* Elegir / soltar una fila: solo se recalculan las tarjetas (la tabla no se redibuja, así no parpadea). */
function seleccionarFilaDiario(clave){
  _diaFilaSel = (clave && clave!==_diaFilaSel) ? clave : null;
  const rows = _diaFilaSel ? _diaFilaUltRows.filter(r=>claveFilaDia(r)===_diaFilaSel) : _diaFilaUltRows;
  renderKPIStrip(rows, 'kpi-strip-dia');
  marcarFilaDiario();
}
function limpiarFilaDiario(){ if(_diaFilaSel) seleccionarFilaDiario(null); }

document.addEventListener('click', e=>{
  const tr = e.target.closest('#tbody-dia tr[data-fila]');
  if(!tr || e.target.closest('a, button, input, select')) return;
  if(String(window.getSelection && window.getSelection()) !== '') return;   // estaba seleccionando texto para copiar
  seleccionarFilaDiario(tr.dataset.fila);
});
document.addEventListener('keydown', e=>{
  const tr = e.target.closest && e.target.closest('#tbody-dia tr[data-fila]');
  if(tr && (e.key==='Enter' || e.key===' ')){ e.preventDefault(); seleccionarFilaDiario(tr.dataset.fila); return; }
  // Escape suelta la fila solo si no hay una ventana abierta encima (esas se cierran primero con su propio Escape).
  if(e.key==='Escape' && _diaFilaSel && currentTab==='diario' && !document.querySelector('.co-modal.open, .tnps-modal.open, #chart-modal.open')
     && document.getElementById('modal-oport')?.style.display!=='flex') limpiarFilaDiario();
});
