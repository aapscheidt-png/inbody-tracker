(function(root){
"use strict";
// Flow coverage is a diagnostic, not a ledger or a yield calculator.
// Excel-reported contributions are declarations, never cash receipts verified
// with brokerage/bank statements. A zero reported transaction is not proof
// that there was no cash movement in an interval.
function coverage(data){
 const history=(Array.isArray(data?.history)?data.history:[]).filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))&&Number.isFinite(Number(x.total)))
   .slice().sort((a,b)=>a.date.localeCompare(b.date));
 const contributions=(Array.isArray(data?.dataEngine?.reportedContributions)?data.dataEngine.reportedContributions:[])
  .filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))&&Number.isFinite(Number(x.amount)));
 const intervals=[];
 for(let i=1;i<history.length;i++){
  const previous=history[i-1],current=history[i];
  const reported=contributions.filter(x=>x.date>previous.date&&x.date<=current.date);
  const sourceTotal=reported.reduce((sum,x)=>sum+Number(x.amount),0);
  const known=current.flowKnown===true||(current.flowKnown!==false&&current.flow!==undefined&&current.flow!==null&&current.flow!==""&&Number.isFinite(Number(current.flow)));
  intervals.push({
   from:previous.date,to:current.date,opening:Number(previous.total),closing:Number(current.total),
   known,flow:known?Number(current.flow):null,
   declaredCount:reported.length,declaredTotal:reported.length?sourceTotal:null,
   // No inferred return until external flows are actually reconciled.
   returnAudited:false
  });
 }
 const supplied=intervals.filter(x=>x.known).length,pending=intervals.length-supplied;
 const unmatched=contributions.filter(x=>!intervals.some(i=>x.date>i.from&&x.date<=i.to));
 return{
  intervals,intervalCount:intervals.length,supplied,pending,
  declaredCount:contributions.length,declaredTotal:contributions.reduce((s,x)=>s+Number(x.amount),0),
  outsideCount:unmatched.length,
  fullyReconciled:false,
  reason:"Fluxos registrados e aportes declarados não equivalem a extratos conciliados. Proventos podem ter sido reinvestidos; não são automaticamente aportes externos."
 };
}
function exportCsv(report){
 const escapeCell=value=>{
  const raw=String(value??"");
  // Never allow spreadsheet programs to evaluate imported text as formulas.
  const safe=typeof value==="number"&&Number.isFinite(value)?raw:(/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw);
  return '"'+safe.replace(/"/g,'""')+'"';
 };
 const lines=[[
  "Data inicial","Data final","Saldo inicial (R$)","Saldo final (R$)",
  "Fluxo informado (R$)","Situação do fluxo","Aportes listados (R$)",
  "Quantidade de aportes listados","Rentabilidade auditada"
 ]];
 for(const i of report.intervals||[])lines.push([
  i.from,i.to,i.opening,i.closing,i.known?i.flow:"",
  i.known?"INFORMADO, NÃO CONCILIADO":"PENDENTE",
  i.declaredTotal===null?"":i.declaredTotal,i.declaredCount,"NÃO"
 ]);
 return "\uFEFF"+lines.map(row=>row.map(escapeCell).join(";")).join("\r\n")+"\r\n";
}
root.WealthFlowAudit={coverage,exportCsv};
})(window);
