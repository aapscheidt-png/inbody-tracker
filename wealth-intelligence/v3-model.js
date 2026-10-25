(function(root){
"use strict";
const PRODUCT={
 pension:{label:"Previdência",color:"#70d0ca"},
 fund:{label:"Fundos de investimento",color:"#deb264"},
 stock:{label:"Ações brasileiras",color:"#ae8bee"},
 fii:{label:"Fundos imobiliários",color:"#f28a7a"},
 abroad:{label:"Investimentos internacionais",color:"#72b5f2"},
 fgts:{label:"FGTS",color:"#82b9af"},
 crypto:{label:"Criptoativos",color:"#e79d8b"},
 savings:{label:"Poupança",color:"#92b7db"},
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
 else if(n.includes("FGTS")){product="fgts";}
 else if(n.startsWith("TREND ")||n.startsWith("ARX FUJI")){product="fund";exposure=n.includes("OURO")||n.includes("PRATA")?"metals":n.includes("FUJI")?"fixed":"alternatives";}
 else if(type==="funds"||type==="metals"){product="fund";exposure=type==="metals"?"metals":"alternatives";}
 else if(type==="cash"||n.includes("POUP")){product="savings";exposure="cash";}
 else if(type==="fixed_income"){product="other";exposure="fixed";}
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
  // A provisional current-month value is not a verified closing-month total.
  const latest=state.dataEngine?.sourceMetadata;
  if(latest?.partial&&latest.latestDate&&latest.latestDate.slice(0,7)>(values.at(-1)?.month||"")){
   values.push({date:latest.latestDate,month:latest.latestDate.slice(0,7),value:group(state).total,complete:false,source:"Saldos com competências distintas",samples:state.positions.length});
  }
 }else{
  const rate=historicalRates(state.dataEngine),buckets=new Map();
  for(const item of source){
   if(classify(item)[dim]!==cat)continue;
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
    const key=item.id||item.name,rec=buckets.get(month)||new Map();
    rec.set(key,{value:obs.value*fx,date:obs.date});buckets.set(month,rec);
   }
  }
  values=[...buckets.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([month,rec])=>({
   date:month+"-01",month,value:[...rec.values()].reduce((sum,r)=>sum+r.value,0),complete:false,
   source:"Saldos mensais observados (cobertura parcial)",samples:rec.size
  }));
 }
 if(months>0)values=values.slice(-months);
 if(annual){
  const byYear=new Map();
  for(const row of values){const year=row.month.slice(0,4),old=byYear.get(year);if(!old||old.month<row.month)byYear.set(year,row);}
  values=[...byYear.values()].sort((a,b)=>a.month.localeCompare(b.month));
 }
 return values.map(x=>({...x,value:Math.round(x.value*100)/100}));
}
function makeDonut(groups,total){
 const relevant=groups.filter(x=>x.amount>0),sum=relevant.reduce((s,x)=>s+x.amount,0);
 if(!sum)return"";
 let cursor=0;const palette=relevant.map(g=>{const from=cursor;cursor+=100*g.amount/sum;return(g.color||"#61aeb3")+" "+from.toFixed(3)+"% "+cursor.toFixed(3)+"%";});
 return"conic-gradient("+palette.join(",")+")";
}
root.WealthV3Model={PRODUCT,EXPOSURE,dimensions,classify,entries,group,trend,label,makeDonut};
})(window);