"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../v3-model.js");
const V=global.WealthV3Model;
function pos(name,type,price,account="Carteira doméstica",currency="BRL"){
 return {id:name,name,type,currency,account,price,units:1,costKnown:false,asOf:"2026-10-15",originalCurrency:type==="international"?"USD":"BRL"};
}
const positions=[
 pos("Santander Previ","pension",700000,"Previdência"),
 pos("Banesprev","pension",165000,"Previdência"),
 pos("TREND OURO","metals",73000),
 pos("TREND OURO DOLAR","metals",10000),
 pos("TREND PRATA","metals",43000),
 pos("TREND IA","funds",6000),
 pos("ARX FUJI RF","fixed_income",65000),
 pos("ABCB4","stocks",2700,"Carteira de ações"),
 pos("FUND IMOBILIÁRIO","reits",95000),
 pos("FUNDO  FGTS","funds",12000),
 pos("POUP STD","cash",1500),
 pos("Mercado BTC","crypto",3100,"Cripto"),
 pos("Exterior · Variável","international",14000,"Investimentos internacionais"),
 pos("Exterior · Fixa","international",31000,"Investimentos internacionais"),
 pos("Exterior · Saldo","international",70,"Investimentos internacionais")
];
const months=Array.from({length:35},(_,i)=>{
 let date=new Date(Date.UTC(2023,10+i+1,0)).toISOString().slice(0,10);
 return {date,total:550000+i*22000,flow:0,flowKnown:false};
});
const state={fx:5.3,positions,history:months,dataEngine:{sourceMetadata:{latestDate:"2026-10-15",partial:true},assetHistory:[]}};
const all=V.group(state);
assert.equal(all.groups.length,7);
assert.equal(all.total,positions.reduce((s,p)=>s+p.price,0));
const byProduct=Object.fromEntries(all.groups.map(g=>[g.id,g.amount]));
assert.equal(byProduct.pension,865000);
assert.equal(byProduct.fund,209000);
assert.equal(byProduct.stock,2700);
assert.equal(byProduct.fii,95000);
assert.equal(byProduct.fgts,undefined,"FGTS investment cannot become a product class");
assert.equal(byProduct.abroad,45070);
assert.equal(byProduct.crypto,3100);
assert.equal(byProduct.savings,1500);
assert.equal(V.classify(positions[2]).product,"fund");assert.equal(V.classify(positions[2]).exposure,"metals");
assert.equal(V.classify(positions[6]).product,"fund");assert.equal(V.classify(positions[6]).exposure,"fixed");
assert.equal(V.classify(positions[9]).product,"fund");
assert.equal(V.classify(positions[9]).exposure,"unspecified","Do not infer a fund strategy from FGTS in its name");
assert.equal(V.group(state,"product","fund").count,6);
assert.equal(V.classify(positions[0]).exposure,"unspecified");
assert.equal(V.group(state,"product","pension").count,2);
assert.equal(V.group(state,"product","pension").total,865000);
assert.equal(V.group(state,"product","pension").groups.length,1);
assert.equal(V.group(state,"product","pension","Banes").total,165000);
for(const dim of ["product","exposure","geo","account","liquidity"]){
 const grouped=V.group(state,dim);assert.ok(Math.abs(grouped.groups.reduce((s,g)=>s+g.amount,0)-all.total)<.001,"grouping "+dim);
}
const historySeries=V.trend(state);assert.equal(historySeries.length,35);assert.equal(historySeries[0].month,"2023-11");assert.equal(historySeries.at(-1).month,"2026-09");assert.equal(historySeries.at(-1).complete,true);
const annualHistory=V.trend(state,{annual:true});
assert.equal(annualHistory.length,4);
assert.deepEqual(annualHistory.map(x=>x.month),["2023-12","2024-12","2025-12","2026-09"]);
assert.deepEqual(annualHistory.map(x=>x.yearComplete),[false,true,true,false]);
assert.deepEqual(annualHistory.map(x=>x.monthsObserved),[2,12,12,9]);
assert.equal(annualHistory.at(-1).complete,true,"September is a recorded monthly close, not a complete year");
assert.equal(V.trend(state,{months:6}).length,6);
assert.equal(V.trend(state,{category:"pension"}).length,0,"Cannot invent missing pension historical points");
const obs=[{date:"2026-08-01",value:680000},{date:"2026-09-01",value:700000}];
state.dataEngine.assetHistory=[{name:"Santander Previ",type:"pension",account:"Previdência",currency:"BRL",observations:obs},
 {name:"Banesprev",type:"pension",account:"Previdência",currency:"BRL",observations:[{date:"2026-09-01",value:165000}]}];
const pension=V.trend(state,{category:"pension"});
assert.equal(pension.length,2);assert.equal(pension[0].value,680000);assert.equal(pension[1].value,865000);
assert.equal(pension[0].complete,false);
// Verified spreadsheet rollover: identical FGTS-fund balance on 2024-12-31 in both year sheets.
state.dataEngine.assetHistory=[
 {id:"old-fgts",name:"FUNDO ELET FGTS",type:"funds",account:"Carteira doméstica",currency:"BRL",
  observations:[{date:"2024-11-29",value:8112.83,source:{sheet:"2024",cell:"AT47"}},{date:"2024-12-31",value:7813.94,source:{sheet:"2024",cell:"AW47"}}]},
 {id:"new-fgts",name:"FUNDO  FGTS",type:"funds",account:"Carteira doméstica",currency:"BRL",
  observations:[{date:"2024-12-31",value:7813.94,source:{sheet:"2025",cell:"B55"}},{date:"2025-01-31",value:8282.04,source:{sheet:"2025",cell:"E55"}}]}
];
const roll=V.trend(state,{dimension:"product",category:"fund"});
assert.deepEqual(roll.map(x=>x.month),["2024-11","2024-12","2025-01"]);
assert.deepEqual(roll.map(x=>x.value),[8112.83,7813.94,8282.04]);
assert.equal(roll[1].samples,1,"Old and new fund names are a single holding at rollover");
const stitched=V.historyForAsset(state.dataEngine,positions[9]);
assert.equal(stitched.length,3,"Merge fund history across year sheets, deduplicating identical December");
assert.equal(stitched[0].date,"2024-11-29");
assert.equal(stitched[1].source.sheet,"2025","Prefer newer sheet for identical observation date");
assert.equal(V.historyKey(state.dataEngine.assetHistory[0]),V.historyKey(state.dataEngine.assetHistory[1]));
console.log("Wealth V3 product facets, filters and truthful history passed.");
