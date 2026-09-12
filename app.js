const ORIGINAL_DATA = [
  { id:'2026-02-03', date:'2026-02-03', time:null, weight:90.8, muscle:36.8, fatPct:28.1 },
  { id:'2026-03-21', date:'2026-03-21', time:null, weight:84.6, muscle:35.3, fatPct:26.0 },
  { id:'2026-04-11', date:'2026-04-11', time:null, weight:81.7, muscle:34.5, fatPct:25.0, fatMass:20.4, ffm:61.3, water:45.0, protein:12.1, minerals:4.21, visceral:9, bmr:1694, bmi:24.4, score:69 },
  { id:'2026-04-25', date:'2026-04-25', time:null, weight:79.2, muscle:34.1, fatPct:23.4 },
  { id:'2026-07-18', date:'2026-07-18', time:'09:41', weight:77.3, muscle:34.8, fatPct:19.6 },
  { id:'2026-08-01', date:'2026-08-01', time:'11:51', weight:78.0, muscle:35.7, fatPct:18.5 },
  { id:'2026-08-15', date:'2026-08-15', time:'09:58', weight:76.3, muscle:35.3, fatPct:17.8 },
  { id:'2026-08-29', date:'2026-08-29', time:'11:38', weight:76.5, muscle:35.4, fatPct:17.6 },
  { id:'2026-09-12', date:'2026-09-12', time:'11:39', weight:76.3, muscle:35.0, fatPct:18.5, bmi:22.8, fatMass:14.1, ffm:62.2, water:45.6, protein:12.3, minerals:4.30, visceral:6, bmr:1713, waistHip:0.88, obesity:104, score:76,
    ranges:{water:[41.4,50.6],protein:[11.1,13.6],minerals:[3.83,4.68],fatMass:[8.8,17.7],weight:[62.6,84.7],muscle:[31.7,38.7],bmi:[18.5,24.9],fatPct:[10,20],waistHip:[0.80,0.90],visceral:[1,9],obesity:[90,110]},
    leanSegments:[
      {name:'Braço esquerdo',kg:3.60,pct:107.5},{name:'Braço direito',kg:3.41,pct:101.2},{name:'Tronco',kg:27.4,pct:98.2},{name:'Perna esquerda',kg:9.81,pct:96.3},{name:'Perna direita',kg:9.90,pct:97.2}
    ],
    fatSegments:[
      {name:'Braço esquerdo',kg:0.7,pct:101.1},{name:'Braço direito',kg:0.8,pct:113.7},{name:'Tronco',kg:7.5,pct:159.8},{name:'Perna esquerda',kg:2.1,pct:108.0},{name:'Perna direita',kg:2.1,pct:108.7}
    ]
  }
];

const BASELINE_2026_WEIGHT = 93.8; // peso aproximado informado para o início de 2026, não é uma bioimpedância datada.
const STORAGE_KEY = 'inbody-tracker-anderson-v1';
let measurements = loadData();
let currentMetric = 'weight';

function loadData(){
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved){const parsed=JSON.parse(saved); if(Array.isArray(parsed)&&parsed.length) return parsed.sort(byDate);}
  }catch(e){console.warn('Falha ao ler dados locais',e)}
  return structuredClone(ORIGINAL_DATA);
}
function saveData(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(measurements)); }
function byDate(a,b){return (a.date+(a.time||''))>(b.date+(b.time||''))?1:-1}
function fmt(n,d=1){return n==null?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}
function fmtFlexible(n){ if(n==null)return '—'; return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2}); }
function brDate(iso){const [y,m,d]=iso.split('-');return `${d}/${m}/${y}`}
function shortDate(iso){const [y,m,d]=iso.split('-');return `${d}/${m}`}
function latest(){return measurements[measurements.length-1]}
function first(){return measurements[0]}
function delta(a,b){return Number((a-b).toFixed(1))}
function signed(n,suffix=''){const sign=n>0?'+':n<0?'−':'';return `${sign}${fmt(Math.abs(n))}${suffix}`}
function computeBMI(weight){return weight?weight/(1.83*1.83):null}
function metricValue(m,key){ if(key==='bmi') return m.bmi ?? computeBMI(m.weight); return m[key]; }
function metricUnit(key){return ({weight:'kg',muscle:'kg',fatPct:'%',bmi:''})[key]}
function metricLabel(key){return ({weight:'Peso',muscle:'Massa muscular',fatPct:'Gordura corporal',bmi:'IMC'})[key]}
function metricColor(key){return ({weight:'#ff4057',muscle:'#4aa7ff',fatPct:'#ffb13b',bmi:'#aa8cff'})[key]}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}

function render(){
  measurements.sort(byDate);
  renderHome(); renderResults(); renderEvolution(); renderCompare(); renderInsights();
}

function renderHome(){
  const l=latest(), f=first();
  document.getElementById('heroWeight').textContent=fmt(l.weight);
  document.getElementById('heroDate').textContent=`${brDate(l.date)}${l.time?` • ${l.time}`:''}`;
  document.getElementById('heroBmi').textContent=fmt(metricValue(l,'bmi'));
  document.getElementById('heroFatPct').textContent=`${fmt(l.fatPct)}%`;
  document.getElementById('heroMuscle').textContent=`${fmt(l.muscle)} kg`;
  document.getElementById('weightDelta').innerHTML=`↓ ${fmt(BASELINE_2026_WEIGHT-l.weight)} kg <small>vs. início/2026 (~${fmt(BASELINE_2026_WEIGHT)} kg)</small>`;
  const dw=delta(l.weight,f.weight), df=delta(l.fatPct,f.fatPct), dm=delta(l.muscle,f.muscle);
  document.getElementById('summaryWeightChange').textContent=signed(dw,' kg');
  document.getElementById('summaryFatChange').textContent=signed(df,' p.p.');
  document.getElementById('summaryMuscleChange').textContent=signed(dm,' kg');
  const fatMassFirst=f.weight*f.fatPct/100, fatMassLast=l.fatMass ?? l.weight*l.fatPct/100;
  const fatKgLost=fatMassFirst-fatMassLast;
  document.getElementById('quickInsight').textContent=`Entre ${brDate(f.date)} e ${brDate(l.date)}, o peso caiu ${fmt(Math.abs(dw))} kg e a gordura corporal ${fmt(Math.abs(df))} pontos percentuais. A estimativa indica cerca de ${fmt(fatKgLost)} kg a menos de gordura no período.`;
  renderMultiChart(document.getElementById('overviewChart'));
  renderComposition(); renderSegments();
}

function renderComposition(){
  const l=latest();
  const items=[
    ['Peso',l.weight,'kg',l.ranges?.weight],['Massa muscular',l.muscle,'kg',l.ranges?.muscle],['Gordura corporal',l.fatPct,'%',l.ranges?.fatPct],['Massa de gordura',l.fatMass,'kg',l.ranges?.fatMass],['Água corporal',l.water,'L',l.ranges?.water],['Proteína',l.protein,'kg',l.ranges?.protein],['Minerais',l.minerals,'kg',l.ranges?.minerals],['Massa livre de gordura',l.ffm,'kg',null],['Metabolismo basal',l.bmr,'kcal',null],['Relação cintura-quadril',l.waistHip,'',l.ranges?.waistHip],['Gordura visceral',l.visceral,'',l.ranges?.visceral],['Grau de obesidade',l.obesity,'%',l.ranges?.obesity]
  ];
  document.getElementById('compositionList').innerHTML=items.filter(x=>x[1]!=null).map(([name,val,unit,range])=>{
    const decimals=Number.isInteger(val)?0:(name==='Minerais'||name.includes('cintura'))?2:1;
    const rangeText=range?`${fmtFlexible(range[0])} – ${fmtFlexible(range[1])}`:'registrado';
    return `<div class="composition-item"><span>${name}</span><strong>${fmt(val,decimals)}${unit?` ${unit}`:''}</strong><small>${rangeText}</small></div>`
  }).join('');
}

function renderSegments(){
  const l=latest();
  const box=x=>`<div class="segment-box"><div class="top"><div><span>${x.name}</span><strong>${fmt(x.kg,x.kg<4?2:1)} kg</strong></div><em>${fmt(x.pct)}%</em></div></div>`;
  document.getElementById('leanSegments').innerHTML=(l.leanSegments||[]).map(box).join('')||'<p class="subtle">Sem dados segmentares nesta medição.</p>';
  document.getElementById('fatSegments').innerHTML=(l.fatSegments||[]).map(box).join('')||'<p class="subtle">Sem dados segmentares nesta medição.</p>';
}

function renderResults(){
  const list=[...measurements].reverse();
  document.getElementById('resultsTimeline').innerHTML=list.map(m=>{
    const [y,mo,d]=m.date.split('-');
    return `<article class="timeline-item">
      <div class="timeline-date"><div><strong>${d}</strong><small>${['','jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(mo)]}</small></div></div>
      <div><h3>${brDate(m.date)}${m.time?` • ${m.time}`:''}</h3><div class="timeline-metrics"><span><b>${fmt(m.weight)}</b> kg</span><span><b>${fmt(m.muscle)}</b> kg músculo</span><span><b>${fmt(m.fatPct)}</b>% gordura</span></div></div>
      <div class="timeline-score">${m.score?`${m.score}<small>/100</small>`:'›'}</div>
    </article>`
  }).join('');
}

function renderEvolution(){
  const l=latest(), f=first(); const lv=metricValue(l,currentMetric), fv=metricValue(f,currentMetric); const d=delta(lv,fv); const unit=metricUnit(currentMetric);
  document.getElementById('evoMetricLabel').textContent=metricLabel(currentMetric);
  document.getElementById('evoMetricValue').innerHTML=`${fmt(lv)} ${unit?`<small>${unit}</small>`:''}`;
  document.getElementById('evoMetricDelta').textContent=`${signed(d,currentMetric==='fatPct'?' p.p.':unit?` ${unit}`:'')} desde ${brDate(f.date)}`;
  renderSingleChart(document.getElementById('evolutionChart'),currentMetric);
  const metrics=['weight','muscle','fatPct','bmi'];
  document.getElementById('comparisonIndicators').innerHTML=metrics.map(k=>{
    const a=metricValue(f,k), b=metricValue(l,k); if(a==null||b==null)return''; const dd=delta(b,a), pct=(dd/a)*100; const su=k==='fatPct'?' p.p.':metricUnit(k)?` ${metricUnit(k)}`:'';
    return `<div class="indicator-row"><span>${metricLabel(k)}</span><strong>${signed(dd,su)}</strong><small>${signed(pct,'%')}</small></div>`
  }).join('');
}

function renderCompare(){
  const aSel=document.getElementById('compareA'), bSel=document.getElementById('compareB');
  const prevA=aSel.value||measurements[0].id, prevB=bSel.value||latest().id;
  const opts=measurements.map(m=>`<option value="${m.id}">${brDate(m.date)} • ${fmt(m.weight)} kg</option>`).join('');
  aSel.innerHTML=opts;bSel.innerHTML=opts;aSel.value=measurements.some(x=>x.id===prevA)?prevA:measurements[0].id;bSel.value=measurements.some(x=>x.id===prevB)?prevB:latest().id;
  renderCompareGrid();
}
function renderCompareGrid(){
  const a=measurements.find(x=>x.id===document.getElementById('compareA').value)||first();
  const b=measurements.find(x=>x.id===document.getElementById('compareB').value)||latest();
  const defs=[['Peso','weight','kg',true],['Massa muscular','muscle','kg',false],['Gordura corporal','fatPct','%',true],['IMC','bmi','',true],['Massa de gordura','fatMass','kg',true],['Gordura visceral','visceral','',true],['Água corporal','water','L',false],['Metabolismo basal','bmr','kcal',false]];
  document.getElementById('compareGrid').innerHTML=defs.map(([label,k,u,lowerGood])=>{
    const av=metricValue(a,k),bv=metricValue(b,k); if(av==null||bv==null)return''; const d=Number((bv-av).toFixed(k==='bmr'?0:1)); const good=lowerGood?d<=0:d>=0;
    return `<article class="compare-card"><span>${label}</span><strong>${fmt(bv,k==='bmr'?0:1)}${u?` ${u}`:''}</strong><em class="${good?'good':'neutral'}">${signed(d,k==='fatPct'?' p.p.':u?` ${u}`:'')}</em><span> vs. ${fmt(av,k==='bmr'?0:1)}${u?` ${u}`:''}</span></article>`
  }).join('');
}

function renderInsights(){
  const f=first(),l=latest(); const weightLoss=f.weight-l.weight, fatDrop=f.fatPct-l.fatPct, muscleDelta=l.muscle-f.muscle; const fatMassStart=f.weight*f.fatPct/100, fatMassEnd=l.fatMass||l.weight*l.fatPct/100;
  document.getElementById('trajectoryTitle').textContent=`${fmt(weightLoss)} kg a menos, com forte redução de gordura corporal.`;
  document.getElementById('trajectoryText').textContent=`De ${brDate(f.date)} a ${brDate(l.date)}, a gordura caiu ${fmt(fatDrop)} p.p., enquanto a massa muscular variou ${signed(muscleDelta,' kg')}.`;
  const boxes=[
    ['COMPOSIÇÃO','A maior parte da mudança veio de gordura',`A massa de gordura estimada caiu de cerca de ${fmt(fatMassStart)} kg para ${fmt(fatMassEnd)} kg, uma redução aproximada de ${fmt(fatMassStart-fatMassEnd)} kg.`],
    ['MÚSCULO','Massa muscular relativamente preservada',`A massa muscular esquelética passou de ${fmt(f.muscle)} kg para ${fmt(l.muscle)} kg. Isso representa uma variação de ${signed(muscleDelta,' kg')} no período.`],
    ['RECENTE','Pequena oscilação na última leitura',`De 29/08 para 12/09, o peso caiu ${fmt(measurements.at(-2).weight-l.weight)} kg, a massa muscular variou ${signed(l.muscle-measurements.at(-2).muscle,' kg')} e a gordura corporal subiu ${signed(l.fatPct-measurements.at(-2).fatPct,' p.p.')}.`],
    ['INDICADOR','Gordura visceral em faixa favorável',`Na última medição, o nível de gordura visceral foi ${l.visceral}, dentro da faixa de referência 1–9 impressa no relatório.`]
  ];
  document.getElementById('insightGrid').innerHTML=boxes.map(x=>`<article class="insight-box"><span class="kicker">${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('');
}

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

function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
document.getElementById('openEvolutionBtn').addEventListener('click',()=>{navigate('evolution')});
document.querySelectorAll('#homeSegments button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#homeSegments button').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  document.querySelectorAll('.home-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('home'+b.dataset.homeTab[0].toUpperCase()+b.dataset.homeTab.slice(1)).classList.add('active');
}));
document.querySelectorAll('#metricTabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#metricTabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentMetric=b.dataset.metric;renderEvolution()}));
document.getElementById('compareA').addEventListener('change',renderCompareGrid);document.getElementById('compareB').addEventListener('change',renderCompareGrid);

const mDialog=document.getElementById('measurementDialog');
function openAdd(){const d=new Date();const f=document.getElementById('measurementForm');f.reset();f.elements.date.value=d.toISOString().slice(0,10);f.elements.time.value=d.toTimeString().slice(0,5);mDialog.showModal()}
document.getElementById('addMeasurementBtn').addEventListener('click',openAdd);document.getElementById('fabAdd').addEventListener('click',openAdd);
document.getElementById('measurementForm').addEventListener('submit',e=>{
  e.preventDefault();const fd=new FormData(e.target);const obj={id:`${fd.get('date')}-${Date.now()}`,date:fd.get('date'),time:fd.get('time')||null};
  ['weight','muscle','fatPct','bmi','fatMass','water','bmr','visceral'].forEach(k=>{const v=fd.get(k);if(v!=='')obj[k]=Number(v)});
  measurements.push(obj);measurements.sort(byDate);saveData();mDialog.close();render();navigate('results');
});

const dataDialog=document.getElementById('dataDialog');document.getElementById('settingsBtn').addEventListener('click',()=>dataDialog.showModal());document.getElementById('closeDataDialog').addEventListener('click',()=>dataDialog.close());
document.getElementById('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(measurements,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`inbody-backup-${latest().date}.json`;a.click();URL.revokeObjectURL(a.href)});
document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error('Formato inválido');measurements=data.sort(byDate);saveData();render();dataDialog.close();alert('Backup importado com sucesso.')}catch(err){alert('Não foi possível importar este arquivo.')}});
document.getElementById('resetBtn').addEventListener('click',()=>{if(confirm('Restaurar as medições originais do app? As medições adicionadas neste navegador serão removidas.')){measurements=structuredClone(ORIGINAL_DATA);saveData();render();dataDialog.close();}});

render();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
