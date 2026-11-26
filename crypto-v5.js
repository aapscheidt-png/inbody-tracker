'use strict';
const HT_RECOVERY_KEY_STORAGE='health-tracker-recovery-key-v5';
const HT_ENCRYPTED_DATA_URL='./health-data-v5.enc.json';
function htB64uToBytes(s){const pad='='.repeat((4-s.length%4)%4);const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+pad);const out=new Uint8Array(b.length);for(let i=0;i<b.length;i++)out[i]=b.charCodeAt(i);return out;}
function loadRecoveryKeyV5(){try{const s=localStorage.getItem(HT_RECOVERY_KEY_STORAGE);return s?JSON.parse(s):null;}catch(e){return null;}}
function hasRecoveryKeyV5(){const k=loadRecoveryKeyV5();return !!(k?.privateKeyJwk&&k?.keyId);}
function saveRecoveryKeyV5(doc){if(!doc?.privateKeyJwk||doc.privateKeyJwk.kty!=='RSA'||!doc.keyId)throw new Error('Chave de recuperação inválida.');localStorage.setItem(HT_RECOVERY_KEY_STORAGE,JSON.stringify(doc));}
function clearRecoveryKeyV5(){localStorage.removeItem(HT_RECOVERY_KEY_STORAGE);}
async function gunzipBytesV5(bytes){if(typeof DecompressionStream==='undefined')throw new Error('Este navegador não suporta a descompactação segura da base.');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}
async function decryptHealthPayloadV5(payload,recovery){
  if(!payload?.wrappedKey||!payload?.iv||!payload?.ciphertext)throw new Error('Pacote criptografado inválido.');
  if(payload.keyId!==recovery?.keyId)throw new Error('A chave de recuperação não corresponde a esta base.');
  if(!globalThis.crypto?.subtle)throw new Error('Criptografia do navegador indisponível.');
  const privateKey=await crypto.subtle.importKey('jwk',recovery.privateKeyJwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
  const aesRaw=await crypto.subtle.decrypt({name:'RSA-OAEP'},privateKey,htB64uToBytes(payload.wrappedKey));
  const aesKey=await crypto.subtle.importKey('raw',aesRaw,{name:'AES-GCM'},false,['decrypt']);
  let plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:htB64uToBytes(payload.iv)},aesKey,htB64uToBytes(payload.ciphertext)));
  if(payload.compression==='gzip')plain=await gunzipBytesV5(plain);
  return normalizeCanonical(JSON.parse(new TextDecoder().decode(plain)));
}
function mergeHistoricalDeltaV5(base,delta){
  const out=clone(base);
  const body=out.bodyComposition.confirmedMeasurements;
  for(const x of delta.bodyComposition.confirmedMeasurements){
    const existing=body.find(y=>y.date===x.date&&Number(y.weightKg)===Number(x.weightKg)&&Number(y.skeletalMuscleKg)===Number(x.skeletalMuscleKg)&&Number(y.bodyFatPct)===Number(x.bodyFatPct));
    if(existing){for(const [k,v] of Object.entries(x))if(existing[k]==null)existing[k]=v;}
    else body.push(x);
  }
  for(const x of delta.laboratoryResults){
    const old=out.laboratoryResults.find(y=>y.date===x.date&&y.key===x.key);
    if(!old)out.laboratoryResults.push(x);
    else if(['verified_zip_snapshot','user_confirmed_rename'].includes(x.storagePathConfidence)&&String(old.value).replace(',','.')===String(x.value).replace(',','.')&&old.unit===x.unit)Object.assign(old,x,{context:old.context||x.context});
  }
  for(const x of delta.reports){
    const old=out.reports.find(y=>y.id===x.id||(y.date===x.date&&y.title===x.title));
    if(!old)out.reports.push(x);
    else if(['verified_zip_snapshot','user_confirmed_rename'].includes(x.storagePathConfidence)){
      Object.assign(old,{storagePath:x.storagePath,storagePathConfidence:x.storagePathConfidence,fileName:x.fileName||old.fileName});
      if(x.reviewedOriginal===true&&x.confidence==='original_document')Object.assign(old,{title:x.title,summary:x.summary,confidence:x.confidence,facility:x.facility,source:x.source,reviewedOriginal:true});
      if(x.originalExcerpt){old.originalExcerpt=x.originalExcerpt;old.originalExcerptNote=x.originalExcerptNote;}
    }
  }
  out.archiveIndex=Array.isArray(out.archiveIndex)?out.archiveIndex:[];
  for(const x of delta.archiveIndex||[]){const i=out.archiveIndex.findIndex(y=>y.id===x.id);if(i<0)out.archiveIndex.push(x);else out.archiveIndex[i]={...out.archiveIndex[i],...x};}
  out.sourceRegistry={...out.sourceRegistry,...delta.sourceRegistry};
  const corrections=delta.archiveCorrections||{};
  const aliases=corrections.pathAliases||{};
  const clean=p=>String(p||'').replace(/\s*\/\s*/g,'/');
  const deleted=new Set(corrections.removedPaths||[]);
  const fixPath=x=>{
    const p=clean(x.storagePath);if(!p)return;
    let q=aliases[p]||p;
    if(corrections.folderFrom&&q.startsWith(corrections.folderFrom))q=corrections.folderTo+q.slice(corrections.folderFrom.length);
    if(q!==p){x.storagePath=q;x.storagePathConfidence='user_confirmed_rename';for(const k of ['fileName','name','title'])if(x[k]===p.split('/').at(-1))x[k]=q.split('/').at(-1);}
  };
  out.archiveIndex=out.archiveIndex.filter(x=>!deleted.has(clean(x.storagePath)));
  for(const x of [...out.laboratoryResults,...out.reports,...out.archiveIndex,...Object.values(out.sourceRegistry)])fixPath(x);
  out.checkups=Array.isArray(out.checkups)?out.checkups:[];
  for(const x of delta.checkups||[]){const i=out.checkups.findIndex(y=>y.date===x.date);if(i<0)out.checkups.push(x);else if(out.checkups[i].status!=='complete')out.checkups[i]={...out.checkups[i],...x};}

  out.dataFreshness={...out.dataFreshness};
  for(const [k,v] of Object.entries(delta.dataFreshness||{}))if(!out.dataFreshness[k]||out.dataFreshness[k]<v)out.dataFreshness[k]=v;
  if(delta.auditStatus)out.auditStatus=delta.auditStatus;
  return normalizeCanonical(out);
}
async function syncEncryptedHealthV5(){
  const recovery=loadRecoveryKeyV5();if(!recovery)throw new Error('Importe sua chave de recuperação uma única vez.');
  const res=await fetch(`${HT_ENCRYPTED_DATA_URL}?t=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw new Error('Não foi possível baixar a base criptografada.');
  const payload=await res.json();const decrypted=await decryptHealthPayloadV5(payload,recovery);
  const deltaRes=await fetch(`./health-delta-2026-11-25.enc.json?t=${Date.now()}`,{cache:'no-store'});if(!deltaRes.ok)throw new Error('Não foi possível baixar a atualização criptografada.');
  const delta=await decryptHealthPayloadV5(await deltaRes.json(),recovery);
  const merged=mergeHistoricalDeltaV5(decrypted,delta);savePrivateData(merged);data=merged;return data;
}
