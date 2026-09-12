function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

function renderMultiChart(svg){
  if(!measurements.length){svg.innerHTML='';return}
  const defs=[['weight','#ff4057',-14],['muscle','#4aa7ff',18],['fatPct','#ffb13b',-30]];
  const pad={l:52,r:28,t:24,b:48},w=720,h=330,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const x=i=>pad.l+(measurements.length===1?iw/2:iw*i/(measurements.length-1));
  let html=grid(w,h,pad,4);
  defs.forEach(([key,color,offset])=>{
    const rows=measurements.map((m,i)=>({i,v:metricValue(m,key)})).filter(x=>x.v!=null);
    if(!rows.length)return;
    const vals=rows.map(x=>x.v),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(max-min,1),lo=min-span*.12,hi=max+span*.12;
    const y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;
    const pts=rows.map(r=>[x(r.i),y(r.v)]);
    html+=`<path class="series" stroke="${color}" d="${pathFrom(pts)}"/>`;
    if(pts.length>1){
      const area=`M ${pts[0][0]} ${pad.t+ih} `+pts.map(p=>`L ${p[0]} ${p[1]}`).join(' ')+` L ${pts.at(-1)[0]} ${pad.t+ih} Z`;
      html+=`<path class="area faint" fill="${color}" d="${area}"/>`;
    }
    pts.forEach((p,idx)=>{
      html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="6"/>`;
      const anchor=idx===0?'start':idx===pts.length-1?'end':'middle';
      const dx=idx===0?4:idx===pts.length-1?-4:0;
      const ly=clamp(p[1]+offset,18,h-58);
      html+=`<text class="point-label compact" fill="${color}" text-anchor="${anchor}" x="${p[0]+dx}" y="${ly}">${escapeHtml(fmt(richLabelValue(rows[idx].v,key)))}</text>`;
    });
  });
  html+=xLabels(measurements,x,h);
  svg.innerHTML=html;
}

function renderSingleChart(svg,key){
  const rows=measurements.map((m,i)=>({i,v:metricValue(m,key)})).filter(x=>x.v!=null);
  if(!rows.length){svg.innerHTML='';return}
  const pad={l:60,r:24,t:25,b:54},w=720,h=410,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const vals=rows.map(x=>x.v),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(max-min,1),lo=min-span*.14,hi=max+span*.14;
  const x=i=>pad.l+(measurements.length===1?iw/2:iw*i/(measurements.length-1)),y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;
  let html=grid(w,h,pad,5);
  for(let i=0;i<=4;i++){
    const val=hi-(hi-lo)*i/4;
    html+=`<text class="axislabel" x="4" y="${pad.t+ih*i/4+6}">${fmt(val,key==='bmi'?1:0)}</text>`;
  }
  const pts=rows.map(r=>[x(r.i),y(r.v)]),color=metricColor(key);
  if(pts.length>1){
    const area=`M ${pts[0][0]} ${pad.t+ih} `+pts.map(p=>`L ${p[0]} ${p[1]}`).join(' ')+` L ${pts.at(-1)[0]} ${pad.t+ih} Z`;
    html+=`<path class="area" fill="${color}" d="${area}"/>`;
  }
  html+=`<path class="series" stroke="${color}" d="${pathFrom(pts)}"/>`;
  pts.forEach((p,idx)=>{
    html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="7"/>`;
    const anchor=idx===0?'start':idx===pts.length-1?'end':'middle';
    const dx=idx===0?4:idx===pts.length-1?-4:0;
    const ly=clamp(p[1]-14,18,h-58);
    html+=`<text class="point-label" fill="${color}" text-anchor="${anchor}" x="${p[0]+dx}" y="${ly}">${escapeHtml(fmt(rows[idx].v,1))}</text>`;
  });
  html+=xLabels(measurements,x,h);
  svg.innerHTML=html;
}

function renderLabChart(svg,series,key){
  if(!series.length){svg.innerHTML='';return}
  const pad={l:68,r:24,t:25,b:54},w=720,h=410,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const vals=series.map(x=>Number(x.value)),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(max-min,1),lo=min-span*.18,hi=max+span*.18;
  const x=i=>pad.l+(series.length===1?iw/2:iw*i/(series.length-1)),y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;
  let html=grid(w,h,pad,5);
  for(let i=0;i<=4;i++){
    const val=hi-(hi-lo)*i/4;
    html+=`<text class="axislabel" x="4" y="${pad.t+ih*i/4+6}">${fmtFlexible(val)}</text>`;
  }
  const pts=series.map((m,i)=>[x(i),y(Number(m.value))]),color='#31d69a';
  if(pts.length>1){
    const area=`M ${pts[0][0]} ${pad.t+ih} `+pts.map(p=>`L ${p[0]} ${p[1]}`).join(' ')+` L ${pts.at(-1)[0]} ${pad.t+ih} Z`;
    html+=`<path class="area" fill="${color}" d="${area}"/>`;
  }
  html+=`<path class="series" stroke="${color}" d="${pathFrom(pts)}"/>`;
  pts.forEach((p,idx)=>{
    html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="8"/>`;
    const anchor=idx===0?'start':idx===pts.length-1?'end':'middle';
    const dx=idx===0?4:idx===pts.length-1?-4:0;
    const ly=clamp(p[1]-14,18,h-58);
    html+=`<text class="point-label" fill="${color}" text-anchor="${anchor}" x="${p[0]+dx}" y="${ly}">${escapeHtml(fmtFlexible(series[idx].value))}</text>`;
  });
  html+=series.map((m,i)=>`<text class="axislabel" text-anchor="middle" x="${x(i)}" y="${h-13}">${shortDate(m.date)}</text>`).join('');
  svg.innerHTML=html;
}

function richLabelValue(value,key){
  if(key==='fatPct'||key==='bmi') return fmt(value,1);
  return fmt(value,1);
}
function grid(w,h,pad,lines){let s='',ih=h-pad.t-pad.b;for(let i=0;i<=lines;i++){const yy=pad.t+ih*i/lines;s+=`<line class="gridline" x1="${pad.l}" x2="${w-pad.r}" y1="${yy}" y2="${yy}"/>`}return s}
function xLabels(data,x,h){return data.map((m,i)=>{if(i!==0&&i!==data.length-1&&i%2===0)return'';return `<text class="axislabel" text-anchor="middle" x="${x(i)}" y="${h-13}">${shortDate(m.date)}</text>`}).join('')}
function pathFrom(points){return points.map((p,i)=>`${i?'L':'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')}
