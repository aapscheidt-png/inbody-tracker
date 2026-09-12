const STORAGE_KEY='health-tracker-local-v3';
const LEGACY_STORAGE_KEY='inbody-tracker-local-v2';
const SCHEMA_VERSION=3;
const LAB_DEFS={
  glucose:{label:'Glicemia',unit:'mg/dL'},
  totalChol:{label:'Colesterol total',unit:'mg/dL'},
  ldl:{label:'LDL',unit:'mg/dL'},
  hdl:{label:'HDL',unit:'mg/dL'},
  triglycerides:{label:'Triglicérides',unit:'mg/dL'}
};
let state=loadState();
let measurements=state.measurements;
let labs=state.labs;
let profile=state.profile;
let currentMetric='weight';
let currentLabMetric='glucose';

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      if(parsed && typeof parsed==='object' && Array.isArray(parsed.measurements)){
        return {schemaVersion:SCHEMA_VERSION,profile:parsed.profile||{},measurements:parsed.measurements.sort(byDate),labs:Array.isArray(parsed.labs)?parsed.labs.sort(byLabDate):[]};
      }
    }
  }catch(e){console.warn('Falha ao ler dados locais',e)}
  return {schemaVersion:SCHEMA_VERSION,profile:{},measurements:[],labs:[]};
}
function saveData(){
  state={schemaVersion:SCHEMA_VERSION,profile:profile||{},measurements,labs};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function importPayload(data){
  if(Array.isArray(data)) return {schemaVersion:SCHEMA_VERSION,profile:{},measurements:data,labs:[]};
  if(data && typeof data==='object' && Array.isArray(data.measurements)) return {schemaVersion:SCHEMA_VERSION,profile:data.profile||{},measurements:data.measurements,labs:Array.isArray(data.labs)?data.labs:[]};
  throw new Error('Formato inválido');
}
function validateMeasurements(items){return Array.isArray(items)&&items.every(m=>m&&/^\d{4}-\d{2}-\d{2}$/.test(m.date||'')&&Number.isFinite(Number(m.weight))&&Number.isFinite(Number(m.muscle))&&Number.isFinite(Number(m.fatPct)))}
function validateLabs(items){return Array.isArray(items)&&items.every(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&LAB_DEFS[x.key]&&Number.isFinite(Number(x.value)))}
function byDate(a,b){return (a.date+(a.time||''))>(b.date+(b.time||''))?1:-1}
function byLabDate(a,b){return a.date>b.date?1:a.date<b.date?-1:0}
function fmt(n,d=1){return n==null?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}
function fmtFlexible(n){if(n==null)return'—';return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2})}
function brDate(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return `${d}/${m}/${y}`}
function shortDate(iso){const[y,m,d]=iso.split('-');return `${d}/${m}`}
function latest(){return measurements[measurements.length-1]}
function first(){return measurements[0]}
function delta(a,b){return Number((a-b).toFixed(1))}
function signed(n,suffix=''){const sign=n>0?'+':n<0?'−':'';return `${sign}${fmt(Math.abs(n))}${suffix}`}
function computeBMI(weight){const h=Number(profile.heightCm);if(!weight||!Number.isFinite(h)||h<=0)return null;const m=h/100;return weight/(m*m)}
function metricValue(m,key){if(key==='bmi')return m.bmi??computeBMI(m.weight);return m[key]}
function metricUnit(key){return({weight:'kg',muscle:'kg',fatPct:'%',bmi:''})[key]}
function metricLabel(key){return({weight:'Peso',muscle:'Massa muscular',fatPct:'Gordura corporal',bmi:'IMC'})[key]}
function metricColor(key){return({weight:'#ff4057',muscle:'#4aa7ff',fatPct:'#ffb13b',bmi:'#aa8cff'})[key]}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function rangeStatus(value,range){if(value==null)return'—';if(!Array.isArray(range)||range.length<2)return'Registrado';if(value<range[0])return'Abaixo';if(value>range[1])return'Acima';return'Normal'}
function hasData(){return measurements.length>0}
function latestLab(key){const arr=labs.filter(x=>x.key===key).sort(byLabDate);return arr.at(-1)||null}
function labSeries(key){return labs.filter(x=>x.key===key).sort(byLabDate)}

function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  window.scrollTo({top:0,behavior:'smooth'});
  if(view==='health')renderHealth();
}
