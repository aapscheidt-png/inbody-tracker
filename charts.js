function renderMultiChart(svg){
  const defs=[['weight','#ff4057'],['muscle','#4aa7ff'],['fatPct','#ffb13b']];
  const pad={l:52,r:28,t:24,b:48},w=720,h=330,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const x=i=>pad.l+(measurements.length===1?0:iw*i/(measurements.length-1));
  let html=grid(svg,w,h,pad,4);
  defs.forEach(([key,color])=>{
    const vals=measurements.map(m=>metricValue(m,key)).filter(v=>v!=null),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(max-min,1),lo=min-span*.12,hi=max+span*.12;
    const y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;
    const pts=measurements.map((m,i)=>[x(i),y(metricValue(m,key))]);
    html+=`<path class="series" stroke="${color}" d="${pathFrom(pts)}"/>`;
    pts.forEach(p=>html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="6"/>`);
  });
  html+=xLabels(measurements,x,h,pad);
  svg.innerHTML=html;
}
function renderSingleChart(svg,key){
  const vals=measurements.map(m=>metricValue(m,key)).filter(v=>v!=null),pad={l:60,r:24,t:25,b:54},w=720,h=410,iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  const min=Math.min(...vals),max=Math.max(...vals),span=Math.max(max-min,1),lo=min-span*.14,hi=max+span*.14;
  const x=i=>pad.l+(measurements.length===1?0:iw*i/(measurements.length-1)); const y=v=>pad.t+ih-(v-lo)/(hi-lo)*ih;
  let html=grid(svg,w,h,pad,5);
  for(let i=0;i<=4;i++){const val=hi-(hi-lo)*i/4;html+=`<text class="axislabel" x="4" y="${pad.t+ih*i/4+6}">${fmt(val,key==='bmi'?1:0)}</text>`}
  const pts=measurements.map((m,i)=>[x(i),y(metricValue(m,key))]); const color=metricColor(key);
  const area=`M ${pts[0][0]} ${pad.t+ih} `+pts.map(p=>`L ${p[0]} ${p[1]}`).join(' ')+` L ${pts.at(-1)[0]} ${pad.t+ih} Z`;
  html+=`<path class="area" fill="${color}" d="${area}"/><path class="series" stroke="${color}" d="${pathFrom(pts)}"/>`;
  pts.forEach(p=>html+=`<circle class="point" fill="${color}" cx="${p[0]}" cy="${p[1]}" r="7"/>`); html+=xLabels(measurements,x,h,pad);
  svg.innerHTML=html;
}
function grid(svg,w,h,pad,lines){let s='';const ih=h-pad.t-pad.b;for(let i=0;i<=lines;i++){const yy=pad.t+ih*i/lines;s+=`<line class="gridline" x1="${pad.l}" x2="${w-pad.r}" y1="${yy}" y2="${yy}"/>`}return s}
function xLabels(data,x,h,pad){return data.map((m,i)=>{if(i!==0&&i!==data.length-1&&i%2===0)return'';return `<text class="axislabel" text-anchor="middle" x="${x(i)}" y="${h-13}">${shortDate(m.date)}</text>`}).join('')}
function pathFrom(points){return points.map((p,i)=>`${i?'L':'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')}
