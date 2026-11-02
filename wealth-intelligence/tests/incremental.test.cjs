"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../engine.js");require("../integrity.js");require("../incremental.js");
const E=global.WealthEngine,G=global.WealthIntegrity,U=global.WealthIncremental;
const pos=(id,name,account,value,asOf="2026-09-30")=>({
 id,name,account,type:account==="Previdência"?"pension":account==="Cripto"?"crypto":
 account==="Investimentos internacionais"?"international":"funds",
 currency:"BRL",originalCurrency:"BRL",originalValue:value,units:1,price:value,cost:0,costKnown:false,
 asOf,valuationOnly:true,source:{sheet:"2026",cell:"C4"}
});
const make=(positions,history,latestDate,extra={})=>{
 const accounts=[
  ["domestic",["Carteira doméstica","Carteira de ações"]],
  ["international",["Investimentos internacionais"]],
  ["pension",["Previdência"]],["crypto",["Cripto"]]
 ];
 const buckets=accounts.map(([key,names])=>{
  const total=positions.filter(x=>names.includes(x.account)).reduce((s,x)=>s+x.price,0);
  return {key,label:key,excelValue:total,importedValue:total,matched:true};
 });
 const total=positions.reduce((s,p)=>s+p.price,0);
 return E.normalize({version:1,mode:"personal",fx:5.2,benchmarkAnnualPct:9,
 assumptions:{target:5000000,monthly:7000,years:15,rate:10,vol:14,inflation:4.5},
 positions,history,dataEngine:{
 sourceMetadata:{sourceVerified:true,sourceBuckets:buckets,sourceTotal:total,calculatedTotal:total,
  sourcePositionFingerprint:E.positionFingerprint(positions),latestDate,latestFullMonth:history.at(-1).date},
 assetHistory:[],sourceRates:[],reportedContributions:[],reportedDistributions:[],quality:[],...extra
 }});
};
const oldPos=[
 pos("old-dom","Fundo A","Carteira doméstica",450),
 pos("old-closed","Fundo encerrado","Carteira doméstica",50),
 pos("old-intl","Exterior","Investimentos internacionais",200),
 pos("old-pension","Previdência A","Previdência",200),
 pos("old-crypto","Bitcoin","Cripto",100)
];
const newPos=[
 pos("new-dom","Fundo A","Carteira doméstica",475,"2026-10-15"),
 pos("new-added","Fundo novo","Carteira doméstica",55,"2026-10-15"),
 pos("new-intl","Exterior","Investimentos internacionais",220,"2026-10-15"),
 pos("new-pension","Previdência A","Previdência",210),
 pos("new-crypto","Bitcoin","Cripto",120,"2026-10-01")
];
const oldHistory=[{date:"2026-08-31",total:950,flow:0,flowKnown:false},
 {date:"2026-09-30",total:1000,flow:100,flowKnown:true}];
const newHistory=[{date:"2026-09-30",total:1000,flow:0,flowKnown:false},
 {date:"2026-10-31",total:1080,flow:0,flowKnown:false}];
const old=make(oldPos,oldHistory,"2026-09-30",{
 assetHistory:[
  {id:"a",name:"Fundo A",account:"Carteira doméstica",type:"funds",currency:"BRL",
   observations:[{date:"2026-08-31",value:420,source:{sheet:"2026",cell:"A1"}},
                 {date:"2026-09-30",value:450,source:{sheet:"2026",cell:"B1"}}]},
  {id:"c",name:"Fundo encerrado",account:"Carteira doméstica",type:"funds",currency:"BRL",
   observations:[{date:"2026-08-31",value:50,source:{sheet:"2026",cell:"A2"}}]}
 ],
 sourceRates:[{date:"2026-09-01",rate:5.1,source:"sourceA"}],
 reportedContributions:[{date:"2026-09-05",amount:100,source:"2026!A5:B5",kind:"reported_aporte"}]
});
const fresh=make(newPos,newHistory,"2026-10-15",{
 assetHistory:[
  {id:"new-a",name:"Fundo A",account:"Carteira doméstica",type:"funds",currency:"BRL",
   observations:[{date:"2026-09-30",value:450,source:{sheet:"2026",cell:"B1"}},
                 {date:"2026-10-15",value:475,source:{sheet:"2026",cell:"C1"}}]}
 ],
 sourceRates:[{date:"2026-09-01",rate:5.1,source:"sourceA"},{date:"2026-10-01",rate:5.2,source:"sourceB"}],
 reportedContributions:[{date:"2026-09-05",amount:100,source:"2026!A5:B5",kind:"reported_aporte"},
 {date:"2026-10-04",amount:25,source:"2026!A7:B7",kind:"reported_aporte"}],
 reportedDistributions:[{date:"2026-10-01",amount:20,kind:"fii_income_total",source:"2026!B3",name:"FIIs"}]
});
assert.equal(G.check(old).status,"verified");
assert.equal(G.check(fresh).status,"verified");
const report=U.reconciliation(old,fresh);
assert.equal(report.eligible,true,report.issues.join("; "));
assert.equal(report.stats.addedPositions,1);
assert.equal(report.stats.removedPositions,1);
assert.equal(report.stats.changedPositions,4);
assert.equal(report.stats.newMonths,1);
assert.equal(report.stats.newObservations,1);
assert.equal(report.stats.newContributions,1);
assert.equal(report.stats.newDistributions,1);
assert.equal(report.candidate.positions.length,5,"Closed positions are not still current");
assert.equal(report.candidate.history.length,3,"Past months retained even if absent from new Excel");
assert.equal(report.candidate.history.find(x=>x.date==="2026-09-30").flow,100,"Manual verified interval flow retained");
assert.equal(report.candidate.history.find(x=>x.date==="2026-09-30").flowKnown,true);
assert.equal(report.candidate.positions.find(x=>x.name==="Fundo A").id,"old-dom","Stable holding identity preserved");
assert.equal(report.candidate.positions.some(x=>x.name==="Fundo encerrado"),false);
assert.ok(report.candidate.dataEngine.assetHistory.some(x=>x.name==="Fundo encerrado"),"Closed history stays archived");
assert.equal(G.check(report.candidate).status,"verified","Four source totals and updated fingerprint must reconcile");
assert.equal(report.candidate.assumptions.target,5000000);
const conflict=U.reconciliation(old,make(newPos,[{date:"2026-09-30",total:1030},{date:"2026-10-31",total:1080}],"2026-10-15"));
assert.equal(conflict.eligible,false,"Overlapping historical difference blocks incremental");
assert.ok(conflict.issues.some(x=>x.includes("Fechamento divergente")));
const edited=E.normalize({...old,positions:old.positions.map((p,i)=>i? p:{...p,price:p.price+10})});
assert.equal(G.check(edited).status,"modified");
assert.equal(U.reconciliation(edited,fresh).eligible,false,"Locally edited wallet cannot be treated as verified old Excel");
const earlier=make(newPos,newHistory,"2026-08-15");
assert.equal(U.reconciliation(old,earlier).eligible,false,"Older source date cannot replace newer verified one");
const duplicate=E.normalize({...fresh,positions:[...fresh.positions,{...fresh.positions[0],id:"duplicate"}]});
assert.equal(U.reconciliation(old,duplicate).eligible,false,"Ambiguous holding key must never silently merge");
const divergentContribution=make(newPos,newHistory,"2026-10-15",{
 reportedContributions:[{date:"2026-09-05",amount:123,source:"2026!A5:B5",kind:"reported_aporte"}]
});
assert.equal(U.reconciliation(old,divergentContribution).eligible,false,"Conflicting ledger amount blocks incremental");
const noNewHistory=U.reconciliation(old,make(newPos,[...oldHistory],"2026-10-15"));
assert.equal(noNewHistory.eligible,true);
assert.equal(noNewHistory.stats.newMonths,0);
console.log("Verified Excel incremental merge, conservative historic retention and conflict gates: PASS");
