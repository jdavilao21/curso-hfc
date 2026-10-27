/* ================== 01-core.js — Config, sesión, login, tema, navegación ================== */

const CFG = {
  API: '/api',                 // Misma origen que la web (Nginx → FastAPI): sin CORS (ADR-0004).
  OFFLINE: false,              // false = login y datos vía API. true = datos de ejemplo generados en el navegador, sin red.
};


let SESION = { usuario_e:null, nombre:null, perfil:null, token:null };

/* Seguridad (revisión del 08-oct-2026): los textos de la API (nombres, supervisores, coordinadores… que vienen de la
   nómina cargada desde Excel) se insertan con innerHTML en muchas tablas y tarjetas. limpiarTextos() quita < > " ` de
   todos los textos de una respuesta antes de guardarla, así un dato malicioso no puede crear etiquetas ni atributos.
   Los nombres reales no usan esos caracteres. Se aplica en cada lectura de la API que se dibuja en pantalla.
   Security pass (SP-08): también ' y \\ como defensa en profundidad, por si un dato llega algún día a un
   onclick="fn('…')" (hoy esos onclick solo usan claves fijas, p. ej. ACTIVO/CESE en 14-asesores.js). */
function limpiarTextos(v){
  if(typeof v === 'string') return v.replace(/[<>"`'\\]/g, '');
  if(Array.isArray(v)){ for(let i=0;i<v.length;i++) v[i] = limpiarTextos(v[i]); return v; }
  if(v && typeof v === 'object'){ for(const k in v) v[k] = limpiarTextos(v[k]); return v; }
  return v;
}

function normalizePerfil(p){
  p = String(p||'').trim().toUpperCase().replace(/\s+/g,' ');
  if(p==='ADMIN') return 'ADMINISTRADOR';
  if(/^CLIENTE[\s_-]*CLARO$/.test(p)) return 'CLIENTE CLARO';
  return p;
}

/* Acceso por campaña (2026-09-22): ADMINISTRADOR, BACK y CALIDAD (perfiles de apoyo) entran a los tres
   sistemas (ATC, Cross, HFC); el resto solo si su campaña es HFC. hfc-login no devuelve la
   campaña, así que se lee de la claim `campana` del token. La API aplica la misma regla (403). */
const NOMBRE_SISTEMA = { FRONT:'ATC', CROSS:'Cross', 'HFC':'HFC' };
function campanaDelToken(token){
  try{
    const p = String(token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const bytes = Uint8Array.from(atob(p + '='.repeat((4 - p.length % 4) % 4)), ch => ch.charCodeAt(0));
    return String(JSON.parse(new TextDecoder().decode(bytes)).campana || '').trim().toUpperCase();
  }catch(e){ return ''; }
}
function accesoCampana(perfil, campana){
  if(['ADMINISTRADOR','BACK','CALIDAD'].includes(perfil)) return null;
  if(!campana || campana === 'HFC') return null;   // sin dato: decide la API
  return `Tu usuario pertenece a la campaña ${campana} — ingresa desde el dashboard de ${NOMBRE_SISTEMA[campana] || campana}.`;
}

async function doLogin(){
  const u = (document.getElementById('inp-user').value||'').trim().toUpperCase();
  const p = document.getElementById('inp-pass').value||'';
  const err = document.getElementById('login-err');
  const btn = document.getElementById('btn-login');
  err.classList.remove('show');
  if(!u || !p){ err.textContent='Ingresa usuario y contraseña.'; err.classList.add('show'); return; }

  btn.disabled = true; btn.textContent = 'Verificando…';
  try{
    let data;
    if(CFG.OFFLINE){
      await new Promise(r=>setTimeout(r,350));
      // Sin usuarios con contraseña en el JS (es público): el login offline queda deshabilitado.
      data = { ok:false, msg:'Login no disponible en modo sin conexión' };
    } else {
      const res = await fetch(`${CFG.API}/hfc-login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ usuario_e:u, password:p })
      });
      data = await res.json();
    }
    if(!data.ok){ err.textContent = data.msg || 'Usuario o contraseña incorrectos'; err.classList.add('show'); return; }

    const perfil = normalizePerfil(data.perfil);
    const msgCamp = accesoCampana(perfil, data.campana || campanaDelToken(data.token));
    if(msgCamp){ err.textContent = msgCamp; err.classList.add('show'); return; }

    SESION = { usuario_e:data.usuario_e, nombre:data.nombre, perfil, token:data.token, supervisor:data.supervisor||null };
    iniciarSesion();
  }catch(e){
    err.textContent = 'No se pudo conectar. Intenta de nuevo.';
    err.classList.add('show');
  }finally{
    btn.disabled = false; btn.textContent = 'Ingresar';
  }
}

function iniciarSesion(){
  document.getElementById('pantalla-login').style.display = 'none';
  document.getElementById('app').classList.add('on');
  document.getElementById('sb-who').textContent = SESION.nombre || SESION.usuario_e;
  document.getElementById('sb-perfil').textContent = SESION.perfil;
  aplicarPermisos();
  if(CFG.OFFLINE){
    RAW_DATA = foldIntervals(mockRawData());
    RAW_ASESORES = mockRawAsesores();
    cargarDatos();
  } else {
    cargarDatosReales();
  }
}

function cerrarSesion(){
  SESION = { usuario_e:null, nombre:null, perfil:null, token:null };
  if(document.body.classList.contains('tv-on') && typeof tvOff==='function') tvOff();
  document.getElementById('app').classList.remove('on');
  document.getElementById('pantalla-login').style.display = 'flex';
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pass').value = '';
}

/* Sesión vencida: con AUTH_MODE=enforce la API responde 401 a un token vencido o inválido (dura 10 h).
   Se vuelve al login con un aviso, en vez de dejar tablas vacías o alertas «Error HTTP 401».
   hfc-login queda fuera (ahí un 401 son credenciales malas) y un 401 de una petición hecha con un
   token anterior se ignora (p. ej. respuesta tardía tras volver a ingresar). Mismo patrón que ATC. */
(function(){
  const _fetch = window.fetch.bind(window);
  let _avisando = false;
  const _authDe = init => {
    const h = init && init.headers;
    if(!h) return '';
    return (typeof h.get === 'function' ? h.get('Authorization') : (h.Authorization || h.authorization)) || '';
  };
  window.fetch = async function(input, init){
    const r = await _fetch(input, init);
    if((r.status === 401 || r.status === 403) && !_avisando && SESION && SESION.token && SESION.token !== 'mock-token'){
      const url = typeof input === 'string' ? input : ((input && input.url) || '');
      const usado = _authDe(init);
      if(url.startsWith(CFG.API) && !url.includes('/hfc-login') && (!usado || usado === 'Bearer ' + SESION.token)){
        _avisando = true;
        cerrarSesion();
        const e = document.getElementById('login-err');
        if(e){ e.textContent = r.status === 403 ? 'Tu usuario no tiene acceso al panel HFC. Si crees que es un error, comunícate con la Jefatura de Planificación y Métricas.' : 'Tu sesión venció. Ingresa de nuevo.'; e.classList.add('show'); }
        setTimeout(()=>{ _avisando = false; }, 2000);
      }
    }
    return r;
  };
})();

/* Botón "Actualizar" del header — re-consulta la API (o re-genera mock en modo demo) y
   re-renderiza la pestaña activa. Mismo patrón que ATC: js/01-core.js:doRefresh(). */
async function doRefresh(){
  const btn = document.getElementById('btn-refresh');
  if(!btn) return;
  btn.classList.add('spin'); btn.disabled = true;
  try{
    if(CFG.OFFLINE){
      RAW_DATA = foldIntervals(mockRawData());
      RAW_ASESORES = mockRawAsesores();
      cargarDatos();
    } else {
      await cargarDatosReales();
    }
  } finally {
    btn.classList.remove('spin'); btn.disabled = false;
  }
}

/* Opciones de navegación visibles para cada perfil restringido. */
const TABS_POR_PERFIL = {
  'AGENTE': ['supervisores'],
  'CLIENTE CLARO': ['diario','intervalos','supervisores']
};
function tabPermitida(tab){
  const permitidas = TABS_POR_PERFIL[SESION.perfil];
  return !permitidas || permitidas.includes(tab);
}
function aplicarPermisos(){
  const p = SESION.perfil;
  const botones = [...document.querySelectorAll('.sb-nav button[data-tab]')];
  botones.forEach(b=>{ b.style.display = tabPermitida(b.dataset.tab) ? '' : 'none'; });
  const inicial = p==='AGENTE' ? 'supervisores' : 'diario';
  currentTab = inicial;
  botones.forEach(b=>b.classList.toggle('on', b.dataset.tab===inicial));
  document.querySelectorAll('.tab-pane').forEach(pane=>pane.classList.toggle('on', pane.id==='tab-'+inicial));
}

/* ---------- Utilidades comunes (Fase 2 del orden del código, 2026-09-24) ---------- */
/* Fecha local de hoy/ayer en AAAA-MM-DD. No usa `new Date().toISOString()` a propósito: esa función
   convierte a UTC y puede correr el día cerca de medianoche; se arma con getFullYear/getMonth/getDate.
   La usan Asesores («Día -1») y Retenciones. */
function _fechaLocalISO(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function _fechaHoyISO(){ return _fechaLocalISO(new Date()); }
function _fechaAyerISO(){ const d = new Date(); d.setDate(d.getDate()-1); return _fechaLocalISO(d); }

/* Tablas ordenables (clic en el encabezado). estado = {col:null|índice, dir:1|-1}; claves = arreglo con una
   función por columna que devuelve el valor a comparar (texto → orden alfabético, número → numérico).
   Clic en la misma columna invierte el orden. Lo usan todas las tablas ordenables del sistema (Diario,
   Intervalos, Supervisores, Asesores, Horas, Retenciones y Reporte Cliente › Agentes). */
function alternarOrden(estado, col){
  if(estado.col===col) estado.dir *= -1; else { estado.col = col; estado.dir = 1; }
}
function ordenarFilas(filas, estado, claves, ...extra){      // extra: datos que la clave necesita (p. ej. eje fecha/franja en Diario)
  if(estado.col===null) return filas;
  const key = claves[estado.col];
  if(!key) return filas;
  return [...filas].sort((a,b)=>{
    const va = key(a, ...extra), vb = key(b, ...extra);
    if(typeof va==='string') return va.localeCompare(vb)*estado.dir;
    return (va-vb)*estado.dir;
  });
}
function marcarOrden(selectorTh, estado){
  document.querySelectorAll(selectorTh).forEach((th,i)=>{
    th.classList.toggle('sort-asc',  estado.col===i && estado.dir===1);
    th.classList.toggle('sort-desc', estado.col===i && estado.dir===-1);
  });
}

/* Etiqueta de filtro activo («🔎 Supervisor: X  ✕»): con texto se muestra; con null/'' se oculta.
   La usan Asesores, Retenciones y las 3 vistas de Reporte Cliente. */
function pintarChip(id, texto){
  const el = document.getElementById(id);
  if(!el) return;
  if(!texto){ el.style.display = 'none'; return; }
  el.style.display = 'inline-flex';
  el.textContent = texto;
}

/* Destello de «se aplicó un filtro»: vuelve a disparar la animación de `clase` en cada elemento (por id). */
function destello(ids, clase='ret-flash'){
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove(clase);
    void el.offsetWidth;   // fuerza reflow para poder re-disparar la animación en clics seguidos
    el.classList.add(clase);
  });
}

/* Selector de Período. valores = PERIODO de cada fila. Opciones:
   todos     → agrega «Todos» (valor 'ALL') al inicio;
   asc       → lista del más antiguo al más reciente (Supervisores); si no, del más reciente al más antiguo;
   conservar → al volver a llenarlo mantiene la selección previa si sigue existiendo.
   Sin selección que conservar, elige el período más reciente (o 'ALL' / '' si no hay datos). */
function llenarSelectPeriodo(sel, valores, {todos=true, asc=false, conservar=false}={}){
  if(!sel) return;
  const periodos = [...new Set(valores)].sort();
  if(!asc) periodos.reverse();
  const prev = sel.value;
  sel.innerHTML = (todos ? '<option value="ALL">Todos</option>' : '') + periodos.map(p=>`<option value="${p}">${p}</option>`).join('');
  const valido = conservar && prev && ((todos && prev==='ALL') || periodos.map(String).includes(prev));
  const masReciente = asc ? periodos[periodos.length-1] : periodos[0];
  sel.value = valido ? prev : (masReciente || (todos ? 'ALL' : ''));
}

/* «Día -1» (Asesores y Retenciones): sincroniza la casilla, bloquea el selector de Fecha (y cierra su lista si
   quedó abierta: un botón deshabilitado ya no puede cerrarla) y, activo, le pone de ayuda el rango acumulado
   «primer día — ayer». fechas = fechas AAAA-MM-DD del período ANTES del corte, para conocer el inicio real. */
function sincronizarDiaMenos1(chkId, selFechaId, activo, fechas){
  const chk = document.getElementById(chkId);
  if(chk) chk.checked = activo;
  const fechaBtn = document.querySelector(`#${selFechaId} .fecha-multi-btn`);
  if(fechaBtn) fechaBtn.disabled = activo;
  if(!activo){ if(fechaBtn) fechaBtn.title = ''; return; }
  const fechaList = document.querySelector(`#${selFechaId} .fecha-multi-list`);
  if(fechaList && !fechaList.hasAttribute('hidden')){
    fechaList.setAttribute('hidden','');
    if(fechaBtn) fechaBtn.setAttribute('aria-expanded','false');
  }
  const ayer = _fechaAyerISO();
  const f = [...new Set(fechas.filter(Boolean))].sort();
  const rango = f.length ? `${fmtFechaCorta(f[0])} — ${fmtFechaCorta(ayer)} (ayer)` : `hasta ayer (${fmtFechaCorta(ayer)})`;
  if(fechaBtn) fechaBtn.title = `Día -1: acumulado ${rango}`;
}

/* Color de una variable CSS del tema activo (p. ej. _cssVar('--good')), para los gráficos Chart.js.
   El tema día se define en «body.day{...}» (css/estilos.css), no en :root: por eso se lee desde
   document.body y no desde <html>, que siempre devolvería los colores del tema noche. */
function _cssVar(name){ return getComputedStyle(document.body).getPropertyValue(name).trim(); }

/* Color "#rrggbb" válido, o null (colores personalizados guardados en localStorage). */
function colorHex(v){ return /^#[0-9a-f]{6}$/i.test(v||'') ? v : null; }

/* ---------- Tema noche/día ---------- */
/* Cuatro temas (HFC, 2026-10-08): noche (◐), día (☀, acento rojo), «iOS» (estilo Apple en tonos rojos, css/tema-ios.css)
   y «Neón» (css/tema-neon.css). iOS es una variante clara: lleva body.day + body.ios y hereda los ajustes del tema día.
   Neón es oscuro: solo body.neon. */
const TEMAS = ['night','day','ios','neon'];
const TEMA_BTN = { night:['◐','Tema noche · clic para pasar a Día'], day:['☀','Tema día · clic para pasar a iOS'], ios:['iOS','Tema iOS · clic para pasar a Neón'], neon:['⚡','Tema neón · clic para pasar a Noche'] };
function aplicarTema(t){
  if(!TEMAS.includes(t)) t = 'night';
  document.body.classList.toggle('day', t==='day' || t==='ios');
  document.body.classList.toggle('ios', t==='ios');
  document.body.classList.toggle('neon', t==='neon');
  localStorage.setItem('rf_theme', t);
  const btn = document.getElementById('btn-theme');
  btn.textContent = TEMA_BTN[t][0]; btn.title = TEMA_BTN[t][1]; btn.setAttribute('aria-label', TEMA_BTN[t][1]);
  // Chart.js no reacciona solo a cambios de variables CSS — hay que re-renderizar
  // para que los gráficos de Intervalos tomen los colores del tema nuevo (mismo
  // fix que ATC: js/09-nav-tema.js:aplicarTema). Guard con typeof porque esta
  // función también corre al cargar la página, antes de que 07-init.js exista.
  if(typeof renderAll === 'function') renderAll();
}
function toggleTema(){
  const b = document.body.classList;
  const actual = b.contains('neon') ? 'neon' : b.contains('ios') ? 'ios' : b.contains('day') ? 'day' : 'night';
  aplicarTema(TEMAS[(TEMAS.indexOf(actual)+1) % TEMAS.length]);
}
(function initTheme(){
  aplicarTema(localStorage.getItem('rf_theme') || 'night');
})();

/* ---------- Navegación de tabs ---------- */
let currentTab = 'diario';
function switchTab(tab, btnEl){
  if(!tabPermitida(tab)) return;
  const boton = document.querySelector(`.sb-nav button[data-tab="${tab}"]`);
  if(!boton) return;
  currentTab = tab;
  document.querySelectorAll('.sb-nav button').forEach(b=>b.classList.remove('on'));
  boton.classList.add('on');
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('on'));
  document.getElementById('tab-'+tab).classList.add('on');
  cerrarSidebar();
  const main = document.querySelector('.main');
  if(main){ main.scrollTop = 0; main.scrollLeft = 0; }
  renderAll();
}

/* ---------- Menú configurable ---------- */
const NAV_POSITIONS = ['left','right','top','bottom'];
let navCompact = localStorage.getItem('rf_nav_compact') === '1';
let navKeepCompact = localStorage.getItem('rf_nav_keep_compact') === '1';
let navPosition = NAV_POSITIONS.includes(localStorage.getItem('rf_nav_position')) ? localStorage.getItem('rf_nav_position') : 'left';
let mobileNavOpen = false;
function isMobileSideNav(){ return window.matchMedia('(max-width:900px)').matches && ['left','right'].includes(navPosition); }
function renderNavPreferences(){
  const layout = document.querySelector('.app-layout');
  layout.dataset.position = navPosition;
  layout.classList.toggle('nav-compact', navCompact || navKeepCompact);
  layout.classList.toggle('nav-keep-compact', navKeepCompact);
  layout.classList.toggle('mobile-nav-open', mobileNavOpen && isMobileSideNav());
  document.getElementById('nav-position').value = navPosition;
  document.getElementById('nav-keep-compact').checked = navKeepCompact;
  const btn = document.getElementById('btn-menu');
  const expanded = isMobileSideNav() ? mobileNavOpen : !(navCompact || navKeepCompact);
  btn.setAttribute('aria-label', expanded ? 'Contraer menú' : 'Expandir menú');
  btn.title = btn.getAttribute('aria-label');
  btn.setAttribute('aria-expanded', String(expanded));
  btn.classList.toggle('on', expanded);
}
function cerrarSidebar(){
  if(mobileNavOpen){ mobileNavOpen=false; renderNavPreferences(); }
}
function toggleSidebar(){
  if(isMobileSideNav()){
    mobileNavOpen=!mobileNavOpen;
    renderNavPreferences();
    return;
  }
  if(navKeepCompact){
    navKeepCompact = false;
    navCompact = false;
    localStorage.setItem('rf_nav_keep_compact', '0');
  } else navCompact = !navCompact;
  localStorage.setItem('rf_nav_compact', navCompact ? '1' : '0');
  renderNavPreferences();
}
function setNavKeepCompact(value){
  navKeepCompact = value;
  if(value) navCompact = true;
  localStorage.setItem('rf_nav_keep_compact', value ? '1' : '0');
  localStorage.setItem('rf_nav_compact', navCompact ? '1' : '0');
  renderNavPreferences();
}
function setNavPosition(value){
  if(!NAV_POSITIONS.includes(value)) return;
  mobileNavOpen=false;
  navPosition = value;
  localStorage.setItem('rf_nav_position', value);
  renderNavPreferences();
}
function toggleNavSettings(){
  const panel = document.getElementById('nav-settings');
  panel.hidden = !panel.hidden;
  document.getElementById('btn-nav-settings').setAttribute('aria-expanded', String(!panel.hidden));
}
document.querySelectorAll('.sb-nav button').forEach(btn=>{
  const label = btn.textContent.trim();
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.dataset.label = label;
  const icon = btn.querySelector('.ic');
  while(icon.nextSibling) icon.nextSibling.remove();
  const text = document.createElement('span');
  text.className = 'sb-label'; text.textContent = label;
  btn.appendChild(text);
});
renderNavPreferences();
document.addEventListener('click', e=>{
  const wrap = document.querySelector('.nav-settings-wrap');
  if(!wrap.contains(e.target)){
    document.getElementById('nav-settings').hidden = true;
    document.getElementById('btn-nav-settings').setAttribute('aria-expanded','false');
  }
  if(mobileNavOpen && !e.target.closest('.sidebar') && !e.target.closest('#btn-menu')) cerrarSidebar();
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    cerrarSidebar();
    document.getElementById('nav-settings').hidden = true;
    document.getElementById('btn-nav-settings').setAttribute('aria-expanded','false');
  }
});
window.addEventListener('resize',()=>{
  if(!isMobileSideNav() && mobileNavOpen){ mobileNavOpen=false; renderNavPreferences(); }
});

/* Fecha múltiple: el estado vive fuera del DOM para sobrevivir a cada render. */
const fechaMultiState = {sup:null, as:null, ret:null};
function poblarFechaMulti(tipo, rows, render){
  const root = document.getElementById('sel-fecha-'+tipo);
  const fechas = [...new Set(rows.map(r=>r.FECHA).filter(Boolean))].sort().reverse();
  const previo = fechaMultiState[tipo];
  if(!previo) fechaMultiState[tipo] = {all:false, selected:new Set(fechas.slice(0,1))};
  else if(!previo.all){
    previo.selected = new Set([...previo.selected].filter(f=>fechas.includes(f)));
    if(!previo.selected.size && fechas.length) previo.selected.add(fechas[0]);
  }
  const estado = fechaMultiState[tipo];
  const abierto = !!root.querySelector('.fecha-multi-list:not([hidden])');
  const foco = document.activeElement?.value;
  const resumen = estado.all ? 'Todas' : estado.selected.size===1
    ? (rows.find(r=>r.FECHA===[...estado.selected][0])?.FECHA_VISUAL || [...estado.selected][0])
    : `${estado.selected.size} fechas`;
  root.innerHTML = `<button type="button" class="ctl fecha-multi-btn" aria-expanded="${abierto}" onclick="toggleFechaMulti('${tipo}')">📅 ${resumen} ▾</button><div class="fecha-multi-list" ${abierto?'':'hidden'}></div>`;
  const list = root.querySelector('.fecha-multi-list');
  const make = (value, label, checked)=>{
    const row = document.createElement('label');
    const cb = document.createElement('input');
    cb.type='checkbox'; cb.value=value; cb.checked=checked;
    cb.addEventListener('change',()=>{
      if(value==='ALL') { estado.all=true; estado.selected.clear(); }
      else { estado.all=false; cb.checked ? estado.selected.add(value) : estado.selected.delete(value); if(!estado.selected.size) estado.all=true; }
      render();
      root.querySelector(`input[value="${value}"]`)?.focus();
    });
    row.append(cb, document.createTextNode(label)); list.appendChild(row);
  };
  make('ALL','Todas',estado.all);
  fechas.forEach(f=>make(f,rows.find(r=>r.FECHA===f)?.FECHA_VISUAL || f,!estado.all && estado.selected.has(f)));
  if(foco && abierto) root.querySelector(`input[value="${foco}"]`)?.focus();
}
function fechasElegidas(tipo){
  const state=fechaMultiState[tipo];
  return state?.all ? null : state?.selected || new Set();
}
function toggleFechaMulti(tipo){
  const root=document.getElementById('sel-fecha-'+tipo);
  const list=root.querySelector('.fecha-multi-list');
  list.hidden=!list.hidden;
  root.querySelector('button').setAttribute('aria-expanded',String(!list.hidden));
}
document.querySelectorAll('.fecha-multi').forEach(root=>root.addEventListener('click',e=>e.stopPropagation()));
document.addEventListener('click',e=>{
  document.querySelectorAll('.fecha-multi').forEach(root=>{
    if(!root.contains(e.target)){
      root.querySelector('.fecha-multi-list')?.setAttribute('hidden','');
      root.querySelector('button')?.setAttribute('aria-expanded','false');
    }
  });
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') document.querySelectorAll('.fecha-multi-list').forEach(list=>list.hidden=true);
});
