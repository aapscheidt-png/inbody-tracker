(function(global){
"use strict";
// Offline XLSX reader for ordinary Excel 2007+ ZIP packages.
// No external scripts, server upload, macros, formulas evaluation or connectors.
const LIMIT={file:12000000,entry:16000000,total:75000000,entries:400,sheets:30,points:20000};
const utf8=new TextDecoder("utf-8");
function bad(msg){throw Error("Excel: "+msg);}
function xml(source){const doc=new DOMParser().parseFromString(source,"application/xml");if(doc.querySelector("parsererror"))bad("XML inválido");return doc;}
function unzipDirectory(bytes){if(bytes.length>LIMIT.file)bad("arquivo superior ao limite de 12 MB");
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){if(v.getUint32(p,true)===0x06054b50){end=p;break;}}
 if(end<0)bad("estrutura ZIP não encontrada");let count=v.getUint16(end+10,true),ptr=v.getUint32(end+16,true),total=0;
 if(count>LIMIT.entries)bad("muitos arquivos internos");const entries=new Map();
 for(let i=0;i<count;i++){if(v.getUint32(ptr,true)!==0x02014b50)bad("diretório ZIP inválido");
  const flag=v.getUint16(ptr+8,true),method=v.getUint16(ptr+10,true),compressed=v.getUint32(ptr+20,true),size=v.getUint32(ptr+24,true),
    nameLen=v.getUint16(ptr+28,true),extra=v.getUint16(ptr+30,true),comment=v.getUint16(ptr+32,true),offset=v.getUint32(ptr+42,true);
  if(flag&1)bad("arquivo criptografado não suportado");if(size>LIMIT.entry||compressed>LIMIT.entry)bad("aba ou arquivo interno muito grande");
  total+=size;if(total>LIMIT.total)bad("limite de expansão ZIP excedido");
  const name=utf8.decode(bytes.subarray(ptr+46,ptr+46+nameLen));
  if(name.startsWith("xl/")||name==="_rels/.rels"||name==="[Content_Types].xml")entries.set(name,{offset,method,compressed,size,name});
  ptr+=46+nameLen+extra+comment;
 }
 return{bytes,v,entries};
}
async function readEntry(zip,name){const z=zip.entries.get(name);if(!z)return null;const {v,bytes}=zip;
 if(v.getUint32(z.offset,true)!==0x04034b50)bad("cabeçalho interno inválido");const start=z.offset+30+v.getUint16(z.offset+26,true)+v.getUint16(z.offset+28,true);
 const raw=bytes.subarray(start,start+z.compressed);let out;
 if(z.method===0)out=raw;
 else if(z.method===8){if(typeof DecompressionStream==="undefined")bad("Safari precisa oferecer descompressão nativa");
  const blob=new Blob([raw]);try{out=new Uint8Array(await new Response(blob.stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());}catch(e){bad("erro ao descompactar "+name);}
 }else bad("método de compactação não suportado");
 if(out.byteLength!==z.size)bad("tamanho de entrada inconsistente");return utf8.decode(out);
}
function colNumber(ref){const letters=(ref.match(/^[A-Z]+/i)||[""])[0].toUpperCase();let x=0;for(const l of letters)x=x*26+l.charCodeAt(0)-64;return x-1;}
function colName(num){let s="";for(let n=num+1;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
function dateSerial(v){const d=new Date(Date.UTC(1899,11,30)+Math.round(Number(v))*86400000);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null;}
function isReal(v){return typeof v==="number"&&Number.isFinite(v);}
function filePath(target){const parts=("xl/"+target).split("/"),out=[];for(const p of parts){if(p==="."||p==="")continue;if(p==="..")out.pop();else out.push(p);}return out.join("/");}
async function workbook(buffer){const zip=unzipDirectory(new Uint8Array(buffer));
 const main=await readEntry(zip,"xl/workbook.xml"),rels=await readEntry(zip,"xl/_rels/workbook.xml.rels");
 if(!main||!rels)bad("não é um workbook XLSX válido");
 const w=xml(main),r=xml(rels),ids=new Map();
 for(const e of r.getElementsByTagName("Relationship"))ids.set(e.getAttribute("Id"),filePath(e.getAttribute("Target")||""));
 let shared=[];const sx=await readEntry(zip,"xl/sharedStrings.xml");if(sx){const d=xml(sx);shared=[...d.getElementsByTagName("si")].map(e=>[...e.getElementsByTagName("t")].map(t=>t.textContent).join(""));}
 const out={sheets:{},origin:"excel_local",size:zip.bytes.byteLength};
 const names=[...w.getElementsByTagName("sheet")];if(names.length>LIMIT.sheets)bad("abas excedem o limite");
 for(const node of names){const name=node.getAttribute("name")||"",id=node.getAttribute("r:id")||node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
  if(!["2024","2025","2026"].includes(name))continue;const path=ids.get(id);if(!path)continue;const raw=await readEntry(zip,path);if(!raw)continue;const d=xml(raw),rows={};
  for(const row of d.getElementsByTagName("row")){const n=Number(row.getAttribute("r"));if(!(n>0&&n<=1000))continue;const cells={};
   for(const cell of row.getElementsByTagName("c")){const ref=cell.getAttribute("r")||"",col=colNumber(ref),typ=cell.getAttribute("t")||"",v=cell.getElementsByTagName("v")[0],inline=cell.getElementsByTagName("is")[0];
    if(col<0||col>120)continue;let value=null;
    if(typ==="inlineStr"&&inline)value=[...inline.getElementsByTagName("t")].map(e=>e.textContent).join("");
    else if(v){const t=v.textContent;if(typ==="s")value=shared[+t]??"";else if(typ==="str"||typ==="e")value=t;else{const n=Number(t);value=t!==""&&Number.isFinite(n)?n:t;}}
    if(value!==null)cells[col]=value;
   }rows[n]=cells;
  }out.sheets[name]=rows;
 }
 if(!out.sheets["2026"]||!out.sheets["2025"]||!out.sheets["2024"])bad("modelo não reconhecido: esperadas abas 2024, 2025 e 2026");
 return out;
}
const get=(sheet,row,col)=>sheet[row]?.[col]??null;
const label=(sheet,row)=>String(get(sheet,row,0)||"").trim();
const currency=(n)=>Math.round(n*100)/100;
const meta={
"2024":{stock:[2,42],other:[47,49,51],intl:[86,87,88],fx:89,pension:[113,114],crypto:[118,119],total:123,monthly:[1,15]},
"2025":{stock:[2,49],other:[55,57,59,61,63,65,67,69,71],intl:[115,116,117],fx:118,pension:[150,151],crypto:[155,156],total:160,monthly:[1,13]},
"2026":{stock:[2,46],other:[51,53,55,57,59,61,63,65,67,69],intl:[82,83,84],fx:85,pension:[116,117],crypto:[121,122],total:126,monthly:[1,11]}
};
function classFor(name,section){const t=name.toUpperCase();
 if(section==="stock")return"stocks";if(section==="international")return"international";if(section==="pension")return"pension";if(section==="crypto")return"crypto";
 if(t.includes("OURO")||t.includes("PRATA"))return"metals";
 if(t.includes("IMOB"))return"reits";if(t.includes("FGTS"))return"funds";
 if(t.includes("POUP"))return"cash";if(t.includes("IA"))return"funds";return"fixed_income";
}
function monthlyDate(year,col){let y=Number(year),m=col;
 if(year==="2024"){y=col===1?2023:col===2?2023:2024;m=col===1?11:col===2?12:col===12?0:col<=11?col-2:col-3;}
 if(year==="2025"){y=col===1?2024:2025;m=col===1?12:col-1;}
 if(year==="2026"){y=col===1?2025:2026;m=col===1?12:col-1;}
 if(!(m>=1&&m<=12))return null;return year==="2026"&&m===10?"2026-10-01":new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
}
function addPoint(store,name,type,date,value,source,account,currencyCode="BRL",row=null,col=null,datePrecision="day"){
 if(!date||!isReal(value)||value<0)return;const key=currencyCode+"|"+type+"|"+name.toUpperCase();
 let series=store.get(key);if(!series){series={id:key,name,ticker:type==="stocks"?name:"",type,currency:currencyCode,account,observations:[]};store.set(key,series);}
 series.observations.push({date,value:currency(value),source:{sheet:source,cell:col===null?null:colName(col)+row},confidence:"reported_balance",datePrecision});
}
function monthLabel(value){const str=String(value||"").trim().toLowerCase(),m=str.match(/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/(\d{2})$/);if(!m)return null;const months={jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};const year=2000+Number(m[2]),month=months[m[1]];return year+"-"+String(month).padStart(2,"0")+"-01";}
function analyze(book){const assets=new Map(),quality=[],sources=[],totals=new Map(),rateSources=[],reportedContributions=[],reportedDistributions=[];
 for(const year of ["2024","2025","2026"]){const s=book.sheets[year],m=meta[year],heading=s[1]||{};
  const dateCols=Object.entries(heading).filter(([col,val])=>+col>=1&&isReal(val)&&val>40000&&val<60000).map(([col,val])=>({col:+col,date:dateSerial(val)}));
  const entries=[...Array.from({length:m.stock[1]-m.stock[0]+1},(_,i)=>({row:m.stock[0]+i,section:"stock"})),...m.other.map(row=>({row,section:"other"}))];
  for(const {row,section} of entries){const name=label(s,row);if(!name||name.toUpperCase().startsWith("TOTAL")||name==="PAPEL")continue;
   const type=classFor(name,section);
   for(const dc of dateCols){const amount=get(s,row,dc.col);if(isReal(amount)&&amount>0)addPoint(assets,name,type,dc.date,amount,year,section==="stock"?"Carteira de ações":"Carteira doméstica","BRL",row,dc.col);}
  }
  for(const [section,rows] of [["international",m.intl],["pension",m.pension],["crypto",m.crypto]])for(const row of rows){const name=(section==="international"?"Exterior · ":"")+label(s,row),type=classFor(name,section);
   for(let c=m.monthly[0];c<=m.monthly[1];c++){const date=monthlyDate(year,c),v=get(s,row,c);if(!date||!isReal(v)||v<=0)continue;
    addPoint(assets,name,type,date,v,year,section==="pension"?"Previdência":section==="crypto"?"Cripto":"Investimentos internacionais",section==="international"?"USD":"BRL",row,c,"month");
   }
  }
  for(let c=m.monthly[0];c<=m.monthly[1];c++){const date=monthlyDate(year,c),v=get(s,m.total,c);if(!date||!isReal(v)||v<=0)continue;
   const record={date,total:currency(v),source:year+"!"+colName(c)+m.total,flow:0,flowKnown:false,completeness:"monthly_reported"};
   const prior=totals.get(date);if(prior&&Math.abs(prior.total-record.total)>.01){quality.push({code:"MONTHLY_OVERLAP",severity:"warning",date,previous:prior.total,incoming:record.total,sources:[prior.source,record.source]});}
   if(!prior||+year>=+prior.source.slice(0,4))totals.set(date,record);
  }
  for(let c=m.monthly[0];c<=m.monthly[1];c++){const v=get(s,m.fx,c),date=monthlyDate(year,c);if(date&&isReal(v)&&v>0)rateSources.push({date,rate:v,source:year+"!"+colName(c)+m.fx});}
  const contributionRange=year==="2024"?[93,101]:year==="2025"?[122,133]:[89,98];
  for(let row=contributionRange[0];row<=contributionRange[1];row++){const serial=get(s,row,0),amount=get(s,row,1),date=isReal(serial)&&serial>40000?dateSerial(serial):null;
   if(date&&isReal(amount)&&amount!==0)reportedContributions.push({date,amount:currency(amount),source:year+"!A"+row+":B"+row,kind:"reported_aporte",externalFlowVerified:false});}
  const divHeader=year==="2024"?56:year==="2025"?76:75,divRows=year==="2024"?[57,82]:year==="2025"?[77,110]:[76,76];
  for(let row=divRows[0];row<=divRows[1];row++){const name=label(s,row);
   for(let c=m.monthly[0];c<=m.monthly[1];c++){const date=monthLabel(get(s,divHeader,c)),amount=get(s,row,c);
    if(date&&isReal(amount)&&amount>0)reportedDistributions.push({date,amount:currency(amount),name:year==="2026"?"Ações BR (consolidado)":name,kind:year==="2026"?"stock_dividends_total":"stock_dividend_entry",source:year+"!"+colName(c)+row,cashReceiptVerified:false});}
  }
  if(year==="2026"){for(let c=1;c<=11;c++){const date=monthLabel(get(s,75,c)),amount=get(s,79,c);if(date&&isReal(amount)&&amount>0)reportedDistributions.push({date,amount:currency(amount),name:"Fundos imobiliários (consolidado)",kind:"fii_income_total",source:year+"!"+colName(c)+"79",cashReceiptVerified:false});}}
 
 }
 // Canonical monthly book-ends: 2024 for Dec 2024, 2025 for Dec 2025.
 const s24=book.sheets["2024"],s25=book.sheets["2025"],s26=book.sheets["2026"];
 totals.set("2024-12-31",{date:"2024-12-31",total:currency(get(s24,123,15)),source:"2024!P123",flow:0,flowKnown:false,completeness:"monthly_corrected"});
 totals.set("2025-12-31",{date:"2025-12-31",total:currency(get(s25,160,13)),source:"2025!N160",flow:0,flowKnown:false,completeness:"monthly_corrected"});
 const september=Number(get(s26,72,22))+Number(get(s26,86,10))+Number(get(s26,116,10))+Number(get(s26,117,10))+Number(get(s26,121,10))+Number(get(s26,122,10));
 if(isReal(september)&&september>0){const reported=Number(get(s26,126,10));if(Math.abs(reported-september)>.01)quality.push({code:"SEPTEMBER_TOTAL_FORMULA",severity:"warning",date:"2026-09-30",reported:currency(reported),corrected:currency(september),difference:currency(reported-september),cell:"2026!K126",domesticCell:"2026!W72"});
 totals.set("2026-09-30",{date:"2026-09-30",total:currency(september),source:"reconciled:2026!W72,K86,K116,K117,K121,K122",flow:0,flowKnown:false,completeness:"monthly_corrected"});}
 const latestDates=[...assets.values()].flatMap(a=>a.observations).map(x=>x.date).sort(),latestOverall=latestDates.at(-1);
 const deduped=[];
 for(const asset of assets.values()){
  const perDate=new Map();
  for(const obs of asset.observations){const old=perDate.get(obs.date);
   if(old&&Math.abs(old.value-obs.value)>.01)quality.push({code:"OBSERVATION_OVERLAP",severity:"info",asset:asset.name,date:obs.date,values:[old.value,obs.value],sources:[old.source,obs.source]});
   if(!old||obs.source.sheet>=old.source.sheet)perDate.set(obs.date,obs);
  }
  asset.observations=[...perDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(asset.observations.length>LIMIT.points)bad("histórico por ativo excede limite");
  const last=asset.observations.at(-1);asset.current={date:last.date,value:last.value,source:last.source,datePrecision:last.datePrecision,partial:last.date!==latestOverall};
  deduped.push(asset);
 }
 const uniqueRates=new Map();for(const r of rateSources){const prev=uniqueRates.get(r.date);if(prev&&Math.abs(prev.rate-r.rate)>.02)quality.push({code:"FX_OVERLAP",severity:"info",date:r.date,reported:prev.rate,corrected:r.rate,message:"Cotações cambiais divergentes em abas de transição"});uniqueRates.set(r.date,r);}
 const sortedRates=[...uniqueRates.values()].sort((a,b)=>a.date.localeCompare(b.date));
 const lastFX=sortedRates.find(x=>x.date==="2026-10-01")||sortedRates.at(-1);
 const maxByAccount=new Map();for(const a of deduped){const old=maxByAccount.get(a.account);if(!old||a.current.date>old)maxByAccount.set(a.account,a.current.date);}
 const positions=deduped.filter(a=>a.current.value>0&&a.current.date===maxByAccount.get(a.account)&&a.current.date>="2026-09-01").map((a,i)=>({
 id:"xlsx"+String(i+1).padStart(3,"0"),name:a.name,ticker:a.ticker,type:a.type,currency:"BRL",units:1,cost:0,costKnown:false,price:a.currency==="USD"?currency(a.current.value*(lastFX?.rate||1)):a.current.value,asOf:a.current.date,datePrecision:a.current.datePrecision,source:a.current.source,account:a.account,valuationOnly:true,
 originalCurrency:a.currency,originalValue:a.current.value,fxRate:a.currency==="USD"?(lastFX?.rate||null):null
 }));
 const latestPension=positions.filter(x=>x.type==="pension").map(x=>x.asOf).sort().at(-1);
 if(latestPension&&latestPension<latestOverall)quality.push({code:"STALE_PENSION",severity:"warning",date:latestOverall,pensionDate:latestPension,message:"Previdência de competência anterior ao último saldo doméstico."});
 const history=[...totals.values()].filter(x=>x.date<="2026-09-30").sort((a,b)=>a.date.localeCompare(b.date));
 return{version:2,schema:"wealth-data-engine-v2",importedFrom:"Excel local: 2024, 2025, 2026",reportedContributions,reportedDistributions,sourceMetadata:{filename:"Papel.xlsx",latestDate:latestOverall,latestFullMonth:history.at(-1)?.date,latestPensionDate:latestPension,partial:true},
 assetHistory:deduped,positions,history,quality,sourceRates:sortedRates,metrics:{assets:deduped.length,positions:positions.length,observations:deduped.reduce((s,a)=>s+a.observations.length,0),months:history.length,flags:quality.length,contributions:reportedContributions.length,distributions:reportedDistributions.length}};
}
async function parseFile(file){if(!file||file.size>LIMIT.file)bad("arquivo muito grande");const model=await workbook(await file.arrayBuffer());return analyze(model);}
global.WealthXlsx={parseFile,workbook,analyze,meta};
})(window);