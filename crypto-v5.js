'use strict';
const HT_RECOVERY_KEY_STORAGE='health-tracker-recovery-key-v5';
const HT_ENCRYPTED_DATA_URL='./health-data-v5.enc.json';
function htB64uToBytes(s){const pad='='.repeat((4-s.length%4)%4);const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+pad);const out=new Uint8Array(b.length);for(let i=0;i<b.length;i++)out[i]=b.charCodeAt(i);return out;}
function loadRecoveryKeyV5(){try{const s=localStorage.getItem(HT_RECOVERY_KEY_STORAGE);return s?JSON.parse(s):null;}catch(e){return null;}}
function hasRecoveryKeyV5(){const k=loadRecoveryKeyV5();return !!(k?.privateKeyJwk&&k?.keyId);}
function saveRecoveryKeyV5(doc){if(!doc?.privateKeyJwk||doc.privateKeyJwk.kty!=='RSA'||!doc.keyId)throw new Error('Chave de recuperação inválida.');localStorage.setItem(HT_RECOVERY_KEY_STORAGE,JSON.stringify(doc));}
function clearRecoveryKeyV5(){localStorage.removeItem(HT_RECOVERY_KEY_STORAGE);}
async function decryptHealthPayloadV5(payload,recovery){
  if(!payload?.wrappedKey||!payload?.iv||!payload?.ciphertext)throw new Error('Pacote criptografado inválido.');
  if(payload.keyId!==recovery?.keyId)throw new Error('A chave de recuperação não corresponde a esta base.');
  if(!globalThis.crypto?.subtle)throw new Error('Criptografia do navegador indisponível.');
  const privateKey=await crypto.subtle.importKey('jwk',recovery.privateKeyJwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
  const aesRaw=await crypto.subtle.decrypt({name:'RSA-OAEP'},privateKey,htB64uToBytes(payload.wrappedKey));
  const aesKey=await crypto.subtle.importKey('raw',aesRaw,{name:'AES-GCM'},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:htB64uToBytes(payload.iv)},aesKey,htB64uToBytes(payload.ciphertext));
  return normalizeCanonical(JSON.parse(new TextDecoder().decode(plain)));
}
async function syncEncryptedHealthV5(){
  const recovery=loadRecoveryKeyV5();if(!recovery)throw new Error('Importe sua chave de recuperação uma única vez.');
  const res=await fetch(`${HT_ENCRYPTED_DATA_URL}?t=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw new Error('Não foi possível baixar a base criptografada.');
  const payload=await res.json();const decrypted=await decryptHealthPayloadV5(payload,recovery);data=decrypted;savePrivateData(data);return data;
}
