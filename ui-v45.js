// V4.5 — navegação e modo somente leitura

document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
document.getElementById('openEvolutionBtn')?.addEventListener('click',()=>navigate('evolution'));
document.getElementById('openHealthBtn')?.addEventListener('click',()=>navigate('health'));
document.getElementById('openReportsBtn')?.addEventListener('click',()=>navigate('health'));

document.querySelectorAll('#homeSegments button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#homeSegments button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.home-panel').forEach(p=>p.classList.remove('active'));
  const id='home'+b.dataset.homeTab[0].toUpperCase()+b.dataset.homeTab.slice(1);
  document.getElementById(id)?.classList.add('active');
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
document.getElementById('settingsBtn')?.addEventListener('click',()=>dataDialog?.showModal());
document.getElementById('closeDataDialog')?.addEventListener('click',()=>dataDialog?.close());

document.getElementById('exportBtn')?.addEventListener('click',()=>{
  const payload={schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),profile,measurements,labs,reports};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`health-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

const isStandalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
document.body.classList.toggle('standalone',isStandalone);
render();

const splash=document.getElementById('appSplash');
if(splash){setTimeout(()=>splash.classList.add('hidden'),isStandalone?450:0)}

if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  navigator.serviceWorker.register('./sw-v45.js?v=4.5',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
}
