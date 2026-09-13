'use strict';
document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>navigateV5(b.dataset.nav)));
function navigateV5(view){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));window.scrollTo({top:0,behavior:'smooth'});if(view==='health')renderHealth();}
document.getElementById('settingsBtn').addEventListener('click',()=>document.getElementById('dataDialog').showModal());
document.getElementById('closeDataDialog').addEventListener('click',()=>document.getElementById('dataDialog').close());
document.getElementById('closeBodyDetail').addEventListener('click',()=>document.getElementById('bodyDetailDialog').close());
document.getElementById('exportBtn').addEventListener('click',exportPrivateData);
document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const raw=JSON.parse(await file.text());data=normalizeCanonical(raw);savePrivateData(data);renderApp();document.getElementById('dataDialog').close();alert('Base privada importada com sucesso.');}catch(err){alert(`Não foi possível importar: ${err.message}`);}finally{e.target.value='';}});
document.getElementById('resetBtn').addEventListener('click',()=>{if(!confirm('Remover os dados privados deste dispositivo? O site continuará instalado, mas o histórico local será apagado.'))return;clearPrivateData();data=clone(EMPTY_DATA);renderApp();document.getElementById('dataDialog').close();});
document.getElementById('openEvolutionBtn').addEventListener('click',()=>navigateV5('evolution'));
document.getElementById('openHealthBtn').addEventListener('click',()=>navigateV5('health'));
document.getElementById('metricTabs').addEventListener('click',e=>{const b=e.target.closest('[data-body-metric]');if(!b)return;currentBodyMetric=b.dataset.bodyMetric;document.querySelectorAll('[data-body-metric]').forEach(x=>x.classList.toggle('active',x===b));renderEvolution();});
document.getElementById('resultsTimeline').addEventListener('click',e=>{const b=e.target.closest('[data-body-id]');if(b)openBodyDetail(b.dataset.bodyId);});
document.getElementById('healthCategoryTabs').addEventListener('click',e=>{const b=e.target.closest('[data-health-cat]');if(!b)return;currentHealthCategory=b.dataset.healthCat;renderHealth();});
document.getElementById('healthMarkers').addEventListener('click',e=>{const b=e.target.closest('[data-lab-key]');if(!b)return;currentLabKey=b.dataset.labKey;renderHealth();});
if(window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone)document.body.classList.add('standalone');
renderApp();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw-v5.js?v=5.1',{updateViaCache:'none'}).catch(()=>{});
