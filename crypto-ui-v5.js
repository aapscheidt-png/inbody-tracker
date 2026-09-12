'use strict';
const baseLabStatusV5=labStatus;
labStatus=function(item){
  const ctx=String(item?.context||'').toLowerCase();
  if((['testosterone_total','testosterone_free','testosterone_bioavailable','fsh','lh'].includes(item?.key))&&(ctx.includes('trt')||ctx.includes('exogenous testosterone')||ctx.includes('replacement'))){
    const base=baseLabStatusV5(item);
    return{code:'context',label:base.code==='high'?'TRT · acima da ref.':base.code==='low'?'TRT · abaixo da ref.':'Contexto TRT'};
  }
  return baseLabStatusV5(item);
};
function cryptoStatusV5(text,state=''){const el=document.getElementById('syncStatus');if(!el)return;el.textContent=text;el.dataset.state=state;}
function updateCryptoUiV5(){const ok=hasRecoveryKeyV5();const k=document.getElementById('keyStatus'),b=document.getElementById('syncBtn'),c=document.getElementById('clearKeyBtn');if(k)k.textContent=ok?'Chave instalada neste aparelho':'Chave ainda não instalada';if(b)b.disabled=!ok;if(c)c.disabled=!ok;cryptoStatusV5(ok?'Sincronização criptografada disponível':'Importe a chave de recuperação para ativar atualizações automáticas.',ok?'ok':'');}
const recoveryInput=document.getElementById('recoveryKeyInput');
if(recoveryInput)recoveryInput.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const doc=JSON.parse(await file.text());saveRecoveryKeyV5(doc);updateCryptoUiV5();cryptoStatusV5('Chave instalada. Sincronizando…','working');await syncEncryptedHealthV5();renderApp();cryptoStatusV5('Sincronização criptografada ativa','ok');document.getElementById('dataDialog')?.close();alert('Chave instalada. As próximas atualizações da sua base poderão ser sincronizadas automaticamente neste aparelho.');}catch(err){cryptoStatusV5(err.message,'error');alert(`Não foi possível ativar a sincronização: ${err.message}`);}finally{e.target.value='';}});
const syncBtnV5=document.getElementById('syncBtn');if(syncBtnV5)syncBtnV5.addEventListener('click',async()=>{try{cryptoStatusV5('Sincronizando…','working');await syncEncryptedHealthV5();renderApp();cryptoStatusV5('Base atualizada agora','ok');}catch(err){cryptoStatusV5(err.message,'error');}});
const clearKeyBtn=document.getElementById('clearKeyBtn');if(clearKeyBtn)clearKeyBtn.addEventListener('click',()=>{if(!confirm('Remover a chave de recuperação deste aparelho? Os dados locais permanecem, mas a sincronização automática será desativada.'))return;clearRecoveryKeyV5();updateCryptoUiV5();});
async function bootstrapEncryptedV5(){updateCryptoUiV5();if(!hasRecoveryKeyV5()){renderHealth();return;}try{cryptoStatusV5('Verificando atualização…','working');await syncEncryptedHealthV5();renderApp();cryptoStatusV5('Sincronização criptografada ativa','ok');}catch(err){cryptoStatusV5(`Usando cópia local · ${err.message}`,'error');renderHealth();}}
bootstrapEncryptedV5();
