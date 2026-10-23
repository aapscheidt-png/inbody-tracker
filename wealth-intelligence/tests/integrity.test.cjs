"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../engine.js");
require("../integrity.js");
const E=global.WealthEngine,G=global.WealthIntegrity;
const positions=[
{id:"d",name:"Brasil",type:"stocks",account:"Carteira de ações",currency:"BRL",units:1,price:100,cost:0,costKnown:false,asOf:"2026-10-15"},
{id:"i",name:"Exterior",type:"international",account:"Investimentos internacionais",currency:"BRL",units:1,price:25,cost:0,costKnown:false,asOf:"2026-10-01"},
{id:"p",name:"Previdência",type:"pension",account:"Previdência",currency:"BRL",units:1,price:70,cost:0,costKnown:false,asOf:"2026-09-30"},
{id:"c",name:"Cripto",type:"crypto",account:"Cripto",currency:"BRL",units:1,price:5,cost:0,costKnown:false,asOf:"2026-10-01"}
];
const meta={sourceVerified:true,sourceTotal:200,calculatedTotal:200,sourceBuckets:[
{key:"domestic",excelValue:100,importedValue:100,matched:true},
{key:"international",excelValue:25,importedValue:25,matched:true},
{key:"pension",excelValue:70,importedValue:70,matched:true},
{key:"crypto",excelValue:5,importedValue:5,matched:true}
]};
const base=E.normalize({...E.emptyData(),positions,dataEngine:{sourceMetadata:meta}});
let report=G.check(base);
assert.equal(report.status,"verified");assert.equal(report.total,200);
let modified=E.normalize({...base,positions:base.positions.map(x=>x.id==="d"?{...x,price:101}:x)});
assert.equal(G.check(modified).status,"modified");
assert.equal(G.check(E.normalize({...E.emptyData(),positions})).status,"manual");
assert.equal(G.check(E.DEMO).status,"demo");
const noMeta=E.normalize({...base,dataEngine:{sourceMetadata:{sourceVerified:true,sourceBuckets:[]}}});
assert.equal(G.check(noMeta).status,"unverified");
global.localStorage={getItem(){return '{"not-a-wallet":true';},setItem(){}};
const corrupted=E.read();assert.equal(corrupted.mode,"personal");assert.equal(corrupted.loadError,true);assert.equal(corrupted.positions.length,0);
global.localStorage={getItem(){return JSON.stringify(base);},setItem(){}};
const restored=E.read();assert.equal(G.check(restored).status,"verified");assert.notEqual(restored.loadError,true);
console.log("Wealth source integrity and corrupted browser-storage recovery passed.");
