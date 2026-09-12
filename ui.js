// Health Tracker V4.4 — navegação, layout mobile e modo somente leitura

const runtimeStyle=document.createElement('style');
runtimeStyle.textContent=`
#fabAdd,#addMeasurementBtn,#measurementDialog,#addLabBtn,#labDialog,#addReportBtn,#reportDialog{display:none!important}
@media (max-width:560px){
  .metric-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .summary-strip{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .metric{padding:14px 10px!important;min-height:112px!important;border-radius:20px!important}
  .metric span{font-size:12px!important;line-height:1.2!important}
  .metric strong{font-size:27px!important}
  .metric em{font-size:12px!important}
  .summary-strip>div{padding:12px!important}
  .summary-strip strong{font-size:21px!important}
  .summary-strip span,.summary-strip small{font-size:11px!important}
  .bottom-nav{bottom:0!important;width:100%!important;max-width:920px!important;border-radius:24px 24px 0 0!important;border-left:none!important;border-right:none!important;border-bottom:none!important;padding-bottom:calc(10px + env(safe-area-inset-bottom))!important}
  .app-shell{padding-bottom:calc(116px + env(safe-area-inset-bottom))!important}
}
`;
document.head.appendChild(runtimeStyle);

['fabAdd','addMeasurementBtn','measurementDialog','addLabBtn','labDialog','addReportBtn','reportDialog'].forEach(id=>document.getElementById(id)?.remove());

document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
document.getElementById('openEvolutionBtn')?.addEventListener('click',()=>navigate('evolution'));
document.getElementById('openHealthBtn')?.addEventListener('click',()=>navigate('health'));
document.getElementById('openReportsBtn')?.addEventListener('click',()=>navigate('health'));

document.querySelectorAll('#homeSegments button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#homeSegments button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.home-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('home'+b.dataset.homeTab[0].toUpperCase()+b.dataset.homeTab.slice(1))?.classList.add('active');
}));

document.querySelectorAll('#metricTabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#metricTabs button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  currentMetric=b.dataset.metric;
  renderEvolution();
}));

document.getElementById('compareA')?.addEventListener('change',renderCompareGrid);
document.getElementById('compareB')?.addEventListener('change',renderCompareGrid);

const dataDialog=document.getElementById('dataDialog');
if(dataDialog){
  const title=dataDialog.querySelector('.dialog-head h2');
  const desc=dataDialog.querySelector(':scope > .subtle');
  if(title)title.textContent='Dados do Health Tracker';
  if(desc)desc.textContent='Este app é atualizado diretamente no GitHub quando você me envia uma nova bioimpedância, exame ou laudo. Não é necessário digitar dados manualmente.';
  dataDialog.querySelector('.file-label')?.remove();
  document.getElementById('resetBtn')?.remove();
  const exportBtn=document.getElementById('exportBtn');
  if(exportBtn)exportBtn.textContent='Exportar cópia JSON';
  document.getElementById('settingsBtn')?.addEventListener('click',()=>dataDialog.showModal());
  document.getElementById('closeDataDialog')?.addEventListener('click',()=>dataDialog.close());
  exportBtn?.addEventListener('click',()=>{
    const payload={schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),profile,measurements,labs,reports};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`health-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

const versionBadge=document.querySelector('.version-badge');
if(versionBadge)versionBadge.textContent='V4.4';
const splash=document.getElementById('appSplash');
if(splash){const small=splash.querySelector('small');if(small)small.textContent='V4.4'}

const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
document.body.classList.toggle('standalone',isStandalone);
render();
if(splash)setTimeout(()=>splash.classList.add('hidden'),isStandalone?500:0);
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
  navigator.serviceWorker.register('./sw.js?v=4.4').then(reg=>reg.update()).catch(()=>{});
}
