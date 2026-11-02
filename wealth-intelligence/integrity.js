(function(global){
"use strict";
function check(state){
 if(!state||!Array.isArray(state.positions))return{status:"invalid",message:"Carteira ausente ou inválida."};
 const total=state.positions.reduce((sum,p)=>sum+Number(p.units||0)*Number(p.price||0)*(p.currency==="USD"?Number(state.fx)||0:1),0);
 if(state.mode==="demo")return{status:"demo",total};
 const m=state.dataEngine?.sourceMetadata;
 if(!m)return{status:"manual",total,message:"Carteira cadastrada manualmente, sem referência Excel."};
 const buckets=m.sourceBuckets||[];
 if(m.sourceVerified!==true||buckets.length!==4)return{status:"unverified",total,message:"A base foi importada sem conferência completa das quatro fontes."};
 const groups={domestic:["Carteira de ações","Carteira doméstica"],international:["Investimentos internacionais"],pension:["Previdência"],crypto:["Cripto"]};
 const verified=buckets.every(b=>{
   const expected=b.excelValue;
   if(!groups[b.key]||!Number.isFinite(expected)||b.matched!==true)return false;
   const sum=state.positions.filter(p=>groups[b.key].includes(p.account)).reduce((s,p)=>s+Number(p.units||0)*Number(p.price||0)*(p.currency==="USD"?Number(state.fx)||0:1),0);
   return Math.abs(expected-sum)<=0.03 && Math.abs((b.importedValue??expected)-sum)<=0.03;
 });
 const allBuckets=verified&&Math.abs(buckets.reduce((s,b)=>s+b.excelValue,0)-total)<=0.03;
 // Older backups without the new position-level checksum remain importable, but
 // cannot claim full verification until the original Excel is imported again.
 if(verified&&!m.sourcePositionFingerprint)
  return{status:"unverified",total,message:"Subtotais presentes, mas falta a conferência individual das posições. Reimporte o Excel original."};
 const individual=typeof m.sourcePositionFingerprint==="string"&&m.sourcePositionFingerprint===
  global.WealthEngine.positionFingerprint(state.positions);
 const original=Number.isFinite(m.sourceTotal)&&Math.abs(m.sourceTotal-total)<=0.03&&Number.isFinite(m.calculatedTotal)&&Math.abs(m.calculatedTotal-total)<=0.03;
 if(!allBuckets||!original||!individual)return{status:"modified",total,expected:Number(m.sourceTotal)||null,message:"Posições ou valores diferentes daqueles conferidos no Excel original."};
 return{status:"verified",total,expected:Number(m.sourceTotal),message:"Quatro subtotais reconciliados com o Excel da base."};
}
global.WealthIntegrity={check};
})(window);