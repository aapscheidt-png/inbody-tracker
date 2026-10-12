"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
global.window=global;
require("../engine.js");require("../analytics.js");
const E=global.WealthEngine,A=global.WealthAnalytics;
function eq(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
const history=[
 {date:"2025-01-31",total:1000,flow:0},
 {date:"2025-02-28",total:1100,flow:100},
 {date:"2025-03-31",total:1210,flow:0}
];
const g=A.growthBridge(history);assert.equal(g.ready,true);eq(g.change,210);eq(g.netFlows,100);eq(g.result,110);
assert.equal(A.growthBridge([]).ready,false);
assert.equal(A.periodHistory(history,"m1","2025-03-31").length,2);
assert.equal(A.periodHistory(history,"all").length,3);
assert.equal(A.milestones([{date:"2025-03-31",total:2000000,flow:0}])[0].value,2000000);
const profile=E.portfolio(E.DEMO),risk=A.portfolioRisk(profile);
assert.ok(risk.score>0&&risk.score<=90);
assert.ok(risk.effectiveAssets>1);
assert.equal(A.portfolioRisk(E.portfolio(E.emptyData())).score,0);
assert.equal(A.historicalCalibration(history).available,false);
const calibrationSeries=[];let balance=1000;
for(let i=0;i<15;i++){const date=new Date(Date.UTC(2025,i,1)).toISOString().slice(0,10);if(i)balance*=1.01;calibrationSeries.push({date,total:balance,flow:0});}
const calibrated=A.historicalCalibration(calibrationSeries);
assert.equal(calibrated.available,true);
assert.ok(calibrated.rate>11&&calibrated.rate<14);
assert.ok(calibrated.vol>=0&&calibrated.vol<1);
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const refs=[...app.matchAll(/(?:el|text)\("([^"]+)"/g)].map(m=>m[1]);
for(const id of refs)assert.ok(ids.has(id),"Missing element: "+id);
for(const script of ["engine.js","analytics.js","app.js"])assert.ok(html.includes("./"+script),"Missing module: "+script);
assert.ok(!/<script[^>]+https?:\/\//i.test(html),"External scripts in private local-first app");
console.log("Wealth Intelligence V1.1: analytics + page contract passed");
