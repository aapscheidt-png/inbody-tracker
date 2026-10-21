"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../engine.js");require("../xlsx-engine.js");
const X=global.WealthXlsx,E=global.WealthEngine;
function sheet(entries){const s={};for(const [row,col,val] of entries){if(!s[row])s[row]={};s[row][col]=val;}return s;}
const d2024=sheet([[1,1,45254],[123,1,550000],[123,15,765000],[113,15,450000],[114,15,120000]]);
const d2025=sheet([[1,1,45657],[160,1,764634],[160,13,1170732.39],[150,13,592590.12],[151,13,142904.01]]);
const d2026=sheet([[1,1,46022],[1,22,46295],[1,23,46310],[3,0,"ABCB4"],[3,22,90],[3,23,100],[51,0,"TREND OURO"],[51,23,50],[72,22,400],
[82,0,"Variável"],[82,10,2],[82,11,2],[83,0,"Fixa"],[83,10,4],[83,11,4],[84,0,"Saldo"],[84,10,.5],[84,11,.5],[85,0,"Dólar"],[85,10,5],[85,11,5],[86,0,"Real"],[86,10,32.5],[86,11,32.5],
[116,0,"Santander Previ"],[116,10,700],[117,0,"Banesprev"],[117,10,150],[121,0,"Mercado BTC"],[121,10,3],[121,11,3],[122,0,"Binance"],[122,10,2],[122,11,2],[126,10,1400]]);
const parsed=X.analyze({sheets:{"2024":d2024,"2025":d2025,"2026":d2026}});
assert.equal(parsed.schema,"wealth-data-engine-v2");
assert.equal(parsed.history.find(x=>x.date==="2024-12-31").total,765000);
assert.equal(parsed.history.find(x=>x.date==="2025-12-31").total,1170732.39);
assert.equal(parsed.history.find(x=>x.date==="2026-09-30").total,1287.5); // 400+32.5+700+150+3+2
assert.ok(parsed.quality.some(x=>x.code==="SEPTEMBER_TOTAL_FORMULA"));
assert.ok(parsed.quality.some(x=>x.code==="STALE_PENSION"));
assert.equal(parsed.sourceMetadata.partial,true);
assert.equal(parsed.sourceMetadata.latestFullMonth,"2026-09-30");
assert.equal(parsed.sourceMetadata.latestPensionDate,"2026-09-30");
assert.equal(parsed.sourceMetadata.latestDate,"2026-10-15");
assert.ok(parsed.positions.some(x=>x.type==="pension"&&x.price===700));
assert.ok(parsed.positions.some(x=>x.type==="international"&&x.price===10&&x.originalCurrency==="USD"));
assert.ok(parsed.assetHistory.some(x=>x.name==="ABCB4"&&x.observations.length===2));
assert.ok(parsed.positions.every(x=>x.costKnown===false));
const state=E.normalize({...E.emptyData(),positions:parsed.positions,history:parsed.history,
 dataEngine:{assetHistory:parsed.assetHistory,quality:parsed.quality,sourceMetadata:parsed.sourceMetadata,sourceRates:parsed.sourceRates}});
assert.ok(state.dataEngine);
assert.equal(state.dataEngine.assetHistory.length,parsed.assetHistory.length);
assert.ok(state.dataEngine.quality.length);
assert.ok(state.history.every(x=>x.flowKnown===false));
console.log("Synthetic XLSX mapping, reconciliation and lineage preservation OK");
