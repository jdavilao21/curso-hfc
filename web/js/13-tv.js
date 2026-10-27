/* ================== 13-tv.js — Modo TV ==================
   Pantalla completa para el televisor del piso: oculta sidebar/header/filtros,
   agranda los datos y rota entre Diario/Intervalos/Supervisores cada TV_MS.
   Mismo patrón que ATC (js/14-tv.js), adaptado a las clases de HFC
   (.sb-nav button[data-tab], .tab-pane.on, switchTab). Sale con el botón 📺 o con ESC. */

const TV_TABS = ['diario','intervalos','supervisores'];
const TV_NOMBRES = { diario:'Resumen Diario', intervalos:'Intervalos', supervisores:'Supervisores' };
const TV_MS = 20000;

let _tvTimer=null, _tvReloj=null, _tvIdx=0, _tvLista=[];

const _tvBtn = t => document.querySelector('.sb-nav button[data-tab="'+t+'"]');

function _tvVisibles(){
  return TV_TABS.filter(t=>{ const b=_tvBtn(t); return b && b.offsetParent!==null; });
}
function _tvTabActual(){
  const p = document.querySelector('.tab-pane.on');
  return p ? p.id.replace(/^tab-/,'') : '';
}
function _tvBarra(){
  let bar = document.getElementById('tv-bar');
  if(bar) return bar;
  bar = document.createElement('div');
  bar.id = 'tv-bar';
  bar.innerHTML =
    '<span class="tv-logo">RF <span>HFC</span></span>'+
    '<span class="tv-tab" id="tv-tab-nom"></span>'+
    '<span class="tv-spacer"></span>'+
    '<span class="tv-reloj" id="tv-reloj"></span>'+
    '<button class="tv-salir" onclick="tvOff()" title="Salir del Modo TV (o ESC)">✕</button>'+
    '<div class="tv-prog"><i id="tv-prog-i"></i></div>';
  document.body.appendChild(bar);
  return bar;
}
function _tvTic(){
  const r = document.getElementById('tv-reloj');
  if(r) r.textContent = new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function _tvIr(i){
  const tab = _tvLista[i];
  if(!tab) return;
  switchTab(tab, _tvBtn(tab));
  const nom = document.getElementById('tv-tab-nom');
  if(nom) nom.textContent = TV_NOMBRES[tab] || tab;
  const p = document.getElementById('tv-prog-i');
  if(p){ p.style.animation='none'; void p.offsetWidth; p.style.animation='tvProg '+(TV_MS/1000)+'s linear forwards'; }
}
function _tvSiguiente(){ _tvIdx=(_tvIdx+1)%_tvLista.length; _tvIr(_tvIdx); }

function tvOn(){
  _tvLista = _tvVisibles();
  if(!_tvLista.length) return;
  document.body.classList.add('tv-on');
  _tvBarra();
  const el = document.documentElement;
  if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
  _tvIdx = Math.max(0, _tvLista.indexOf(_tvTabActual()));
  _tvIr(_tvIdx);
  _tvTic();
  _tvTimer = setInterval(_tvSiguiente, TV_MS);
  _tvReloj = setInterval(_tvTic, 1000);
  _syncBtnTV();
}
function tvOff(){
  document.body.classList.remove('tv-on');
  clearInterval(_tvTimer); _tvTimer=null;
  clearInterval(_tvReloj); _tvReloj=null;
  const b = document.getElementById('tv-bar'); if(b) b.remove();
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  _syncBtnTV();
}
function toggleTV(){ document.body.classList.contains('tv-on') ? tvOff() : tvOn(); }
function _syncBtnTV(){
  const b = document.getElementById('btn-tv');
  if(!b) return;
  const on = document.body.classList.contains('tv-on');
  b.style.opacity = on ? '1' : '.55';
  b.title = on ? 'Modo TV activo — clic o ESC para salir' : 'Modo TV: pantalla completa que rota entre pestañas';
}
document.addEventListener('fullscreenchange', ()=>{
  if(!document.fullscreenElement && document.body.classList.contains('tv-on')) tvOff();
});
_syncBtnTV();
