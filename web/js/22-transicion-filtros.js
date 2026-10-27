/* ================== 22-transicion-filtros.js — transición al filtrar (estilo Power BI) ==================
   Pedido de Jose (2026-09-24): al filtrar, que los gráficos no salten ni vuelvan a crecer desde
   cero, sino que cada barra/punto/porción pase suavemente de su valor anterior al nuevo (FLIP).
   Adaptación a Chart.js (canvas) de /opt/backoffice/js/tableros-animacion.js (que trabaja con SVG).

   Cómo funciona, sin tocar el código de cada pestaña:
     1. Los tableros hacen chart.destroy() + new Chart() en cada filtro. Al destruir un gráfico
        se guarda una foto de sus valores, por id del <canvas>.
     2. Al crear el gráfico nuevo en ese mismo canvas (poco después de un filtro), se dibuja
        primero, sin animación, con los valores de la foto, y enseguida se pasa a los valores
        reales con una transición de ~380 ms (ease-out). Emparejamiento por ranura: la barra de
        la posición i (del dataset i) parte del valor que había en esa misma posición; lo que no
        existía crece desde la base.
     3. Cifras KPI que cambiaron: suben un poco mientras aparecen; tablas redibujadas: fundido corto.
   Respeta «reducir movimiento» del sistema. Se carga con defer después de Chart.js.
   ============================================================================================ */
(function(){
  const QUIETO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  const quieto = () => !!(QUIETO && QUIETO.matches);
  const DUR = 380, EASE_CHART = 'easeOutCubic', EASE = 'cubic-bezier(.22,.8,.26,1)';
  const VENTANA_DESTROY = 1500;   // ms entre destroy() y new Chart() para considerarlo un redibujo
  const VENTANA_FILTRO  = 10000;  // ms desde el último filtro (cubre la espera de datos remotos)

  let ultimoFiltro = 0;

  /* ---------- 1. Gráficos Chart.js ---------- */
  if(typeof window.Chart === 'function'){
    const Base = window.Chart;
    const fotos = new Map();        // id del canvas → {tipo, datasets:[[valores]], t}

    const idCanvas = item => {
      const el = typeof item === 'string' ? document.getElementById(item)
               : (item && item.canvas) ? item.canvas : item;
      return el && el.id ? el.id : null;
    };
    const numerico = arr => Array.isArray(arr) && arr.every(v => v === null || v === undefined || typeof v === 'number');
    const sinAnimacion = anim => anim === false || (anim && anim.duration === 0);

    class ChartTransicion extends Base {
      constructor(item, config){
        const id = idCanvas(item);
        const foto = id ? fotos.get(id) : null;
        const cfg = config || {};
        const ahora = Date.now();
        const usar = foto && !quieto()
          && foto.tipo === cfg.type
          && (ahora - foto.t < VENTANA_DESTROY || ahora - ultimoFiltro < VENTANA_FILTRO)
          && cfg.data && Array.isArray(cfg.data.datasets) && cfg.data.datasets.length
          && !sinAnimacion(cfg.options && cfg.options.animation);
        if(!usar){ super(item, config); return; }
        if(id) fotos.delete(id);

        /* valores de partida: los de la foto en la misma ranura; lo nuevo, desde la base
           (en líneas, desde su propio valor para no dibujar picos falsos) */
        const reales = cfg.data.datasets.map(ds => ds.data);
        cfg.data.datasets.forEach((ds, i) => {
          if(!numerico(ds.data)) return;
          const antes = foto.datasets[i] || [];
          const linea = (ds.type || cfg.type) === 'line';
          ds.data = ds.data.map((v, j) => {
            const a = antes[j];
            if(typeof a === 'number') return a;
            return linea ? v : (v === null || v === undefined ? v : 0);
          });
        });
        cfg.options = cfg.options || {};
        const tieneAnim = Object.prototype.hasOwnProperty.call(cfg.options, 'animation');
        const animOrig = cfg.options.animation;
        cfg.options.animation = false;
        cfg.options.transitions = cfg.options.transitions || {};
        cfg.options.transitions.filtro = {animation:{duration:DUR, easing:EASE_CHART}};

        super(item, cfg);

        /* devolver los valores reales y la animación original, y transicionar */
        if(tieneAnim) this.config.options.animation = animOrig; else delete this.config.options.animation;
        this.data.datasets.forEach((ds, i) => { if(reales[i] !== undefined) ds.data = reales[i]; });
        try{ this.update('filtro'); }
        catch(e){ try{ this.update('none'); }catch(e2){} }
      }
      destroy(){
        try{
          const id = this.canvas && this.canvas.id;
          if(id && this.data && this.config){
            fotos.set(id, {
              tipo: this.config.type,
              datasets: (this.data.datasets || []).map(ds => numerico(ds.data) ? ds.data.slice() : []),
              t: Date.now()
            });
          }
        }catch(e){}
        return super.destroy();
      }
    }
    window.Chart = ChartTransicion;
  }

  /* ---------- 2. Cifras KPI y tablas ---------- */
  if(!Element.prototype.animate) return;
  const SEL_KPI = '.kpi-card .kv';

  function foto(){
    const f = {tbodys:new WeakSet(), kpis:new Map()};
    document.querySelectorAll('tbody').forEach(tb => { if(tb.firstElementChild) f.tbodys.add(tb.firstElementChild); });
    document.querySelectorAll(SEL_KPI).forEach(v => f.kpis.set(v, v.textContent));
    return f;
  }
  function animar(antes){
    document.querySelectorAll('tbody').forEach(tb => {
      const f = tb.firstElementChild;
      if(f && !antes.tbodys.has(f) && tb.offsetParent !== null)
        tb.animate([{opacity:.5},{opacity:1}], {duration:240, easing:'ease-out'});
    });
    /* KPI: el mismo nodo con otro texto, o un nodo nuevo en el mismo orden con otro texto */
    const previos = [...antes.kpis.entries()];
    document.querySelectorAll(SEL_KPI).forEach((v, i) => {
      const txt = antes.kpis.has(v) ? antes.kpis.get(v) : (previos[i] ? previos[i][1] : null);
      if(txt !== null && txt !== v.textContent)
        v.animate([{opacity:.3, transform:'translateY(4px)'},{opacity:1, transform:'none'}], {duration:300, easing:EASE});
    });
  }

  let pendiente = null;
  function antesDeFiltrar(e){
    if(e.type === 'click' && !e.target.closest('button, a, label, select, input, th, [role="button"], [data-dias], [data-cant], [data-fila], .chip, .pill')) return;
    ultimoFiltro = Date.now();
    if(quieto() || pendiente) return;               // un solo cambio por pintado
    pendiente = foto();
    requestAnimationFrame(() => { const f = pendiente; pendiente = null; animar(f); });
  }
  document.addEventListener('click', antesDeFiltrar, true);
  document.addEventListener('change', antesDeFiltrar, true);
  document.addEventListener('input', antesDeFiltrar, true);
})();
