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
    const r=rows.map((m,i)=>({i,v:Number(metricValue(m,key))})).filter(z=>Number.isFinite(z.v));if(!r.length)return;const [lo,hi]=domain(r.map(z=>z.v));const y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;const pts=r.map(z=>[x(z.i),y(z.v)]);html+=`<path class="series home-series" stroke="${color}" d="${svgPath(pts)}"/>`;
    pts.forEach((p,j)=>{const val=r[j].v;const offset=seriesIndex===0?-11:seriesIndex===1?18:(j%2?-11:18);const ly=clamp(p[1]+offset,pad.t+10,h-pad.b+16);html+=`<circle class="point point-compact" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="5.4"/><text class="home-point-label" fill="${color}" text-anchor="middle" x="${p[0]}" y="${ly}">${esc(fmt(val,1))}</text>`;});
  });
  html+=xLabelRows(rows,x,h);svg.innerHTML=html;
}

function renderBodyChart(svg,key){
  const rows=bodyMeasurements();const valid=rows.map((m,i)=>({m,i,v:Number(metricValue(m,key))})).filter(z=>Number.isFinite(z.v));if(!valid.length){svg.innerHTML='';return;}
  const range=bodyMetricRange(key),target=bodyMetricTarget(key),extra=[...(Array.isArray(range)?range:[]),target];const [lo,hi]=domain(valid.map(z=>z.v),extra);const pad={l:68,r:28,t:36,b:64},w=720,h=450,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;const x=i=>pad.l+(rows.length===1?iw/2:iw*i/(rows.length-1)),y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;let html=svgGrid(w,h,pad,5);html+=statusBand(range,y,w,pad);html+=targetLine(target,y,w,pad,key==='weightKg'?'peso ideal':'meta');
  for(let i=0;i<=4;i++){const v=hi-(hi-lo)*i/4;html+=`<text class="axislabel" x="4" y="${pad.t+ih*i/4+5}">${fmt(v,key==='bmi'?1:0)}</text>`;}
  const pts=valid.map(z=>[x(z.i),y(z.v)]),color=key==='weightKg'?'#ff4057':key==='skeletalMuscleKg'?'#4aa7ff':key==='bodyFatPct'?'#ffb13b':'#aa8cff';if(pts.length>1){const area=`M ${pts[0][0]} ${pad.t+ih} `+pts.map(p=>`L ${p[0]} ${p[1]}`).join(' ')+` L ${pts.at(-1)[0]} ${pad.t+ih} Z`;html+=`<path class="area" fill="${color}" d="${area}"/>`;}
  html+=`<path class="series" stroke="${color}" d="${svgPath(pts)}"/>`;pts.forEach((p,j)=>{const anchor=j===0?'start':j===pts.length-1?'end':'middle',dx=j===0?6:j===pts.length-1?-6:0,ly=clamp(p[1]+(j%2?-14:22),pad.t+13,h-pad.b+22);html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="7"/><text class="point-label readable" fill="${color}" text-anchor="${anchor}" x="${p[0]+dx}" y="${ly}">${esc(fmt(valid[j].v,1))}</text>`;});html+=xLabelRows(rows,x,h);svg.innerHTML=html;
}

function renderLabChartV5(svg,series){
  const valid=series.filter(x=>Number.isFinite(Number(x.value)));if(!valid.length){svg.innerHTML='<text class="axislabel" x="30" y="40">Sem série numérica para este marcador.</text>';return;}
  const refItem=valid.at(-1),band=referenceNumericBand(refItem),target=referenceNumericTarget(refItem),extra=[...(band||[]),target?.value];const [lo,hi]=domain(valid.map(x=>Number(x.value)),extra);const pad={l:74,r:30,t:38,b:64},w=720,h=450,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;const x=i=>pad.l+(valid.length===1?iw/2:iw*i/(valid.length-1)),y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;let html=svgGrid(w,h,pad,5);html+=statusBand(band,y,w,pad);if(target)html+=targetLine(target.value,y,w,pad,`referência ${target.operator||''}`);
  for(let i=0;i<=4;i++){const v=hi-(hi-lo)*i/4;html+=`<text class="axislabel" x="4" y="${pad.t+ih*i/4+5}">${fmtFlex(v)}</text>`;}
  const pts=valid.map((m,i)=>[x(i),y(Number(m.value))]),color='#31d69a';if(pts.length>1){const area=`M ${pts[0][0]} ${pad.t+ih} `+pts.map(p=>`L ${p[0]} ${p[1]}`).join(' ')+` L ${pts.at(-1)[0]} ${pad.t+ih} Z`;html+=`<path class="area" fill="${color}" d="${area}"/>`;}
  html+=`<path class="series" stroke="${color}" d="${svgPath(pts)}"/>`;pts.forEach((p,j)=>{const anchor=j===0?'start':j===pts.length-1?'end':'middle',dx=j===0?6:j===pts.length-1?-6:0,ly=clamp(p[1]+(j%2?-14:22),pad.t+13,h-pad.b+22);html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="7"/><text class="point-label readable" fill="${color}" text-anchor="${anchor}" x="${p[0]+dx}" y="${ly}">${esc(fmtFlex(valid[j].value))}</text>`;});html+=valid.map((m,i)=>`<text class="axislabel" text-anchor="middle" x="${x(i)}" y="${h-13}">${shortDate(m.date)}</text>`).join('');svg.innerHTML=html;
}
