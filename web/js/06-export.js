/* ================== 06-export.js — Descarga a .xlsx (siempre xlsx, nunca csv) ================== */

/* Formato de celdas (cabecera / total / bordes) — mismo criterio que el export de ATC
   (js/09-nav-tema.js:exportExcelInt), con el color de acento de HFC. Se aplica
   sobre el aoa ya volcado por aoa_to_sheet: fila de cabecera con fondo oscuro + texto
   blanco, fila TOTAL con fondo cobre claro + negrita, bordes finos en toda la data,
   primera columna alineada a la izquierda (igual que la tabla en pantalla). */
/* Columnas de TNPS completo al final de cada Excel (2026-10-08). conConteos: Diario/Intervalos llevan también las
   cantidades de Promotores / Neutros / Detractores (Supervisores y Asesores ya las traen en sus columnas). */
function _xlsTnps(o, m, conConteos){
  const p = x => +(x*100).toFixed(2);
  return conConteos
    ? [Math.round(m.enc), Math.round(o.CANT_PROMOTOR||0), Math.round(o.CANT_PASIVO||0), Math.round(o.CANT_DETRACTOR||0), p(m.pProm), p(m.pNeu), p(m.pDet), p(m.pResp)]
    : [Math.round(m.enc), p(m.pProm), p(m.pNeu), p(m.pDet), p(m.pResp)];
}
function libroConTitulo(titulo, subtitulo, head, dataRows, nombreHoja, sinTotal){
  subtitulo = `${subtitulo} · Elaborado por la Jefatura de Planificación y Métricas · GEA`;   // firma del área en cada Excel (Jose, 08-oct-2026)
  const aoa = [[titulo],[subtitulo],[],head,...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!views'] = [{ showGridLines:false }];
  if(ws['A1']) ws['A1'].s = { font:{bold:true,sz:14,color:{rgb:'3B82F6'}} };
  if(ws['A2']) ws['A2'].s = { font:{sz:10,color:{rgb:'666666'}} };

  const border = { top:{style:'thin',color:{rgb:'CBD0D6'}}, bottom:{style:'thin',color:{rgb:'CBD0D6'}}, left:{style:'thin',color:{rgb:'CBD0D6'}}, right:{style:'thin',color:{rgb:'CBD0D6'}} };
  const sHdr  = { fill:{fgColor:{rgb:'20242B'}}, font:{bold:true,sz:10,color:{rgb:'FFFFFF'}}, border, alignment:{horizontal:'center',vertical:'center',wrapText:true} };
  const sTot  = { fill:{fgColor:{rgb:'F3E0CE'}}, font:{bold:true,sz:10,color:{rgb:'1C1006'}}, border, alignment:{horizontal:'center',vertical:'center'} };
  const sTotL = { fill:{fgColor:{rgb:'F3E0CE'}}, font:{bold:true,sz:10,color:{rgb:'1C1006'}}, border, alignment:{horizontal:'left',vertical:'center'} };
  const sCell = { font:{sz:10,color:{rgb:'1F2937'}}, border, alignment:{horizontal:'center',vertical:'center'} };
  const sCellL= { font:{sz:10,color:{rgb:'1F2937'}}, border, alignment:{horizontal:'left',vertical:'center'} };

  const headerRow = 3; // 0-indexed: 0=titulo,1=subtitulo,2=blanco,3=cabeceras
  const lastRow = sinTotal ? -1 : headerRow + dataRows.length; // última fila de datos = fila TOTAL (si aplica)
  head.forEach((_,c)=>{
    const addr = XLSX.utils.encode_cell({r:headerRow,c});
    if(ws[addr]) ws[addr].s = sHdr;
  });
  dataRows.forEach((row,ri)=>{
    const r = headerRow+1+ri;
    const isTotal = (r===lastRow);
    row.forEach((_,c)=>{
      const addr = XLSX.utils.encode_cell({r,c});
      if(!ws[addr]) return;
      ws[addr].s = isTotal ? (c===0?sTotL:sTot) : (c===0?sCellL:sCell);
    });
  });
  ws['!cols'] = head.map((_,i)=>({wch:i===0?16:11}));
  ws['!rows'] = [{hpt:20},{hpt:14},{hpt:6},{hpt:26}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  return wb;
}

/* Variante sin fila TOTAL — para exports de detalle fila-a-fila (ej. TNPS por encuesta)
   donde no tiene sentido sumar/promediar la última fila. */
function libroConTituloSinTotal(titulo, subtitulo, head, dataRows, nombreHoja){
  return libroConTitulo(titulo, subtitulo, head, dataRows, nombreHoja, true);
}

/* Solo Diario lleva Retención en el export (Intervalos usa COLS_DIARIO sin tocar, ver abajo).
   "GESTIÓN"->"Q SOLICITUDES" y "%TIPIF" agregado al final (Jose, 2026-09-17): mismo cambio que
   ya tiene la tabla en pantalla (js/10-columnas.js:COL_RETEN_DIA) — el export se había quedado
   desalineado (le faltaba %Tipif por completo). COLS_DIARIO ya trae VAR.TRAF al final desde
   04-diario.js, así que el export lo hereda solo con el dato en el orden correcto. */

function exportDiario(){
  const rows = FILTRADO_DIARIO || [];
  if(!rows.length) return;
  const head = COLS_DIARIO;
  const data = rows.map(o=>{
    const m=M(o);
    return [o.FECHA_VISUAL, rangoApr(o)?'APROB.':'DESAPROB.', +(m.ns*100).toFixed(2), +(m.na*100).toFixed(2),
      +(m.aban*100).toFixed(2), Math.round(o.TRAF_DIM), Math.round(o.LLAM_RECIBIDAS), Math.round(o.CANT_ATENDIDA),
      Math.round(o.CANT_ABANDONADA), Math.round(o.CORTE_AGENTE), +(m.catP*100).toFixed(2), +(m.ocup*100).toFixed(2),
      Math.round(m.agReal), Math.round(m.agRq), Math.round(m.agD), +(m.util*100).toFixed(2),
      fmtSeg(m.tmgProm)+' / '+fmtSeg(m.tmgRq), fmtSegSigned(m.tmgProm-m.tmgRq), +m.hrs.toFixed(1),
      +(m.cumpTraf*100).toFixed(2), +(m.tnps*100).toFixed(2), +(m.transf*100).toFixed(2),
      Math.round(m.transfTot), Math.round(o.TRANS_VICIO), Math.round(o.TRANS_IVR_123), Math.round(o.TRANS_OTROS_BPO), Math.round(o.TRANS_OTROS_GEA),
      Math.round(o.TRANS_ENCU), +(m.pEncu*100).toFixed(2), +(m.ind*100).toFixed(2),
      +(m.pTransVicio*100).toFixed(2), +(m.pTransIvr*100).toFixed(2), +(m.pTransBpo*100).toFixed(2), +(m.pTransGea*100).toFixed(2),
      +(m.varTraf*100).toFixed(2), ..._xlsTnps(o,m,true)];
  });
  const tot = aggAll(rows); const mt=M(tot);
  data.push(['TOTAL', rangoApr(tot)?'APROB.':'DESAPROB.', +(mt.ns*100).toFixed(2), +(mt.na*100).toFixed(2),
    +(mt.aban*100).toFixed(2), Math.round(tot.TRAF_DIM), Math.round(tot.LLAM_RECIBIDAS), Math.round(tot.CANT_ATENDIDA),
    Math.round(tot.CANT_ABANDONADA), Math.round(tot.CORTE_AGENTE), +(mt.catP*100).toFixed(2), +(mt.ocup*100).toFixed(2),
    Math.round(mt.agReal), Math.round(mt.agRq), Math.round(mt.agD), +(mt.util*100).toFixed(2),
    '—','—', +mt.hrs.toFixed(1), +(mt.cumpTraf*100).toFixed(2), +(mt.tnps*100).toFixed(2), +(mt.transf*100).toFixed(2),
    Math.round(mt.transfTot), Math.round(tot.TRANS_VICIO), Math.round(tot.TRANS_IVR_123), Math.round(tot.TRANS_OTROS_BPO), Math.round(tot.TRANS_OTROS_GEA),
    Math.round(tot.TRANS_ENCU), +(mt.pEncu*100).toFixed(2), +(mt.ind*100).toFixed(2),
    +(mt.pTransVicio*100).toFixed(2), +(mt.pTransIvr*100).toFixed(2), +(mt.pTransBpo*100).toFixed(2), +(mt.pTransGea*100).toFixed(2),
    +(mt.varTraf*100).toFixed(2), ..._xlsTnps(tot,mt,true)]);

  const wb = libroConTitulo('HFC — Diario', 'Exportado ' + new Date().toLocaleString('es-PE'), head, data, 'Diario');
  XLSX.writeFile(wb, `hfc_diario_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportIntervalos(){
  const rows = FILTRADO_INTERVALOS || [];
  if(!rows.length) return;
  const head = COLS_DIARIO.map(c=>c==='FECHA'?'FRANJA':c);
  const data = rows.map(o=>{
    const m=M(o);
    return [o.FRANJA_GTR, intervalApr(o)?'APROB.':'DESAPROB.', +(m.ns*100).toFixed(2), +(m.na*100).toFixed(2),
      +(m.aban*100).toFixed(2), Math.round(o.TRAF_DIM), Math.round(o.LLAM_RECIBIDAS), Math.round(o.CANT_ATENDIDA),
      Math.round(o.CANT_ABANDONADA), Math.round(o.CORTE_AGENTE), +(m.catP*100).toFixed(2), +(m.ocup*100).toFixed(2),
      Math.round(m.agReal), Math.round(m.agRq), Math.round(m.agD), +(m.util*100).toFixed(2),
      fmtSeg(m.tmgProm)+' / '+fmtSeg(m.tmgRq), fmtSegSigned(m.tmgProm-m.tmgRq), +m.hrs.toFixed(1),
      +(m.cumpTraf*100).toFixed(2), +(m.tnps*100).toFixed(2), +(m.transf*100).toFixed(2),
      Math.round(m.transfTot), Math.round(o.TRANS_VICIO), Math.round(o.TRANS_IVR_123), Math.round(o.TRANS_OTROS_BPO), Math.round(o.TRANS_OTROS_GEA),
      Math.round(o.TRANS_ENCU), +(m.pEncu*100).toFixed(2), +(m.ind*100).toFixed(2),
      +(m.pTransVicio*100).toFixed(2), +(m.pTransIvr*100).toFixed(2), +(m.pTransBpo*100).toFixed(2), +(m.pTransGea*100).toFixed(2),
      +(m.varTraf*100).toFixed(2), ..._xlsTnps(o,m,true)];
  });
  const tot = aggAll(rows); const mt=M(tot);
  data.push(['TOTAL', rangoApr(tot)?'APROB.':'DESAPROB.', +(mt.ns*100).toFixed(2), +(mt.na*100).toFixed(2),
    +(mt.aban*100).toFixed(2), Math.round(tot.TRAF_DIM), Math.round(tot.LLAM_RECIBIDAS), Math.round(tot.CANT_ATENDIDA),
    Math.round(tot.CANT_ABANDONADA), Math.round(tot.CORTE_AGENTE), +(mt.catP*100).toFixed(2), +(mt.ocup*100).toFixed(2),
    Math.round(mt.agReal), Math.round(mt.agRq), Math.round(mt.agD), +(mt.util*100).toFixed(2),
    '—','—', +mt.hrs.toFixed(1), +(mt.cumpTraf*100).toFixed(2), +(mt.tnps*100).toFixed(2), +(mt.transf*100).toFixed(2),
    Math.round(mt.transfTot), Math.round(tot.TRANS_VICIO), Math.round(tot.TRANS_IVR_123), Math.round(tot.TRANS_OTROS_BPO), Math.round(tot.TRANS_OTROS_GEA),
    Math.round(tot.TRANS_ENCU), +(mt.pEncu*100).toFixed(2), +(mt.ind*100).toFixed(2),
    +(mt.pTransVicio*100).toFixed(2), +(mt.pTransIvr*100).toFixed(2), +(mt.pTransBpo*100).toFixed(2), +(mt.pTransGea*100).toFixed(2),
    +(mt.varTraf*100).toFixed(2), ..._xlsTnps(tot,mt,true)]);

  const fecha = (document.getElementById('sel-fecha-int')||{}).value || 'todas';
  const wb = libroConTitulo('HFC — Intervalos', `Fecha ${fecha} · Exportado ` + new Date().toLocaleString('es-PE'), head, data, 'Intervalos');
  XLSX.writeFile(wb, `hfc_intervalos_${fecha}.xlsx`);
}

function exportSupervisores(){
  const rows = FILTRADO_SUPERVISORES || [];
  if(!rows.length) return;
  const head = ['Supervisor','Atendidas','CAT','%CAT','%Ocup','TMG','Hrs.Prod','Prom.','Detr.','Neu.','%TNPS','%Util','%Transf','Transf.Tot','T.Vicio','T.IVR123','T.Otro BPO','T.Otro GEA','%Corte Cl.','Trans.Enc','%Transf Encu.','%Ind.Enc','%T.Vicio','%T.IVR123','%T.Otro BPO','%T.Otro GEA','Encuestas','%Prom.','%Neu.','%Det.','%Resp.'];
  const porSup = aggBySupervisor(rows);
  const data = porSup.map(o=>{
    const m=MSup(o);
    return [o.SUPERVISOR, Math.round(o.CANT_ATENDIDA), Math.round(o.CORTE_AGENTE), +(m.catP*100).toFixed(2),
      +(m.ocup*100).toFixed(2), fmtSeg(m.tmg), +m.hrs.toFixed(1), Math.round(o.CANT_PROMOTOR), Math.round(o.CANT_DETRACTOR),
      Math.round(o.CANT_PASIVO), +(m.tnps*100).toFixed(2), +(m.util*100).toFixed(2), +(m.transf*100).toFixed(2),
      Math.round(m.transfTot), Math.round(o.TRANS_VICIO), Math.round(o.TRANS_IVR_123), Math.round(o.TRANS_OTROS_BPO), Math.round(o.TRANS_OTROS_GEA),
      +(m.corteCl*100).toFixed(2), Math.round(o.TRANS_ENCU), +(m.pEncu*100).toFixed(2), +(m.ind*100).toFixed(2),
      +(m.pTransVicio*100).toFixed(2), +(m.pTransIvr*100).toFixed(2), +(m.pTransBpo*100).toFixed(2), +(m.pTransGea*100).toFixed(2), ..._xlsTnps(o,m,false)];
  });
  const total = blankSup(); rows.forEach(r=>addIntoSup(total,r));
  const mt = MSup(total);
  data.push(['TOTAL', Math.round(total.CANT_ATENDIDA), Math.round(total.CORTE_AGENTE), +(mt.catP*100).toFixed(2),
    +(mt.ocup*100).toFixed(2), fmtSeg(mt.tmg), +mt.hrs.toFixed(1), Math.round(total.CANT_PROMOTOR), Math.round(total.CANT_DETRACTOR),
    Math.round(total.CANT_PASIVO), +(mt.tnps*100).toFixed(2), +(mt.util*100).toFixed(2), +(mt.transf*100).toFixed(2),
    Math.round(mt.transfTot), Math.round(total.TRANS_VICIO), Math.round(total.TRANS_IVR_123), Math.round(total.TRANS_OTROS_BPO), Math.round(total.TRANS_OTROS_GEA),
    +(mt.corteCl*100).toFixed(2), Math.round(total.TRANS_ENCU), +(mt.pEncu*100).toFixed(2), +(mt.ind*100).toFixed(2),
    +(mt.pTransVicio*100).toFixed(2), +(mt.pTransIvr*100).toFixed(2), +(mt.pTransBpo*100).toFixed(2), +(mt.pTransGea*100).toFixed(2), ..._xlsTnps(total,mt,false)]);

  const periodo = (document.getElementById('sel-periodo-sup')||{}).value || 'todos';
  const wb = libroConTitulo('HFC — Supervisores', `Período ${periodo} · Exportado ` + new Date().toLocaleString('es-PE'), head, data, 'Supervisores');
  XLSX.writeFile(wb, `hfc_supervisores_${periodo}.xlsx`);
}

function exportAsesores(){
  const rows = FILTRADO_ASESORES || [];
  if(!rows.length) return;
  const head = ['Usuario','Nombre','Atendidas','Días','Prom.At.','TMG Real','Cat.Ag.','%Cat.Ag.','Promotor','Detractor','Neutros','%TNPS','%Transf','Transf.Tot','T.Vicio','T.IVR123','T.Otro BPO','T.Otro GEA','%Corte Cl.','Trans.Enc','%Transf Encu.','%Ind.Enc','%T.Vicio','%T.IVR123','%T.Otro BPO','%T.Otro GEA','Encuestas','%Prom.','%Neu.','%Det.','%Resp.','Cuartil TNPS','% de Detract.','Días crít.','Días con ≥5 enc.'];
  const porAsesor = aplicarSortAs(aggByAsesor(rows));
  const data = porAsesor.map(o=>{
    const m=MSup(o);
    return [o.USUARIO, o.NOMBRE_ASESOR||'—', Math.round(o.CANT_ATENDIDA), o.DIAS_GEST, +(o.PROM_AT||0).toFixed(1),
      fmtSeg(m.tmg), Math.round(o.CORTE_AGENTE), +(m.catP*100).toFixed(2),
      Math.round(o.CANT_PROMOTOR), Math.round(o.CANT_DETRACTOR), Math.round(o.CANT_PASIVO), +(m.tnps*100).toFixed(2), +(m.transf*100).toFixed(2),
      Math.round(m.transfTot), Math.round(o.TRANS_VICIO), Math.round(o.TRANS_IVR_123), Math.round(o.TRANS_OTROS_BPO), Math.round(o.TRANS_OTROS_GEA),
      +(m.corteCl*100).toFixed(2), Math.round(o.TRANS_ENCU), +(m.pEncu*100).toFixed(2), +(m.ind*100).toFixed(2),
      +(m.pTransVicio*100).toFixed(2), +(m.pTransIvr*100).toFixed(2), +(m.pTransBpo*100).toFixed(2), +(m.pTransGea*100).toFixed(2), ..._xlsTnps(o,m,false), cuartilTnps(o).label, +(aporteDetractores(o)*100).toFixed(2), diasCriticos(o).crit, diasCriticos(o).conVol];
  });
  const total = blankSup(); rows.forEach(r=>addIntoSup(total,r));
  total.DIAS_GEST = new Set(rows.map(r=>r.FECHA)).size || 1;
  total.PROM_AT = total.CANT_ATENDIDA / total.DIAS_GEST;
  const mt = MSup(total);
  data.push(['TOTAL','', Math.round(total.CANT_ATENDIDA), total.DIAS_GEST, +(total.PROM_AT||0).toFixed(1),
    fmtSeg(mt.tmg), Math.round(total.CORTE_AGENTE), +(mt.catP*100).toFixed(2),
    Math.round(total.CANT_PROMOTOR), Math.round(total.CANT_DETRACTOR), Math.round(total.CANT_PASIVO), +(mt.tnps*100).toFixed(2), +(mt.transf*100).toFixed(2),
    Math.round(mt.transfTot), Math.round(total.TRANS_VICIO), Math.round(total.TRANS_IVR_123), Math.round(total.TRANS_OTROS_BPO), Math.round(total.TRANS_OTROS_GEA),
    +(mt.corteCl*100).toFixed(2), Math.round(total.TRANS_ENCU), +(mt.pEncu*100).toFixed(2), +(mt.ind*100).toFixed(2),
    +(mt.pTransVicio*100).toFixed(2), +(mt.pTransIvr*100).toFixed(2), +(mt.pTransBpo*100).toFixed(2), +(mt.pTransGea*100).toFixed(2), ..._xlsTnps(total,mt,false), cuartilTnps(total).label, 100, '', '']);

  const periodo = (document.getElementById('sel-periodo-as')||{}).value || 'todos';
  const wb = libroConTitulo('HFC — Asesores', `Período ${periodo} · Exportado ` + new Date().toLocaleString('es-PE'), head, data, 'Asesores');
  XLSX.writeFile(wb, `hfc_asesores_${periodo}.xlsx`);
}
