const STORAGE_KEY='health-tracker-local-v4';
const LEGACY_STORAGE_KEYS=['health-tracker-local-v3','inbody-tracker-local-v2'];
const SCHEMA_VERSION=4;

const LAB_DEFS={
  glucose:{label:'Glicemia',unit:'mg/dL'},
  totalChol:{label:'Colesterol total',unit:'mg/dL'},
  ldl:{label:'LDL',unit:'mg/dL'},
  hdl:{label:'HDL',unit:'mg/dL'},
  triglycerides:{label:'Triglicérides',unit:'mg/dL'}
};

const REPORT_CATEGORIES={
  sono:'Sono',
  neurologia:'Neurologia',
  imagem:'Imagem',
  ortopedia:'Ortopedia / Coluna',
  clinico:'Clínico',
  outros:'Outros'
};

function cloneBundled(){
  const src=(typeof BUNDLED_HEALTH_DATA!=='undefined'&&BUNDLED_HEALTH_DATA)?BUNDLED_HEALTH_DATA:{profile:{},measurements:[],labs:[],reports:[]};
  return JSON.parse(JSON.stringify(src));
}

function loadState(){
  const bundled=cloneBundled();
  return {
    schemaVersion:SCHEMA_VERSION,
    profile:bundled.profile||{},
    measurements:normalizeMeasurements(bundled.measurements||[]),
    labs:normalizeLabs(bundled.labs||[]),
    reports:normalizeReports(bundled.reports||[])
  };
}

let state=loadState();
let measurements=state.measurements;
let labs=state.labs;
let reports=state.reports;
let profile=state.profile;
let currentMetric='weight';
let currentLabMetric='glucose';

function normalizeMeasurements(items){return (Array.isArray(items)?items:[]).slice().sort(byDate)}
function normalizeLabs(items){return (Array.isArray(items)?items:[]).slice().sort(byLabDate)}
function normalizeReports(items){return (Array.isArray(items)?items:[]).slice().sort(byReportDate)}

function saveData(){
  state={schemaVersion:SCHEMA_VERSION,profile:profile||{},measurements,labs,reports};
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}
}

function importPayload(data){
  if(Array.isArray(data)) return {schemaVersion:SCHEMA_VERSION,profile:{},measurements:data,labs:[],reports:[]};
  if(data&&typeof data==='object'&&Array.isArray(data.measurements)){
    return {schemaVersion:SCHEMA_VERSION,profile:data.profile||{},measurements:data.measurements,labs:Array.isArray(data.labs)?data.labs:[],reports:Array.isArray(data.reports)?data.reports:[]};
  }
  throw new Error('Formato inválido');
}

function validateMeasurements(items){return Array.isArray(items)&&items.every(m=>m&&/^\d{4}-\d{2}-\d{2}$/.test(m.date||'')&&Number.isFinite(Number(m.weight))&&Number.isFinite(Number(m.muscle))&&Number.isFinite(Number(m.fatPct)))}
function validateLabs(items){return Array.isArray(items)&&items.every(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&LAB_DEFS[x.key]&&Number.isFinite(Number(x.value)))}
function validateReports(items){return Array.isArray(items)&&items.every(r=>{const hasDate=!r.date||/^\d{4}-\d{2}-\d{2}$/.test(r.date);const hasTitle=typeof r.title==='string'&&r.title.trim().length>0;const hasSummary=typeof r.summary==='string'&&r.summary.trim().length>0;const hasCategory=!!REPORT_CATEGORIES[r.category||'outros']||!!r.category;return hasDate&&hasTitle&&hasSummary&&hasCategory})}

function byDate(a,b){return (a.date+(a.time||''))>(b.date+(b.time||''))?1:-1}
function byLabDate(a,b){return a.date>b.date?1:a.date<b.date?-1:0}
function reportSortKey(r){return r.date||''}
function byReportDate(a,b){return reportSortKey(a)>reportSortKey(b)?1:reportSortKey(a)<reportSortKey(b)?-1:0}

function fmt(n,d=1){return n==null?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}
function fmtFlexible(n){if(n==null)return'—';return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2})}
function brDate(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return `${d}/${m}/${y}`}
function shortDate(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return `${d}/${m}`}
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
function visibleReports(){return [...reports].sort((a,b)=>{if(a.date&&b.date)return a.date>b.date?-1:a.date<b.date?1:0;if(a.date&&!b.date)return-1;if(!a.date&&b.date)return 1;return 0})}
function reportBadge(category){return REPORT_CATEGORIES[category]||category||'Laudo'}
function reportDateLabel(r){return r.date?brDate(r.date):(r.dateText||'Sem data exata')}
function firstNonEmptyLine(text){return String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}

function navigate(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
  window.scrollTo({top:0,behavior:'smooth'});
  if(view==='health')renderHealth();
}
