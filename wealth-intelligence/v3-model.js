(function(root){
"use strict";
const PRODUCT={
 pension:{label:"Previdência",color:"#70d0ca"},
 fund:{label:"Fundos de investimento",color:"#deb264"},
 stock:{label:"Ações brasileiras",color:"#ae8bee"},
 fii:{label:"Fundos imobiliários",color:"#f28a7a"},
 abroad:{label:"Investimentos internacionais",color:"#72b5f2"},
 crypto:{label:"Criptoativos",color:"#e79d8b"},
 savings:{label:"Poupança",color:"#92b7db"},
 fixed_income:{label:"Renda fixa direta",color:"#8bc5ac"},
 cash:{label:"Saldo em conta",color:"#a8b3c7"},
 other:{label:"Não classificado",color:"#98a7b5"}
};
const EXPOSURE={
 unspecified:"Não especificada",equities:"Renda variável",fixed:"Renda fixa",property:"Imobiliário",
 metals:"Metais preciosos",alternatives:"Alternativos",crypto:"Criptoativos",cash:"Caixa"
};
function classify(x){
 const n=String(x.name||"").trim().toUpperCase().replace(/\s+/g," "),type=String(x.type||"");
 let product="other",exposure="unspecified",geo="br";
 if(type==="pension"){product="pension";}
 else if(type==="stocks"){product="stock";exposure="equities";}
 else if(type==="reits"||n.includes("FUND IMOB")){product="fii";exposure="property";}
 else if(type==="international"){product="abroad";geo="global";exposure=n.includes("VARIÁVEL")||n.includes("VARIAVEL")?"equities":n.includes("FIXA")?"fixed":n.includes("SALDO")?"cash":"unspecified";}
 else if(type==="crypto"){product="crypto";exposure="crypto";}
 else if(n.startsWith("TREND ")||n.startsWith("ARX FUJI")){product="fund";exposure=n.includes("OURO")||n.includes("PRATA")?"metals":n.includes("FUJI")?"fixed":"alternatives";}
 else if(type==="funds"){product="fund";exposure="unspecified";}
 else if(type==="metals"){product="other";exposure="metals";}
 else if(n.includes("POUP")){product="savings";exposure="cash";}
 else if(type==="cash"){product="cash";exposure="cash";}
 else if(type==="fixed_income"){product="fixed_income";exposure="fixed";}
 return {product,exposure,account:String(x.account||"").trim()||"Conta não informada",
  geo,liquidity:"not_reported",currency:x.originalCurrency==="USD"?"USD":"BRL"};
}
function moneyValue(p,fx){
 const value=(Number(p.units)||0)*(Number(p.price)||0)*(p.currency==="USD"?(Number(fx)||0):1);
 return Number.isFinite(value)&&value>=0?Math.round(value*100)/100:0;
}
function entries(state){
 return (state?.positions||[]).map(p=>({...p,facets:classify(p),amount:moneyValue(p,state.fx)}));
}
const dimensions={
 product:{label:"Produto",options:PRODUCT},
 exposure:{label:"Exposição",options:Object.fromEntries(Object.entries(EXPOSURE).map(([id,label])=>[id,{label}]))},
 account:{label:"Conta"},geo:{label:"Localização",options:{br:{label:"Brasil"},global:{label:"Exterior"}}},
 liquidity:{label:"Liquidez",options:{not_reported:{label:"Não informada"}}}
};
function label(dim,id){if(dim==="account")return id;return dimensions[dim]?.options?.[id]?.label||id;}
function group(state,dim="product",category="",query=""){
 const all=entries(state),needle=String(query).trim().toLocaleLowerCase("pt-BR");
 const filtered=all.filter(x=>(!category||String(x.facets[dim])===String(category))&&(!needle||(x.name+" "+x.ticker).toLocaleLowerCase("pt-BR").includes(needle)));
 const total=filtered.reduce((s,p)=>s+Math.round(p.amount*100),0)/100;
 const groups=new Map();
 for(const item of filtered){
  const id=item.facets[dim]||"other",g=groups.get(id)||{id,label:label(dim,id),amountCents:0,count:0,items:[]};
  g.amountCents+=Math.round(item.amount*100);g.count++;g.items.push(item);groups.set(id,g);
 }
 return{total,allTotal:all.reduce((s,p)=>s+Math.round(p.amount*100),0)/100,count:filtered.length,
  groups:[...groups.values()].map(g=>({...g,amount:g.amountCents/100,share:total?100*g.amountCents/(total*100):0,
   color:dim==="product"?(PRODUCT[g.id]?.color||"#93adb8"):"#77c7b6",
   items:g.items.sort((a,b)=>b.amount-a.amount)})).sort((a,b)=>b.amount-a.amount),
  filtered};
}
// The 2024 workbook calls this same fund "FUNDO ELET FGTS" while 2025+
// calls it "FUNDO FGTS". Both carry exactly R$ 7,813.94 on 31 Dec 2024.
// Map only this audited alias, not all products containing "FGTS".
function historyKey(item){
 const n=String(item.name||"").trim().toUpperCase().replace(/\s+/g," ");
 const isLegacyFund=n==="FUNDO ELET FGTS"||n==="FUNDO FGTS";
 return isLegacyFund&&(item.type==="funds"||item.type==="fixed_income")?
  "FGTS_FUND_AUDITED_ALIAS":String(item.id||item.name||"")+"|"+String(item.account||"");
}
function historyForAsset(data,item){
 const reference=historyKey(item);
 const matching=(data?.assetHistory||[]).filter(x=>
   x.account===item.account&&(x.name===item.name||historyKey(x)===reference));
 const byDay=new Map();
 for(const series of matching)for(const o of series.observations||[]){
  const d=String(o.date||"");if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(o.value))continue;
  const prev=byDay.get(d);
  if(!prev||String(o.source?.sheet||"")>String(prev.source?.sheet||""))byDay.set(d,o);
 }
 return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function historyFacets(state,dim="product"){
 const categories=new Map();
 const assets=[...(state?.positions||[]),...(state?.dataEngine?.assetHistory||[])];
 for(const asset of assets){
  const f=classify(asset),id=f[dim]||"other";
  if(!categories.has(id))categories.set(id,{id,label:label(dim,id)});
 }
 return [...categories.values()].sort((a,b)=>a.label.localeCompare(b.label,"pt-BR"));
}
function historicalRates(data){
 const map=new Map();
 for(const r of data?.sourceRates||[])if(Number(r.rate)>0)map.set(String(r.date).slice(0,7),Number(r.rate));
 return map;
}
function trend(state,options={}){
 const dim=options.dimension||"product",cat=options.category||"",months=options.months||0,annual=options.annual===true;
 const source=state.dataEngine?.assetHistory||[],filtered=cat!=="";
 let values=[];
 if(!filtered){
  values=(state.history||[]).filter(r=>Number.isFinite(r.total)).map(r=>({date:r.date,month:r.date.slice(0,7),value:r.total,complete:true,source:r.source||"",samples:1}));
  values.sort((a,b)=>a.date.localeCompare(b.date));
  // Do not join provisional mixed-date holdings to the verified monthly-closing curve.
  // Even if a separately labelled partial observation exists, it is not a monthly close.
 }else{
  const rate=historicalRates(state.dataEngine),buckets=new Map();
  const cohort=source.filter(item=>classify(item)[dim]===cat);
  const expected=new Set(cohort.map(historyKey)).size;
  const verifiedPension=expected>0&&cohort.every(item=>classify(item).product==="pension");
  for(const item of cohort){
   const byMonth=new Map();
   for(const obs of item.observations||[]){
    const month=String(obs.date||"").slice(0,7);
    if(!/^\d{4}-\d{2}$/.test(month)||!Number.isFinite(obs.value)||obs.value<0)continue;
    const prev=byMonth.get(month);
    if(!prev||obs.date>=prev.date)byMonth.set(month,obs);
   }
   for(const [month,obs] of byMonth){
    const fx=item.currency==="USD"?(rate.get(month)||null):1;
    if(fx===null)continue;
    const key=historyKey(item),rec=buckets.get(month)||new Map();
    const existing=rec.get(key),value=obs.value*fx;
    if(!existing||obs.date>existing.date||(obs.date===existing.date&&String(obs.source?.sheet||"")>String(existing.sheet||"")))
      rec.set(key,{value,date:obs.date,sheet:obs.source?.sheet||""});
    buckets.set(month,rec);
   }
  }
  values=[...buckets.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([month,rec])=>({
   date:month+"-01",month,value:[...rec.values()].reduce((sum,r)=>sum+r.value,0),
   complete:verifiedPension&&rec.size===expected,
   source:"Saldos históricos observados por ativo",samples:rec.size,expected,
   coverage:expected?rec.size/expected:0
  }));
 }
 if(months>0)values=values.slice(-months);
 if(annual){
  const byYear=new Map(),availableMonths=new Map();
  for(const row of values){
   const year=row.month.slice(0,4),old=byYear.get(year);
   if(!old||old.month<row.month)byYear.set(year,row);
   if(!availableMonths.has(year))availableMonths.set(year,new Set());
   availableMonths.get(year).add(row.month.slice(5,7));
  }
  const yearFullyObserved=new Map();
  for(const row of values){
   const yr=row.month.slice(0,4);
   yearFullyObserved.set(yr,(yearFullyObserved.get(yr)??true)&&row.complete===true);
  }
  values=[...byYear.values()].sort((a,b)=>a.month.localeCompare(b.month)).map(row=>{
   const year=row.month.slice(0,4),monthsObserved=availableMonths.get(year).size;
   return {...row,yearComplete:row.month.endsWith("-12")&&monthsObserved===12&&yearFullyObserved.get(year)===true,
     monthsObserved,annualReferenceMonth:row.month};
  });
 }
 return values.map(x=>({...x,value:Math.round(x.value*100)/100}));
}
function makeDonut(groups,total){
 const relevant=groups.filter(x=>x.amount>0),sum=relevant.reduce((s,x)=>s+x.amount,0);
 if(!sum)return"";
 let cursor=0;const palette=relevant.map(g=>{const from=cursor;cursor+=100*g.amount/sum;return(g.color||"#61aeb3")+" "+from.toFixed(3)+"% "+cursor.toFixed(3)+"%";});
 return"conic-gradient("+palette.join(",")+")";
}
root.WealthV3Model={PRODUCT,EXPOSURE,dimensions,classify,entries,group,trend,label,makeDonut,historyKey,historyForAsset,historyFacets};
})(window);