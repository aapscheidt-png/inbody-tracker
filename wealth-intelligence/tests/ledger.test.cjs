"use strict";
const assert=require("node:assert/strict");
global.window=global;
require("../engine.js");
require("../importer.js");
require("../ledger.js");
const E=global.WealthEngine,I=global.WealthImporter,L=global.WealthLedger;
const D={reportedDistributions:[
{date:"2026-01-01",amount:100,kind:"stock_dividends_total",source:"2026!C76"},
{date:"2026-01-01",amount:300,kind:"stock_dividend_entry",name:"ABC",source:"2026!C88"},
{date:"2026-01-01",amount:50,kind:"fii_income_total",source:"2026!C79"},
{date:"2026-02-01",amount:120.55,kind:"stock_dividends_total",source:"2026!D76"},
{date:"2025-12-01",amount:79.3,kind:"stock_dividend_entry",name:"ABC",source:"2025!N88"},
{date:"2025-12-01",amount:79.3,kind:"stock_dividend_entry",name:"ABC",source:"2024!P88"}
],reportedContributions:[{date:"2026-03-01",amount:300,source:"2026!A88"}]};
const years=L.yearList(D);assert.deepEqual(years,["2026","2025"]);
const y=L.incomeByYear(D,"2026");
assert.equal(y.total,270.55);assert.equal(y.stocks,220.55);assert.equal(y.fiis,50);assert.equal(y.duplicates,1);assert.equal(y.sourceCount,3);
assert.equal(L.incomeByYear(D,2025).total,79.3);
const state=E.normalize({...E.emptyData(),positions:[{id:"A",name:"Previdência histórica",ticker:"",type:"pension",currency:"BRL",units:1,cost:0,costKnown:false,valuationOnly:true,price:10000,asOf:"2026-09-30",source:{sheet:"2026",cell:"K116"},account:"Previdência",datePrecision:"month"}],dataEngine:{sourceMetadata:{filename:"fixture",dashboardTotal:10500,calculatedTotal:10000,difference:500,latestDate:"2026-10-15",dashboardCell:"Dashboard!B6"},quality:[{code:"CHECK",severity:"warning",date:"2026-10-15",difference:500}],reportedDistributions:D.reportedDistributions,reportedContributions:D.reportedContributions}});
const lines=L.auditLines(state);assert.ok(lines.some(x=>x[0]==="Dashboard original"&&x[1]===10500));assert.ok(lines.some(x=>x[0].includes("Previdência histórica")&&x[3]==="2026!K116"));assert.ok(L.csv(lines,I.escapeCell).includes("Dashboard original"));
const headers=["nome","codigo","classe","moeda","quantidade","custo_unitario","preco_atual","data_preco","custo_conhecido","saldo_historico","conta","precisao_data"];
const csv=L.csv([headers,["Previdência histórica","","Previdência","BRL",1,"",10000,"2026-09-30","nao","sim","Previdência","mes"]],I.escapeCell);
const imported=I.rowsToPositions(csv,"2026-09-30");
assert.equal(imported.length,1);assert.equal(imported[0].type,"pension");assert.equal(imported[0].costKnown,false);assert.equal(imported[0].valuationOnly,true);assert.equal(imported[0].datePrecision,"month");
const restored=E.portfolio(E.normalize({...E.emptyData(),positions:imported}));assert.equal(restored.profit,null);assert.equal(restored.total,10000);
const legacy=I.rowsToPositions('nome;quantidade;custo_unitario;preco_atual\nABC;2;10;20',"2026-10-22");assert.equal(legacy[0].costKnown,true);assert.equal(legacy[0].cost,10);
console.log("Wealth V2.2: income dedup, audit provenance and lossless unknown-cost CSV passed");