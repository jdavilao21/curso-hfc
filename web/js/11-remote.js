/* ================== 11-remote.js — carga de datos reales desde la API del proyecto (cuando CFG.OFFLINE=false) ================== */

async function fetchJSON(path){
  const res = await fetch(`${CFG.API}/${path}`, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      ...(SESION.token ? {'Authorization':'Bearer '+SESION.token} : {})
    },
    body: JSON.stringify({})
  });
  if(!res.ok){ const err = new Error('HTTP '+res.status+' en '+path); err.status = res.status; throw err; }
  return limpiarTextos(await res.json());
}

function _estadoCarga(msg, esErr){
  const box = document.getElementById('carga-estado');
  if(!box) return;
  box.style.display = 'flex';
  box.querySelector('.msg').textContent = msg;
  box.classList.toggle('err', !!esErr);
}
function _ocultarEstadoCarga(){
  const box = document.getElementById('carga-estado');
  if(box) box.style.display = 'none';
}

async function cargarDatosReales(){
  _estadoCarga('Cargando datos de HFC…', false);
  try{
    const [datos, asesores] = await Promise.all([
      fetchJSON('hfc-diario'),
      fetchJSON('hfc-supervisores')
    ]);
    RAW_DATA = foldIntervals(Array.isArray(datos) ? datos : []);
    RAW_ASESORES = Array.isArray(asesores) ? asesores : [];
    _ocultarEstadoCarga();
    cargarDatos();
  }catch(e){
    if(e && e.status === 401) return; // sesión vencida: 01-core.js ya volvió al login con el aviso
    _estadoCarga('No se pudo cargar los datos (' + e.message + '). Revisa que la API esté activa (GET /api/health).', true);
  }
}
