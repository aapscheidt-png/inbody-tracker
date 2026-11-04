(function(root){
"use strict";
const M=root.WealthV3Model,L=root.WealthLedger,G=root.WealthIntegrity;
let getState=()=>null,navigate=()=>{},facet="product",selection="",search="",period=0,annual=false,historySelection="",historyDimension="product",incomeYear="2026",hidden=false,filterOpen=false;
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl=(v)=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const pct=(v)=>Number(v).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:2})+"%";
const pctVisible=v=>hidden?"•••":pct(v);
const fmt=v=>hidden?"••••••":brl(v),monthDate=s=>s.slice(5,7)+"/"+s.slice(0,4);
function allocationSvg(groups){
 let cursor=0;
 const segments=groups.filter(g=>g.amount>0).map(g=>{
  const span=Math.max(0,g.share)*10,left=cursor;cursor+=span;
  return '<rect x="'+left.toFixed(3)+'" y="0" width="'+span.toFixed(3)+'" height="12" fill="'+esc(g.color)+'"><title>'+esc(g.label+" "+pctVisible(g.share))+'</title></rect>';
 }).join("");
 return '<svg viewBox="0 0 1000 12" preserveAspectRatio="none" aria-hidden="true">'+segments+'</svg>';
}
function incomeBarSvg(row,ceiling){
 const divisor=Math.max(1,ceiling),stock=100*row.stock/divisor,fiis=100*row.fiis/divisor,other=100*row.other/divisor;
 return '<svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">'+
  '<rect x="0" y="0" width="'+stock.toFixed(3)+'" height="12" fill="#63b5cb"/>'+
  '<rect x="'+stock.toFixed(3)+'" y="0" width="'+fiis.toFixed(3)+'" height="12" fill="#d0a65f"/>'+
  '<rect x="'+(stock+fiis).toFixed(3)+'" y="0" width="'+other.toFixed(3)+'" height="12" fill="#bc99d5"/></svg>';
}
// Human-readable axes are essential for a financial chart. The horizontal axis
// uses only observed periods; missing months are never interpolated.
function axisMoney(value,currency="BRL"){
 if(hidden)return"•••";
 const symbol=currency==="USD"?"US$":"R$";
 const absolute=Math.abs(value);
 const form=(number,precision=1)=>number.toLocaleString("pt-BR",{maximumFractionDigits:precision});
 if(absolute>=1000000)return symbol+" "+form(value/1000000,2)+" mi";
 if(absolute>=1000)return symbol+" "+form(value/1000,1)+" mil";
 return symbol+" "+form(value,0);
}
function chart(series,title,currency="BRL"){
 if(!series.length)return'<p class="v3-empty">Não há observações para este período. Nenhum ponto será estimado.</p>';
 const annual=series.some(x=>x.yearComplete!==undefined),cadence=annual?"Anual":"Mensal";
 const valid=series.filter(s=>Number.isFinite(s.value)&&/^\d{4}-\d{2}$/.test(s.month));
 if(!valid.length)return'<p class="v3-empty">Não há saldos válidos para este período.</p>';
 const w=425,h=206,l=86,r=16,t=15,b=33;
 const vals=valid.map(x=>x.value),lo=Math.min(...vals),hi=Math.max(...vals);
 // Use a rounded, evenly spaced monetary axis, not unlabeled grid lines.
 const range=hi-lo||Math.max(1,Math.abs(hi)*.16),rawStep=range/3;
 const magnitude=Math.pow(10,Math.floor(Math.log10(rawStep)));
 const step=[1,2,2.5,5,10].map(x=>x*magnitude).find(x=>x>=rawStep)||10*magnitude;
 let low=Math.max(0,Math.floor((lo-range*.05)/step)*step);
 let high=Math.ceil((hi+range*.05)/step)*step;
 if(high<=low)high=low+step;
 const count=Math.round((high-low)/step);
 // Small series and precise amounts still get a readable 3–5 tick scale.
 const y=value=>t+(high-value)/(high-low)*(h-t-b);
 const ord=month=>Number(month.slice(0,4))*12+Number(month.slice(5,7));
 const ordinals=valid.map(s=>ord(s.month));
 const first=ordinals[0],last=ordinals.at(-1);
 const x=i=>last>first?l+(ordinals[i]-first)/(last-first)*(w-l-r):l+(w-l-r)/2;
 const pts=valid.map((v,i)=>[x(i),y(v.value)]);
 const complete=row=>row.yearComplete!==undefined?row.yearComplete===true:row.complete===true;
 const fragments=pts.slice(1).map(([px,py],j)=>{
  const i=j+1,previous=pts[i-1],a=valid[i-1],b=valid[i];
  // Annual lines only join adjoining years with truly covered intervening months.
  const adjacent=annual?
   (Number(b.month.slice(0,4))===Number(a.month.slice(0,4))+1 &&
    a.month.endsWith("-12")&&Number(b.monthsObserved)===Number(b.month.slice(5,7))):
   ordinals[i]===ordinals[i-1]+1;
  if(!adjacent)return"";
  const partial=!complete(a)||!complete(b);
  return'<path d="M'+previous[0].toFixed(1)+' '+previous[1].toFixed(1)+' L'+px.toFixed(1)+' '+py.toFixed(1)+
   '" stroke="'+(partial?"#c8a66c":"#8ae8cf")+'" stroke-width="2.6" fill="none"'+(partial?' stroke-dasharray="5 5"':'')+' stroke-linecap="round"/>';
 }).join("");
 const yTicks=Array.from({length:count+1},(_,i)=>{
  const value=low+i*step,yy=y(value).toFixed(1);
  return'<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy+'" y2="'+yy+'" stroke="#304553" stroke-opacity=".75"/>'+
   '<text data-v3-y-label x="'+(l-8)+'" y="'+(Number(yy)+3.5)+'" text-anchor="end" font-size="10" fill="#9db4be">'+esc(axisMoney(value,currency))+'</text>';
 }).join("");
 // Reserve the first and last observed dates, then select spaced intermediate
 // observations by their *calendar coordinates*. Sampling by record index was
 // making Sep/2026 and Oct/2026 collide in the iPhone chart.
 // The minimum gap is in SVG viewBox units, so it scales with mobile width.
 const tickGap=annual?55:80,plotWidth=w-l-r;
 const maxTicks=Math.min(5,valid.length,Math.floor(plotWidth/tickGap)+1);
 const indices=[0];
 if(valid.length>1&&x(valid.length-1)-x(0)>=tickGap)indices.push(valid.length-1);
 for(let slot=1;slot<maxTicks-1;slot++){
  const target=l+slot*plotWidth/(maxTicks-1);
  const candidates=valid.map((_,i)=>i).filter(i=>
   !indices.includes(i)&&indices.every(j=>Math.abs(x(i)-x(j))>=tickGap));
  if(!candidates.length)break;
  candidates.sort((a,b)=>Math.abs(x(a)-target)-Math.abs(x(b)-target)||a-b);
  indices.push(candidates[0]);
 }
 indices.sort((a,b)=>x(a)-x(b));
 const xTicks=indices.map(i=>{
  const s=valid[i],xx=x(i).toFixed(1);
  const label=annual?s.month.slice(0,4)+(s.yearComplete?"":"*"):monthDate(s.month);
  const anchor=i===0?"start":i===valid.length-1?"end":"middle";
  return'<line x1="'+xx+'" x2="'+xx+'" y1="'+(h-b)+'" y2="'+(h-b+4)+'" stroke="#607783"/>'+
   '<text data-v3-x-label x="'+xx+'" y="'+(h-9)+'" fill="#adc5cd" text-anchor="'+anchor+'" font-size="10">'+esc(label)+'</text>';
 }).join("");
 const dots=valid.map((s,i)=>{
  const verified=complete(s),color=verified?"#8ae8cf":"#c8a66c";
  const dateLabel=annual?s.month.slice(0,4)+(s.yearComplete?" · ano completo":" · até "+monthDate(s.month)+" · ano parcial"):monthDate(s.month);
  const hint=dateLabel+" · "+(hidden?"••••••":Number(s.value).toLocaleString("pt-BR",{style:"currency",currency}))+
   (verified?" · observado":" · cobertura parcial");
  return'<circle data-v3-chartpoint="'+esc(hint)+'" tabindex="0" role="button" aria-label="'+esc(hint)+'" cx="'+pts[i][0].toFixed(1)+'" cy="'+pts[i][1].toFixed(1)+
   '" r="'+(i===valid.length-1?5:4)+'" fill="'+color+'"><title>'+esc(hint)+'</title></circle>';
 }).join("");
 const hasPartial=valid.some(x=>!complete(x));
 const partialLegend=hasPartial?'<span><i class="v3-legend-dash"></i> '+(annual?"* Ano incompleto / cobertura parcial":"Cobertura parcial")+'</span>':"";
 return'<div class="v3-chart-area" data-v3-chart>'+
  '<div class="v3-chart-meta"><span>Saldo ('+(currency==="USD"?"US$":"R$")+')</span><span>'+cadence+' · '+(annual?"ano de referência":"competência (mês/ano)")+'</span></div>'+
  '<svg viewBox="0 0 '+w+' '+h+'" role="group" aria-label="'+esc(title+' · '+cadence+' · escala monetária em '+currency)+'">'+
  yTicks+xTicks+fragments+dots+'</svg>'+
  '<div class="v3-chart-legend"><span><i class="v3-legend-line"></i> Saldos '+(annual?"de referência anual":"mensais")+'</span>'+partialLegend+'</div>'+
  '<p class="v3-chart-picked" role="status" hidden></p></div>';
}
function optionsWithLabels(groups,chosen,all="Todas as categorias"){
 return'<option value="">'+esc(all)+'</option>'+groups.map(g=>'<option value="'+esc(g.id)+'"'+(chosen===g.id?' selected':'')+'>'+esc(g.label)+'</option>').join("");
}
function navChoices(){
 return Object.keys(M.dimensions).filter(d=>d!=="liquidity"||M.entries(getState()).some(x=>x.facets.liquidity!=="not_reported")).map(d=>'<button type="button" data-v3-facet="'+d+'" class="'+(facet===d?"chosen":"")+'" aria-pressed="'+(facet===d)+'">'+esc(M.dimensions[d].label)+'</button>').join("");
}
function showDetail(id){
 const data=getState(),item=M.entries(data).find(x=>x.id===id);if(!item)return;
 const dlg=$("v3DetailDialog"),obs=M.historyForAsset(data.dataEngine,item);
 const monthly=new Map();
 for(const o of obs){const m=o.date.slice(0,7),prev=monthly.get(m);if(!prev||o.date>prev.date)monthly.set(m,o);}
 const plotted=[...monthly.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-36);
 const isLegacyFund=M.historyKey(item).startsWith("FGTS_FUND_AUDITED_ALIAS");
 const source=item.source?.sheet&&item.source?.cell?item.source.sheet+"!"+item.source.cell:"Cadastro manual";
 $("v3DetailContent").innerHTML=
 '<div class="v3-detail-heading"><span class="v3-eyebrow">'+esc(M.PRODUCT[item.facets.product]?.label||"Investimento")+'</span><h2>'+esc(item.name)+'</h2><strong class="v3-big-amount" data-v3-money>'+fmt(item.amount)+'</strong></div>'+
 '<dl class="v3-facts"><div><dt>Exposição</dt><dd>'+esc(M.EXPOSURE[item.facets.exposure])+'</dd></div><div><dt>Conta</dt><dd>'+esc(item.facets.account)+'</dd></div><div><dt>Data de referência</dt><dd>'+esc(item.asOf)+'</dd></div><div><dt>Origem no Excel</dt><dd>'+esc(source)+'</dd></div>'+
 (item.originalCurrency==="USD"?'<div><dt>Saldo em US$ informado</dt><dd>'+(hidden?"••••••":"US$ "+Number(item.originalValue||0).toLocaleString("pt-BR",{minimumFractionDigits:2}))+'</dd></div>':'')+
 '<div><dt>Liquidez</dt><dd>Não informada</dd></div><div><dt>Rentabilidade</dt><dd>Não calculável sem fluxos e custos</dd></div></dl>'+
 '<h3 class="v3-h3">Histórico de saldos observados</h3>'+
 (plotted.length?chart(plotted.map(o=>({value:o.value,month:o.date.slice(0,7),complete:false})),"Evolução mensal observada",item.originalCurrency==="USD"?"USD":"BRL"): '<p class="v3-empty">Não há série específica neste arquivo.</p>')+
 '<p class="v3-note">Saldos registrados, não rentabilidade. '+plotted.length+' competência(s) mensal(is) com observações; '+obs.length+' registros de origem.'+(isLegacyFund?' A série histórica unifica os nomes FUNDO ELET FGTS (2024) e FUNDO FGTS (2025–2026), sem duplicar o fechamento de 31/12/2024.':'')+'</p>';
 dlg.showModal();
}
// V4 product-led home: show a decision-ready overview, not the audit ledger.
// Financial values are read-only projections from the existing verified engine.
function renderHome(){
 const data=getState(),all=M.group(data),integrity=G?.check(data)||{status:"unverified"};
 const metadata=data.dataEngine?.sourceMetadata||{},demo=data.mode==="demo";
 const recent=M.trend(data,{months:12}),latest=recent.at(-1),prior=recent.at(-2);
 const hasComparison=!!latest&&!!prior&&Number.isFinite(latest.value)&&Number.isFinite(prior.value);
 const balanceChange=hasComparison?latest.value-prior.value:null;
 const changeText=!hasComparison?"Sem comparação disponível":balanceChange>0?"Aumento do saldo":balanceChange<0?"Redução do saldo":"Saldo sem mudança";
 const dateDisplay=raw=>/^\d{4}-\d{2}/.test(String(raw||""))?String(raw).slice(5,7)+"/"+String(raw).slice(0,4):"Sem referência";
 const reference=metadata.latestDate||data.positions?.map(p=>p.asOf).filter(Boolean).sort().at(-1)||"";
 const lastFullMonth=metadata.latestFullMonth||"";
 const referenceText=demo?"Exemplo ilustrativo":reference?"Última posição: "+dateDisplay(reference):
  lastFullMonth?"Referência mensal: "+dateDisplay(lastFullMonth):
  reference?"Última posição: "+dateDisplay(reference):"Data não informada";
 const discrepancy=data.dataEngine?.sourceMetadata?.sourceBuckets?.find(x=>x.key==="pension")?.excelValue;
 const pension=M.group(data,"product","pension");
 const pensionMismatch=Number.isFinite(discrepancy)&&Math.abs(discrepancy-pension.total)>.02;
 const messages={
  verified:["Carteira conferida","Os saldos foram conferidos com o Excel, mas não são cotações em tempo real.","Ver origem"],
  demo:["Comece com seus investimentos","Os valores nesta tela são fictícios. Importe seu Excel para ver seu patrimônio.","Importar Excel"],
  modified:["Confira suas alterações","Sua carteira mudou desde a última conferência com o Excel.","Ver origem"],
  unverified:["Confirme seus saldos","A carteira ainda não foi conferida com a planilha.","Importar Excel"],
  manual:["Registre uma referência","Os valores foram informados manualmente e não passaram pela conferência do Excel.","Importar Excel"],
  invalid:["Revise seus dados","Não foi possível confirmar a integridade da carteira armazenada.","Ver origem"]
 };
 let [alertTitle,alertBody,alertButton]=messages[integrity.status]||messages.unverified;
 if(pensionMismatch){
  alertTitle="Previdência precisa de conferência";
  alertBody="O saldo de previdência difere da referência do Excel. Confira antes de usar o total.";
  alertButton="Ver origem";
 }
 else if(integrity.status==="verified"&&metadata.partial){
  alertTitle="Há saldos de datas diferentes";
  alertBody="Alguns investimentos têm referências de meses distintos. Atualize os saldos antes de comparar.";
  alertButton="Atualizar Excel";
 }
 else if(integrity.status==="verified"&&!metadata.partial){
  alertTitle="Seus saldos estão organizados";
  alertBody="Os quatro subtotais conferem. Você pode explorar a carteira ou atualizar o Excel.";
  alertButton="Ver carteira";
 }
 const alertAction=alertButton==="Ver carteira"?"data-v3-openportfolio":
  alertButton==="Ver origem"?"data-v4-openaudit":"data-v3-reimport";
 const top=all.groups.filter(g=>g.amount>0).slice(0,3);
 const remaining=all.groups.filter(g=>g.amount>0).slice(3);
 const groupRow=g=>'<button type="button" class="v4-investment-row" data-v3-product="'+esc(g.id)+'">'+
  '<span class="v3-bullet" data-v3-color="'+esc(g.color)+'"></span>'+
  '<span class="v4-investment-label">'+esc(g.label)+'</span>'+
  '<strong class="v4-investment-value" data-v3-money>'+fmt(g.amount)+'</strong>'+
  '<span class="v4-investment-share">'+pctVisible(g.share)+'</span><span aria-hidden="true">›</span></button>';
 const statusTag=demo?"DEMONSTRAÇÃO":pensionMismatch?"REVISAR SALDOS":integrity.status==="verified"?"CONFERIDO":"NÃO CONFERIDO";
 const deltaColor=hasComparison&&balanceChange<0?" v4-down":"";
 $("v3Home").innerHTML=
  '<section class="v4-wealth-hero" aria-label="Visão geral do patrimônio">'+
  '<div class="v4-hero-top"><div><span class="v4-kicker">VISÃO GERAL</span><h1>Seu patrimônio</h1></div>'+
  '<span class="v4-hero-badge">'+esc(statusTag)+'</span></div>'+
  '<strong class="v4-balance" data-v3-money>'+fmt(all.total)+'</strong>'+
  '<div class="v4-hero-caption"><span>'+esc(referenceText)+'</span>'+
  '<span>'+all.count+' investimentos</span></div>'+
  '<div class="v4-balance-divider"></div>'+
  '<div class="v4-balance-change"><div><span class="v4-change-label">'+esc(changeText)+'</span>'+
  '<strong class="v4-change-value'+deltaColor+'" data-v3-money>'+
  (hasComparison?(hidden?"••••••":(balanceChange>0?"+":"")+brl(balanceChange)):"Não disponível")+
  '</strong><span class="v4-change-date">'+(hasComparison?"Entre "+dateDisplay(prior.month)+" e "+dateDisplay(latest.month):"Requer ao menos dois saldos datados")+
  '</span></div><span class="v4-nonperformance">Variação do saldo,<br>não rentabilidade</span></div>'+
  '</section>'+
  '<section class="v4-home-action" aria-label="O que merece atenção"><div class="v4-action-marker" aria-hidden="true">!</div>'+
  '<div class="v4-action-content"><span class="v4-kicker">PARA VOCÊ</span><h2>'+esc(alertTitle)+'</h2>'+
  '<p>'+esc(alertBody)+'</p><button type="button" class="v4-action-link" '+alertAction+'>'+
  esc(alertButton)+' <span aria-hidden="true">›</span></button></div></section>'+
  '<article class="v4-panel v3-home-trend"><div class="v4-panel-head"><div><h2>Como evoluiu</h2>'+
  '<p>Últimos 12 meses · valores registrados</p></div>'+
  '<button type="button" data-v3-openhistory class="v4-subtle-button">Detalhes <span aria-hidden="true">›</span></button></div>'+
  chart(recent,"Evolução dos saldos no período disponível")+
  '<p class="v4-chart-note">Os saldos incluem aportes e retiradas. Não representam rendimento.</p></article>'+
  '<article class="v4-panel v3-home-allocation"><div class="v4-panel-head"><div><h2>Onde está investido</h2>'+
  '<p>Principais categorias do patrimônio</p></div>'+
  '<button type="button" data-v3-openportfolio class="v4-subtle-button">Carteira <span aria-hidden="true">›</span></button></div>'+
  '<div class="v3-allocation-track" role="img" aria-label="Distribuição entre categorias">'+allocationSvg(all.groups)+'</div>'+
  '<div class="v4-investment-list">'+top.map(groupRow).join("")+'</div>'+
  (remaining.length?'<details class="v4-more-investments"><summary>Ver outras '+remaining.length+' categorias</summary>'+
   '<div class="v4-investment-list">'+remaining.map(groupRow).join("")+'</div></details>':"")+
  '</article>'+
  '<details class="v4-source-details"><summary>Origem e conferência dos valores</summary>'+
  '<p>'+esc(metadata.filename||"Nenhum Excel de origem identificado")+'. '+esc(metadata.latestFullMonth?"Último fechamento: "+dateDisplay(metadata.latestFullMonth)+".":"")+'</p>'+
  '<p>Conferência: '+esc(integrity.status==="verified"?"quatro subtotais conciliados":integrity.status==="demo"?"demonstração com valores fictícios":"dados ainda não conferidos")+'.</p>'+
  '<button type="button" data-v3-reimport>Atualizar Excel</button></details>';
 $("v3PrivacyToggle").textContent=hidden?"Mostrar valores":"Ocultar valores";
 $("v3PrivacyToggle").setAttribute("aria-pressed",String(hidden));
}
function renderPortfolio(){
 const data=getState(),all=M.group(data),possible=M.group(data,facet,"",search),out=M.group(data,facet,selection,search);
 const choices=possible.groups.map(g=>({id:g.id,label:g.label}));
 $("v3PortfolioTabs").innerHTML=navChoices();
 $("v3PortfolioFilterArea").hidden=!filterOpen;
 $("v3ToggleFilters").setAttribute("aria-expanded",String(filterOpen));
 $("v3ToggleFilters").classList.toggle("chosen",filterOpen);
 const activeFilters=(facet!=="product"?1:0)+(selection?1:0);
 $("v3FilterBadge").hidden=activeFilters===0;
 $("v3FilterBadge").textContent=activeFilters;
 $("v3PortfolioCategory").innerHTML=optionsWithLabels(choices,selection);
 $("v3PortfolioTotal").textContent=fmt(out.total);
 $("v3PortfolioCount").textContent=out.count+" "+(out.count===1?"investimento":"investimentos")+" · "+out.groups.length+" "+(out.groups.length===1?"categoria":"categorias");
 $("v4PortfolioContext").textContent=selection||search?"Mostrando os resultados da busca ou filtro.":"Selecione uma categoria para consultar seus investimentos.";
 $("v3PortfolioReset").hidden=!selection&&!search&&facet==="product";
 if(!out.groups.length){$("v3PortfolioCategories").innerHTML='<div class="v3-empty">Nenhum investimento encontrado para os filtros escolhidos.</div>';return;}
 $("v3PortfolioCategories").innerHTML=out.groups.map((g,i)=>'<details class="v3-group" '+((selection||search)?"open":"")+'><summary>'+
 '<span class="v3-bullet" data-v3-color="'+esc(g.color)+'"></span><span class="v3-group-name"><strong>'+esc(g.label)+'</strong><small>'+g.count+" "+(g.count===1?"investimento":"investimentos")+' · '+pctVisible(all.total?100*g.amount/all.total:0)+' do patrimônio</small></span>'+
 '<strong class="v3-group-amount" data-v3-money>'+fmt(g.amount)+'</strong><span class="v3-chevron">⌄</span></summary><div class="v3-group-items">'+g.items.map(item=>
 '<button type="button" data-v3-detail="'+esc(item.id)+'" class="v3-item"><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.asOf)+' · '+esc(M.EXPOSURE[item.facets.exposure])+'</small></span><strong data-v3-money>'+fmt(item.amount)+'</strong><span class="v3-chevron">›</span></button>'
 ).join("")+'</div></details>').join("");

}
function renderHistory(){
 const data=getState();
 const values=M.trend(data,{dimension:historyDimension,category:historySelection,months:period,annual});
 const cohort=historySelection?M.group(data,historyDimension,historySelection).count:0;
 const groups=M.historyFacets(data,historyDimension);
 const subject=historySelection?M.label(historyDimension,historySelection):"Patrimônio total";
 $("v3History").querySelector(".v3-card-top h3").textContent="Saldos · "+subject;
 $("v3HistoryDimension").value=historyDimension;
 $("v3HistoryCategory").innerHTML=optionsWithLabels(groups,historySelection,"Todo o patrimônio");
 $("v3HistoryYears").innerHTML=['Tudo','12 meses','6 meses','3 meses'].map((label,i)=>'<button type="button" data-v3-months="'+[0,12,6,3][i]+'" class="'+(period===[0,12,6,3][i]?"chosen":"")+'">'+label+'</button>').join("");
 $("v3HistoricalMode").innerHTML=['Mensal','Anual'].map((label,i)=>'<button type="button" data-v3-annual="'+i+'" class="'+(annual===!!i?"chosen":"")+'">'+label+'</button>').join("");
 $("v3HistoryChart").innerHTML=chart(values,subject+" · evolução "+(annual?"anual":"mensal")+" dos saldos observados");
 const first=values[0],last=values.at(-1);
 const metricCaptions=$("v3History").querySelectorAll(".v3-historical-metrics span");
 if(metricCaptions.length>=2){metricCaptions[0].textContent=first?"Início · "+monthDate(first.month):"Início";metricCaptions[1].textContent=last?"Final · "+monthDate(last.month):"Final";}
 $("v3HistoryFirst").textContent=first?fmt(first.value):"—";
 $("v3HistoryLast").textContent=last?fmt(last.value):"—";
 const allObserved=values.length>=2&&values.every(row=>row.complete);
 $("v3HistoryDelta").textContent=first&&last&&(!historySelection||allObserved)?fmt(last.value-first.value):"N/D (cobertura parcial)";
 const deltaLabel=$("v3History").querySelector(".v3-historical-metrics>div:last-child>span");
 if(deltaLabel)deltaLabel.textContent=historySelection&&allObserved?"Variação dos saldos observados":"Variação do saldo";
 const hasPartial=values.some(x=>x.yearComplete!==undefined?!x.yearComplete:!x.complete);
 $("v3HistoryShort").textContent=hasPartial?"Cobertura parcial · entenda a série":"Como interpretar a série";
 $("v3HistoryDescription").textContent=(historySelection?
  (allObserved?
    "Dois planos de previdência identificados em todas as competências exibidas. Variação dos saldos não significa rentabilidade e pode incluir contribuições.":
    "Série por categoria construída de saldos observados individualmente. "+cohort+" posição(ões) na carteira atual; a cobertura histórica pode variar e há posições encerradas. Não é um fechamento completo."):
  "Fechamentos mensais registrados no Excel. Os saldos mais recentes de outras competências não são conectados à curva. Variação patrimonial não equivale à rentabilidade.")+(hasPartial?" Linha tracejada: cobertura incompleta do período.":"");
 $("v3HistoryRows").innerHTML=values.slice().reverse().map(x=>{
  const periodLabel=annual?x.month.slice(0,4):monthDate(x.month);
  const note=annual?(x.yearComplete?" · ano completo":" · até "+monthDate(x.month)+" · parcial"):(historySelection?" · "+x.samples+"/"+(x.expected||"?")+" ativo(s)"+(x.complete?" · cobertura integral":" · parcial"):"");
  return '<div class="v3-history-row"><span>'+esc(periodLabel)+' <small>'+esc(note)+'</small></span><strong data-v3-money>'+fmt(x.value)+'</strong></div>';
 }).join("");
}
function renderFlowAudit(){
 const report=root.WealthFlowAudit?.coverage(getState())||{intervalCount:0,supplied:0,pending:0,declaredCount:0,outsideCount:0,declaredTotal:0,intervals:[],reason:""};
 $("v3FlowAuditSummary").innerHTML=
  '<div><span>Intervalos com fluxo informado</span><strong>'+report.supplied+' / '+report.intervalCount+'</strong></div>'+
  '<div><span>Intervalos sem fluxo</span><strong>'+report.pending+'</strong></div>'+
  '<div><span>Aportes listados no Excel</span><strong>'+report.declaredCount+'</strong><small data-v3-money>'+fmt(report.declaredTotal)+'</small></div>';
 $("v3FlowAuditHint").textContent=report.intervalCount===0?
  "Ainda não há dois saldos datados para comparar. Registre ou importe fechamentos mensais.":
  report.reason+" "+(report.outsideCount?"Há "+report.outsideCount+" lançamento(s) fora dos intervalos exibidos.":"");
 $("v3FlowAuditRows").innerHTML=report.intervals.length?report.intervals.slice().reverse().map(i=>
  '<div class="v3-flow-row"><span>'+esc(monthDate(i.from.slice(0,7)))+' → '+esc(monthDate(i.to.slice(0,7)))+
  '<small>'+(i.known?"Fluxo informado":"Fluxo pendente · não presumir zero")+'</small></span>'+
  '<span class="v3-flow-values"><strong data-v3-money>'+(i.known?fmt(i.flow):"Pendente")+'</strong>'+
  '<small>'+(i.declaredCount?i.declaredCount+" aporte(s) listado(s) · "+fmt(i.declaredTotal):"Sem aporte listado na planilha")+'</small></span></div>'
 ).join(""):'<p class="v3-empty">Sem intervalos comparáveis.</p>';
}
function exportFlowAudit(){
 const data=root.WealthFlowAudit?.coverage(getState());
 if(!data)return;
 const csv=root.WealthFlowAudit.exportCsv(data);
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="wealth-conciliacao-fluxos-"+new Date().toISOString().slice(0,10)+".csv";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function renderIncome(){
 const data=getState().dataEngine||{},years=L.yearList(data);if(!years.length)years.push(String(new Date().getFullYear()));if(!years.includes(incomeYear))incomeYear=years[0];
 $("v3IncomeYear").innerHTML=years.map(y=>'<option value="'+esc(y)+'" '+(incomeYear===y?"selected":"")+'>'+y+'</option>').join("");
 const report=L.incomeByYear(data,incomeYear);
 $("v3IncomeTotal").textContent=fmt(report.total);
 $("v3IncomeSplit").innerHTML='<div><span>Dividendos ações</span><strong data-v3-money>'+fmt(report.stocks)+'</strong></div><div><span>Rendimentos FIIs</span><strong data-v3-money>'+fmt(report.fiis)+'</strong></div>';
 const max=Math.max(0,...report.months.map(m=>m.total));
 const magnitude=Math.pow(10,Math.floor(Math.log10(Math.max(1,max))));
 const ceiling=([1,2,2.5,5,10].map(n=>n*magnitude).find(n=>n>=max)||10*magnitude);
 const axis=report.months.length?
  '<div class="v3-income-chart-intro"><span>Proventos por competência · '+incomeYear+'</span><span>Escala em R$</span></div>'+
  '<div class="v3-income-axis"><span></span><div class="v3-income-ticks"><span>'+esc(axisMoney(0))+'</span><span>'+esc(axisMoney(ceiling/2))+'</span><span>'+esc(axisMoney(ceiling))+'</span></div><span></span></div>':"";
 const legend=report.months.length?
  '<div class="v3-income-legend"><span><i class="v3-income-key v3-key-stock"></i> Ações</span><span><i class="v3-income-key v3-key-fii"></i> FIIs</span>'+
  (report.other>0?'<span><i class="v3-income-key v3-key-other"></i> Outros lançamentos</span>':"")+'</div>':"";
 $("v3IncomeMonths").innerHTML=report.months.length?axis+
  report.months.map(row=>'<div class="v3-income-row"><span>'+esc(monthDate(row.month))+'</span><span class="v3-income-track" role="img" aria-label="'+esc(monthDate(row.month)+" · "+(hidden?"valores ocultos":brl(row.total)))+'">'+incomeBarSvg(row,ceiling)+'</span><strong data-v3-money>'+fmt(row.total)+'</strong></div>').join("")+legend+
  '<p class="v3-income-data-note">Somente meses com lançamentos; meses ausentes não representam valor zero.</p>':
  '<div class="v4-income-empty"><span class="v4-income-empty-icon" aria-hidden="true">＋</span><h3>Sem lançamentos em '+esc(incomeYear)+'</h3>'+
   '<p>A planilha ainda não contém proventos registrados para este ano. Isso não significa que não houve recebimentos.</p>'+
   '<button type="button" data-v3-reimport>Atualizar Excel</button></div>';

}
function render(){
 if(!$("v3Home"))return;
 renderHome();renderPortfolio();renderHistory();renderFlowAudit();renderIncome();
}
function mount(options){
 getState=options.getState;navigate=options.navigate;
 document.addEventListener("click",e=>{
  const point=e.target.closest("[data-v3-chartpoint]");
  if(point){const info=point.closest("[data-v3-chart]")?.querySelector(".v3-chart-picked");
   if(info){info.textContent=point.dataset.v3Chartpoint;info.hidden=false;}return;}
  const t=e.target.closest("[data-v3-togglefilters],[data-v3-facet],[data-v3-detail],[data-v3-product],[data-v3-months],[data-v3-annual],[data-v3-reset],[data-v3-private],[data-v3-openportfolio],[data-v3-openhistory],[data-v3-reimport],[data-v3-openpension],[data-v4-openaudit]");
  if(!t)return;
  if(t.hasAttribute("data-v3-togglefilters")){filterOpen=!filterOpen;renderPortfolio();}
  else if(t.hasAttribute("data-v3-facet")){facet=t.dataset.v3Facet;selection="";renderPortfolio();}
  else if(t.hasAttribute("data-v3-detail"))showDetail(t.dataset.v3Detail);
  else if(t.hasAttribute("data-v3-product")){facet="product";selection=t.dataset.v3Product;filterOpen=true;renderPortfolio();navigate("portfolio");}
  else if(t.hasAttribute("data-v3-months")){period=Number(t.dataset.v3Months);renderHistory();}
  else if(t.hasAttribute("data-v3-annual")){annual=t.dataset.v3Annual==="1";renderHistory();}
  else if(t.hasAttribute("data-v3-reset")){facet="product";selection="";search="";filterOpen=false;$("v3PortfolioSearch").value="";renderPortfolio();}
  else if(t.hasAttribute("data-v3-private")){hidden=!hidden;document.body.classList.toggle("v3-private",hidden);render();}
  else if(t.hasAttribute("data-v3-openportfolio"))navigate("portfolio");
  else if(t.hasAttribute("data-v3-openhistory"))navigate("history");
  else if(t.hasAttribute("data-v3-reimport")){document.getElementById("openSettings")?.click();document.getElementById("importXlsx")?.click();}
  else if(t.hasAttribute("data-v3-openpension")){historyDimension="product";historySelection="pension";annual=false;period=0;renderHistory();navigate("history");}
  else if(t.hasAttribute("data-v4-openaudit")){const details=$("v3Home").querySelector(".v4-source-details");if(details){details.open=true;details.scrollIntoView({behavior:"auto",block:"center"});}}
 });
 document.addEventListener("keydown",e=>{const point=e.target.closest?.("[data-v3-chartpoint]");if(point&&(e.key==="Enter"||e.key===" ")){e.preventDefault();point.dispatchEvent(new MouseEvent("click",{bubbles:true}));}});
 $("v3PortfolioCategory").addEventListener("change",e=>{selection=e.target.value;renderPortfolio();});
 $("v3PortfolioSearch").addEventListener("input",e=>{search=e.target.value;renderPortfolio();});
 $("v3HistoryDimension").addEventListener("change",e=>{historyDimension=e.target.value;historySelection="";renderHistory();});
 $("v3HistoryCategory").addEventListener("change",e=>{historySelection=e.target.value;renderHistory();});
 $("v3IncomeYear").addEventListener("change",e=>{incomeYear=e.target.value;renderIncome();});
 $("v3FlowExport").addEventListener("click",exportFlowAudit);
 $("v3DetailDialog").addEventListener("click",e=>{if(e.target.closest("[data-v3-close]"))$("v3DetailDialog").close();});
 document.body.classList.add("v3-ready");
 render();
}
root.WealthV3View={mount,render,openDetail:showDetail,renderChart:chart};
})(window);