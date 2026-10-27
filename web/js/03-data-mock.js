/* ================== 03-data-mock.js — generador de RAW_DATA mock (solo se usa si CFG.OFFLINE=true) ================== */

function mockRawData(){
  const dias=['dom.','lun.','mar.','mié.','jue.','vie.','sáb.'];
  const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  let seed=20260801;
  const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const W=[0.30,0.55,0.80,1.00,1.10,1.05,0.95,0.85,0.90,1.00,0.95,0.80,0.65,0.50,0.40,0.30,0.28,0.20];
  const out=[];
  for(let day=1;day<=20;day++){
    const d=new Date(2026,7,day);
    const dow=d.getDay();
    const wknd=(dow===0||dow===6);
    const fv=String(day).padStart(2,'0')+'-'+meses[d.getMonth()]+'. ('+dias[dow]+')';
    const vol=wknd?95:165;
    for(let f=0;f<18;f++){
      const w=W[f]*(0.85+rnd()*0.30);
      const recibidas=Math.max(1,Math.round(vol*w));
      const atendida=Math.round(recibidas*(0.90+rnd()*0.08));
      const abandonada=Math.max(0,recibidas-atendida);
      const atendUmbr=Math.round(recibidas*(0.78+rnd()*0.14));
      const corte=Math.round(atendida*(0.008+rnd()*0.040));
      const tmgProm=170+Math.round(rnd()*110);
      const tmgTotal=tmgProm*atendida;
      const m90=Math.round(atendida*(0.82+rnd()*0.12));
      const prom=Math.round(atendida*0.01*(3+rnd()*4));
      const detr=Math.round(atendida*0.01*(1+rnd()*2));
      const pas=Math.round(atendida*0.01*(2+rnd()*2));
      const transEncu=prom+detr+pas;
      const encuCal=Math.round(transEncu*(0.40+rnd()*0.35));
      const trafDim=Math.round(recibidas*(0.90+rnd()*0.18));
      const tmgDim=+(1260*(0.92+rnd()*0.16)).toFixed(2);
      const agDim=+((wknd?5:8)+6*w+rnd()*2).toFixed(2);
      const agIdle=+(agDim*(0.88+rnd()*0.22)).toFixed(2);
      const agNeto=+(agIdle*(0.60+rnd()*0.22)).toFixed(2);
      const agBr=+(agIdle*(1.04+rnd()*0.14)).toFixed(2);
      // TMP_PROD (seg. productivos) — consistente con la identidad de la vista real:
      // AGENTE_NETO_IDLE=(TMP_PROD/3600)*2, o sea TMP_PROD=AGENTE_NETO_IDLE*1800.
      const tmpProd=Math.round(agIdle*1800);
      const horasDim=+(agDim*0.5).toFixed(2);
      const transVicio=Math.round(atendida*0.01*(0.5+rnd()*1.5));
      const transIvr=Math.round(atendida*0.01*(1+rnd()*2));
      const transBpo=Math.round(atendida*0.01*(0.5+rnd()*1.5));
      const transGea=Math.round(atendida*0.01*(0.5+rnd()*1.5));
      out.push({
        PERIODO:'202608',
        FECHA:'2026-08-'+String(day).padStart(2,'0'),
        FECHA_VISUAL:fv,
        SEMANA:'SEM-'+Math.ceil(day/7),
        FRANJA_GTR:String(8+Math.floor(f/2)).padStart(2,'0')+':'+(f%2?'30':'00'),
        LLAM_RECIBIDAS:recibidas, CANT_ATENDIDA:atendida, CANT_ABANDONADA:abandonada,
        TRANS_ENCU:transEncu, CORTE_AGENTE:corte, TMG_TOTAL_SEG:tmgTotal, ENCU_CAL:encuCal,
        TMG_PROMSEG:tmgProm, MENOR_90SEG:m90, ATENDIDA_UMBR:atendUmbr,
        CANT_PROMOTOR:prom, CANT_DETRACTOR:detr, CANT_PASIVO:pas,
        TRAF_DIM:trafDim, TMG_DIM:tmgDim, AGENT_DIM:agDim, TMP_PROD:tmpProd,
        TMP_HABLADO:tmgTotal, AGENTE_BR:agBr, AGENTE_NETO_IDLE:agIdle, AGENTE_NETO:agNeto,
        HORAS_DIM:horasDim,
        TRANS_VICIO:transVicio, TRANS_IVR_123:transIvr, TRANS_OTROS_BPO:transBpo, TRANS_OTROS_GEA:transGea
      });
    }
  }
  return out;
}

/* RAW_DATA se puebla en 01-core.js:iniciarSesion() — mock si CFG.OFFLINE, si no vía la API (11-remote.js) */
let RAW_DATA = [];
