"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../flow-audit.js");
const F=global.WealthFlowAudit;
const data={
 history:[
  {date:"2026-01-31",total:1000,flow:0,flowKnown:false},
  {date:"2026-02-28",total:1200},
  {date:"2026-03-31",total:1300,flow:100,flowKnown:true},
  {date:"2026-04-30",total:1380,flow:0,flowKnown:true}
 ],
 dataEngine:{
  reportedContributions:[
   {date:"2026-01-20",amount:20},
   {date:"2026-02-28",amount:50},
   {date:"2026-03-05",amount:100},
   {date:"2026-05-01",amount:70}
  ],
  reportedDistributions:[{date:"2026-03-01",amount:5,kind:"fii_income_total"}]
 }
};
const result=F.coverage(data);
assert.equal(result.intervalCount,3);
assert.equal(result.supplied,2);
assert.equal(result.pending,1);
assert.equal(result.fullyReconciled,false,"No source declaration certifies external flows");
assert.deepEqual(result.intervals.map(x=>x.known),[false,true,true]);
assert.equal(result.intervals[0].declaredCount,1);
assert.equal(result.intervals[0].declaredTotal,50,"Interval includes its closing date");
assert.equal(result.intervals[1].declaredTotal,100);
assert.equal(result.intervals[2].declaredTotal,null);
assert.equal(result.outsideCount,2);
assert.equal(result.declaredCount,4);
assert.equal(result.declaredTotal,240);
assert.ok(result.intervals.every(x=>!x.returnAudited));
assert.equal(F.coverage({history:[]}).intervalCount,0);
assert.equal(F.coverage({}).pending,0);
assert.equal(F.coverage({history:[{date:"2026-01-31",total:1000},{date:"2026-02-28",total:1100,flow:null}]}).pending,1);
require("../engine.js");require("../analytics.js");require("../performance.js");
const E=global.WealthEngine,A=global.WealthAnalytics,P=global.WealthPerformance;
const missing=[{date:"2025-01-01",total:1000},{date:"2026-01-01",total:1100}];
for(const rows of [missing,[{date:"2025-01-01",total:1000,flow:0},{date:"2026-01-01",total:1100,flow:null}]]){
 assert.equal(E.historyAnalysis(rows).twr,null,"Missing flows must not produce adjusted returns");
 assert.equal(A.growthBridge(rows).ready,false,"Missing flows must block growth bridge");
 assert.equal(A.historicalCalibration(rows).available,false);
 assert.equal(P.annualizedMoneyWeightedReturn(rows).available,false,"Missing flows must block IRR");
 assert.equal(P.referenceScenario(rows,10).available,false);
}
const explicitZero=[{date:"2025-01-01",total:1000,flow:0},{date:"2026-01-01",total:1100,flow:0}];
assert.ok(Math.abs(E.historyAnalysis(explicitZero).twr-10)<1e-9);
assert.equal(A.growthBridge(explicitZero).ready,true);
assert.equal(P.annualizedMoneyWeightedReturn(explicitZero).available,true);
console.log("Flow provenance and unknown-cash-flow regression PASS");
