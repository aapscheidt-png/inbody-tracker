const STORAGE_KEY = 'inbody-tracker-local-v2';
const SCHEMA_VERSION = 2;
let state = loadState();
let measurements = state.measurements;
let profile = state.profile;
let currentMetric = 'weight';

function loadState(){
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved){
      const parsed=JSON.parse(saved);
      if(parsed && typeof parsed==='object' && Array.isArray(parsed.measurements)){
        return {schemaVersion:SCHEMA_VERSION,profile:parsed.profile||{},measurements:parsed.measurements.sort(byDate)};
      }
    }
  }catch(e){console.warn('Falha ao ler dados locais',e)}
  return {schemaVersion:SCHEMA_VERSION,profile:{},measurements:[]};
}
function saveData(){
  state={schemaVersion:SCHEMA_VERSION,profile:profile||{},measurements};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function importPayload(data){
  if(Array.isArray(data)) return {schemaVersion:SCHEMA_VERSION,profile:{},measurements:data};
  if(data && typeof data==='object' && Array.isArray(data.measurements)){
    return {schemaVersion:SCHEMA_VERSION,profile:data.profile||{},measurements:data.measurements};
  }
  throw new Error('Formato inválido');
}
function validateMeasurements(items){
  if(!Array.isArray(items)) return false;
  return items.every(m=>m && /^\d{4}-\d{2}-\d{2}$/.test(m.date||'') && Number.isFinite(Number(m.weight)) && Number.isFinite(Number(m.muscle)) && Number.isFinite(Number(m.fatPct)));
}
function byDate(a,b){return (a.date+(a.time||''))>(b.date+(b.time||''))?1:-1}
function fmt(n,d=1){return n==null?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}
function fmtFlexible(n){ if(n==null)return '—'; return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2}); }
function brDate(iso){const [y,m,d]=iso.split('-');return `${d}/${m}/${y}`}
function shortDate(iso){const [y,m,d]=iso.split('-');return `${d}/${m}`}
function latest(){return measurements[measurements.length-1]}
function first(){return measurements[0]}
function delta(a,b){return Number((a-b).toFixed(1))}
function signed(n,suffix=''){const sign=n>0?'+':n<0?'−':'';return `${sign}${fmt(Math.abs(n))}${suffix}`}
function computeBMI(weight){const h=Number(profile.heightCm);if(!weight||!Number.isFinite(h)||h<=0)return null;const m=h/100;return weight/(m*m)}
function metricValue(m,key){ if(key==='bmi') return m.bmi ?? computeBMI(m.weight); return m[key]; }
function metricUnit(key){return ({weight:'kg',muscle:'kg',fatPct:'%',bmi:''})[key]}
function metricLabel(key){return ({weight:'Peso',muscle:'Massa muscular',fatPct:'Gordura corporal',bmi:'IMC'})[key]}
function metricColor(key){return ({weight:'#ff4057',muscle:'#4aa7ff',fatPct:'#ffb13b',bmi:'#aa8cff'})[key]}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function rangeStatus(value,range){
  if(value==null) return '—';
  if(!Array.isArray(range)||range.length<2) return 'Registrado';
  if(value<range[0]) return 'Abaixo';
  if(value>range[1]) return 'Acima';
  return 'Normal';
}
function hasData(){return measurements.length>0}
function renderEmpty(){
  document.getElementById('greeting').textContent='Olá 👋';
  document.getElementById('heroWeight').textContent='—';
  document.getElementById('heroDate').textContent='Nenhuma medição carregada';
  document.getElementById('heroBmi').textContent='—';
  document.getElementById('heroFatPct').textContent='—';
  document.getElementById('heroMuscle').textContent='—';
  document.getElementById('heroBmiStatus').textContent='—';
  document.getElementById('heroFatStatus').textContent='—';
  document.getElementById('heroMuscleStatus').textContent='—';
  document.getElementById('weightDelta').innerHTML='— <small>sem referência</small>';
  ['summaryWeightChange','summaryFatChange','summaryMuscleChange'].forEach(id=>document.getElementById(id).textContent='—');
  ['summaryWeightLabel','summaryFatLabel','summaryMuscleLabel'].forEach(id=>document.getElementById(id).textContent='Período');
  document.getElementById('quickInsightTitle').textContent='Carregue seus dados para começar.';
  document.getElementById('quickInsight').textContent='Use o menu ⋯ para importar um backup privado em JSON ou toque em + para registrar sua primeira bioimpedância.';
  document.getElementById('overviewChart').innerHTML='';
  document.getElementById('compositionList').innerHTML='<p class="subtle">Nenhuma medição disponível.</p>';
  document.getElementById('scoreBadge').textContent='—/100';
  ['idealWeight','weightControl','fatControl','muscleControl'].forEach(id=>document.getElementById(id).textContent='—');
  document.getElementById('leanSegments').innerHTML='<p class="subtle">Nenhuma medição disponível.</p>';
  document.getElementById('fatSegments').innerHTML='<p class="subtle">Nenhuma medição disponível.</p>';
  document.getElementById('resultsTimeline').innerHTML='<article class="card"><h2>Seu histórico está vazio</h2><p class="subtle">Importe seu backup privado ou adicione uma nova medição.</p></article>';
  document.getElementById('evoMetricValue').textContent='—';
  document.getElementById('evoMetricDelta').textContent='—';
  document.getElementById('evolutionChart').innerHTML='';
  document.getElementById('comparisonIndicators').innerHTML='<p class="subtle">Adicione pelo menos uma medição.</p>';
  document.getElementById('compareA').innerHTML='<option>Sem dados</option>';
  document.getElementById('compareB').innerHTML='<option>Sem dados</option>';
  document.getElementById('compareGrid').innerHTML='<article class="card"><p class="subtle">Adicione medições para comparar.</p></article>';
  document.getElementById('trajectoryTitle').textContent='Sem dados suficientes para análise.';
  document.getElementById('trajectoryText').textContent='Suas tendências aparecerão aqui depois que o histórico for carregado.';
  document.getElementById('insightGrid').innerHTML='';
}
