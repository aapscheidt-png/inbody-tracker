"use strict";
// Entirely synthetic, generated in memory; NO user's financial data in CI.
const zlib=require("node:zlib");
function crc(bytes){let c=-1;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=c&1?(c>>>1)^0xEDB88320:c>>>1;}return (c^-1)>>>0;}
function zip(files){const local=[],central=[];let offset=0;
 for(const [name,value] of Object.entries(files)){const fn=Buffer.from(name),raw=Buffer.from(value),compressed=zlib.deflateRawSync(raw),checksum=crc(raw);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(8,8);h.writeUInt32LE(checksum,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(fn.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(checksum,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(fn.length,28);c.writeUInt32LE(offset,42);
  local.push(h,fn,compressed);central.push(c,fn);offset+=h.length+fn.length+compressed.length;
 }
 const cent=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(cent.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,cent,end]);
}
const escape=(v)=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const col=(idx)=>{let s="";for(let n=idx+1;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
function sheet(cells){const byRow=new Map();for(const [r,c,v] of cells){const row=byRow.get(r)||[];row.push([c,v]);byRow.set(r,row);}
 const parts=[...byRow.entries()].sort((a,b)=>a[0]-b[0]).map(([r,row])=>'<row r="'+r+'">'+row.sort((a,b)=>a[0]-b[0]).map(([c,v])=>{
 const ref=col(c)+r;return typeof v==="number"?'<c r="'+ref+'"><v>'+v+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t>'+escape(v)+'</t></is></c>';
 }).join("")+'</row>').join("");
 return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+parts+'</sheetData></worksheet>';
}
function fixture(){
 const f2024=[[1,0,"PAPEL"],[1,1,45254],[123,0,"Saldos"],[123,1,550000],[123,15,765000],[113,0,"Santander Previ"],[113,15,450000],[114,0,"Banesprev"],[114,15,120000]];
 const f2025=[[1,0,"PAPEL"],[1,1,45657],[160,0,"Saldos Total"],[160,1,764634],[160,13,1170732.39],[150,0,"Santander Previ"],[150,13,592590.12],[151,0,"Banesprev"],[151,13,142904.01]];
 const f2026=[[1,0,"PAPEL"],[1,1,46022],[1,22,46295],[1,23,46310],
 [3,0,"ABCB4"],[3,22,90],[3,23,100],[51,0,"TREND OURO"],[51,23,50],
 [72,0,"TOTAL GERAL"],[72,22,400],
 [82,0,"Variável"],[82,10,2],[82,11,2],[83,0,"Fixa"],[83,10,4],[83,11,4],
 [84,0,"Saldo"],[84,10,.5],[84,11,.5],[85,0,"Dólar"],[85,10,5],[85,11,5],[86,0,"Real"],[86,10,32.5],
 [116,0,"Santander Previ"],[116,10,700],[117,0,"Banesprev"],[117,10,150],
 [121,0,"Mercado BTC"],[121,10,3],[121,11,3],[122,0,"Binance"],[122,10,2],[122,11,2],
 [126,0,"Saldos Total"],[126,10,1400]];
 const main='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+["2024","2025","2026"].map((n,i)=>'<sheet name="'+n+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets></workbook>';
 const rel='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+[1,2,3].map(i=>'<Relationship Id="rId'+i+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+i+'.xml"/>').join("")+'</Relationships>';
 return zip({"xl/workbook.xml":main,"xl/_rels/workbook.xml.rels":rel,"xl/worksheets/sheet1.xml":sheet(f2024),"xl/worksheets/sheet2.xml":sheet(f2025),"xl/worksheets/sheet3.xml":sheet(f2026)});
}
module.exports={fixture};