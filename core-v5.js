'use strict';
const HT_VERSION='5.0';
const PRIVATE_STORAGE_KEY='health-tracker-private-v5';
const LEGACY_KEYS=['health-tracker-local-v4','health-tracker-local-v3','inbody-tracker-local-v2','inbody-tracker-anderson-v1'];

const EMPTY_DATA={
  schemaVersion:1,datasetId:'local-empty',classification:'sensitive_personal_health_data',publishToPublicRepository:false,
  profile:{displayName:'',heightCm:null,baselineWeightKg:null,baselineLabel:'início de 2026',baselineType:'user_reported_reference',baselineIsBioimpedance:false},
  bodyComposition:{confirmedMeasurements:[],unverifiedCandidateDates:[]},laboratoryResults:[],reports:[],treatments:[],
  sleep:{watchDataStatus:'not_yet_source_backed'},dataFreshness:{},sourceRegistry:{},excludedAsNonClinicalSource:[]
};

const CATEGORY_ORDER=['metabolic','lipids','hormones','thyroid','kidney','liver','vitamins','cbc','screening','other'];
const CATEGORY_LABELS={metabolic:'Metabólico',lipids:'Lipídios',hormones:'Hormônios',thyroid:'Tireoide',kidney:'Rins',liver:'Fígado',vitamins:'Vitaminas e minerais',cbc:'Hemograma',screening:'Rastreamento',other:'Outros'};
const LAB_CATEGORY={
  glucose:'metabolic',hba1c:'metabolic',estimated_avg_glucose:'metabolic',insulin:'metabolic',homa_ir:'metabolic',uric_acid:'metabolic',calcium:'metabolic',homocysteine:'metabolic',
  total_cholesterol:'lipids',hdl:'lipids',ldl:'lipids',non_hdl:'lipids',triglycerides:'lipids',
  testosterone_total:'hormones',testosterone_free:'hormones',testosterone_bioavailable:'hormones',shbg:'hormones',fsh:'hormones',lh:'hormones',estradiol:'hormones',dht:'hormones',prolactin:'hormones',cortisol_serum:'hormones',
  tsh:'thyroid',free_t4:'thyroid',t3:'thyroid',
  creatinine:'kidney',egfr:'kidney',urea:'kidney',
  alt:'liver',ast:'liver',ggt:'liver',bilirubin_total:'liver',bilirubin_direct:'liver',bilirubin_indirect:'liver',alkaline_phosphatase:'liver',albumin:'liver',
  vitamin_d_25oh:'vitamins',vitamin_b12:'vitamins',vitamin_c:'vitamins',iron:'vitamins',ferritin:'vitamins',zinc:'vitamins',
  rbc:'cbc',hemoglobin:'cbc',hematocrit:'cbc',mcv:'cbc',mch:'cbc',mchc:'cbc',rdw:'cbc',wbc:'cbc',neutrophils_abs:'cbc',eosinophils_abs:'cbc',basophils_abs:'cbc',lymphocytes_abs:'cbc',monocytes_abs:'cbc',platelets:'cbc',mpv:'cbc',
  psa_total:'screening',ca19_9:'screening',lipase:'other'
};

function clone(v){return JSON.parse(JSON.stringify(v));}
function toNumber(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function esc(s){return String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c]));}
function brDate(iso){if(!iso)return'—';const [y,m,d]=iso.split('-');return `${d}/${m}/${y}`;}
function shortDate(iso){if(!iso)return'—';const [y,m,d]=iso.split('-');return `${d}/${m}`;}
function fmt(v,d=1){const n=Number(v);if(!Number.isFinite(n))return String(v??'—');return n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmtFlex(v){const n=Number(v);if(!Number.isFinite(n))return String(v??'—');return n.toLocaleString('pt-BR',{maximumFractionDigits:2});}
function signed(v,suffix=''){const n=Number(v);if(!Number.isFinite(n))return'—';return `${n>0?'+':n<0?'−':''}${fmtFlex(Math.abs(n))}${suffix}`;}
function daysBetween(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000);}
function todayIso(){return new Date().toISOString().slice(0,10);}

function normalizeBody(m){
  const x=clone(m||{});
  if(x.weight!=null&&x.weightKg==null)x.weightKg=x.weight;
  if(x.muscle!=null&&x.skeletalMuscleKg==null)x.skeletalMuscleKg=x.muscle;
  if(x.fatPct!=null&&x.bodyFatPct==null)x.bodyFatPct=x.fatPct;
  if(x.fatMass!=null&&x.fatMassKg==null)x.fatMassKg=x.fatMass;
  if(x.ffm!=null&&x.fatFreeMassKg==null)x.fatFreeMassKg=x.ffm;
  if(x.water!=null&&x.bodyWaterL==null)x.bodyWaterL=x.water;
  if(x.protein!=null&&x.proteinKg==null)x.proteinKg=x.protein;
  if(x.minerals!=null&&x.mineralsKg==null)x.mineralsKg=x.minerals;
  if(x.visceral!=null&&x.visceralFatLevel==null)x.visceralFatLevel=x.visceral;
  if(x.bmr!=null&&x.bmrKcal==null)x.bmrKcal=x.bmr;
  if(x.waistHip!=null&&x.waistHipRatio==null)x.waistHipRatio=x.waistHip;
  if(x.obesity!=null&&x.obesityDegreePct==null)x.obesityDegreePct=x.obesity;
  if(x.idealWeight!=null&&x.idealWeightKg==null)x.idealWeightKg=x.idealWeight;
  if(x.weightControl!=null&&x.weightControlKg==null)x.weightControlKg=x.weightControl;
  if(x.fatControl!=null&&x.fatControlKg==null)x.fatControlKg=x.fatControl;
  if(x.muscleControl!=null&&x.muscleControlKg==null)x.muscleControlKg=x.muscleControl;
  if(x.ranges && !x.referenceRanges){
    x.referenceRanges={weightKg:x.ranges.weight,skeletalMuscleKg:x.ranges.muscle,bodyFatPct:x.ranges.fatPct,bmi:x.ranges.bmi,fatMassKg:x.ranges.fatMass,bodyWaterL:x.ranges.water,proteinKg:x.ranges.protein,mineralsKg:x.ranges.minerals,waistHipRatio:x.ranges.waistHip,visceralFatLevel:x.ranges.visceral,obesityDegreePct:x.ranges.obesity};
  }
  x.id=x.id||`${x.date||'unknown'}-${x.time||'00:00'}`;
  return x;
}

function normalizeCanonical(raw){
  if(!raw||typeof raw!=='object')throw new Error('Arquivo inválido.');
  if(raw.bodyComposition&&Array.isArray(raw.bodyComposition.confirmedMeasurements)){
    const out=clone(raw);out.bodyComposition.confirmedMeasurements=out.bodyComposition.confirmedMeasurements.map(normalizeBody).sort((a,b)=>(a.date+(a.time||''))>(b.date+(b.time||''))?1:-1);out.laboratoryResults=Array.isArray(out.laboratoryResults)?out.laboratoryResults:[];out.reports=Array.isArray(out.reports)?out.reports:[];out.treatments=Array.isArray(out.treatments)?out.treatments:[];return out;
  }
  if(Array.isArray(raw.measurements)){
    return {
      schemaVersion:1,datasetId:'migrated-v4',classification:'sensitive_personal_health_data',publishToPublicRepository:false,
      profile:{displayName:raw.profile?.displayName||'',heightCm:raw.profile?.heightCm||null,baselineWeightKg:raw.profile?.referenceWeight||null,baselineLabel:raw.profile?.referenceLabel||'referência',baselineType:'legacy_reference',baselineIsBioimpedance:false},
      bodyComposition:{confirmedMeasurements:raw.measurements.map(normalizeBody),unverifiedCandidateDates:[]},
      laboratoryResults:(raw.labs||[]).map(x=>({date:x.date,key:x.key,label:legacyLabLabel(x.key),value:x.value,unit:x.unit||'',source:'migrated_v4',confidence:'legacy_structured_no_original_report'})),
      reports:raw.reports||[],treatments:[],sleep:{watchDataStatus:'not_yet_source_backed'},dataFreshness:{},sourceRegistry:{},excludedAsNonClinicalSource:[]
    };
  }
  throw new Error('Formato de dados não reconhecido.');
}
function legacyLabLabel(k){return({glucose:'Glicemia',totalChol:'Colesterol total',ldl:'LDL',hdl:'HDL',triglycerides:'Triglicérides'})[k]||k;}

function loadPrivateData(){
  try{const s=localStorage.getItem(PRIVATE_STORAGE_KEY);if(s)return normalizeCanonical(JSON.parse(s));}catch(e){console.warn(e);}
  for(const key of LEGACY_KEYS){try{const s=localStorage.getItem(key);if(!s)continue;const migrated=normalizeCanonical(JSON.parse(s));savePrivateData(migrated);return migrated;}catch(e){}}
  return clone(EMPTY_DATA);
}
function savePrivateData(data){localStorage.setItem(PRIVATE_STORAGE_KEY,JSON.stringify(normalizeCanonical(data)));}
function clearPrivateData(){localStorage.removeItem(PRIVATE_STORAGE_KEY);}

let data=loadPrivateData();
let currentBodyMetric='weightKg';
let currentLabKey='glucose';
let currentHealthCategory='metabolic';

function bodyMeasurements(){return (data.bodyComposition?.confirmedMeasurements||[]).map(normalizeBody).sort((a,b)=>(a.date+(a.time||''))>(b.date+(b.time||''))?1:-1);}
function latestBody(){const a=bodyMeasurements();return a.at(-1)||null;}
function firstBody(){const a=bodyMeasurements();return a[0]||null;}
function metricValue(m,key){if(!m)return null;if(key==='bmi'&&m.bmi==null&&m.weightKg&&data.profile?.heightCm){const h=data.profile.heightCm/100;return m.weightKg/(h*h);}return m[key];}
function bodyMetricLabel(k){return({weightKg:'Peso',skeletalMuscleKg:'Massa muscular',bodyFatPct:'Gordura corporal',bmi:'IMC'})[k]||k;}
function bodyMetricUnit(k){return({weightKg:'kg',skeletalMuscleKg:'kg',bodyFatPct:'%',bmi:''})[k]??'';}
function bodyMetricRange(k){const l=latestBody();return l?.referenceRanges?.[k]||null;}
function bodyMetricTarget(k){const l=latestBody();if(k==='weightKg'&&Number.isFinite(Number(l?.idealWeightKg)))return Number(l.idealWeightKg);return null;}
function bodyStatus(value,range){const n=Number(value);if(!Number.isFinite(n)||!Array.isArray(range))return'Registrado';if(n<range[0])return'Abaixo';if(n>range[1])return'Acima';return'Na faixa';}

function labs(){return (data.laboratoryResults||[]).slice().sort((a,b)=>a.date>b.date?1:a.date<b.date?-1:0);}
function labSeries(key){return labs().filter(x=>x.key===key);}
function latestLab(key){return labSeries(key).at(-1)||null;}
function labKeys(){return [...new Set(labs().map(x=>x.key))];}
function labCategory(key){return LAB_CATEGORY[key]||'other';}
function labLabel(key){return latestLab(key)?.label||key;}
function latestLabDate(){return labs().map(x=>x.date).filter(Boolean).sort().at(-1)||null;}
function markerReferenceText(item){
  const r=item?.reference;if(!r)return'Referência não recuperada';
  if(r.type==='lab_reference'){
    if(r.min!=null&&r.max!=null)return `${fmtFlex(r.min)} – ${fmtFlex(r.max)} ${item.unit||''}`.trim();
    if(r.operator&&r.target!=null)return `${r.operator} ${fmtFlex(r.target)} ${item.unit||''}`.trim();
  }
  if(r.type==='risk_dependent_target')return 'Meta depende do risco cardiovascular';
  if(r.type==='fasting_dependent_target')return `Jejum ${r.targets?.fasting||'—'} · sem jejum ${r.targets?.non_fasting||'—'}`;
  if(r.type==='interpretive_range')return `Adequado: ${r.adequate_general?.[0]}–${r.adequate_general?.[1]} ${item.unit||''}`;
  if(r.type==='time_dependent_reference')return `Referência por horário`;
  if(r.type==='interpretive_note')return 'Interpretação contextual';
  return 'Referência contextual';
}
function labStatus(item){
  const n=Number(item?.value),r=item?.reference;
  if(item?.status==='above_lab_reference')return{code:'high',label:'Acima da referência'};
  if(item?.status==='below_desired')return{code:'low',label:'Abaixo do desejável'};
  if(!Number.isFinite(n)||!r)return{code:'context',label:'Contexto'};
  if(r.type==='lab_reference'){
    if(r.min!=null&&n<r.min)return{code:'low',label:'Abaixo'};
    if(r.max!=null&&n>r.max)return{code:'high',label:'Acima'};
    if(r.operator==='<'&&n>=r.target)return{code:'high',label:'Acima'};
    if(r.operator==='<='&&n>r.target)return{code:'high',label:'Acima'};
    if(r.operator==='>'&&n<=r.target)return{code:'low',label:'Abaixo'};
    if(r.operator==='>='&&n<r.target)return{code:'low',label:'Abaixo'};
    return{code:'ok',label:'Na faixa'};
  }
  if(r.type==='interpretive_range'&&Array.isArray(r.adequate_general))return n<r.adequate_general[0]?{code:'low',label:'Abaixo'}:n>r.adequate_general[1]?{code:'high',label:'Acima'}:{code:'ok',label:'Adequado'};
  if(r.type==='fasting_dependent_target'){const lim=parseFloat(String(r.targets?.fasting||'').replace(/[^0-9.]/g,''));return Number.isFinite(lim)&&n<lim?{code:'ok',label:'Desejável'}:{code:'context',label:'Ver jejum'};}
  if(r.type==='time_dependent_reference'){const a=r.morning_06_10;if(Array.isArray(a))return n<a[0]?{code:'low',label:'Abaixo'}:n>a[1]?{code:'high',label:'Acima'}:{code:'ok',label:'Na faixa'};}
  if(r.type==='risk_dependent_target')return{code:'context',label:'Meta por risco'};
  return{code:'context',label:'Contexto'};
}
function referenceNumericBand(item){const r=item?.reference;if(!r)return null;if(r.type==='lab_reference'&&r.min!=null&&r.max!=null)return[r.min,r.max];if(r.type==='interpretive_range'&&r.adequate_general)return r.adequate_general;if(r.type==='time_dependent_reference'&&r.morning_06_10)return r.morning_06_10;return null;}
function referenceNumericTarget(item){const r=item?.reference;if(!r)return null;if(r.type==='lab_reference'&&r.operator&&r.target!=null)return{value:Number(r.target),operator:r.operator};if(r.type==='fasting_dependent_target'){const v=parseFloat(String(r.targets?.fasting||'').replace(/[^0-9.]/g,''));return Number.isFinite(v)?{value:v,operator:'<'}:null;}return null;}
function freshness(date){if(!date)return{code:'unknown',label:'Sem data'};const d=daysBetween(date,todayIso());if(d<=90)return{code:'current',label:'Atual'};if(d<=180)return{code:'watch',label:'Acompanhar'};return{code:'old',label:'Dado antigo'};}
function latestLabsByKey(){return labKeys().map(k=>latestLab(k)).filter(Boolean);}

function reports(){return (data.reports||[]).slice().sort((a,b)=>(b.date||'0000').localeCompare(a.date||'0000'));}
function treatments(){return (data.treatments||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
function timelineEvents(){
  const out=[];
  bodyMeasurements().forEach(x=>out.push({date:x.date,type:'bio',title:'Bioimpedância',summary:`${fmt(x.weightKg)} kg · ${fmt(x.skeletalMuscleKg)} kg músculo · ${fmt(x.bodyFatPct)}% gordura`,ref:x.id}));
  const panels=new Map();labs().forEach(x=>{if(!panels.has(x.date))panels.set(x.date,0);panels.set(x.date,panels.get(x.date)+1);});panels.forEach((n,date)=>out.push({date,type:'lab',title:'Exames laboratoriais',summary:`${n} resultados estruturados`}));
  reports().forEach(x=>{if(x.date)out.push({date:x.date,type:'report',title:x.title,summary:x.summary});});
  treatments().forEach(x=>out.push({date:x.date,type:'treatment',title:x.title,summary:x.note||'Prescrição registrada'}));
  return out.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}

function exportPrivateData(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`health-tracker-private-${todayIso()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
