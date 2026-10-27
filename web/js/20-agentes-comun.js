/* ================== 20-agentes-comun.js — piezas comunes de Asesores ==================
   Limpieza de HFC (08-oct-2026): al eliminar Retenciones (17, 18), Reporte Cliente (19, 20, 21), Objetivos (23) y
   Compartir (24), estas funciones se conservaron aquí porque las usan las pestañas que quedan:
   - estadoBadge / estadoBucket: estado ACTIVO / CESE de la nómina (tabla de Asesores, dona «Asesores por Estado»).
   - renderDonaFiltro: dona clicable que filtra (dona «Asesores por Estado»).
   - barraTop: barras horizontales Top 10 Agentes / Top 5 Supervisores por %TNPS.
   - fmtFechaCorta: fecha corta «dd-mmm» (etiqueta del filtro «Día -1» de Asesores). */

/* Color «#rrggbb» con transparencia → rgba(). */
function _hexA(hex, alpha){
  const h = String(hex||'').replace('#','');
  if(h.length!==6) return hex;
  const n = parseInt(h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

/* ---------- Estado del asesor (ACTIVO / CESE, columna ESTADO de la nómina) ----------
   OJO: no es ESTADO_OP (esa es la modalidad: REMOTO / PRESENCIAL). Si llega vacío (asesor sin nómina) se muestra «—». */
function estadoBadge(v){
  const s = String(v||'').trim().toUpperCase();
  if(!s) return '<span class="estado" style="opacity:.45">—</span>';
  const activo = s.startsWith('ACTIV');
  return `<span class="estado ${activo?'ap':'des'}">${s}</span>`;
}
function estadoBucket(estado){
  const s = String(estado||'').trim().toUpperCase();
  if(!s) return 'SIN_NOMINA';
  return s.startsWith('ACTIV') ? 'ACTIVO' : 'CESE';
}

/* ---------- Fecha corta ---------- */
const _MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function _fecha10(v){ return String(v||'').slice(0,10); }
function fmtFechaCorta(f){
  f = _fecha10(f);
  if(!f) return '—';
  const rd = (RAW_DATA||[]).find(r=>_fecha10(r.FECHA)===f);
  if(rd && rd.FECHA_VISUAL) return rd.FECHA_VISUAL;
  const [, m, d] = f.split('-');
  return m&&d ? `${d}-${_MESES_CORTOS[+m-1]||m}` : f;
}

/* ── Dona que filtra: motor común (Fase 2 del orden del código, 2026-09-24) ──
   La usa «Asesores por Estado» (Asesores). Dibuja la dona,
   pinta en gris (--dim) los segmentos no elegidos, separa el elegido, marca la tarjeta (borde de color,
   etiqueta «🔎 …» y destello solo cuando el filtro cambia) y arma la leyenda clicable.
   cfg = { ids:{canvas, leyenda, card, filtro}, registro:{chart, prev}, segmentos:[{clave, etiqueta, color, n}],
           total, sel, alTocar(clave), onclick:'nombreFuncionGlobal' | (clave → código JS), pill(seg), titulo(seg),
           tooltip(seg, n, pct), fila(seg, n, pct) → HTML interior de la fila de la leyenda,
           separacion (18), animacionMs (450), compacta (leyenda más chica) } */
function renderDonaFiltro(cfg){
  const canvas = document.getElementById(cfg.ids.canvas);
  const leyenda = document.getElementById(cfg.ids.leyenda);
  const card = document.getElementById(cfg.ids.card);
  const filtroTag = document.getElementById(cfg.ids.filtro);
  if(!canvas || typeof Chart==='undefined') return;
  const reg = cfg.registro;
  if(reg.chart){ try{ reg.chart.destroy(); }catch(e){} }

  const segs = cfg.segmentos, total = cfg.total, sel = cfg.sel;
  const selSeg = segs.find(s=>s.clave===sel);
  const grisInactivo = _cssVar('--dim');
  const pctDe = n => total>0 ? (n/total*100).toFixed(1) : '0.0';

  if(card) card.classList.toggle('filtrando', !!sel);
  if(card){
    if(selSeg) card.style.setProperty('--rcag-sel-color', selSeg.color);
    else card.style.removeProperty('--rcag-sel-color');
  }
  if(filtroTag) filtroTag.innerHTML = sel
    ? `<span class="rcag-pill" style="background:${_hexA(selSeg.color,.16)};color:${selSeg.color};border-color:${selSeg.color}">🔎 ${cfg.pill(selSeg)}</span>`
    : '';
  /* Destello de la tarjeta solo cuando el filtro realmente cambió (seleccionar, cambiar de segmento o
     limpiar) — no en cada re-render por búsqueda/orden/período, para no «parpadear» sin motivo. */
  if(card && sel!==reg.prev) destello([cfg.ids.card], 'rcag-flash');
  reg.prev = sel;
  const separacion = cfg.separacion ?? 18;

  reg.chart = new Chart(canvas, {
    type:'doughnut',
    data:{ labels:segs.map(s=>s.etiqueta), datasets:[{ data:segs.map(s=>s.n),
      backgroundColor:segs.map(s=> sel && s.clave!==sel ? grisInactivo : s.color), borderColor:_cssVar('--surface'),
      borderWidth:segs.map(s=>s.clave===sel?4:2), offset:segs.map(s=>s.clave===sel?separacion:0), hoverOffset:6 }] },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'62%',
      animation:{duration:cfg.animacionMs ?? 450, easing:'easeOutQuart'},
      onClick:(evt, elems)=>{ if(!elems.length) return; cfg.alTocar(segs[elems[0].index].clave); },
      onHover:(evt, elems)=>{ if(evt.native) evt.native.target.style.cursor = elems.length?'pointer':'default'; },
      plugins:{
        legend:{display:false},
        tooltip:{ callbacks:{ label:ctx=>cfg.tooltip(segs[ctx.dataIndex], ctx.parsed, pctDe(ctx.parsed)) } }
      }
    }
  });

  if(leyenda){
    const [fuente, relleno, muestra] = cfg.compacta ? ['11.5px','4px 6px','10px'] : ['12px','5px 6px','11px'];
    leyenda.innerHTML = segs.map(sg=>{
      const filaSel = sel===sg.clave, atenuar = sel && !filaSel;
      const onclick = typeof cfg.onclick==='function' ? cfg.onclick(sg.clave) : `${cfg.onclick}('${sg.clave}')`;
      return `<div onclick="${onclick}" title="${cfg.titulo(sg)}" class="rcag-leyenda-fila${filaSel?' sel':''}" style="display:flex;align-items:center;gap:8px;font-size:${fuente};font-family:var(--mono);padding:${relleno};border-radius:6px;cursor:pointer;${filaSel?`background:${_hexA(sg.color,.14)};box-shadow:inset 3px 0 0 ${sg.color}`:''}${atenuar?';opacity:.45':''}">
        <span style="width:${muestra};height:${muestra};border-radius:3px;background:${sg.color};flex:0 0 auto"></span>
        ${cfg.fila(sg, sg.n, pctDe(sg.n))}
      </div>`;
    }).join('');
  }
}

/* ---------- Top 10 Agentes / Top 5 Supervisores ----------
   items = [{nombre, pct}] con pct en fracción (0–1). Color por meta de TNPS: verde en meta, amarillo atención, rojo debajo. */
function barraTop(canvasId, items){
  const canvas = document.getElementById(canvasId);
  if(!canvas || typeof Chart==='undefined') return null;
  const colors = items.map(o=> o.pct>=TH.TNPS.v ? '#59A14F' : o.pct>=TH.TNPS.a ? '#EDC948' : '#E15759');
  const cTick = _cssVar('--text'), cGrid = _cssVar('--border');
  return new Chart(canvas, {
    type:'bar',
    data:{ labels:items.map(o=>o.nombre), datasets:[{ data:items.map(o=>+(o.pct*100).toFixed(2)), backgroundColor:colors, borderRadius:5, maxBarThickness:18 }] },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>`${ctx.parsed.x.toFixed(2)}%` } } },
      scales:{
        x:{ grid:{color:cGrid}, ticks:{color:cTick, font:{size:10}, callback:v=>v+'%'}, suggestedMin:0, suggestedMax:100 },
        y:{ grid:{display:false}, ticks:{color:cTick, font:{size:10}} }
      }
    }
  });
}
