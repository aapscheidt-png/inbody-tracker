(function(root){"use strict";
/* Reconciled Excel-to-Excel incremental update. This module NEVER sends data,
   alters the source workbook, guesses transactions or accepts conflicting history. */
const centsEqual=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=.02;
const txt=v=>String(v??"").normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase("pt-BR");
const positionKey=p=>[p.account,p.name,p.type,p.originalCurrency||p.currency].map(txt).join("|");
const assetKey=p=>[p.account,p.name,p.type,p.currency].map(txt).join("|");
const storedFlow=x=>x.flowKnown===true&&x.flow!==undefined&&x.flow!==null&&x.flow!==""&&Number.isFinite(Number(x.flow));
function keyed(rows,keyFn,label,issues){
 const out=new Map();
 for(const row of rows){
  const k=keyFn(row);
  if(!k||out.has(k)){issues.push("Identificação duplicada ou ausente em "+label+": "+k);continue;}
  out.set(k,row);
 }
 return out;
}
function mergeDated(oldRows,newRows,keyFn,equalFn,label,issues){
 const old=keyed(oldRows,keyFn,label,issues);
 const next=keyed(newRows,keyFn,label,issues);
 const merged=new Map(old),added=[];
 for(const [key,value] of next){
  if(merged.has(key)&&!equalFn(merged.get(key),value)){
   issues.push("Conflito de "+label+" em "+key+". Compare as fontes antes de atualizar.");
  }else{
   if(!merged.has(key))added.push(key);
   merged.set(key,value);
  }
 }
 return{rows:[...merged.values()],added:added.length};
}
function mergeHistory(oldRows,newRows,issues){
 const base=keyed(oldRows,x=>x.date,"fechamentos",issues),next=keyed(newRows,x=>x.date,"fechamentos",issues);
 let added=0;
 for(const [date,row] of next){
  const existing=base.get(date);
  if(existing){
   if(!centsEqual(existing.total,row.total)||
    (storedFlow(existing)&&storedFlow(row)&&!centsEqual(existing.flow,row.flow))){
    issues.push("Fechamento divergente em "+date+". Não será sobrescrito automaticamente.");
    continue;
   }
   // An explicitly supplied flow in a manually completed period is retained;
   // an unknown Excel flow must never erase it.
   base.set(date,storedFlow(existing)&&!storedFlow(row)?existing:row);
  }else{base.set(date,row);added++;}
 }
 return{rows:[...base.values()].sort((a,b)=>a.date.localeCompare(b.date)),added};
}
function mergeAssetHistory(oldRows,newRows,issues){
 const old=keyed(oldRows,assetKey,"séries por investimento",issues);
 const recent=keyed(newRows,assetKey,"séries por investimento",issues);
 const output=new Map(old);let added=0;
 for(const [key,asset] of recent){
  if(!old.has(key)){output.set(key,asset);added+=(asset.observations||[]).length;continue;}
  const oldAsset=old.get(key);
  const a=mergeDated(oldAsset.observations||[],asset.observations||[],x=>x.date,
   (x,y)=>centsEqual(x.value,y.value),"saldos do investimento "+asset.name,issues);
  added+=a.added;
  output.set(key,{...asset,id:oldAsset.id||asset.id,observations:a.rows.sort((x,y)=>x.date.localeCompare(y.date))});
 }
 return{rows:[...output.values()],added};
}
function reconciliation(current,incoming){
 const E=root.WealthEngine,G=root.WealthIntegrity,issues=[];
 if(!current||!incoming||!E||!G)throw Error("Motor de conferência indisponível.");
 const oldStatus=G.check(current).status,newStatus=G.check(incoming).status;
 if(oldStatus!=="verified")issues.push("A carteira atual não está integralmente conferida com um Excel anterior. Faça backup e use substituição completa, se necessário.");
 if(newStatus!=="verified")issues.push("O novo Excel não passou na conferência dos quatro subtotais e posições.");
 const oldMeta=current.dataEngine?.sourceMetadata||{},newMeta=incoming.dataEngine?.sourceMetadata||{};
 for(const key of ["latestDate","latestFullMonth"]){
  if(oldMeta[key]&&newMeta[key]&&newMeta[key]<oldMeta[key])
   issues.push("O novo arquivo possui "+key+" anterior à última importação. Atualização incremental bloqueada.");
 }
 const oldPositions=keyed(current.positions||[],positionKey,"posições atuais",issues);
 const nextPositions=keyed(incoming.positions||[],positionKey,"novas posições",issues);
 const updatedPositions=[];let addedPositions=0,changedPositions=0,removedPositions=0,unchangedPositions=0;
 for(const [key,pos] of nextPositions){
  const previous=oldPositions.get(key);
  if(!previous){updatedPositions.push(pos);addedPositions++;continue;}
  const changed=previous.asOf!==pos.asOf||!centsEqual(previous.units*previous.price,pos.units*pos.price);
  if(changed)changedPositions++;else unchangedPositions++;
  updatedPositions.push({...pos,id:previous.id});
 }
 for(const key of oldPositions.keys())if(!nextPositions.has(key))removedPositions++;
 // An absent position is absent from the NEW CURRENT valuation; its observations
 // remain in the archive. Keeping it as current would double-count source buckets.
 const h=mergeHistory(current.history||[],incoming.history||[],issues);
 const oldAudit=current.dataEngine||{},nextAudit=incoming.dataEngine||{};
 const assets=mergeAssetHistory(oldAudit.assetHistory||[],nextAudit.assetHistory||[],issues);
 const rates=mergeDated(oldAudit.sourceRates||[],nextAudit.sourceRates||[],
  x=>x.date,(x,y)=>centsEqual(x.rate,y.rate),"cotações históricas",issues);
 const contrib=mergeDated(oldAudit.reportedContributions||[],nextAudit.reportedContributions||[],
  x=>[x.date,x.source,x.kind].map(txt).join("|"),
  (x,y)=>centsEqual(x.amount,y.amount),"aportes declarados",issues);
 const income=mergeDated(oldAudit.reportedDistributions||[],nextAudit.reportedDistributions||[],
  x=>[x.date,x.source,x.kind,x.name].map(txt).join("|"),
  (x,y)=>centsEqual(x.amount,y.amount),"proventos declarados",issues);
 const candidate={
  ...incoming,positions:updatedPositions,history:h.rows,
  dataEngine:{...nextAudit,assetHistory:assets.rows,sourceRates:rates.rows,
   reportedContributions:contrib.rows,reportedDistributions:income.rows,
   sourceMetadata:{...newMeta,sourcePositionFingerprint:E.positionFingerprint(updatedPositions)}}
 };
 let normalized=null;
 if(!issues.length){
  try{
   normalized=E.normalize(candidate);
   if(G.check(normalized).status!=="verified"){
    issues.push("A carteira resultante não conciliou com os subtotais do novo Excel.");
    normalized=null;
   }
  }catch(error){issues.push("A atualização não pôde ser validada: "+error.message);}
 }
 return{
  eligible:issues.length===0,issues,oldStatus,newStatus,candidate:normalized,
  stats:{addedPositions,changedPositions,removedPositions,unchangedPositions,
   newMonths:h.added,newObservations:assets.added,newRates:rates.added,
   newContributions:contrib.added,newDistributions:income.added,
   oldTotal:E.portfolio(current).total,newTotal:E.portfolio(incoming).total,
   updatedHistoricalMonths:h.rows.length,latestDate:newMeta.latestDate||""}
 };
}
root.WealthIncremental={reconciliation,positionKey,assetKey};
})(window);
