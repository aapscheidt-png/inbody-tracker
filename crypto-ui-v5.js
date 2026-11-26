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
function refreshPrivateDataBannerV6(message='',state=''){
  const anchor=document.getElementById('privacyState');if(!anchor)return;
  let panel=document.getElementById('privateDataSetupV6');
  const loaded=bodyMeasurements().length>0||labs().length>0||reports().length>0;
  const key=hasRecoveryKeyV5();
  if(!panel){
    panel=document.createElement('div');panel.id='privateDataSetupV6';panel.className='card';
    panel.style.cssText='margin:12px 0;padding:14px;line-height:1.45';
    panel.innerHTML='<strong id="privateSetupTitleV6"></strong><p id="privateSetupTextV6" class="subtle" role="status" aria-live="polite"></p><button id="privateSetupActionV6" class="pill-btn" type="button">Configurar dados privados</button>';
    anchor.insertAdjacentElement('afterend',panel);
    panel.querySelector('button').addEventListener('click',()=>document.getElementById('dataDialog')?.showModal());
  }
  panel.hidden=loaded&&key&&state!=='error';
  panel.style.display=panel.hidden?'none':'';
  const title=panel.querySelector('#privateSetupTitleV6'),detail=panel.querySelector('#privateSetupTextV6'),btn=panel.querySelector('button');
  title.textContent=!key?'Ative seus dados privados':state==='error'?'Sincronização não concluída':state==='working'?'Carregando seus exames…':'Seus dados ainda não foram carregados';
  detail.textContent=!key?'Abra este endereço no Safari ou no atalho habitual. Se necessário, importe sua chave de recuperação nas configurações. A chave nunca é publicada no site.':state==='error'?message+' Verifique a conexão e tente sincronizar novamente.':state==='working'?'A base criptografada está sendo verificada neste dispositivo.':'Abra as configurações e toque em Sincronizar agora.';
  btn.textContent=key?'Abrir sincronização':'Importar chave de recuperação';
}
function cryptoStatusV5(text,state=''){const el=document.getElementById('syncStatus');if(el){el.textContent=text;el.dataset.state=state;}refreshPrivateDataBannerV6(text,state);}
function updateCryptoUiV5(){const ok=hasRecoveryKeyV5();const k=document.getElementById('keyStatus'),b=document.getElementById('syncBtn'),c=document.getElementById('clearKeyBtn');if(k)k.textContent=ok?'Chave instalada neste aparelho':'Chave ainda não instalada';if(b)b.disabled=!ok;if(c)c.disabled=!ok;cryptoStatusV5(ok?'Sincronização criptografada disponível':'Importe a chave de recuperação para ativar atualizações automáticas.',ok?'ok':'');}
const recoveryInput=document.getElementById('recoveryKeyInput');
if(recoveryInput)recoveryInput.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const doc=JSON.parse(await file.text());saveRecoveryKeyV5(doc);updateCryptoUiV5();cryptoStatusV5('Chave instalada. Sincronizando…','working');await syncEncryptedHealthV5();renderApp();const msg=typeof v511SyncSuccessMessage==='function'?v511SyncSuccessMessage():'Sincronização concluída';cryptoStatusV5(msg,'ok');if(typeof v511ShowToast==='function')v511ShowToast(msg,'ok');document.getElementById('dataDialog')?.close();alert('Chave instalada. As próximas atualizações da sua base poderão ser sincronizadas automaticamente neste aparelho.');}catch(err){cryptoStatusV5(err.message,'error');if(typeof v511ShowToast==='function')v511ShowToast(`Falha na sincronização · ${err.message}`,'error');alert(`Não foi possível ativar a sincronização: ${err.message}`);}finally{e.target.value='';}});
const syncBtnV5=document.getElementById('syncBtn');if(syncBtnV5)syncBtnV5.addEventListener('click',async()=>{const original=syncBtnV5.textContent;syncBtnV5.disabled=true;syncBtnV5.textContent='Sincronizando…';try{cryptoStatusV5('Sincronizando…','working');await syncEncryptedHealthV5();renderApp();const msg=typeof v511SyncSuccessMessage==='function'?v511SyncSuccessMessage():'Sincronização concluída';cryptoStatusV5(msg,'ok');if(typeof v511ShowToast==='function')v511ShowToast(msg,'ok');}catch(err){const msg=`Falha na sincronização · ${err.message}`;cryptoStatusV5(msg,'error');if(typeof v511ShowToast==='function')v511ShowToast(msg,'error');}finally{syncBtnV5.textContent=original;syncBtnV5.disabled=!hasRecoveryKeyV5();}});
const clearKeyBtn=document.getElementById('clearKeyBtn');if(clearKeyBtn)clearKeyBtn.addEventListener('click',()=>{if(!confirm('Remover a chave de recuperação deste aparelho? Os dados locais permanecem, mas a sincronização automática será desativada.'))return;clearRecoveryKeyV5();updateCryptoUiV5();});
async function bootstrapEncryptedV5(){updateCryptoUiV5();if(!hasRecoveryKeyV5()){renderHealth();return;}try{cryptoStatusV5('Verificando atualização…','working');await syncEncryptedHealthV5();renderApp();cryptoStatusV5('Sincronização criptografada ativa','ok');}catch(err){cryptoStatusV5((bodyMeasurements().length||labs().length||reports().length?'Usando cópia local · ':'Nenhum dado carregado · ')+err.message,'error');renderHealth();}}
bootstrapEncryptedV5();
