function render(){
  measurements.sort(byDate);
  if(!hasData()){renderEmpty();return;}
  document.getElementById('greeting').textContent=profile.displayName?`Olá, ${profile.displayName} 👋`:'Olá 👋';
  renderHome(); renderResults(); renderEvolution(); renderCompare(); renderInsights();
}

function renderHome(){
  const l=latest(), f=first();
  document.getElementById('heroWeight').textContent=fmt(l.weight);
  document.getElementById('heroDate').textContent=`${brDate(l.date)}${l.time?` • ${l.time}`:''}`;
  document.getElementById('heroBmi').textContent=fmt(metricValue(l,'bmi'));
  document.getElementById('heroFatPct').textContent=`${fmt(l.fatPct)}%`;
  document.getElementById('heroMuscle').textContent=`${fmt(l.muscle)} kg`;
  document.getElementById('heroBmiStatus').textContent=rangeStatus(metricValue(l,'bmi'),l.ranges?.bmi);
  document.getElementById('heroFatStatus').textContent=rangeStatus(l.fatPct,l.ranges?.fatPct);
  document.getElementById('heroMuscleStatus').textContent=rangeStatus(l.muscle,l.ranges?.muscle);
  const refWeight=Number(profile.referenceWeight);
  if(Number.isFinite(refWeight)){
    const d=refWeight-l.weight; const arrow=d>=0?'↓':'↑';
    document.getElementById('weightDelta').innerHTML=`${arrow} ${fmt(Math.abs(d))} kg <small>vs. ${escapeHtml(profile.referenceLabel||'referência')}</small>`;
  }else if(measurements.length>1){
    const d=f.weight-l.weight; const arrow=d>=0?'↓':'↑';
    document.getElementById('weightDelta').innerHTML=`${arrow} ${fmt(Math.abs(d))} kg <small>vs. ${brDate(f.date)}</small>`;
  }else{
    document.getElementById('weightDelta').innerHTML='Primeira medição';
  }
  const dw=delta(l.weight,f.weight), df=delta(l.fatPct,f.fatPct), dm=delta(l.muscle,f.muscle);
  document.getElementById('summaryWeightChange').textContent=signed(dw,' kg');
  document.getElementById('summaryFatChange').textContent=signed(df,' p.p.');
  document.getElementById('summaryMuscleChange').textContent=signed(dm,' kg');
  const periodLabel=`Desde ${shortDate(f.date)}`;
  document.getElementById('summaryWeightLabel').textContent=periodLabel;
  document.getElementById('summaryFatLabel').textContent=periodLabel;
  document.getElementById('summaryMuscleLabel').textContent=periodLabel;
  const fatMassFirst=f.weight*f.fatPct/100, fatMassLast=l.fatMass ?? l.weight*l.fatPct/100;
  const fatKgLost=fatMassFirst-fatMassLast;
  document.getElementById('quickInsightTitle').textContent=measurements.length>1?'Sua evolução em contexto.':'Primeira medição registrada.';
  document.getElementById('quickInsight').textContent=measurements.length>1?`Entre ${brDate(f.date)} e ${brDate(l.date)}, o peso variou ${signed(dw,' kg')} e a gordura corporal ${signed(df,' p.p.')}. A estimativa indica ${signed(-fatKgLost,' kg')} de mudança na massa de gordura.`:'Adicione novas bioimpedâncias para visualizar tendências e comparações.';
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
  document.getElementById('scoreBadge').textContent=l.score!=null?`${l.score}/100`:'—/100';
  document.getElementById('idealWeight').textContent=l.idealWeight!=null?`${fmt(l.idealWeight)} kg`:'—';
  document.getElementById('weightControl').textContent=l.weightControl!=null?signed(l.weightControl,' kg'):'—';
  document.getElementById('fatControl').textContent=l.fatControl!=null?signed(l.fatControl,' kg'):'—';
  document.getElementById('muscleControl').textContent=l.muscleControl!=null?signed(l.muscleControl,' kg'):'—';
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
  const f=first(),l=latest(); const muscleDelta=l.muscle-f.muscle; const fatMassStart=f.weight*f.fatPct/100, fatMassEnd=l.fatMass||l.weight*l.fatPct/100;
  if(measurements.length===1){
    document.getElementById('trajectoryTitle').textContent='Primeira medição registrada.';
    document.getElementById('trajectoryText').textContent='Adicione novas bioimpedâncias para formar uma série histórica.';
  }else{
    document.getElementById('trajectoryTitle').textContent=`Peso ${signed(l.weight-f.weight,' kg')} e gordura ${signed(l.fatPct-f.fatPct,' p.p.')} no período.`;
    document.getElementById('trajectoryText').textContent=`De ${brDate(f.date)} a ${brDate(l.date)}, a massa muscular variou ${signed(muscleDelta,' kg')}.`;
  }
  const boxes=[];
  if(measurements.length>1) boxes.push(['COMPOSIÇÃO','Mudança estimada de massa de gordura',`A massa de gordura estimada passou de cerca de ${fmt(fatMassStart)} kg para ${fmt(fatMassEnd)} kg, uma variação de ${signed(fatMassEnd-fatMassStart,' kg')}.`]);
  boxes.push(['MÚSCULO','Acompanhe a massa muscular',`A massa muscular esquelética atual é ${fmt(l.muscle)} kg${measurements.length>1?`, com variação de ${signed(muscleDelta,' kg')} no período`:'.'}`]);
  if(measurements.length>1){const p=measurements.at(-2);boxes.push(['RECENTE','Última comparação disponível',`Desde ${brDate(p.date)}, o peso variou ${signed(l.weight-p.weight,' kg')}, a massa muscular ${signed(l.muscle-p.muscle,' kg')} e a gordura corporal ${signed(l.fatPct-p.fatPct,' p.p.')}.`]);}
  if(l.visceral!=null) boxes.push(['INDICADOR','Gordura visceral',`Na última medição, o nível de gordura visceral foi ${l.visceral}${l.ranges?.visceral?`, com referência registrada de ${l.ranges.visceral[0]}–${l.ranges.visceral[1]}`:''}.`]);
  document.getElementById('insightGrid').innerHTML=boxes.map(x=>`<article class="insight-box"><span class="kicker">${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p></article>`).join('');
}
