/* ================== 08-supervisores-mock.js — generador de RAW_ASESORES mock (solo si CFG.OFFLINE=true) ================== */

function mockRawAsesores(){
  const sups=['Karina Ríos','Marco Salas','Lucía Vega'];
  const nombres=['Ana Torres','Luis Pérez','María Gómez','Jorge Díaz','Sofía Ramos','Diego Castro',
    'Valeria Núñez','Pedro Salinas','Carla Mendoza','Raúl Vargas','Lucía Flores','Iván Rojas',
    'Paola Ríos','Hugo León','Nadia Cruz','Óscar Pinto','Elena Soto','Bruno Vera',
    'Karen Loza','Tito Aguirre','Mía Campos','Saúl Bravo','Gina Pardo','Beto Ríos'];
  const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const diasW=['do.','lu.','ma.','mi.','ju.','vi.','sá.'];
  let seed=54321;
  const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const conds=['FULL TIME','MINI FULL TIME','PART TIME'];
  const ases=nombres.map((n,i)=>({u:'U'+String(i+1).padStart(3,'0'),n:n,s:sups[i%3],c:(i%9===0)?'POSIBLE OJT':conds[i%3]}));
  const out=[];
  for(let day=1;day<=20;day++){
    const d=new Date(2026,7,day);const dow=d.getDay();const wknd=(dow===0||dow===6);
    const fv=String(day).padStart(2,'0')+'-'+meses[7]+'. ('+diasW[dow]+')';
    ases.forEach(a=>{
      if(wknd&&rnd()<0.5)return;
      const startSlot=Math.floor(rnd()*20);
      const len=14+Math.floor(rnd()*10);
      for(let s=0;s<len;s++){
        const slot=startSlot+s; if(slot>35)break;
        const franja=String(8+Math.floor(slot/2)).padStart(2,'0')+':'+((slot%2)?'30':'00');
        const at=1+Math.floor(rnd()*6);
        const corte=rnd()<0.14?1:0;
        const tmgP=200+Math.round(rnd()*160);
        const dur=tmgP*at;
        const hablado=dur;
        const prod=Math.round(dur/(0.55+rnd()*0.30));
        const tpm=Math.round(prod/(0.80+rnd()*0.15));
        const enc=rnd()<0.5?1:0;
        let p=0,de=0,pa=0;
        if(enc){const x=rnd();if(x<0.6)p=1;else if(x<0.8)pa=1;else de=1;}
        const transf=rnd()<0.10; // ~1 de cada 10 franjas del asesor tiene alguna transferencia
        const tv=transf&&rnd()<0.4?1:0, ti=transf&&rnd()<0.4?1:0, tb=transf&&rnd()<0.3?1:0, tg=transf&&rnd()<0.3?1:0;
        out.push({
          PERIODO:'202608', FECHA:'2026-08-'+String(day).padStart(2,'0'), FECHA_VISUAL:fv,
          SEMANA:'SEM-'+Math.ceil(day/7), FRANJA_GTR:franja,
          USUARIO:a.u, NOMBRE_ASESOR:a.n, SUPERVISOR:a.s, GRUPO_SUPERV:a.s, COORDINADOR:'Coord. '+sups[0].split(' ')[0],
          CONDICION_LAB:a.c,
          CANT_ATENDIDA:at, CORTE_AGENTE:corte, CANT_HOLD:rnd()<0.1?1:0,
          TMG_TOTAL_SEG:dur, TMP_HABLADO:hablado, TMP_PROD:prod, TMP_DISPO:Math.round(prod*0.3), TMP_TIPIF:Math.round(prod*0.15), TPM_TOTAL:tpm,
          CANT_PROMOTOR:p, CANT_DETRACTOR:de, CANT_PASIVO:pa,
          TRANS_VICIO:tv, TRANS_IVR_123:ti, TRANS_OTROS_BPO:tb, TRANS_OTROS_GEA:tg,
          CORTE_CLIENTE:rnd()<0.06?1:0,
          TRANS_ENCU:enc, ENCU_CAL:(!enc&&rnd()<0.3)?1:0
        });
      }
    });
  }
  return out;
}

/* RAW_ASESORES se puebla en 01-core.js:iniciarSesion() — mock si CFG.OFFLINE, si no vía la API (11-remote.js) */
let RAW_ASESORES = [];
