'use strict';
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function svgPath(points){return points.map((p,i)=>`${i?'L':'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');}
function svgGrid(w,h,pad,n=5){let s='',ih=h-pad.t-pad.b;for(let i=0;i<=n;i++){const y=pad.t+ih*i/n;s+=`<line class="gridline" x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}"/>`;}return s;}
function domain(values,extras=[]){const a=[...values,...extras].filter(v=>Number.isFinite(Number(v))).map(Number);if(!a.length)return[0,1];let lo=Math.min(...a),hi=Math.max(...a);const span=Math.max(hi-lo,1);return[lo-span*.16,hi+span*.16];}
function xLabelRows(rows,x,h){return rows.map((m,i)=>{if(rows.length>8&&i!==0&&i!==rows.length-1&&i%2===1)return'';return `<text class="axislabel" text-anchor="middle" x="${x(i)}" y="${h-13}">${shortDate(m.date)}</text>`;}).join('');}
function statusBand(range,y,w,pad){if(!Array.isArray(range)||range.length<2)return'';const y1=y(range[1]),y2=y(range[0]),top=Math.min(y1,y2),height=Math.abs(y2-y1);return `<rect class="reference-band" x="${pad.l}" y="${top}" width="${w-pad.l-pad.r}" height="${height}"/><text class="reference-label" x="${w-pad.r-4}" y="${top+13}" text-anchor="end">faixa de referência</text>`;}
function targetLine(target,y,w,pad,label='meta'){if(!Number.isFinite(Number(target)))return'';const yy=y(Number(target));return `<line class="target-line" x1="${pad.l}" x2="${w-pad.r}" y1="${yy}" y2="${yy}"/><text class="target-label" x="${w-pad.r-4}" y="${yy-6}" text-anchor="end">${esc(label)} ${fmtFlex(target)}</text>`;}

function renderHomeChart(svg){
  const rows=bodyMeasurements();if(!rows.length){svg.innerHTML='';return;}
  const defs=[['weightKg','#ff4057'],['skeletalMuscleKg','#4aa7ff'],['bodyFatPct','#ffb13b']];
  const pad={l:34,r:20,t:26,b:46},w=720,h=350,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;const x=i=>pad.l+(rows.length===1?iw/2:iw*i/(rows.length-1));let html=svgGrid(w,h,pad,4);
  defs.forEach(([key,color],seriesIndex)=>{
    const r=rows.map((m,i)=>({i,v:bodyMetricNumber(m,key)})).filter(z=>z.v!==null);if(!r.length)return;const [lo,hi]=domain(r.map(z=>z.v));const y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;const pts=r.map(z=>[x(z.i),y(z.v)]);html+=`<path class="series home-series" stroke="${color}" d="${svgPath(pts)}"/>`;
    pts.forEach((p,j)=>{const val=r[j].v;const offset=seriesIndex===0?-11:seriesIndex===1?18:(j%2?-11:18);const ly=clamp(p[1]+offset,pad.t+10,h-pad.b+16);html+=`<circle class="point point-compact" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="5.4"/><text class="home-point-label" fill="${color}" text-anchor="middle" x="${p[0]}" y="${ly}">${esc(fmt(val,1))}</text>`;});
  });
  html+=xLabelRows(rows,x,h);svg.innerHTML=html;
}

function renderBodyChart(svg,key){
 const all=bodyMeasurements(),valid=all.map(m=>({m,v:bodyMetricNumber(m,key),device:bodyDeviceGroup(m)})).filter(z=>z.v!==null);if(!valid.length){svg.innerHTML='';return;}
 const w=720,h=450,pad={l:72,r:36,t:36,b:74},iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
 const [lo,hi]=domain(valid.map(z=>z.v));const y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;
 const stamps=valid.map(z=>Date.parse(z.m.date+'T'+(z.m.time||'12:00')+':00'));const min=Math.min(...stamps),max=Math.max(...stamps);
 const x=i=>max>min?pad.l+(stamps[i]-min)/(max-min)*iw:pad.l+iw/2;
 let html=svgGrid(w,h,pad,5);
 for(let i=0;i<=4;i++){const v=hi-(hi-lo)*i/4;html+=`<text class="axislabel" x="4" y="${pad.t+ih*i/4+5}">${fmtFlex(v)}</text>`;}
 const color=key==='weightKg'?'#ff4057':key==='skeletalMuscleKg'?'#4aa7ff':key==='bodyFatPct'?'#ffb13b':'#aa8cff';
 const pts=valid.map((z,i)=>[x(i),y(z.v)]);
 for(let i=1;i<valid.length;i++)if(valid[i].device===valid[i-1].device&&valid[i].device!=='Equipamento não identificado')html+=`<path class="series" stroke="${color}" d="${svgPath([pts[i-1],pts[i]])}"/>`;
 let lastX=-1000;
 pts.forEach((p,i)=>{const z=valid[i],anchor=i===0?'start':i===pts.length-1?'end':'middle',dx=i===0?4:i===pts.length-1?-4:0;
 html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="6"><title>${esc(brDate(z.m.date)+' · '+fmtFlex(z.v)+' '+bodyMetricUnit(key)+' · '+z.device)}</title></circle>`;
 if(p[0]-lastX>=75||i===pts.length-1){lastX=p[0];html+=`<text class="point-label readable" fill="${color}" text-anchor="${anchor}" x="${p[0]+dx}" y="${clamp(p[1]+(i%2?-14:22),pad.t+13,h-pad.b+22)}">${esc(fmtFlex(z.v))}</text><text class="axislabel" text-anchor="${anchor}" x="${p[0]+dx}" y="${h-24+(i%2)*16}">${esc(brDate(z.m.date))}</text>`;}
 });svg.innerHTML=html;
}

function comparableLabSeriesV5(series){
  const ordered=series.filter(x=>x?.date&&x.value!==null&&x.value!==''&&Number.isFinite(Number(x.value))).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const last=ordered.at(-1);if(!last)return[];
  const unit=String(last.unit||'');
  const factor=(x)=>{
    const from=String(x.unit||'');if(from===unit)return 1;
    if(['platelets','wbc'].includes(x.key)){if(from==='/µL'&&unit==='x10^3/µL')return 0.001;if(from==='x10^3/µL'&&unit==='/µL')return 1000;}
    if(['sodium','potassium'].includes(x.key)&&['mmol/L','mEq/L'].includes(from)&&['mmol/L','mEq/L'].includes(unit))return 1;
    if(x.key==='magnesium'){if(from==='mg/dL'&&unit==='mEq/L')return 20/24.305;if(from==='mEq/L'&&unit==='mg/dL')return 24.305/20;}
    return null;
  };
  return ordered.flatMap(x=>{const f=factor(x);if(f===null)return[];return [{...x,value:Number(x.value)*f,unit,originalValue:x.value,originalUnit:x.unit}];});
}
function labDateAxisV5(m){return String(m.date||'').split('-').reverse().join('/');}
function renderLabChartV5(svg,series){
  const valid=comparableLabSeriesV5(series);if(!valid.length){svg.innerHTML='<text class="axislabel" x="30" y="40">Sem série numérica para este marcador.</text>';return;}
  const refItem=valid.at(-1),band=referenceNumericBand(refItem),target=referenceNumericTarget(refItem),extra=[...(band||[]),target?.value];const [lo,hi]=domain(valid.map(x=>Number(x.value)),extra);const pad={l:74,r:30,t:38,b:64},w=720,h=450,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;const x=i=>pad.l+(valid.length===1?iw/2:iw*i/(valid.length-1)),y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;let html=svgGrid(w,h,pad,5);if(valid.length===1){html+=statusBand(band,y,w,pad);if(target)html+=targetLine(target.value,y,w,pad,`referência ${target.operator||''}`);}
  for(let i=0;i<=4;i++){const v=hi-(hi-lo)*i/4;html+=`<text class="axislabel" x="4" y="${pad.t+ih*i/4+5}">${fmtFlex(v)}</text>`;}
  const pts=valid.map((m,i)=>[x(i),y(Number(m.value))]),color='#31d69a';if(pts.length>1){const area=`M ${pts[0][0]} ${pad.t+ih} `+pts.map(p=>`L ${p[0]} ${p[1]}`).join(' ')+` L ${pts.at(-1)[0]} ${pad.t+ih} Z`;html+=`<path class="area" fill="${color}" d="${area}"/>`;}
  html+=`<path class="series" stroke="${color}" d="${svgPath(pts)}"/>`;pts.forEach((p,j)=>{const anchor=j===0?'start':j===pts.length-1?'end':'middle',dx=j===0?6:j===pts.length-1?-6:0,ly=clamp(p[1]+(j%2?-14:22),pad.t+13,h-pad.b+22);html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="7"/><text class="point-label readable" fill="${color}" text-anchor="${anchor}" x="${p[0]+dx}" y="${ly}">${esc(fmtFlex(valid[j].value))}</text>`;});html+=valid.map((m,i)=>`<text class="axislabel" text-anchor="middle" x="${x(i)}" y="${h-13}">${labDateAxisV5(m)}</text>`).join('');svg.innerHTML=html;
}
