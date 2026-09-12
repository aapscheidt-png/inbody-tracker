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
document.getElementById('exportBtn').addEventListener('click',()=>{
  if(!hasData()){alert('Nenhum dado para exportar.');return;}
  const payload={schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),profile,measurements};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`inbody-backup-${latest().date}.json`;a.click();URL.revokeObjectURL(a.href)
});
document.getElementById('importInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const payload=importPayload(JSON.parse(await file.text()));
    if(!validateMeasurements(payload.measurements)||payload.measurements.length===0) throw new Error('Medições inválidas');
    profile=payload.profile||{}; measurements=payload.measurements.sort(byDate); saveData(); render(); dataDialog.close(); alert('Backup importado com sucesso. Os dados ficaram salvos somente neste navegador.');
  }catch(err){console.warn(err);alert('Não foi possível importar este arquivo.');}
  finally{e.target.value='';}
});
document.getElementById('resetBtn').addEventListener('click',()=>{
  if(confirm('Apagar todas as medições salvas neste aparelho? Esta ação não pode ser desfeita sem um backup.')){
    measurements=[];profile={};localStorage.removeItem(STORAGE_KEY);render();dataDialog.close();
  }
});

render();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
