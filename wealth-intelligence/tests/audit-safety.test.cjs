"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../engine.js");
require("../integrity.js");
const E=global.WealthEngine,G=global.WealthIntegrity;
const baseline=E.emptyData();
const safe=(raw)=>E.normalize({...baseline,...raw});
// Impossible dates are rejected rather than silently shifted to a nearby month.
for(const impossible of ["2026-02-30","2026-13-01","2026-00-10","2026-04-31","1900-02-29"]){
 assert.throws(()=>safe({history:[{date:impossible,total:100,flow:0}]}),/inválidos/,"Invalid monthly close: "+impossible);
 assert.throws(()=>safe({positions:[{id:"x",name:"Teste",type:"stocks",currency:"BRL",units:1,cost:0,price:100,asOf:impossible}]}),/inválidos/,"Invalid position date: "+impossible);
}
const leap=safe({history:[{date:"2024-02-29",total:100,flow:0}]});
assert.equal(leap.history[0].date,"2024-02-29");
assert.throws(()=>safe({history:[{date:"2026-01-01",total:100,flow:"abc"}]}),/inválidos/);
// No flows must never be interpreted as a certified zero-flow return.
const missing=safe({history:[{date:"2025-12-31",total:100},{date:"2026-01-31",total:120}]});
assert.equal(missing.history[0].flowKnown,false);
assert.equal(missing.history[1].flowKnown,false);
assert.equal(E.historyAnalysis(missing.history).twr,null);
const zero=safe({history:[{date:"2025-12-31",total:100,flow:0},{date:"2026-01-31",total:120,flow:0}]});
assert.equal(zero.history[1].flowKnown,true);
assert.ok(Math.abs(E.historyAnalysis(zero.history).twr-20)<1e-9);
assert.equal(E.historyAnalysis([{date:"2025-12-31",total:0,flowKnown:false},{date:"2026-01-31",total:120,flowKnown:false}]).delta,null);
// Historical balance proxies must not acquire a fictitious average cost.
const balance=safe({positions:[{id:"proxy",name:"Saldo no extrato",type:"funds",currency:"BRL",units:1,price:1000,cost:0,valuationOnly:true,asOf:"2026-09-30"}]});
assert.equal(balance.positions[0].costKnown,false);
assert.equal(E.portfolio(balance).profit,null);
assert.equal(G.check(balance).status,"manual");
console.log("Wealth audit regressions: date validity, no invented flows/return and unknown costs OK");
