'use strict';

// V5.2: panorama de saúde calculado localmente a partir da base privada descriptografada.
const V52_SPECIALTIES=[
  {id:'metabolic',label:'Metabólico e glicemia',icon:'◌',labKeys:['glucose','hba1c','estimated_avg_glucose','insulin','insulin_free','homa_ir','uric_acid']},
  {id:'cardio',label:'Cardiovascular e lipídios',icon:'♡',labKeys:['total_cholesterol','hdl','ldl','non_hdl','triglycerides','homocysteine']},
  {id:'hematology',label:'Hematologia',icon:'◇',labKeys:['rbc','hemoglobin','hematocrit','mcv','mch','mchc','rdw','wbc','neutrophils_abs','eosinophils_abs','basophils_abs','lymphocytes_abs','monocytes_abs','platelets','mpv']},
  {id:'kidney',label:'Rins e eletrólitos',icon:'◫',labKeys:['creatinine','egfr','urea','sodium','potassium']},
  {id:'liver',label:'Fígado e abdome',icon:'◒',labKeys:['alt','ast','ggt','bilirubin_total','bilirubin_direct','bilirubin_indirect','alkaline_phosphatase','albumin','lipase'],reportTerms:['abdome','abdominal','usg abd','abd tot','fígado','figado','hepát','hepat','vesícula','vesicula']},
  {id:'thyroid',label:'Tireoide',icon:'⌁',labKeys:['tsh','free_t4','t3','anti_tpo']},
  {id:'vitamins',label:'Vitaminas e minerais',icon:'✦',labKeys:['vitamin_d_25oh','vitamin_b12','vitamin_c','iron','ferritin','zinc','magnesium','calcium']},
  {id:'hormones',label:'Hormonal e TRT',icon:'△',labKeys:['testosterone_total','testosterone_free','testosterone_bioavailable','shbg','fsh','lh','estradiol','dht','prolactin','cortisol_serum']},
  {id:'urology',label:'Urologia e saúde reprodutiva',icon:'○',labKeys:['psa_total'],reportTerms:['testícul','testicul','escrot','esperm','próstata','prostata','urolog','varico']},
  {id:'gastro',label:'Gastroenterologia',icon:'≈',labKeys:[],reportTerms:['endoscop','gástr','gastr','helicobacter','h. pylori','anatomopat','intestinal','duoden']},
  {id:'sleep',label:'Sono',icon:'☾',labKeys:[],reportTerms:['polisson','sono','apneia','ronco','brux']},
  {id:'neuro',label:'Neurologia',icon:'⌘',labKeys:[],reportTerms:['crânio','cranio','cérebr','cerebr','encefal','neurol','eletroneurom','enmg','parestes','aracnoide']},
  {id:'musculoskeletal',label:'Coluna e musculoesquelético',icon:'⌗',labKeys:[],reportTerms:['lomb','sacro','bacia','joelho','quadril','coluna','tendin','glúte','glute','isquiot','menisc','patela']},
  {id:'body',label:'Composição corporal',icon:'◎',body:true,labKeys:[]}
];

function v52Norm(s=''){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function v52ReportText(r){return v52Norm([r?.title,r?.category,r?.summary].filter(Boolean).join(' '));}
function v52ReportMatches(r,spec){const text=v52ReportText(r);return (spec.reportTerms||[]).some(t=>text.includes(v52Norm(t)));}
function v52LatestLabsFor(spec){return (spec.labKeys||[]).map(k=>latestLab(k)).filter(Boolean).sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
function v52ReportsFor(spec){return (reports()||[]).filter(r=>v52ReportMatches(r,spec)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
function v52LatestDate(items){return items.map(x=>x?.date).filter(Boolean).sort().at(-1)||'';}
function v52ReportLooksReassuring(r){
  const t=v52ReportText(r);
  const reassuring=['exame normal','dentro dos limites','sem alteracoes significativas','sem evidencias de','aspecto ultrassonografico normal','encefalo dentro dos limites'];
  const findings=['protrus','tendin','varico','metaplas','gastrite','apneia','cisto','edema','derrame','esteat','calculo','heterogene','degener','eros','fissur','hoffit','peritend','reduzid'];
  return reassuring.some(x=>t.includes(v52Norm(x)))&&!findings.some(x=>t.includes(v52Norm(x)));
}
function v52LabStatusSummary(labsForSpec){
  const statuses=labsForSpec.map(x=>({item:x,status:labStatus(x)}));
  const attention=statuses.filter(x=>['high','low'].includes(x.status.code));
  const context=statuses.filter(x=>x.status.code==='context');
  const ok=statuses.filter(x=>x.status.code==='ok');
  return{statuses,attention,context,ok};
}
function v52BodyEvidence(){
  const m=latestBody();if(!m)return null;
  const parts=[];
  if(m.weightKg!=null)parts.push(`Peso ${fmtFlex(m.weightKg)} kg`);
  if(m.bodyFatPct!=null)parts.push(`gordura ${fmtFlex(m.bodyFatPct)}%`);
  if(m.skeletalMuscleKg!=null)parts.push(`massa muscular ${fmtFlex(m.skeletalMuscleKg)} kg`);
  return{date:m.date||'',title:'Bioimpedância',summary:parts.join(' · '),source:'InBody',raw:m};
}
function v52BuildSpecialty(spec){
  if(spec.body){
    const e=v52BodyEvidence();if(!e)return null;
    const m=e.raw,flags=[];
    for(const key of ['bodyFatPct','skeletalMuscleKg','bmi']){
      const value=metricValue(m,key),range=m.referenceRanges?.[key];
      if(value!=null&&Array.isArray(range)&&bodyStatus(value,range)!=='Na faixa')flags.push(key);
    }
    const status=flags.length?{code:'follow',label:'Acompanhar'}:{code:'good',label:'Favorável'};
    return{...spec,date:e.date,status,summary:flags.length?'A composição corporal tem indicadores fora das faixas de referência do aparelho; acompanhe a tendência, não apenas uma medição isolada.':'Os principais indicadores corporais disponíveis estão dentro das faixas de referência registradas no exame mais recente.',labs:[],report:null,body:e,evidenceCount:1};
  }
  const ls=v52LatestLabsFor(spec),rs=v52ReportsFor(spec),report=rs[0]||null;
  if(!ls.length&&!report)return null;
  const labSum=v52LabStatusSummary(ls);
  let status;
  if(labSum.attention.length)status={code:'attention',label:'Atenção'};
  else if(report&&!v52ReportLooksReassuring(report))status={code:'follow',label:'Acompanhar'};
  else if(labSum.context.length)status={code:'follow',label:'Acompanhar'};
  else status={code:'good',label:'Favorável'};
  const phrases=[];
  if(ls.length){
    const newest=ls.slice(0,4).map(x=>`${x.label} ${fmtFlex(x.value)}${x.unit?` ${x.unit}`:''}`);
    phrases.push(`Marcadores mais recentes: ${newest.join(', ')}.`);
    if(labSum.attention.length)phrases.push(`${labSum.attention.length} ${labSum.attention.length===1?'marcador está':'marcadores estão'} fora da referência disponível no próprio exame.`);
    else if(labSum.context.length)phrases.push('Parte dos marcadores exige interpretação pelo contexto clínico, risco individual ou tratamento em uso.');
    else phrases.push('Nos marcadores com referência recuperada, não há desvio relevante no resultado mais recente.');
  }
  if(report)phrases.push(`Último laudo da área: ${report.summary||report.title}.`);
  const dates=[...ls,report].filter(Boolean);const date=v52LatestDate(dates);
  return{...spec,date,status,summary:phrases.join(' '),labs:ls,report,body:null,evidenceCount:ls.length+(report?1:0)};
}
function v52Panorama(){return V52_SPECIALTIES.map(v52BuildSpecialty).filter(Boolean).sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
function v52GlobalSummary(rows){
  const good=rows.filter(x=>x.status.code==='good').length,follow=rows.filter(x=>x.status.code==='follow').length,attention=rows.filter(x=>x.status.code==='attention').length;
  if(!rows.length)return 'Ainda não há dados suficientes para montar o panorama.';
  const latest=rows.map(x=>x.date).filter(Boolean).sort().at(-1);
  let s=`Panorama calculado localmente a partir das evidências mais recentes de ${rows.length} áreas de saúde`;
  if(latest)s+=`, com dados até ${brDate(latest)}`;
  s+=`. ${good} ${good===1?'área aparece favorável':'áreas aparecem favoráveis'}, ${follow} ${follow===1?'merece':'merecem'} acompanhamento`;
  if(attention)s+=` e ${attention} ${attention===1?'tem marcador laboratorial':'têm marcadores laboratoriais'} que merece${attention===1?'':'m'} atenção`;
  return s+'.';
}
function v52EvidenceHtml(row){
  const labsHtml=row.labs.map(x=>{const st=labStatus(x);return `<li><div><strong>${esc(x.label)}</strong><span>${brDate(x.date)} · ${fmtFlex(x.value)} ${esc(x.unit||'')}</span></div><em class="status ${esc(st.code)}">${esc(st.label)}</em></li>`;}).join('');
  const reportHtml=row.report?`<li><div><strong>${esc(row.report.title)}</strong><span>${row.report.date?brDate(row.report.date):'Data não recuperada'} · ${esc(row.report.summary||'Laudo disponível')}</span></div><em class="status context">Laudo</em></li>`:'';
  const bodyHtml=row.body?`<li><div><strong>${esc(row.body.title)}</strong><span>${brDate(row.body.date)} · ${esc(row.body.summary)}</span></div><em class="status context">InBody</em></li>`:'';
  return `<ul class="panorama-evidence-list">${labsHtml}${reportHtml}${bodyHtml}</ul>`;
}
function v52RenderPanorama(){
  const box=document.getElementById('healthPanoramaContent');if(!box)return;
  const rows=v52Panorama();
  box.innerHTML=`<div class="panorama-overview"><span class="label">VISÃO CONSOLIDADA</span><h3>${esc(v52GlobalSummary(rows))}</h3><p>O panorama usa sempre o dado mais recente disponível de cada área e é recalculado após cada sincronização. Achados antigos continuam preservados no histórico, mas não substituem a evidência mais nova da mesma área.</p></div><div class="panorama-grid">${rows.map(r=>`<article class="panorama-area ${esc(r.status.code)}"><div class="panorama-area-head"><div class="panorama-symbol">${esc(r.icon)}</div><div><h3>${esc(r.label)}</h3><time>${r.date?`Última evidência: ${brDate(r.date)}`:'Data não recuperada'}</time></div><span class="panorama-state ${esc(r.status.code)}">${esc(r.status.label)}</span></div><p>${esc(r.summary)}</p><details><summary>Ver evidências (${r.evidenceCount})</summary>${v52EvidenceHtml(r)}</details></article>`).join('')}</div><p class="panorama-footnote">Este panorama organiza resultados e laudos; não estabelece diagnóstico e não substitui avaliação médica, sintomas, exame físico ou contexto clínico individual.</p>`;
}
function v52EnsureUi(){
  const health=document.querySelector('.view[data-view="health"]'),hero=health?.querySelector('.health-summary-hero');if(!health||!hero)return;
  let actions=document.getElementById('healthPrimaryActions');
  if(!actions){actions=document.createElement('div');actions.id='healthPrimaryActions';actions.className='health-primary-actions';hero.insertAdjacentElement('afterend',actions);}
  let pano=document.getElementById('openHealthPanoramaBtn');
  if(!pano){pano=document.createElement('button');pano.id='openHealthPanoramaBtn';pano.className='health-action primary';pano.type='button';pano.innerHTML='<span class="health-action-icon">✦</span><span><strong>Ver meu panorama de saúde</strong><small>Resumo por área com a evidência mais recente</small></span><span class="health-action-arrow">›</span>';actions.appendChild(pano);}
  let exam=document.getElementById('openExamIndexBtn'),examCreated=false;
  if(!exam){exam=document.createElement('button');exam.id='openExamIndexBtn';exam.type='button';examCreated=true;actions.appendChild(exam);}else if(exam.parentElement!==actions){actions.appendChild(exam);}
  exam.className='health-action';exam.innerHTML='<span class="health-action-icon">⌕</span><span><strong>Procurar meus exames</strong><small>Veja quando fez e onde o arquivo está guardado</small></span><span class="health-action-arrow">›</span>';
  if(!document.getElementById('healthPanoramaDialog')){
    const d=document.createElement('dialog');d.id='healthPanoramaDialog';d.className='detail-dialog panorama-dialog';d.innerHTML='<div class="dialog-head"><div><p class="eyebrow">PANORAMA DE SAÚDE</p><h2>Seu estado de saúde em contexto</h2></div><button class="icon-btn" id="closeHealthPanorama" aria-label="Fechar">×</button></div><div id="healthPanoramaContent" class="detail-scroll panorama-content"></div>';document.body.appendChild(d);
  }
  if(!pano.dataset.bound){pano.addEventListener('click',()=>{v52RenderPanorama();document.getElementById('healthPanoramaDialog')?.showModal();});pano.dataset.bound='1';}
  if(examCreated&&!exam.dataset.v52Bound){exam.addEventListener('click',()=>{const card=document.querySelector('.exam-index-card');if(!card)return;card.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>document.getElementById('examIndexSearch')?.focus({preventScroll:true}),450);});exam.dataset.v52Bound='1';}
  const close=document.getElementById('closeHealthPanorama');if(close&&!close.dataset.bound){close.addEventListener('click',()=>document.getElementById('healthPanoramaDialog')?.close());close.dataset.bound='1';}
}

const v52BaseRenderHealth=renderHealth;
renderHealth=function(){v52BaseRenderHealth();v52EnsureUi();};
v52EnsureUi();
