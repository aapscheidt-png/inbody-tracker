'use strict';
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function svgPath(points){return points.map((p,i)=>`${i?'L':'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');}
function svgGrid(w,h,pad,n=5){let s='',ih=h-pad.t-pad.b;for(let i=0;i<=n;i++){const y=pad.t+ih*i/n;s+=`<line class="gridline" x1="${pad.l}" x2="${w-pad.r}" y1="${y}" y2="${y}"/>`;}return s;}
function domain(values,extras=[]){const a=[...values,...extras].filter(v=>Number.isFinite(Number(v))).map(Number);if(!a.length)return[0,1];let lo=Math.min(...a),hi=Math.max(...a);const span=Math.max(hi-lo,1);return[lo-span*.16,hi+span*.16];}
function xLabelRows(rows,x,h){return rows.map((m,i)=>{if(rows.length>8&&i!==0&&i!==rows.length-1&&i%2===1)return'';return `<text class="axislabel" text-anchor="middle" x="${x(i)}" y="${h-13}">${shortDate(m.date)}</text>`;}).join('');}
function statusBand(range,y,w,pad){if(!Array.isArray(range)||range.length<2)return'';const y1=y(range[1]),y2=y(range[0]),top=Math.min(y1,y2),height=Math.abs(y2-y1);return `<rect class="reference-band" x="${pad.l}" y="${top}" width="${w-pad.l-pad.r}" height="${height}"/><text class="reference-label" x="${w-pad.r-4}" y="${top+13}" text-anchor="end">faixa de referência</text>`;}
function targetLine(target,y,w,pad,label='meta'){if(!Number.isFinite(Number(target)))return'';const yy=y(Number(target));return `<line class="target-line" x1="${pad.l}" x2="${w-pad.r}" y1="${yy}" y2="${yy}"/><text class="target-label" x="${w-pad.r-4}" y="${yy-6}" text-anchor="end">${esc(label)} ${fmtFlex(target)}</text>`;}

// Chart positions for month-only records are approximate, never shown as a day.
function bodyChartRowsV6(key){
 const rows=bodyMeasurements().map(m=>({m,v:bodyMetricNumber(m,key),device:bodyDeviceGroup(m),stamp:Date.parse(m.date+'T12:00:00Z'),label:brDate(m.date),axis:m.date.slice(5,7)+'/'+m.date.slice(2,4),reported:false})).filter(r=>r.v!==null&&Number.isFinite(r.stamp));
 if(key==='weightKg')for(const m of (data.weightHistory||[])){if(m.datePrecision!=='month'||m.sourceType!=='user_reported'||m.isBioimpedance!==false||!/^\d{4}-\d{2}$/.test(m.period)||!Number.isFinite(m.weightKg))continue;const stamp=Date.parse(m.period+'-15T12:00:00Z');if(Number.isFinite(stamp))rows.push({m,v:m.weightKg,device:'Peso informado',stamp,label:m.period.slice(5)+'/'+m.period.slice(0,4)+' (dia não informado)',axis:m.period.slice(5)+'/'+m.period.slice(2,4),reported:true});}
 return rows.sort((a,b)=>a.stamp-b.stamp);
}
function chartLabelIndicesV6(points,minGap){
 if(points.length<=1)return points.length?[0]:[];
 const end=points.length-1,chosen=[0];let prior=points[0][0];
 for(let i=1;i<end;i++){if(points[i][0]-prior>=minGap&&points[end][0]-points[i][0]>=minGap){chosen.push(i);prior=points[i][0];}}
 if(points[end][0]-prior>=minGap||chosen.length===1&&points[end][0]-points[0][0]>=minGap/2)chosen.push(end);
 else if(chosen.length>1){chosen.pop();chosen.push(end);}else chosen[0]=end;
 return chosen;
}
function bodyLineV6(a,b,key){
 if(!a.reported&&!b.reported&&a.device===b.device&&a.device!=='Equipamento não identificado')return 'solid';
 return key==='weightKg'?'dashed':'none';
}
function chartBodyPlotV6(rows,key,w,h,pad,compact=false){
 if(!rows.length)return '';
 const [lo,hi]=domain(rows.map(r=>r.v));const iw=w-pad.l-pad.r,ih=h-pad.t-pad.b,t0=rows[0].stamp,t1=rows.at(-1).stamp;
 const x=r=>t1===t0?pad.l+iw/2:pad.l+(r.stamp-t0)/(t1-t0)*iw,y=v=>pad.t+ih*(hi-v)/(hi-lo);
 const pts=rows.map(r=>[x(r),y(r.v)]),color=key==='weightKg'?'#ff647a':key==='skeletalMuscleKg'?'#62b5fc':key==='bodyFatPct'?'#ffb13b':'#aa8cff';
 let out=svgGrid(w,h,pad,compact?2:4);
 if(!compact)for(let i=0;i<=4;i++){const v=hi-(hi-lo)*i/4;out+=`<text x="4" y="${pad.t+ih*i/4+6}" font-size="22" fill="#a6b3c4">${esc(fmtFlex(Number(v.toPrecision(3))))}</text>`;}
 for(let i=1;i<rows.length;i++){const mode=bodyLineV6(rows[i-1],rows[i],key);if(mode!=='none')out+=`<path fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" ${mode==='dashed'?'stroke-dasharray="8 6" opacity=".65"':''} d="${svgPath([pts[i-1],pts[i]])}"/>`;}
 const selected=compact?[0,pts.length-1]:chartLabelIndicesV6(pts,150);
 rows.forEach((r,i)=>{const [xx,yy]=pts[i];const tip=esc(r.label+' · '+fmtFlex(r.v)+' '+bodyMetricUnit(key)+' · '+r.device);
 out+=r.reported?`<rect x="${xx-6}" y="${yy-6}" width="12" height="12" rx="1" fill="#0b121a" stroke="${color}" stroke-width="3" transform="rotate(45 ${xx} ${yy})"><title>${tip}</title></rect>`:`<circle cx="${xx}" cy="${yy}" r="${compact?4:6}" fill="${color}"><title>${tip}</title></circle>`;
 if(selected.includes(i)){const anchor=i===0?'start':i===rows.length-1?'end':'middle',yyLabel=clamp(yy-15,pad.t+2,h-pad.b-4);out+=`<text x="${xx}" y="${yyLabel}" text-anchor="${anchor}" font-size="${compact?24:26}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#0b121a" stroke-width="4">${esc(fmtFlex(r.v))}</text>`;
 if(!compact)out+=`<text x="${xx}" y="${h-20}" text-anchor="${anchor}" font-size="23" fill="#a6b3c4">${esc(r.axis)}</text>`; }
 });return out;
}
function renderHomeChart(svg){
 const defs=[['weightKg','Peso (kg)'],['skeletalMuscleKg','Massa muscular (kg)'],['bodyFatPct','Gordura corporal (%)']];
 const w=720,rowH=158;let html='';
 defs.forEach(([key,label],i)=>{const rows=bodyChartRowsV6(key);if(!rows.length)return;
 html+=`<g transform="translate(0 ${i*rowH})"><text x="20" y="25" font-size="25" font-weight="600" fill="#b7c4d4">${esc(label)}</text>${chartBodyPlotV6(rows,key,w,rowH,{l:26,r:26,t:54,b:20},true)}</g>`;});
 svg.setAttribute('viewBox','0 0 720 474');svg.setAttribute('role','img');svg.setAttribute('aria-label','Três gráficos separados de peso, massa muscular e gordura corporal, cada um com sua própria escala');svg.innerHTML=html;
}
function renderBodyChart(svg,key){
 const rows=bodyChartRowsV6(key);if(!rows.length){svg.innerHTML='';return;}
 svg.setAttribute('viewBox','0 0 720 450');svg.setAttribute('role','img');svg.setAttribute('aria-label',bodyMetricLabel(key)+' por mês e ano; datas completas no histórico');
 svg.innerHTML=chartBodyPlotV6(rows,key,720,450,{l:100,r:36,t:42,b:66});
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
