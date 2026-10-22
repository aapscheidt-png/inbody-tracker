(function(global) {
"use strict";
function moneyNumber(value) {const x=Number(value);return Number.isFinite(x)?Math.round(x*100)/100:0;}
function validMonth(date) {return /^\d{4}-\d{2}-\d{2}$/.test(String(date||""))?String(date).slice(0,7):null;}
function yearList(data) {
 const years=new Set();
 for(const x of [...(data?.reportedDistributions||[]),...(data?.reportedContributions||[])]) {const date=String(x.date||"");if(/^20\d{2}-\d{2}-\d{2}$/.test(date))years.add(date.slice(0,4));}
 return [...years].sort((a,b)=>b.localeCompare(a));
}
function incomeByYear(data,year) {
 const accepted=new Map(),duplicates=[],records=(data?.reportedDistributions||[]).filter(e=>e&&Number(e.amount)>0&&validMonth(e.date)?.startsWith(String(year)+"-"));
 // Ignore superseded detail whenever the same month has a consolidated stock total.
 const consolidated=new Set(records.filter(x=>x.kind==="stock_dividends_total").map(x=>validMonth(x.date)));
 for(const x of records) {
  const month=validMonth(x.date);if(!month)continue;
  if(x.kind==="stock_dividend_entry"&&consolidated.has(month)){duplicates.push({date:x.date,name:x.name,reason:"Consolidado de ações prevalece"});continue;}
  const key=month+"|"+x.kind+"|"+(x.kind==="stock_dividend_entry"?String(x.name||"").trim().toUpperCase():"total");
  const old=accepted.get(key);
  if(old)duplicates.push({date:x.date,name:x.name,reason:"Observações sobrepostas"});
  if(!old||String(x.source||"").slice(0,4)>=String(old.source||"").slice(0,4))accepted.set(key,x);
 }
 const months=[];
 for(let i=1;i<=12;i++){
  const m=String(year)+"-"+String(i).padStart(2,"0"),entries=[...accepted.values()].filter(x=>validMonth(x.date)===m);
  if(!entries.length)continue;
  const stock=moneyNumber(entries.filter(x=>x.kind.startsWith("stock_")).reduce((s,x)=>s+Number(x.amount),0));
  const fiis=moneyNumber(entries.filter(x=>x.kind==="fii_income_total").reduce((s,x)=>s+Number(x.amount),0));
  const other=moneyNumber(entries.filter(x=>x.kind!=="fii_income_total"&&!x.kind.startsWith("stock_")).reduce((s,x)=>s+Number(x.amount),0));
  months.push({month:m,stock,fiis,other,total:moneyNumber(stock+fiis+other),count:entries.length,entries:entries.map(x=>({source:String(x.source||""),amount:Number(x.amount),name:String(x.name||""),kind:String(x.kind||"")}))});
 }
 return{year:String(year),months,total:moneyNumber(months.reduce((s,x)=>s+x.total,0)),stocks:moneyNumber(months.reduce((s,x)=>s+x.stock,0)),fiis:moneyNumber(months.reduce((s,x)=>s+x.fiis,0)),other:moneyNumber(months.reduce((s,x)=>s+x.other,0)),duplicates:duplicates.length,sourceCount:accepted.size,complete:false,
  caution:"Proventos informados no Excel; a base não comprova o crédito em conta nem distingue reinvestimentos."};
}
function auditLines(state){
 const data=state.dataEngine||{},meta=data.sourceMetadata||{};
 const rows=[["WEALTH INTELLIGENCE · CONFERÊNCIA PRIVADA","VALOR BRL","DATA OU COMPETÊNCIA","ORIGEM","OBSERVAÇÃO"]];
 if(Number.isFinite(meta.dashboardTotal))rows.push(["Dashboard original",meta.dashboardTotal,meta.latestDate||"",meta.dashboardCell||"Dashboard!B6","Valor informado no arquivo"]);
 if(Number.isFinite(meta.calculatedTotal))rows.push(["Soma das últimas posições",meta.calculatedTotal,meta.latestDate||"","Wealth Data Engine","Patrimônio provisório com datas mistas"]);
 if(Number.isFinite(meta.difference))rows.push(["Diferença Dashboard - posições",meta.difference,meta.latestDate||"","Conciliação","Não representa ganho ou perda"]);
 for(const h of state.history||[])rows.push(["Fechamento mensal",h.total,h.date,h.source||"","Movimentações externas não conciliadas"]);
 const list=(state.positions||[]).slice().sort((a,b)=>(a.type||"").localeCompare(b.type||"")||(a.name||"").localeCompare(b.name||""));
 for(const a of list){
  const units=Number(a.units)||0,fx=a.currency==="USD"?(Number(state.fx)||0):1,value=moneyNumber(units*Number(a.price)*fx);
  const original=a.originalCurrency==="USD"?"Valor em US$ "+a.originalValue+", USD/BRL "+a.fxRate:"";
  rows.push(["Posição: "+a.name,value,a.asOf||"",a.source?.sheet&&a.source?.cell?a.source.sheet+"!"+a.source.cell:"Cadastro manual",
    (a.valuationOnly||a.costKnown===false?"Saldo informado; custo não conhecido":"Preço e quantidade informados")+(original?"; "+original:"")]);
 }
 for(const a of data.quality||[])rows.push(["Alerta: "+a.code,Number.isFinite(a.difference)?a.difference:"",a.date||"",a.cell||"",a.message||"Divergência identificada"]);
 return rows;
}
function csv(rows,escapeCell){
 return "\uFEFF"+rows.map(row=>row.map(escapeCell).join(";")).join("\r\n")+"\r\n";
}
global.WealthLedger={yearList,incomeByYear,auditLines,csv};
})(window);