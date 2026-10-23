(function(){"use strict";
const E=window.WealthEngine,A=window.WealthAnalytics,P=window.WealthPerformance,I=window.WealthImporter,X=window.WealthXlsx,L=window.WealthLedger,G=window.WealthIntegrity;
let state=E.read(),activePage="home",simulation=null,simulationKey="",activePreset="base",activePeriod="all",historyView="assets",incomeYear="2026",toastTimer=null,pendingXlsx=null;
const el=(id)=>document.getElementById(id);
const text=(id,val)=>{const e=el(id);if(e)e.textContent=val;};
const esc=(x)=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isoDate=(d)=>new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"});
const observedDate=(d,precision)=>precision==="month"?"Competência "+new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{month:"short",year:"numeric"}):isoDate(d);
const money=E.money,compact=E.compact;
function notify(message){const box=el("toast");box.textContent=message;box.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove("show"),3400);}
function persist(){try{E.save(state);return true;}catch(error){notify("Não foi possível salvar neste navegador. Exporte um backup.");return false;}}
function go(page){if(!["home","portfolio","scenario","insights","history"].includes(page))page="home";activePage=page;document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));document.querySelectorAll(".tabbar [data-go]").forEach(x=>{const on=x.dataset.go===page;x.classList.toggle("active",on);if(on)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});history.replaceState(null,"","#"+page);window.scrollTo({top:0,behavior:"instant"});if(page==="scenario")renderScenario();if(page==="history")renderHistory();if(page==="insights")renderInsights();}
function viewSnapshot(){return E.portfolio(state);}
function colorGain(v){return v<0?"negative":"positive";}
function svgChart(values,opts){opts=opts||{};if(!values.length)return '<div class="empty"><strong>Sem dados históricos</strong><p>Adicione registros para visualizar a evolução.</p></div>';const w=680,h=opts.height||170,padL=opts.labels?48:10,padR=opts.labels?12:10,padT=12,padB=opts.labels?30:10;const max=Math.max(...values,1),min=opts.zero?0:Math.min(...values)*.93,delta=Math.max(1,max-min);const points=values.map((v,i)=>({x:padL+(values.length===1?.5:i/(values.length-1))*(w-padL-padR),y:padT+(max-v)/delta*(h-padT-padB)}));const xy=points.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");const base=(h-padB);const first=points[0],last=points[points.length-1];const area="M"+first.x+" "+base+" L"+xy.replace(/ /g," L")+" L"+last.x+" "+base+" Z";let lines="";if(opts.labels){for(let i=0;i<4;i++){const v=min+(max-min)*i/3,y=padT+(max-v)/delta*(h-padT-padB);lines+='<line class="chart-grid" x1="'+padL+'" x2="'+(w-padR)+'" y1="'+y+'" y2="'+y+'"/><text class="chart-label" x="2" y="'+(y+4)+'">'+esc(compact(v).replace("R$ ",""))+"</text>";}}const gradient="wealth-gradient-"+(opts.id||"base");const svg='<svg viewBox="0 0 '+w+" "+h+'" preserveAspectRatio="none" role="img" aria-label="Gráfico patrimonial"><defs><linearGradient id="'+gradient+'" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#66e7bb" stop-opacity=".23"/><stop offset="1" stop-color="#66e7bb" stop-opacity=".01"/></linearGradient></defs>'+lines+'<path d="'+area+'" fill="url(#'+gradient+')"/><polyline class="chart-line" points="'+xy+'"/><circle class="chart-dot" cx="'+last.x+'" cy="'+last.y+'" r="4.5"/></svg>';return svg;}

function renderHeroPeriod(){
  const h=A.periodHistory(state.history,activePeriod);
  el("heroSpark").innerHTML=svgChart(h.map(x=>x.total),{height:170,id:"hero"});
  document.querySelectorAll("[data-period]").forEach(b=>{const on=b.dataset.period===activePeriod;b.classList.toggle("active",on);b.setAttribute("aria-pressed",on?"true":"false");});
}
function renderGrowthBridge(){
  const rows=A.periodHistory(state.history,activePeriod),g=A.growthBridge(rows);const growthCard=document.querySelector(".growth-panel");if(growthCard)growthCard.hidden=!g.ready&&!!state.dataEngine;
  text("growthPeriod",g.ready?isoDate(g.from)+" – "+isoDate(g.to):"SEM HISTÓRICO");
  text("growthTotal",g.ready?(g.change>=0?"+":"")+money(g.change):"—");
  text("growthFlows",g.ready?(g.netFlows>=0?"+":"")+money(g.netFlows):"—");
  text("growthResult",g.ready?(g.result>=0?"+":"")+money(g.result):"—");
  const bar=el("growthBar");
  if(!g.ready){bar.innerHTML='<div class="growth-blank">Fluxos externos ainda não conciliados ou histórico insuficiente.</div>';return;}
  const total=Math.abs(g.netFlows)+Math.abs(g.result),depositPct=total>0?100*Math.abs(g.netFlows)/total:50;
  bar.innerHTML='<div class="growth-segment deposit" title="Aportes líquidos: '+esc(money(g.netFlows))+'"></div><div class="growth-segment profit" title="Resultado estimado: '+esc(money(g.result))+'"></div>';
  bar.firstElementChild.style.width=depositPct.toFixed(2)+"%";
  bar.lastElementChild.style.width=(100-depositPct).toFixed(2)+"%";
  text("growthFootnote",(g.netFlows<0||g.result<0?"Segmentos proporcionais ao valor absoluto, para representar entradas e perdas. ":"")+"Estimativa: patrimônio final menos inicial e aportes líquidos no período. Não representa rentabilidade líquida de taxas ou tributos.");
}
function renderMilestones(rows){
  const milestones=A.milestones(rows);const box=el("milestoneList");
  if(!milestones.length){box.innerHTML='<p class="muted">Marcos aparecerão quando o histórico alcançar os primeiros valores de referência.</p>';return;}
  box.innerHTML=milestones.slice(0,6).map((x,i)=>'<div class="milestone-item"><div class="milestone-track"><span class="milestone-bullet '+(i===0?"current":"")+'"></span></div><div class="milestone-body"><strong>'+esc(compact(x.value))+'</strong><span>Primeiro registro nesse patamar ou acima</span></div><time>'+isoDate(x.date)+'</time></div>').join("");
}


function renderDataQuality(){
 const meta=state.dataEngine?.sourceMetadata,bar=el("dataQualityStrip");bar.hidden=!meta;
 if(!meta)return;
 text("dataQualityHeadline",meta.partial?"Patrimônio provisório · datas diferentes":"Patrimônio conciliado por competência");
 text("dataQualitySubtitle",(meta.filename||"Arquivo não identificado")+" · "+(meta.importedAt?"importado "+new Date(meta.importedAt).toLocaleString("pt-BR"):"importação anterior, sem data de conferência")+" · Previdência até "+(meta.latestPensionDate||"sem data"));
 text("dataFileFingerprint",meta.sha256?"Arquivo SHA-256: "+meta.sha256.slice(0,16)+"… · referência do Excel": "Esta base não tem identificação verificável do arquivo importado.");
}
function renderReportedFlows(){
 const data=state.dataEngine,panel=el("reportedFlowsPanel");panel.hidden=!data;if(!data)return;
 const years=L.yearList(data),selector=el("incomeYear");
 const desired=years.includes(incomeYear)?incomeYear:(years[0]||"2026");
 incomeYear=desired;
 selector.innerHTML=years.map(y=>'<option value="'+esc(y)+'">'+esc(y)+'</option>').join("");
 selector.value=desired;
 const contributions=data.reportedContributions||[],report=L.incomeByYear(data,desired);
 const grandTotal=contributions.reduce((s,x)=>s+Number(x.amount),0);
 text("reportedTotalFlows",money(grandTotal,2));
 text("reportedCountFlows",contributions.length+" lançamentos declarados, 2023–2026 · sem conciliação bancária");
 text("reportedTotalIncome",money(report.total,2));
 text("reportedCountIncome",report.sourceCount+" lançamento(s) "+desired+" · consolidado sem sobreposição conhecida");
 el("incomeAnnualSummary").innerHTML='<div><span>DIVIDENDOS DE AÇÕES</span><strong>'+money(report.stocks,2)+'</strong></div><div><span>RENDIMENTOS DE FIIs</span><strong>'+money(report.fiis,2)+'</strong></div>';
 const box=el("incomeMonthly");box.innerHTML="";
 const max=Math.max(1,...report.months.map(x=>x.total));
 if(!report.months.length){box.innerHTML='<p class="muted">Não há proventos registrados para este ano.</p>';}
 else{
  for(const row of report.months){
   const item=document.createElement("div");item.className="income-month-row";
   const month=document.createElement("strong");month.className="income-month-name";month.textContent=new Date(row.month+"-01T12:00:00").toLocaleDateString("pt-BR",{month:"short"}).replace(".","");
   const track=document.createElement("div");track.className="income-month-track";
   const stock=document.createElement("span");stock.className="income-month-stock";stock.style.width=(100*row.stock/max).toFixed(2)+"%";
   const fii=document.createElement("span");fii.className="income-month-fii";fii.style.width=(100*row.fiis/max).toFixed(2)+"%";
   track.append(stock,fii);
   const value=document.createElement("span");value.className="income-month-value";value.textContent=money(row.total,2);
   item.append(month,track,value);box.append(item);
  }
 }
 const filteredContributions=contributions.filter(x=>x.date.startsWith(desired+"-"));
 const filteredIncome=(data.reportedDistributions||[]).filter(x=>x.date.startsWith(desired+"-"));
 const latest=[...filteredContributions.map(x=>({...x,label:"Aporte declarado"})),...filteredIncome.map(x=>({...x,label:x.kind==="fii_income_total"?"Rendimento FII":"Dividendo informado"}))]
 .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
 el("reportedFlowsList").innerHTML=latest.length?latest.map(x=>'<div class="reported-row"><span>'+isoDate(x.date)+' · '+esc(x.label)+'</span><strong>'+money(x.amount,2)+'</strong><small>'+esc(x.source)+'</small></div>').join(""):'<p class="muted">Sem lançamentos neste ano.</p>';
}
function renderAssetHistory(){
 const data=state.dataEngine,series=data?.assetHistory||[],panel=el("assetHistoryPanel");panel.hidden=!series.length;if(!series.length)return;
 const sorted=series.filter(a=>a.observations.length).slice().sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 const selector=el("assetHistorySelect"),prior=selector.value;
 selector.innerHTML=sorted.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+' ('+a.observations.length+' registros)</option>').join("");
 if(sorted.some(a=>a.id===prior))selector.value=prior;
 text("assetHistorySummary",sorted.length+" séries");
 updateAssetHistory();
}
function updateAssetHistory(){
 const id=el("assetHistorySelect").value,series=state.dataEngine?.assetHistory?.find(a=>a.id===id);
 if(!series)return;
 const obs=series.observations;
 el("assetHistoryChart").innerHTML=svgChart(obs.map(x=>x.value),{height:210,id:"byAsset",labels:true});
 el("assetHistoryDetails").innerHTML=obs.slice(-8).reverse().map(x=>'<div class="asset-observation"><span>'+observedDate(x.date,x.datePrecision)+'</span><strong>'+((series.currency==="USD")?"US$ "+x.value.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):money(x.value,2))+'</strong><small>'+esc(x.source.sheet+"!"+x.source.cell)+'</small></div>').join("");
}
function renderAudit(){
 const data=state.dataEngine,panel=el("dataAuditPanel");panel.hidden=!data;if(!data)return;
 const meta=data.sourceMetadata,flags=data.quality||[];
 text("auditFlagCount",flags.length+" alertas");
 el("auditOverview").innerHTML='<div><span>Último dado identificado</span><strong>'+esc(meta.latestDate||"—")+'</strong></div><div><span>Último mês consolidado</span><strong>'+esc(meta.latestFullMonth||"—")+'</strong></div><div><span>Previdência</span><strong>'+esc(meta.latestPensionDate||"—")+'</strong></div>';
 el("auditIssues").innerHTML=flags.length?flags.slice(0,35).map(f=>'<div class="audit-item"><strong>'+esc(f.code)+'</strong><span>'+esc(f.date||f.asset||"")+'</span><small>'+esc(f.message||((f.reported||f.corrected)?"Informado: "+money(f.reported)+" · Reconciliado: "+money(f.corrected):f.cell||"Divergência entre fontes"))+'</small></div>').join(""):'<p class="muted">Nenhuma divergência detectada pelas regras implementadas; isso não substitui conciliação bancária.</p>';
}
async function importExcel(file){
 if(!file)return;pendingXlsx=null;el("confirmXlsx").disabled=true;
  el("importStatus").hidden=false;text("importStatus","Conferindo o arquivo "+String(file.name||"Excel")+" com o saldo de cada classe...");
  notify("Analisando planilha localmente...");
 try{
  const parsed=await X.parseFile(file);parsed.sourceMetadata.filename=String(file.name||"Excel importado").slice(0,95);
  parsed.sourceMetadata.importedAt=new Date().toISOString();
  parsed.sourceMetadata.fileSize=file.size;
  if(globalThis.crypto?.subtle){const hash=await globalThis.crypto.subtle.digest("SHA-256",await file.arrayBuffer());parsed.sourceMetadata.sha256=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");}
  if(parsed.sourceMetadata.sourceVerified!==true)throw Error("Subtotais do Excel divergem das posições importadas. Esta carga foi interrompida para evitar valores incorretos.");
  if(!parsed.positions.length||!parsed.history.length)throw Error("A importação não identificou posições e históricos válidos.");
  const next=E.emptyData();next.positions=parsed.positions;next.history=parsed.history;
  const fx=parsed.sourceRates.filter(x=>x.rate>0).at(-1)?.rate;
  if(fx>0)next.fx=fx;
  if(state.mode==="personal"){next.assumptions={...state.assumptions};next.benchmarkAnnualPct=state.benchmarkAnnualPct;}
  next.dataEngine={quality:parsed.quality,sourceMetadata:parsed.sourceMetadata,assetHistory:parsed.assetHistory,sourceRates:parsed.sourceRates,reportedContributions:parsed.reportedContributions,reportedDistributions:parsed.reportedDistributions};
  const candidate=E.normalize(next);pendingXlsx=candidate;
  const worth=E.portfolio(candidate).total;
  el("xlsxPreview").innerHTML='<p class="xlsx-check-ok">Conferência aprovada: Brasil, exterior, previdência e cripto coincidem com os quatro subtotais do Excel. O Dashboard pode continuar divergente porque usa competências diferentes.</p><div class="xlsx-summary"><div><small>POSIÇÕES COM SALDO</small><strong>'+candidate.positions.length+'</strong></div><div><small>OBSERVAÇÕES POR ATIVO</small><strong>'+parsed.metrics.observations+'</strong></div><div><small>MESES CONSOLIDADOS</small><strong>'+candidate.history.length+'</strong></div><div><small>SALDOS PROVISÓRIOS</small><strong>'+money(worth,2)+'</strong></div></div><p class="xlsx-warning"><strong>Competências diferentes.</strong> Última posição doméstica '+esc(parsed.sourceMetadata.latestDate)+', último fechamento '+esc(parsed.sourceMetadata.latestFullMonth)+', previdência '+esc(parsed.sourceMetadata.latestPensionDate)+'. Saldos, não preços unitários ou custos de compra.</p><p class="muted paragraph">'+parsed.quality.filter(q=>q.severity==="warning").length+' alertas de divergência. Importar substitui os dados do navegador, mas não altera o Excel original.</p>';
  text("importStatus","Conferência concluída: quatro subtotais coincidem com a planilha. Confirme a importação.");
  el("settingsDialog").close();el("xlsxDialog").showModal();el("confirmXlsx").disabled=false;
  }catch(error){pendingXlsx=null;el("importStatus").hidden=false;text("importStatus","Importação interrompida: "+error.message+" Nenhum valor anterior foi substituído.");notify("Falha na leitura: "+error.message);}
}
function confirmExcelImport(){
 if(!pendingXlsx)return;
 if(!confirm("Substituir a carteira local atual pelo histórico do Excel? Exporte backup antes. Os dados não serão publicados."))return;
 const candidate=pendingXlsx;if(!persistCandidate(candidate))return;
 pendingXlsx=null;el("xlsxDialog").close();simulationKey="";render();go("home");notify("Histórico Excel importado com origem e ressalvas de conciliação.");
}
function persistCandidate(candidate){try{E.save(candidate);state=candidate;return true;}catch(e){notify("Armazenamento local insuficiente ou indisponível. Tente exportar seu histórico.");return false;}}

function renderReconciliation(p){
 const meta=state.dataEngine?.sourceMetadata,panel=el("reconciliationPanel"),has=!!meta;
 panel.hidden=!has;
 if(!has){text("heroEyebrow","PATRIMÔNIO CONSOLIDADO");text("heroGainCaption","resultado não realizado sobre custo atual");text("heroCostLabel","CAPITAL ALOCADO*");return;}
 const reported=meta.dashboardTotal,calculated=p.total,difference=reported===null?null:reported-calculated;
 text("heroEyebrow","SOMA DOS SALDOS DISPONÍVEIS · PROVISÓRIO");
 text("heroGainCaption","Diferença entre origens e competências dos saldos");
 text("heroCostLabel","CUSTO DE AQUISIÇÃO");
 text("heroTotal",money(calculated,2));
 text("reconcileReported",reported===null?"Importe o Excel atualizado":money(reported,2));
 text("reconcileCalculated",money(calculated,2));
 text("reconcileDifference",difference===null?"Não disponível":money(Math.abs(difference),2));
 text("reconcileReportedSource",meta.dashboardCell||"Dashboard do Excel");
 const buckets=meta.sourceBuckets||[];
 const sourceStillCurrent=meta.sourceVerified===true&&meta.calculatedTotal!==null&&Math.abs(p.total-meta.calculatedTotal)<.02 &&
 buckets.length===4 && buckets.every(b=>b.matched&&Math.abs(p.items.filter(x=>({
 domestic:["Carteira de ações","Carteira doméstica"],international:["Investimentos internacionais"],pension:["Previdência"],crypto:["Cripto"]
 }[b.key]||[]).includes(x.account)).reduce((t,x)=>t+x.value,0)-b.importedValue)<.03);
 text("reconcileStatus",sourceStillCurrent?"SUBTOTAIS VERIFICADOS · DATAS MISTAS":meta.sourceVerified?"POSIÇÕES ALTERADAS APÓS IMPORTAR":"BASE NÃO VALIDADA");
 el("reconcileSources").innerHTML=buckets.length?buckets.map(b=>{
 const now=p.items.filter(x=>({domestic:["Carteira de ações","Carteira doméstica"],international:["Investimentos internacionais"],pension:["Previdência"],crypto:["Cripto"]}[b.key]||[]).includes(x.account)).reduce((t,x)=>t+x.value,0);
 const ok=b.matched&&Math.abs(now-b.importedValue)<.03;
 return '<div class="reconcile-bucket"><span>'+esc(b.label)+'</span><strong>'+ (b.excelValue===null?"N/D":money(b.excelValue,2))+'</strong><small>'+esc(b.excelCell)+' · '+esc(b.asOf)+(ok?" · Confere":" · Alterado ou divergente")+'</small></div>';
 }).join(""):'<p class="muted">Subtotais não verificados nesta carga. Reimporte seu Excel original.</p>';
 const last=state.history.at(-1);
 text("reconcileMonthTotal",last?money(last.total,2):"—");
 text("reconcileMonthDate",last?observedDate(last.date,"month"):"Sem fechamento");
 text("reconcilePensionDate",meta.latestPensionDate?observedDate(meta.latestPensionDate,"month"):"—");
 const matchesCrypto=difference!==null&&meta.cryptoPrevious!==null&&meta.cryptoOctober!==null&&Math.abs(difference-(meta.cryptoPrevious-meta.cryptoOctober))<.02;
 text("reconcileExplanation",meta.sourceVerified&&!sourceStillCurrent?"A carteira foi alterada desde a importação. Os subtotais anteriormente verificados deixaram de representar todas as posições atuais. Faça uma nova conferência com o Excel.":!meta.sourceVerified?"Esta importação não possui conferência dos quatro subtotais do Excel. Reimporte o arquivo original para validar as posições e suas competências.":reported===null?
  "Os dados históricos carregados não incluem a referência original do Dashboard. Importe novamente o Excel para reconciliar ambos os totais.":
  matchesCrypto?"A diferença de "+money(Math.abs(difference),2)+" corresponde a saldos de cripto de setembro ainda usados pelo Dashboard. A soma das posições considera os valores de outubro. Previdência permanece com fechamento de setembro.":
  Math.abs(difference)<.02?"O valor do Dashboard confere com a soma das posições. Confira as datas de competência antes de interpretar como fechamento de outubro.":
  "Os dois valores não fecham. O número original da planilha foi preservado; a diferença deve ser investigada antes de tratar o patrimônio como consolidado.");
 const gain=el("heroGain");
 gain.textContent=difference!==null?(Math.abs(difference)<.02?"Dashboard e posições conferem":"Diferença para o Dashboard: "+money(Math.abs(difference),2)):"Fonte sem conferência";
 gain.classList.remove("negative");gain.classList.toggle("reconcile-warning",difference===null||Math.abs(difference)>=.02);
}
function renderPortfolioBreakdown(p){
 const pension=p.classes.find(c=>c.id==="pension")?.value||0,other=p.total-pension;
 el("portfolioBreakdown").innerHTML='<div class="portfolio-segment"><span>PREVIDÊNCIA</span><strong>'+money(pension,2)+'</strong><small>'+E.percent(p.total?pension/p.total*100:0)+' do total · posição de competência própria</small></div><div class="portfolio-segment"><span>DEMAIS INVESTIMENTOS</span><strong>'+money(other,2)+'</strong><small>'+E.percent(p.total?other/p.total*100:0)+' do total · liquidez varia por ativo</small></div>';
}
function renderGroupedPortfolio(p){
 const query=el("portfolioSearch").value.trim().toLocaleLowerCase("pt-BR"),sort=el("portfolioSort").value;
 const groups=p.classes.map(cls=>{
 let holdings=p.items.filter(x=>x.type===cls.id);
 if(query)holdings=holdings.filter(x=>(x.name+" "+x.ticker).toLocaleLowerCase("pt-BR").includes(query));
 if(sort==="name")holdings.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 else holdings.sort((a,b)=>b.value-a.value);
 return{cls,holdings};
 }).filter(g=>g.holdings.length);
 const totalMatches=groups.reduce((n,g)=>n+g.holdings.length,0);
 text("positionsCounter",query?totalMatches:p.items.length);
 text("portfolioHelp",query?totalMatches+" posição(ões) encontrada(s). Grupos relevantes abertos para conferência.":"Toque numa classe para consultar as posições, os valores completos e as datas.");
 if(!groups.length){el("positionsList").innerHTML='<p class="empty">Nenhum investimento corresponde à busca.</p>';return;}
 el("positionsList").innerHTML=groups.map((g,i)=>{
  const cls=g.cls,items=g.holdings,groupValue=items.reduce((sum,x)=>sum+x.value,0),clsLabel=E.TYPES[cls.id].label;
  const positions=items.map(x=>{
   const share=p.total?x.value/p.total*100:0;
   const valuation=x.valuationOnly||x.costKnown===false;
   return '<article class="asset-line"><div class="asset-line-name"><strong>'+esc(x.name)+'</strong><span>'+esc(x.account||clsLabel)+'</span></div><div class="asset-line-amount"><strong>'+money(x.value,2)+'</strong><span>'+E.percent(share)+' do patrimônio</span></div><div class="asset-line-meta"><span>'+esc(observedDate(x.asOf,x.datePrecision))+'</span>'+(valuation?'<span>Saldo informado no extrato</span>':'<span>Preço unitário cadastrado</span>')+'</div><div class="asset-line-actions"><button data-edit="'+esc(x.id)+'">Editar</button><button data-remove="'+esc(x.id)+'">Excluir</button></div></article>';
  }).join("");
  return '<details class="asset-group"'+((query||i===0)?' open':'')+'><summary><span class="group-icon" data-color-key="'+esc(cls.id)+'">'+esc(E.TYPES[cls.id].icon)+'</span><span class="group-title"><strong>'+esc(clsLabel)+'</strong><small>'+items.length+' ativo(s) · '+E.percent(p.total?cls.value/p.total*100:0)+' do patrimônio</small></span><span class="group-amount">'+money(cls.value,2)+'</span><span class="group-chevron" aria-hidden="true">⌄</span></summary><div class="asset-group-body">'+positions+'</div></details>';
 }).join("");
}

function renderHome(p){text("modeBadge",state.mode==="demo"?"DEMO":"LOCAL");el("demoNotice").hidden=state.mode!=="demo";el("demoNotice").classList.toggle("is-demo",state.mode==="demo");text("heroTotal",money(p.total,2));text("heroCost",p.costComplete?compact(p.basis):"—");text("heroCount",p.items.length);text("heroClasses",p.classes.length);const gain=el("heroGain");gain.textContent=p.costComplete?(p.profit>=0?"+":"")+money(p.profit)+" ("+E.signedPercent(p.profitPct)+")":"Custo de aquisição indisponível";gain.classList.toggle("negative",p.costComplete&&p.profit<0);let dates=p.items.map(x=>x.asOf).sort();text("heroAsOf",state.dataEngine?.sourceMetadata?.partial?"PARCIAL · "+isoDate(state.dataEngine.sourceMetadata.latestDate):dates.length?"PREÇOS ATÉ "+isoDate(dates[dates.length-1]):"SEM POSIÇÕES");renderDataQuality();renderReconciliation(p);renderHeroPeriod();const score=A.portfolioRisk(p).score;text("divScore",score+"/100");text("divHint",score>=80?"Concentração controlada na heurística":score>=60?"Alguns pontos merecem atenção":"Reveja composição e atualização");text("topExposure",E.percent(p.topAssetShare));text("topExposureName",p.items.length?p.items[0].name:"Cadastre ativos");renderDonut(p);renderGrowthBridge();const insight=E.insights(state,p).find(x=>x.severity!=="good")||E.insights(state,p)[0];text("homeInsightTitle",insight.title);text("homeInsightText",insight.text);}
function renderDonut(p){const box=el("allocationDonut"),legend=el("allocationLegend");if(!p.total){box.innerHTML='<div class="donut-center"><strong>0</strong><span>CLASSES</span></div>';legend.innerHTML='<p class="muted">Cadastre ativos para visualizar a distribuição.</p>';return;}const r=70,c=2*Math.PI*r;let offset=0;const rings=p.classes.map(k=>{const len=k.value/p.total*c,arc='<circle cx="90" cy="90" r="'+r+'" stroke="'+k.color+'" stroke-width="16" fill="none" stroke-dasharray="'+len+" "+(c-len)+'" stroke-dashoffset="'+(-offset)+'" />';offset+=len;return arc;}).join("");box.innerHTML='<svg viewBox="0 0 180 180" role="img" aria-label="Distribuição por classe"><circle cx="90" cy="90" r="70" fill="none" stroke="#233440" stroke-width="16"/>'+rings+'</svg><div class="donut-center"><strong>'+p.classes.length+'</strong><span>CLASSES</span></div>';legend.innerHTML=p.classes.map(k=>'<div class="legend-row"><i class="dot" data-color-key="'+esc(k.id)+'"></i><span>'+esc(k.label)+'</span><strong>'+money(k.value,2)+'<small>'+E.percent(k.value/p.total*100)+'</small></strong></div>').join("");}
function renderPortfolio(p){
 text("portfolioTotal",money(p.total,2));
 text("portfolioSubtitle",p.items.length+" posições · "+p.classes.length+" classes · "+(state.dataEngine?"extrato Excel com competências diferentes":"atualização manual"));
 renderPortfolioBreakdown(p);
 if(!p.items.length){text("positionsCounter",0);el("positionsList").innerHTML='<div class="empty"><strong>Sua carteira começa aqui.</strong><p>Adicione seus ativos ou importe uma planilha.</p><button class="primary small" data-action="add-position">+ Primeiro ativo</button></div>';return;}
 renderGroupedPortfolio(p);
}
function renderInsights(){const p=viewSnapshot(),s=A.portfolioRisk(p).score;text("scoreNumber",s);el("scoreNumber").parentElement.style.setProperty("--score",String(s));text("scoreLabel",A.portfolioRisk(p).label);el("insightsList").innerHTML=E.insights(state,p).map(x=>'<article class="insight-item '+(x.severity==="warn"?"warn":x.severity==="critical"?"critical":"")+'"><div class="insight-label"><span>'+esc(x.tag)+'</span><span>'+ (x.severity==="good"?"✓":x.severity==="critical"?"!":"•")+'</span></div><h3>'+esc(x.title)+'</h3><p>'+esc(x.text)+'</p></article>').join("");}
function renderPerformance(){
  const rate=state.benchmarkAnnualPct,irr=P.annualizedMoneyWeightedReturn(state.history),ref=P.referenceScenario(state.history,rate);
  text("performanceXirr",irr.available?E.signedPercent(irr.annualPct):"—");
  text("performancePeriod",irr.available?"TIR aproximada, anualizada":"Histórico insuficiente");
  text("performanceExcess",ref.available?(ref.excess>0?"+":"")+money(ref.excess):"—");
  el("performanceExcess").classList.toggle("negative",ref.available&&ref.excess<0);
  el("performanceExcess").classList.toggle("positive",ref.available&&ref.excess>=0);
  text("performanceReference","Referência hipotética: "+E.percent(rate)+" a.a.");
  text("performanceActual",ref.available?money(ref.actualResult):"—");
  text("performanceBenchmark",ref.available?money(ref.referenceResult):"—");
  text("performanceCaveat",irr.available?"TIR aproximada considera os fluxos líquidos nas datas dos registros. A comparação aplica "+E.percent(rate)+" a.a. constantes às mesmas entradas e retiradas. Não representa CDI histórico ou rentabilidade líquida de custos e tributos.":"Sem conciliação dos aportes e retiradas externos, não é possível calcular TIR ou benchmark confiáveis.");
}
function renderHistorySections(){
 let view=historyView;
 if(!state.dataEngine&&["assets","ledger","audit"].includes(view))view="returns";
 if(state.dataEngine&&!(state.dataEngine.assetHistory||[]).length&&view==="assets")view="audit";
 const groups={assets:["assetHistoryPanel"],ledger:["reportedFlowsPanel"],audit:["dataAuditPanel"],months:["historyRecordsPanel"],returns:["performancePanel","milestonesPanel"]};
 for(const id of ["assetHistoryPanel","reportedFlowsPanel","dataAuditPanel","historyRecordsPanel","performancePanel","milestonesPanel"]){
  const visible=(groups[view]||[]).includes(id);el(id).hidden=!visible;el(id).classList.toggle("history-panel-hidden",!visible);
 }
 document.querySelectorAll("[data-history-view]").forEach(btn=>{const active=btn.dataset.historyView===view;btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",active?"true":"false");});
 const hints={assets:"Escolha um investimento e consulte os saldos observados ao longo do tempo.",ledger:"Aportes e proventos informados no Excel; ainda sujeitos à conciliação.",audit:"Verifique diferenças de competência, fórmulas e origem dos saldos.",months:"Confira os fechamentos mês a mês, com valores e datas de origem.",returns:"Estimativas de desempenho aparecem somente com custos e fluxos conciliados."};
 text("historyViewHint",hints[view]||hints.assets);
}
function renderHistory(){const stats=E.historyAnalysis(state.history),h=stats.sorted;text("historyDelta",stats.delta===null?"—":E.signedPercent(stats.delta));text("historyTwr",stats.twr===null?"—":E.signedPercent(stats.twr));text("historyCount",h.length);el("historyChart").innerHTML=svgChart(h.map(x=>x.total),{height:210,labels:true,id:"history"});el("historyList").innerHTML=h.length?h.slice().reverse().map(x=>'<article class="history-item"><div><strong>'+isoDate(x.date)+'</strong><span> '+(x.flowKnown===false?"Aportes pendentes de conciliação":"Fluxo do intervalo: "+money(x.flow))+'</span></div><div class="history-values"><strong>'+money(x.total)+'</strong><button class="ghost-link" data-delete-snapshot="'+x.date+'">Excluir</button></div></article>').join(""):'<div class="empty"><strong>Sem histórico ainda</strong><p>Registre patrimônio e aportes para construir sua linha do tempo.</p></div>';renderMilestones(h);renderPerformance();renderReportedFlows();renderAssetHistory();renderAudit();renderHistorySections();}
function plotProjection(series){const w=680,h=230,l=14,r=15,t=14,b=31,max=Math.max(...series.map(x=>x.p90),1)*1.05;const x=(yr)=>l+yr/(series.length-1)*(w-l-r),y=(v)=>t+(1-v/max)*(h-t-b);const path=(key)=>series.map((s,i)=>(i?"L":"M")+x(s.year).toFixed(1)+" "+y(s[key]).toFixed(1)).join(" ");const poly=series.map(s=>x(s.year)+","+y(s.p90)).concat([...series].reverse().map(s=>x(s.year)+","+y(s.p10))).join(" ");const rows=[.25,.5,.75,1].map(k=>'<line class="chart-grid" x1="'+l+'" y1="'+y(max*k)+'" x2="'+(w-r)+'" y2="'+y(max*k)+'"/>').join("");const labels=[0,Math.round((series.length-1)/2),series.length-1].map(yr=>'<text class="chart-label" x="'+x(yr)+'" y="'+(h-6)+'" text-anchor="middle">'+yr+' anos</text>').join("");return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" role="img" aria-label="Projeção simulada com faixa de percentis">'+rows+'<polygon points="'+poly+'" fill="#6996c2" fill-opacity=".14"/><path d="'+path("p10")+'" fill="none" stroke="#567b90" stroke-width="1.7" stroke-dasharray="5 5"/><path d="'+path("p90")+'" fill="none" stroke="#b69aff" stroke-width="1.7" stroke-dasharray="5 5"/><path d="'+path("p50")+'" fill="none" stroke="#66e7bb" stroke-width="3.7" stroke-linecap="round"/>'+labels+"</svg>";}
function readScenarioForm(){return{target:parseFloat(el("simTarget").value),monthly:parseFloat(el("simMonthly").value),years:parseFloat(el("simYears").value),rate:parseFloat(el("simRate").value),vol:parseFloat(el("simVol").value),inflation:parseFloat(el("simInflation").value)};}
function fillScenarioForm(){const a=state.assumptions;for(const [id,k] of [["simTarget","target"],["simMonthly","monthly"],["simYears","years"],["simRate","rate"],["simVol","vol"],["simInflation","inflation"]])el(id).value=a[k];}
function renderScenario(){const p=viewSnapshot(),a=state.assumptions;fillScenarioForm();const key=JSON.stringify([p.total,a]);if(simulationKey!==key){simulation=E.forecast(p.total,a);simulationKey=key;}text("scenarioTarget",money(a.target));const progress=p.total/a.target;el("targetProgress").style.width=Math.min(100,progress*100).toFixed(1)+"%";text("scenarioStatus",E.percent(progress*100)+" da meta com o patrimônio registrado"+(state.dataEngine?.sourceMetadata?.partial?" · consolidado provisório com competências diferentes":""));el("projectionChart").innerHTML=plotProjection(simulation.series);text("forecastMedian",compact(simulation.median));text("forecastLow",compact(simulation.series.at(-1).p10));text("forecastHigh",compact(simulation.series.at(-1).p90));text("forecastChance",E.percent(simulation.probability));const calibration=A.historicalCalibration(state.history);const calibrateButton=el("calibrateHistory");calibrateButton.disabled=!calibration.available;calibrateButton.title=calibration.available?"Aplicar taxa e volatilidade históricas estimadas":calibration.reason;text("calibrationHelp",calibration.available?"Histórico disponível: "+calibration.intervals+" intervalos. Taxa estimada: "+E.percent(calibration.rate)+" a.a.; volatilidade: "+E.percent(calibration.vol)+" a.a. Calibração ilustrativa, sem previsibilidade garantida.":calibration.reason);text("forecastReal","Mediana em poder de compra de hoje (inflação assumida: "+E.percent(a.inflation)+"): "+money(simulation.realMedian)+". Meta e probabilidades estão em valores nominais; não há previsão garantida.");}
function render(){el("localStorageWarning").hidden=!state.loadError;const p=viewSnapshot();renderHome(p);renderPortfolio(p);renderInsights();if(activePage==="history")renderHistory();if(activePage==="scenario")renderScenario();}
function startPortfolio(){if(state.loadError&&!confirm("Dados anteriores neste iPhone não puderam ser lidos. Criar carteira substituirá esse armazenamento. Guarde uma cópia dos dados locais antes de prosseguir. Continuar?"))return;if(state.mode!=="demo"&&(state.positions.length||state.history.length)){if(!confirm("Substituir toda a carteira e o histórico deste dispositivo por uma carteira vazia? Exporte backup antes."))return;}state=E.emptyData();simulationKey="";persist();el("settingsDialog").close();render();go("portfolio");notify("Carteira vazia criada. Adicione o primeiro ativo.");}
function positionModal(id){const p=id?state.positions.find(x=>x.id===id):null;el("positionDialogTitle").textContent=p?"Editar posição":"Adicionar posição";el("positionForm").reset();el("posId").value=p?p.id:"";el("posName").value=p?p.name:"";el("posTicker").value=p?p.ticker:"";el("posClass").value=p?p.type:"fixed_income";el("posCurrency").value=p?p.currency:"BRL";el("posQty").value=p?p.units:1;el("posCost").value=p&&p.costKnown!==false?p.cost:"";el("posUnknownCost").checked=!!(p&&p.costKnown===false);el("posCost").disabled=el("posUnknownCost").checked;el("posPrice").value=p?p.price:"";el("posDate").value=p?p.asOf:E.asDate();el("positionDialog").showModal();}
function addSnapshotModal(){el("snapshotForm").reset();el("snapDate").value=E.asDate();el("snapTotal").value=viewSnapshot().total.toFixed(2);el("snapFlow").value=0;el("snapshotDialog").showModal();}
function validateFinite(v,lo,hi,label){if(!Number.isFinite(v)||v<lo||v>hi)throw Error(label+" fora dos limites permitidos.");return v;}
function handlePositionSubmit(ev){ev.preventDefault();try{const id=el("posId").value;const name=el("posName").value.trim(),ticker=el("posTicker").value.trim();if(!name)throw Error("Informe o nome do ativo.");const costKnown=!el("posUnknownCost").checked,units=validateFinite(Number(el("posQty").value),.000001,1e10,"Quantidade"),cost=costKnown?validateFinite(Number(el("posCost").value),0,1e12,"Custo"):0,price=validateFinite(Number(el("posPrice").value),0,1e12,"Preço");const p={id:id||"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,ticker,type:el("posClass").value,currency:el("posCurrency").value,units,cost,costKnown,price,asOf:el("posDate").value};if(id){const i=state.positions.findIndex(x=>x.id===id);if(i<0)throw Error("Ativo não encontrado.");state.positions[i]=p;}else state.positions.push(p);state=E.normalize(state);simulationKey="";persist();el("positionDialog").close();render();notify("Posição salva com sucesso.");}catch(error){notify(error.message);}}
function handleSnapshotSubmit(ev){ev.preventDefault();try{const record={date:el("snapDate").value,total:validateFinite(Number(el("snapTotal").value),0,1e15,"Patrimônio"),flow:validateFinite(Number(el("snapFlow").value),-1e15,1e15,"Fluxo")};if(state.history.some(x=>x.date===record.date)){if(!confirm("Já existe um registro nesta data. Substituir?"))return;state.history=state.history.filter(x=>x.date!==record.date);}state.history.push(record);state=E.normalize(state);persist();el("snapshotDialog").close();render();renderHistory();notify("Registro salvo.");}catch(error){notify(error.message);}}
function exportFile(name,data,mime){const blob=new Blob([data],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function exportJson(){exportFile("wealth-intelligence-backup-"+E.asDate()+".json",JSON.stringify(state,null,2),"application/json");notify("Backup exportado. Guarde-o em local seguro.");}
function exportCsv(){
 const head=["nome","codigo","classe","moeda","quantidade","custo_unitario","preco_atual","data_preco","custo_conhecido","saldo_historico","conta","precisao_data"];
 const rows=[head].concat(state.positions.map(p=>[p.name,p.ticker,E.TYPES[p.type].label,p.currency,p.units,p.costKnown===false?"":p.cost,p.price,p.asOf,p.costKnown===false?"nao":"sim",p.valuationOnly===true?"sim":"nao",p.account||"",p.datePrecision==="month"?"mes":"dia"]));
 exportFile("wealth-posicoes-"+E.asDate()+".csv",L.csv(rows,I.escapeCell),"text/csv;charset=utf-8");
 notify("Posições exportadas sem inventar custos de aquisição.");
}
function exportReconciliation(){
 if(!state.dataEngine){notify("Importe sua planilha Excel antes de exportar a conferência detalhada.");return;}
 const rows=L.auditLines(state);
 exportFile("wealth-conferencia-fontes-"+E.asDate()+".csv",L.csv(rows,I.escapeCell),"text/csv;charset=utf-8");
 notify("Relatório privado de conciliação gerado no dispositivo.");
}

function importCsv(file){if(!file)return;if(file.size>2000000){notify("CSV excede o limite de 2 MB.");return;}const reader=new FileReader();reader.onload=()=>{try{const positions=I.rowsToPositions(String(reader.result||""),E.asDate());if(!confirm("Importar "+positions.length+" posições? Isso substituirá suas posições e seu histórico local. Exporte um backup antes de continuar."))return;const next=E.emptyData();next.positions=positions;if(state.mode==="personal"){next.fx=state.fx;next.assumptions={...state.assumptions};next.benchmarkAnnualPct=state.benchmarkAnnualPct;}state=E.normalize(next);simulationKey="";if(!persist())return;el("settingsDialog").close();render();go("portfolio");notify(positions.length+" posições importadas. Confira a cotação do dólar, se houver ativos em USD.");}catch(error){notify("CSV recusado: "+error.message);}};reader.onerror=()=>notify("Não foi possível ler o CSV.");reader.readAsText(file);}

function importJson(file){
 if(!file)return;if(file.size>3000000){notify("Backup excede 3 MB.");return;}
 const reader=new FileReader();reader.onload=()=>{
  try{
   const candidate=E.normalize(JSON.parse(reader.result)),check=G.check(candidate);
   if(check.status==="invalid")throw Error(check.message);
   let warning="";
   if(check.status==="modified"){warning="A soma das posições NÃO confere com os subtotais do Excel deste backup. A conferência será removida. Verifique as posições antes de usar os valores.\n\n";candidate.dataEngine.sourceMetadata.sourceVerified=false;}
   if(check.status==="unverified")warning="Este backup não contém comprovação completa dos quatro subtotais do Excel.\n\n";
   const source=candidate.dataEngine?.sourceMetadata?.filename||"backup local";
   const summary="Arquivo de origem: "+source+"\nSoma das posições: "+money(check.total,2)+"\nQuantidade de posições: "+candidate.positions.length+"\nSituação: "+({verified:"4 grupos conferidos",modified:"alterado após conferência",unverified:"sem conferência",manual:"carteira manual",demo:"demonstração"}[check.status]||check.status);
   if(!confirm(warning+summary+"\n\nSubstituir os dados atuais deste dispositivo?"))return;
   if(candidate.dataEngine?.sourceMetadata)candidate.dataEngine.sourceMetadata.importedAt=new Date().toISOString();
   E.save(candidate);
   state=candidate;simulationKey="";el("settingsDialog").close();render();go("home");
   notify(check.status==="verified"?"Backup conferido importado com sucesso.":"Backup importado; confira as ressalvas de conciliação.");
  }catch(err){notify("Importação recusada: "+err.message);}
 };reader.onerror=()=>notify("Não foi possível ler o arquivo.");reader.readAsText(file);
}
document.addEventListener("click",ev=>{const historyTab=ev.target.closest("[data-history-view]");if(historyTab){historyView=historyTab.dataset.historyView;renderHistorySections();return;}const periodBtn=ev.target.closest("[data-period]");if(periodBtn){activePeriod=periodBtn.dataset.period;renderHeroPeriod();renderGrowthBridge();return;}const goBtn=ev.target.closest("[data-go]");if(goBtn){go(goBtn.dataset.go);return;}const close=ev.target.closest("[data-close]");if(close){el(close.dataset.close).close();return;}const edit=ev.target.closest("[data-edit]");if(edit){positionModal(edit.dataset.edit);return;}const remove=ev.target.closest("[data-remove]");if(remove){const id=remove.dataset.remove,p=state.positions.find(x=>x.id===id);if(p&&confirm("Excluir "+p.name+" da carteira?")){state.positions=state.positions.filter(x=>x.id!==id);persist();simulationKey="";render();notify("Ativo excluído.");}return;}const deleteSnapshot=ev.target.closest("[data-delete-snapshot]");if(deleteSnapshot){const date=deleteSnapshot.dataset.deleteSnapshot;if(confirm("Excluir registro de "+isoDate(date)+"?")){state.history=state.history.filter(x=>x.date!==date);persist();render();renderHistory();notify("Registro excluído.");}return;}const action=ev.target.closest("[data-action]");if(action){if(action.dataset.action==="start")startPortfolio();if(action.dataset.action==="add-position")positionModal();if(action.dataset.action==="add-snapshot")addSnapshotModal();}});
el("positionForm").addEventListener("submit",handlePositionSubmit);
el("portfolioSearch").addEventListener("input",()=>renderGroupedPortfolio(viewSnapshot()));
el("portfolioSort").addEventListener("change",()=>renderGroupedPortfolio(viewSnapshot()));
el("assetHistorySelect").addEventListener("change",updateAssetHistory);
el("confirmXlsx").addEventListener("click",confirmExcelImport);
el("importXlsx").addEventListener("change",ev=>{const file=ev.target.files[0];ev.target.value="";importExcel(file);});
el("reimportFromHome").addEventListener("click",()=>el("importXlsx").click());
el("posUnknownCost").addEventListener("change",()=>{el("posCost").disabled=el("posUnknownCost").checked;el("posCost").required=!el("posUnknownCost").checked;});
el("snapshotForm").addEventListener("submit",handleSnapshotSubmit);
el("openSettings").addEventListener("click",()=>{el("fxInput").value=state.fx;el("benchmarkRateInput").value=state.benchmarkAnnualPct;el("settingsDialog").showModal();});
el("saveFx").addEventListener("click",()=>{const fx=Number(el("fxInput").value);if(!Number.isFinite(fx)||fx<=0||fx>100){notify("Insira uma cotação USD/BRL válida.");return;}state.fx=fx;persist();simulationKey="";render();notify("Cotação de conversão atualizada.");});
el("saveBenchmark").addEventListener("click",()=>{const rate=Number(el("benchmarkRateInput").value);if(!Number.isFinite(rate)||rate < -95||rate > 500){notify("Insira uma referência anual entre -95% e 500%.");return;}state.benchmarkAnnualPct=rate;persist();renderHistory();notify("Taxa hipotética atualizada. Não é CDI oficial.");});
el("exportRawLocal").addEventListener("click",()=>{
 try{const raw=localStorage.getItem("wealth-intelligence-ai.v1");if(!raw){notify("Não foi encontrado arquivo local para exportar.");return;}
 exportFile("wealth-recuperacao-local-"+E.asDate()+".txt",raw,"text/plain;charset=utf-8");notify("Cópia bruta salva. Não contém reparos; guarde-a em local seguro.");}
 catch(e){notify("O Safari não permitiu acessar o armazenamento local.");}
});
el("openBackupFromWarning").addEventListener("click",()=>el("importBackup").click());
el("exportBackup").addEventListener("click",exportJson);
el("exportCsv").addEventListener("click",exportCsv);
el("exportAuditCsv").addEventListener("click",exportReconciliation);
el("exportAuditCsvSettings").addEventListener("click",exportReconciliation);
el("incomeYear").addEventListener("change",next=>{incomeYear=el("incomeYear").value;renderReportedFlows();});
el("downloadTemplate").addEventListener("click",()=>exportFile("wealth-modelo-posicoes.csv",I.template(),"text/csv;charset=utf-8"));
el("importCsv").addEventListener("change",ev=>{importCsv(ev.target.files[0]);ev.target.value="";});
el("importBackup").addEventListener("change",ev=>{importJson(ev.target.files[0]);ev.target.value="";});
el("resetDemo").addEventListener("click",()=>{if(!confirm("Restaurar dados fictícios e apagar os registros locais?"))return;state=JSON.parse(JSON.stringify(E.DEMO));simulationKey="";persist();el("settingsDialog").close();render();go("home");notify("Demonstração restaurada.");});
el("runSimulation").addEventListener("click",()=>{try{const a=readScenarioForm();for(const [k,lo,hi] of [["target",1,1e13],["monthly",0,1e10],["years",1,40],["rate",-50,50],["vol",0,60],["inflation",0,30]])validateFinite(a[k],lo,hi,k);a.years=Math.round(a.years);state.assumptions=a;simulationKey="";activePreset="custom";document.querySelectorAll("[data-preset]").forEach(x=>x.classList.remove("active"));persist();renderScenario();notify("Cenários recalculados com suas premissas.");}catch(error){notify(error.message);}});
el("calibrateHistory").addEventListener("click",()=>{const c=A.historicalCalibration(state.history);if(!c.available){notify(c.reason);return;}if(!confirm("Usar os retornos aproximados do histórico para calibrar retorno e volatilidade? Não garante rentabilidade futura."))return;state.assumptions={...state.assumptions,rate:Number(c.rate.toFixed(2)),vol:Number(c.vol.toFixed(2))};activePreset="custom";document.querySelectorAll("[data-preset]").forEach(x=>x.classList.remove("active"));simulationKey="";persist();renderScenario();notify("Premissas históricas aplicadas à simulação.");});
const presets={conservative:{rate:6,vol:8},base:{rate:10,vol:14},optimistic:{rate:14,vol:22}};
document.querySelectorAll("[data-preset]").forEach(btn=>btn.addEventListener("click",()=>{activePreset=btn.dataset.preset;state.assumptions={...state.assumptions,...presets[activePreset]};document.querySelectorAll("[data-preset]").forEach(x=>x.classList.toggle("active",x===btn));simulationKey="";persist();renderScenario();notify("Premissas "+btn.textContent.toLowerCase()+" aplicadas.");}));
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",event=>{if(event.target===d)d.close();}));
render();go((location.hash||"").slice(1)||"home");
if("serviceWorker" in navigator&&window.isSecureContext)navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();