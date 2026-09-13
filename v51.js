'use strict';

// V5.1 enriches the V5 renderer without changing the private-data / crypto contract.
const V51_CATEGORY_OVERRIDES={
  insulin_free:'metabolic',anti_tpo:'thyroid',sodium:'vitamins',potassium:'vitamins',magnesium:'vitamins',psa_total:'screening'
};
const baseLabCategoryV51=labCategory;
labCategory=function(key){return V51_CATEGORY_OVERRIDES[key]||baseLabCategoryV51(key);};

const baseLabStatusV51=labStatus;
labStatus=function(item){
  if(item?.status==='within_lab_reference')return{code:'ok',label:'Na faixa'};
  return baseLabStatusV51(item);
};

function v51LatestValue(key){const x=latestLab(key);return x?`${fmtFlex(x.value)}${x.unit?` ${x.unit}`:''}`:null;}
healthExecutiveSummary=function(){
  const date=latestLabDate(),fresh=freshness(date),latest=latestLabsByKey();
  const attention=latest.filter(x=>['high','low'].includes(labStatus(x).code));
  const context=latest.filter(x=>labStatus(x).code==='context');
  const glucose=latestLab('glucose'),hba=latestLab('hba1c'),ldl=latestLab('ldl'),tg=latestLab('triglycerides'),hdl=latestLab('hdl');
  let narrative='';
  if(date){
    const pieces=[];
    if(glucose)pieces.push(`glicemia ${fmtFlex(glucose.value)} ${glucose.unit}`);
    if(hba)pieces.push(`HbA1c ${fmtFlex(hba.value)}%`);
    if(ldl)pieces.push(`LDL ${fmtFlex(ldl.value)} mg/dL`);
    if(tg)pieces.push(`triglicérides ${fmtFlex(tg.value)} mg/dL`);
    narrative=`Nos dados laboratoriais mais recentes (${brDate(date)}), ${pieces.join(', ')}. `;
    if(hdl)narrative+=`O HDL está em ${fmtFlex(hdl.value)} mg/dL e deve ser lido contra o critério do próprio laudo. `;
    const g=labSeries('glucose').filter(x=>Number.isFinite(Number(x.value)));
    if(g.length>=3)narrative+=`A série de glicose permite acompanhar a trajetória desde ${brDate(g[0].date)} até ${brDate(g.at(-1).date)}, sem depender de uma única coleta. `;
    if(latestLab('testosterone_total'))narrative+='O painel hormonal de julho é apresentado em contexto de reposição de testosterona, evitando classificar isoladamente FSH/LH/testosterona pela faixa populacional. ';
    const oldUsg=(data.reports||[]).find(r=>r.id==='abd-usg-2025-10-12'),newUsg=(data.reports||[]).find(r=>r.id==='abd-usg-2026-08-09');
    if(oldUsg&&newUsg)narrative+='Na imagem abdominal, o laudo de 09/08/2026 já não descreve a esteatose leve nem o possível pequeno cálculo renal relatados em 12/10/2025.';
  }else narrative='Nenhum resultado laboratorial carregado.';
  return{date,fresh,attention,context,narrative};
};

function v51Source(item){return data.sourceRegistry?.[item?.source]||{};}
function v51StripExt(name=''){return String(name).replace(/\.(pdf|json)$/i,'').replace(/_/g,' ').trim();}
function v51TypeLabel(type){return({laboratory:'Laboratório',report:'Laudo / procedimento',pending:'Pendente',support:'Documento de apoio',order:'Pedido médico',visit:'Consulta / pasta',assessment:'Avaliação'})[type]||type;}
function v51StatusLabel(status){
  return({imported:'Resultado importado',report_imported:'Laudo importado',listed_in_icloud_source_not_imported:'Resultado não importado',legacy_summary_present_original_missing:'Resumo disponível · original pendente',supporting_document_located:'Documento localizado',folder_location:'Pasta localizada',order_document_imported:'Pedido importado'})[status]||status||'Localizado';
}
function v51StatusClass(status){return status==='imported'||status==='report_imported'||status==='order_document_imported'?'ok':status==='listed_in_icloud_source_not_imported'||status==='legacy_summary_present_original_missing'?'pending':'context';}

function examIndexRows(){
  const rows=[];
  const groups=new Map();
  labs().forEach(x=>{
    const src=v51Source(x),path=x.storagePath||src.storagePath||'',file=x.fileName||src.name||x.label;
    const k=[x.date,path,file].join('|');
    if(!groups.has(k))groups.set(k,{id:`lab-${k}`,type:'laboratory',title:v51StripExt(file),date:x.date,physician:src.orderingPhysician||'',facility:src.facility||'',path,status:'imported',markers:[],values:[]});
    const g=groups.get(k);g.markers.push(x.label);g.values.push(`${x.label} ${fmtFlex(x.value)} ${x.unit||''}`.trim());
  });
  groups.forEach(g=>{g.detail=`${g.markers.length} ${g.markers.length===1?'resultado':'resultados'} estruturados`;g.search=[g.title,g.date,g.physician,g.facility,g.path,...g.markers,...g.values].join(' ').toLowerCase();rows.push(g);});
  reports().forEach(r=>{
    const src=v51Source(r),path=r.storagePath||src.storagePath||'';
    rows.push({id:`rep-${r.id}`,type:'report',title:r.title,date:r.date||'',physician:r.orderingPhysician||src.orderingPhysician||'',facility:r.facility||src.facility||'',path,status:'report_imported',detail:r.summary||'',search:[r.title,r.date,r.orderingPhysician,src.orderingPhysician,r.facility,src.facility,path,r.summary].join(' ').toLowerCase()});
  });
  (data.archiveIndex||[]).forEach(a=>{
    const type=a.status==='supporting_document_located'?'support':a.status==='order_document_imported'?'order':a.status==='folder_location'?'visit':a.category==='assessment'?'assessment':'pending';
    rows.push({id:`arc-${a.id}`,type,title:a.title,date:a.dateHint||'',physician:a.orderingPhysician||'',facility:a.facility||'',path:a.storagePath||'',status:a.status,detail:a.note||'',search:[a.title,a.dateHint,a.category,a.storagePath,a.note].join(' ').toLowerCase()});
  });
  return rows.sort((a,b)=>(b.date||'0000').localeCompare(a.date||'0000')||a.title.localeCompare(b.title,'pt-BR'));
}

let examIndexFilter='all',examIndexQuery='',examIndexExpanded=false;
function examIndexMatches(row){
  const q=examIndexQuery.trim().toLowerCase();if(q&&!row.search.includes(q))return false;
  if(examIndexFilter==='lab'&&row.type!=='laboratory')return false;
  if(examIndexFilter==='reports'&&row.type!=='report')return false;
  if(examIndexFilter==='pending'&&!['pending'].includes(row.type))return false;
  if(examIndexFilter==='documents'&&!['support','order','visit','assessment'].includes(row.type))return false;
  return true;
}
function renderExamIndex(){
  const list=document.getElementById('examIndexList'),count=document.getElementById('examIndexCount'),more=document.getElementById('examIndexMore');if(!list||!count)return;
  const all=examIndexRows(),filtered=all.filter(examIndexMatches),shown=examIndexExpanded?filtered:filtered.slice(0,60);
  count.textContent=`${filtered.length} ${filtered.length===1?'item':'itens'} encontrados`;
  list.innerHTML=shown.map(r=>{
    const statusClass=v51StatusClass(r.status),date=r.date?(/^\d{4}-\d{2}-\d{2}$/.test(r.date)?brDate(r.date):esc(r.date)):'Data clínica não confirmada';
    return `<article class="exam-index-row"><div class="exam-index-main"><div class="exam-index-titleline"><span class="exam-type">${esc(v51TypeLabel(r.type))}</span><span class="exam-state ${statusClass}">${esc(v51StatusLabel(r.status))}</span></div><h3>${esc(r.title)}</h3><p class="exam-date">${date}</p>${r.physician?`<p><b>Médico:</b> ${esc(r.physician)}</p>`:''}${r.facility?`<p><b>Laboratório/local:</b> ${esc(r.facility)}</p>`:''}${r.detail?`<p class="exam-detail">${esc(r.detail)}</p>`:''}</div>${r.path?`<button class="exam-path" data-copy-path="${esc(r.path)}" aria-label="Copiar localização"><span>Onde encontrar</span><strong>${esc(r.path.replaceAll(' / ',' › '))}</strong><small>Toque para copiar</small></button>`:''}</article>`;
  }).join('')||'<p class="subtle">Nenhum item encontrado com esses filtros.</p>';
  if(more){more.hidden=filtered.length<=60;more.textContent=examIndexExpanded?'Mostrar menos':`Mostrar todos (${filtered.length})`;}
}

const baseRenderHealthV51=renderHealth;
renderHealth=function(){baseRenderHealthV51();renderExamIndex();const el=document.getElementById('healthSummaryDate');if(el){const b=data.dataFreshness||{};const parts=[];if(b.bodyCompositionLatest)parts.push(`composição ${brDate(b.bodyCompositionLatest)}`);if(b.laboratoryLatest)parts.push(`laboratório ${brDate(b.laboratoryLatest)}`);if(b.imagingLatest)parts.push(`imagem ${brDate(b.imagingLatest)}`);el.textContent=parts.length?`Data-base · ${parts.join(' · ')}`:'Sem data-base';}};

const baseOpenBodyDetailV51=openBodyDetail;
openBodyDetail=function(id){
  baseOpenBodyDetailV51(id);const m=bodyMeasurements().find(x=>x.id===id),box=document.getElementById('bodyDetailContent');if(!m||!box)return;
  if(m.impedanceOhms){const rows=Object.entries(m.impedanceOhms).map(([freq,v])=>`<tr><th>${esc(freq)}</th><td>${fmtFlex(v.rightArm)}</td><td>${fmtFlex(v.leftArm)}</td><td>${fmtFlex(v.trunk)}</td><td>${fmtFlex(v.rightLeg)}</td><td>${fmtFlex(v.leftLeg)}</td></tr>`).join('');box.insertAdjacentHTML('beforeend',`<h3>Impedância (Ω)</h3><div class="impedance-scroll"><table class="impedance-table"><thead><tr><th>Freq.</th><th>Braço D</th><th>Braço E</th><th>Tronco</th><th>Perna D</th><th>Perna E</th></tr></thead><tbody>${rows}</tbody></table></div>`);}
};

const examSearch=document.getElementById('examIndexSearch');if(examSearch)examSearch.addEventListener('input',e=>{examIndexQuery=e.target.value;examIndexExpanded=false;renderExamIndex();});
const examFilters=document.getElementById('examIndexFilters');if(examFilters)examFilters.addEventListener('click',e=>{const b=e.target.closest('[data-exam-filter]');if(!b)return;examIndexFilter=b.dataset.examFilter;examIndexExpanded=false;examFilters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderExamIndex();});
const examList=document.getElementById('examIndexList');if(examList)examList.addEventListener('click',async e=>{const b=e.target.closest('[data-copy-path]');if(!b)return;const path=b.dataset.copyPath;try{await navigator.clipboard.writeText(path);const small=b.querySelector('small');if(small){small.textContent='Caminho copiado';setTimeout(()=>small.textContent='Toque para copiar',1400);}}catch(_){prompt('Copie o caminho:',path);}});
const examMore=document.getElementById('examIndexMore');if(examMore)examMore.addEventListener('click',()=>{examIndexExpanded=!examIndexExpanded;renderExamIndex();});

// V5.1.1 UX: acesso rápido ao índice de exames e feedback explícito de sincronização.
function v511EnsureExamJump(){
  if(document.getElementById('openExamIndexBtn'))return;
  const health=document.querySelector('.view[data-view="health"]'),hero=health?.querySelector('.health-summary-hero');
  if(!health||!hero)return;
  const b=document.createElement('button');b.id='openExamIndexBtn';b.className='exam-index-jump';b.type='button';b.innerHTML='<span class="exam-jump-icon">⌕</span><span><strong>Procurar meus exames</strong><small>Veja quando fez e onde o arquivo está guardado</small></span><span class="exam-jump-arrow">›</span>';
  hero.insertAdjacentElement('afterend',b);
  b.addEventListener('click',()=>{const card=document.querySelector('.exam-index-card');if(!card)return;card.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>document.getElementById('examIndexSearch')?.focus({preventScroll:true}),450);});
}
function v511SyncRecordCount(){return bodyMeasurements().length+labs().length+reports().length+(data.treatments||[]).length+(data.archiveIndex||[]).length;}
function v511SyncSuccessMessage(){
  const now=new Date(),time=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),count=v511SyncRecordCount();
  try{localStorage.setItem('health-tracker-last-sync-v5',now.toISOString());}catch(_){}
  return `Sincronização concluída · ${time} · ${count} registros carregados`;
}
function v511ShowToast(message,state='ok'){
  let t=document.getElementById('syncToastV511');if(!t){t=document.createElement('div');t.id='syncToastV511';t.className='sync-toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t);}
  t.textContent=message;t.dataset.state=state;t.classList.add('show');clearTimeout(v511ShowToast._timer);v511ShowToast._timer=setTimeout(()=>t.classList.remove('show'),3600);
}
v511EnsureExamJump();
