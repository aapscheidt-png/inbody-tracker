(function(global){
"use strict";
const aliases={
nome:["nome","ativo","name","descricao","description"],
codigo:["codigo","ticker","ticker_codigo","symbol","simbolo"],
classe:["classe","class","tipo","categoria","asset_class"],
moeda:["moeda","currency","divisa"],
quantidade:["quantidade","qty","quantity","unidades","units"],
custo:["custo_unitario","custo","custo_medio","preco_medio","average_cost","cost"],
preco:["preco_atual","preco","cotacao","valor_unitario","current_price","price"],
data:["data_preco","data","data_cotacao","price_date","as_of"]
};
const types={
"renda fixa":"fixed_income","fixed_income":"fixed_income","rf":"fixed_income",
"acoes br":"stocks","acoes":"stocks","stocks":"stocks","acoes brasileiras":"stocks",
"fundos imobiliarios":"reits","fii":"reits","fiis":"reits","reits":"reits",
"internacional":"international","internacionais":"international","international":"international","global":"international",
"fundos":"funds","funds":"funds","multimercado":"funds",
"cripto":"crypto","criptomoedas":"crypto","crypto":"crypto",
"caixa":"cash","cash":"cash","liquidez":"cash",
"outros":"other","other":"other"
};
function normalized(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[\s\-]+/g,"_");}
function delimiterFromHeader(text){
 let semi=0,comma=0,tab=0,quoted=false;for(const c of text){if(c==='"'){quoted=!quoted;continue;}if(!quoted&&(c==="\n"||c==="\r"))break;if(quoted)continue;if(c===";")semi++;else if(c===",")comma++;else if(c==="\t")tab++;}
 return semi>=comma&&semi>=tab&&semi>0?";":tab>comma?"\t":",";
}
function parse(text){
 if(typeof text!=="string"||text.length>2000000)throw Error("CSV vazio ou superior a 2 MB.");
 const separator=delimiterFromHeader(text);let out=[],row=[],item="",quoted=false;
 for(let i=0;i<text.length;i++){
 const c=text[i];
 if(c==='"'){if(quoted&&text[i+1]==='"'){item+='"';i++;}else quoted=!quoted;continue;}
 if(!quoted&&(c===separator||c==="\n"||c==="\r")){
   if(c===separator){row.push(item);item="";continue;}
   row.push(item);item="";if(row.some(x=>x.trim()!==""))out.push(row);
   row=[];if(c==="\r"&&text[i+1]==="\n")i++;continue;
 }
 item+=c;
 }
 if(quoted)throw Error("CSV com aspas não fechadas.");
 row.push(item);if(row.some(x=>x.trim()!==""))out.push(row);
 return out;
}
function number(value,label){
 let s=String(value||"").trim().replace(/[\s\u00A0]/g,"");
 if(!s)throw Error(label+" obrigatório.");
 if(s.includes(",")&&s.includes(".")){if(s.lastIndexOf(",")>s.lastIndexOf("."))s=s.replace(/\./g,"").replace(",",".");else s=s.replace(/,/g,"");}
 else if(s.includes(","))s=s.replace(",",".");
 const n=Number(s);if(!Number.isFinite(n))throw Error(label+" inválido.");return n;
}
function date(raw){
 const x=String(raw||"").trim();
 if(!x){const t=new Date();return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");}
 let y,m,d;const iso=x.match(/^(\d{4})-(\d{2})-(\d{2})$/),br=x.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 if(iso){[,y,m,d]=iso;}else if(br){[,d,m,y]=br;}else throw Error("Data inválida: "+x);
 const z=new Date(Date.UTC(+y,+m-1,+d));if(z.getUTCFullYear()!==+y||z.getUTCMonth()!==+m-1||z.getUTCDate()!==+d)throw Error("Data impossível: "+x);
 return y+"-"+m+"-"+d;
}
function rowsToPositions(text,defaultDate){
 const rows=parse(text);if(rows.length<2)throw Error("Informe cabeçalho e pelo menos uma posição.");
 if(rows.length>501)throw Error("Limite de 500 posições por importação.");
 const headers=rows.shift().map(normalized),keys={};for(const [key,variants] of Object.entries(aliases)){const found=headers.findIndex(x=>variants.includes(x));if(found!==-1)keys[key]=found;}
 for(const k of ["nome","quantidade","custo","preco"])if(keys[k]===undefined)throw Error("Coluna obrigatória ausente: "+k);
 const result=[];for(let idx=0;idx<rows.length;idx++){
 const row=rows[idx],v=(key)=>keys[key]===undefined?"":row[keys[key]]||"",tag="Linha "+(idx+2)+": ";
 const name=String(v("nome")).trim(),code=String(v("codigo")).trim();if(!name||name.length>90)throw Error(tag+"Nome do ativo inválido.");
 const qty=number(v("quantidade"),tag+"Quantidade"),cost=number(v("custo"),tag+"Custo"),price=number(v("preco"),tag+"Preço");
 if(!(qty>0&&qty<1e10&&cost>=0&&cost<1e12&&price>=0&&price<1e12))throw Error(tag+"valores fora dos limites.");
 const key=normalized(v("classe")).replace(/_/g," "),type=types[key]||types[normalized(v("classe"))]||"other";
 const curr=String(v("moeda")||"BRL").trim().toUpperCase();if(!["BRL","USD"].includes(curr))throw Error(tag+"moeda não reconhecida. Use BRL ou USD.");
 let asOf=defaultDate?date(defaultDate):date("");if(String(v("data")).trim())asOf=date(v("data"));
 result.push({id:"csv_"+(idx+1)+"_"+Math.random().toString(36).slice(2,8),name,ticker:code.slice(0,30),type,currency:curr,units:qty,cost,price,asOf});
 }
 return result;
}
function escapeCell(value){const s=String(value===undefined||value===null?"":value),safe=/^[\s]*[=+@\-\t\r]/.test(s)?"'"+s:s;return '"'+safe.replace(/"/g,'""')+'"';}
const example=[["nome","codigo","classe","moeda","quantidade","custo_unitario","preco_atual","data_preco"],["Tesouro IPCA+","IPCA2035","Renda fixa","BRL","1","1000.00","1100.00","2026-10-12"],["ETF Global","WORLD","Internacional","USD","2","150.00","160.00","2026-10-12"]];
function template(){return "\uFEFF"+example.map(row=>row.map(escapeCell).join(";")).join("\r\n")+"\r\n";}
global.WealthImporter={parse,rowsToPositions,template,escapeCell};
})(window);