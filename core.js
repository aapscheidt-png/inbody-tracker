const STORAGE_KEY='health-tracker-local-v4';
const LEGACY_STORAGE_KEYS=['health-tracker-local-v3','inbody-tracker-local-v2'];
const SCHEMA_VERSION=4;

const BUNDLED_HEALTH_DATA={"schemaVersion":4,"profile":{"displayName":"Anderson","heightCm":183,"referenceWeight":93.8,"referenceLabel":"início/2026"},"measurements":[{"id":"2026-02-03","date":"2026-02-03","time":null,"weight":90.8,"muscle":36.8,"fatPct":28.1},{"id":"2026-03-21","date":"2026-03-21","time":null,"weight":84.6,"muscle":35.3,"fatPct":26},{"id":"2026-04-11","date":"2026-04-11","time":null,"weight":81.7,"muscle":34.5,"fatPct":25,"fatMass":20.4,"ffm":61.3,"water":45,"protein":12.1,"minerals":4.21,"visceral":9,"bmr":1694,"bmi":24.4,"score":69},{"id":"2026-04-25","date":"2026-04-25","time":null,"weight":79.2,"muscle":34.1,"fatPct":23.4},{"id":"2026-07-18","date":"2026-07-18","time":"09:41","weight":77.3,"muscle":34.8,"fatPct":19.6},{"id":"2026-08-01","date":"2026-08-01","time":"11:51","weight":78,"muscle":35.7,"fatPct":18.5},{"id":"2026-08-15","date":"2026-08-15","time":"09:58","weight":76.3,"muscle":35.3,"fatPct":17.8},{"id":"2026-08-29","date":"2026-08-29","time":"11:38","weight":76.5,"muscle":35.4,"fatPct":17.6},{"id":"2026-09-12","date":"2026-09-12","time":"11:39","weight":76.3,"muscle":35,"fatPct":18.5,"bmi":22.8,"fatMass":14.1,"ffm":62.2,"water":45.6,"protein":12.3,"minerals":4.3,"visceral":6,"bmr":1713,"waistHip":0.88,"obesity":104,"score":76,"idealWeight":73.7,"weightControl":-2.6,"fatControl":-3.1,"muscleControl":0.5,"ranges":{"water":[41.4,50.6],"protein":[11.1,13.6],"minerals":[3.83,4.68],"fatMass":[8.8,17.7],"weight":[62.6,84.7],"muscle":[31.7,38.7],"bmi":[18.5,24.9],"fatPct":[10,20],"waistHip":[0.8,0.9],"visceral":[1,9],"obesity":[90,110]},"leanSegments":[{"name":"Braço esquerdo","kg":3.6,"pct":107.5},{"name":"Braço direito","kg":3.41,"pct":101.2},{"name":"Tronco","kg":27.4,"pct":98.2},{"name":"Perna esquerda","kg":9.81,"pct":96.3},{"name":"Perna direita","kg":9.9,"pct":97.2}],"fatSegments":[{"name":"Braço esquerdo","kg":0.7,"pct":101.1},{"name":"Braço direito","kg":0.8,"pct":113.7},{"name":"Tronco","kg":7.5,"pct":159.8},{"name":"Perna esquerda","kg":2.1,"pct":108},{"name":"Perna direita","kg":2.1,"pct":108.7}]}],"labs":[{"id":"lab-2025-09-02-glucose","date":"2025-09-02","key":"glucose","value":121,"unit":"mg/dL"},{"id":"lab-2025-09-02-totalchol","date":"2025-09-02","key":"totalChol","value":157,"unit":"mg/dL"},{"id":"lab-2025-09-02-ldl","date":"2025-09-02","key":"ldl","value":95,"unit":"mg/dL"},{"id":"lab-2025-09-02-hdl","date":"2025-09-02","key":"hdl","value":36,"unit":"mg/dL"},{"id":"lab-2025-09-02-triglycerides","date":"2025-09-02","key":"triglycerides","value":166,"unit":"mg/dL"}],"reports":[{"id":"report-1","date":"2025-09-03","category":"neurologia","title":"ENMG de membro inferior esquerdo","summary":"Achado compatível com meralgia parestésica esquerda de componente sensitivo moderado.","bullets":["Mononeuropatia do nervo cutâneo lateral femoral esquerdo.","Predomínio sensitivo."]},{"id":"report-2","date":"","dateText":"Sem data exata","category":"sono","title":"Polissonografia","summary":"Resultado compatível com apneia obstrutiva do sono leve e bruxismo.","bullets":["IAH 7,2/h.","Dessaturação mínima de 86%.","Bruxismo relatado no histórico."]},{"id":"report-3","date":"","dateText":"Sem data exata","category":"imagem","title":"Ressonância magnética de crânio","summary":"Exame descrito como normal, com provável cisto aracnoide sem outra alteração relevante.","bullets":["Sem achado agudo relevante."]},{"id":"report-4","date":"","dateText":"Sem data exata","category":"ortopedia","title":"Coluna lombar e quadril","summary":"Histórico com protrusão discal L4-L5 e tendinopatia glútea/isquiotibiais à esquerda.","bullets":["Sintomas com melhora importante após fisioterapia sacroilíaca.","Exame de 2026 também citou L2-L3 no histórico."]}]};

const LAB_DEFS={
  glucose:{label:'Glicemia',unit:'mg/dL'},
  totalChol:{label:'Colesterol total',unit:'mg/dL'},
  ldl:{label:'LDL',unit:'mg/dL'},
  hdl:{label:'HDL',unit:'mg/dL'},
  triglycerides:{label:'Triglicérides',unit:'mg/dL'}
};

const REPORT_CATEGORIES={sono:'Sono',neurologia:'Neurologia',imagem:'Imagem',ortopedia:'Ortopedia / Coluna',clinico:'Clínico',outros:'Outros'};

function cloneBundled(){return JSON.parse(JSON.stringify(BUNDLED_HEALTH_DATA))}
function loadState(){const b=cloneBundled();return{schemaVersion:SCHEMA_VERSION,profile:b.profile||{},measurements:normalizeMeasurements(b.measurements||[]),labs:normalizeLabs(b.labs||[]),reports:normalizeReports(b.reports||[])}}

let state=loadState();
let measurements=state.measurements;
let labs=state.labs;
let reports=state.reports;
let profile=state.profile;
let currentMetric='weight';
let currentLabMetric='glucose';

function normalizeMeasurements(items){return(Array.isArray(items)?items:[]).slice().sort(byDate)}
function normalizeLabs(items){return(Array.isArray(items)?items:[]).slice().sort(byLabDate)}
function normalizeReports(items){return(Array.isArray(items)?items:[]).slice().sort(byReportDate)}
function saveData(){state={schemaVersion:SCHEMA_VERSION,profile:profile||{},measurements,labs,reports};try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}}
function importPayload(data){if(Array.isArray(data))return{schemaVersion:SCHEMA_VERSION,profile:{},measurements:data,labs:[],reports:[]};if(data&&typeof data==='object'&&Array.isArray(data.measurements))return{schemaVersion:SCHEMA_VERSION,profile:data.profile||{},measurements:data.measurements,labs:Array.isArray(data.labs)?data.labs:[],reports:Array.isArray(data.reports)?data.reports:[]};throw new Error('Formato inválido')}
function validateMeasurements(items){return Array.isArray(items)&&items.every(m=>m&&/^\d{4}-\d{2}-\d{2}$/.test(m.date||'')&&Number.isFinite(Number(m.weight))&&Number.isFinite(Number(m.muscle))&&Number.isFinite(Number(m.fatPct)))}
function validateLabs(items){return Array.isArray(items)&&items.every(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&LAB_DEFS[x.key]&&Number.isFinite(Number(x.value)))}
function validateReports(items){return Array.isArray(items)&&items.every(r=>{const hasDate=!r.date||/^\d{4}-\d{2}-\d{2}$/.test(r.date);const hasTitle=typeof r.title==='string'&&r.title.trim().length>0;const hasSummary=typeof r.summary==='string'&&r.summary.trim().length>0;const hasCategory=!!REPORT_CATEGORIES[r.category||'outros']||!!r.category;return hasDate&&hasTitle&&hasSummary&&hasCategory})}
function byDate(a,b){return(a.date+(a.time||''))>(b.date+(b.time||''))?1:-1}
function byLabDate(a,b){return a.date>b.date?1:a.date<b.date?-1:0}
function reportSortKey(r){return r.date||''}
function byReportDate(a,b){return reportSortKey(a)>reportSortKey(b)?1:reportSortKey(a)<reportSortKey(b)?-1:0}
function fmt(n,d=1){return n==null?'—':Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}
function fmtFlexible(n){if(n==null)return'—';return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2})}
function brDate(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`}
function shortDate(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return`${d}/${m}`}
function latest(){return measurements[measurements.length-1]}
function first(){return measurements[0]}
function delta(a,b){return Number((a-b).toFixed(1))}
function signed(n,suffix=''){const sign=n>0?'+':n<0?'−':'';return`${sign}${fmt(Math.abs(n))}${suffix}`}
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
function visibleReports(){return[...reports].sort((a,b)=>{if(a.date&&b.date)return a.date>b.date?-1:a.date<b.date?1:0;if(a.date&&!b.date)return-1;if(!a.date&&b.date)return 1;return 0})}
function reportBadge(category){return REPORT_CATEGORIES[category]||category||'Laudo'}
function reportDateLabel(r){return r.date?brDate(r.date):(r.dateText||'Sem data exata')}
function firstNonEmptyLine(text){return String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function navigate(view){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));window.scrollTo({top:0,behavior:'smooth'});if(view==='health')renderHealth()}
