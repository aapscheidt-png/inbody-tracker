(function(root){
"use strict";
const M=root.WealthV3Model,L=root.WealthLedger,G=root.WealthIntegrity;
let getState=()=>null,navigate=()=>{},facet="product",selection="",search="",period=0,annual=false,historySelection="",historyDimension="product",incomeYear="2026",hidden=false,filterOpen=false;
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl=(v)=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const pct=(v)=>Number(v).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:2})+"%";
const fmt=v=>hidden?"••••••":brl(v),monthDate=s=>s.slice(5,7)+"/"+s.slice(0,4);
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
 // Up to five dated labels for the actual records; annual partial years get an asterisk.
 const indices=[...new Set(Array.from({length:Math.min(5,valid.length)},(_,i)=>
  Math.round(i*(valid.length-1)/Math.max(1,Math.min(5,valid.length)-1))))];
 const xTicks=indices.map(i=>{
  const s=valid[i],xx=x(i).toFixed(1);
  const label=annual?s.month.slice(0,4)+(s.yearComplete?"":"*"):monthDate(s.month);
  return'<line x1="'+xx+'" x2="'+xx+'" y1="'+(h-b)+'" y2="'+(h-b+4)+'" stroke="#607783"/>'+
   '<text data-v3-x-label x="'+xx+'" y="'+(h-9)+'" fill="#adc5cd" text-anchor="middle" font-size="10">'+esc(label)+'</text>';
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
 const partialLegend=hasPartial?'<span><i class="v3-legend-dash"></i> Cobertura parcial</span>':"";
 return'<div class="v3-chart-area" data-v3-chart>'+
  '<div class="v3-chart-meta"><span>Saldo ('+(currency==="USD"?"US$":"R$")+')</span><span>'+cadence+' · '+(annual?"ano de referência":"competência (mês/ano)")+'</span></div>'+
  '<svg viewBox="0 0 '+w+' '+h+'" role="group" aria-label="'+esc(title+' · '+cadence+' · escala monetária em '+currency)+'">'+
  yTicks+xTicks+fragments+dots+'</svg>'+
  '<div class="v3-chart-legend"><span><i class="v3-legend-line"></i> Saldos '+(annual?"anuais":"mensais")+'</span>'+partialLegend+'</div>'+
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
function renderHome(){
 const data=getState(),all=M.group(data),pension=M.group(data,"product","pension"),integrity=G?.check(data)||{status:"unverified"};
 const metadata=data.dataEngine?.sourceMetadata||{};
 const status={
  verified:{title:"Subtotais conferidos com o Excel",detail:"Quatro origens de saldo conciliadas. Não significa cotação em tempo real.",style:"verified"},
  demo:{title:"Demonstração fictícia",detail:"Valores de exemplo, não representam sua carteira.",style:"unverified"},
  modified:{title:"Carteira diferente do Excel",detail:"Algum valor foi alterado após a última conferência. Reimporte para restaurar a referência.",style:"danger"},
  unverified:{title:"Base ainda não conferida",detail:"Importe o Excel original para validar os saldos antes de utilizá-los.",style:"danger"},
  manual:{title:"Carteira manual",detail:"Não há reconciliação com uma planilha de origem.",style:"unverified"},
  invalid:{title:"Dados inválidos",detail:"Verifique o armazenamento local ou importe um backup.",style:"danger"}
 }[integrity.status]||{title:"Conferência indisponível",detail:"Confira o arquivo original.",style:"danger"};
 const expectedPension=data.dataEngine?.sourceMetadata?.sourceBuckets?.find(x=>x.key==="pension")?.excelValue;
 const mismatch=Number.isFinite(expectedPension)&&Math.abs(expectedPension-pension.total)>.02;

 const recent=M.trend(data,{months:12}),first=recent[0],last=recent.at(-1);
 const sourceLine=(metadata.filename||"Cadastro manual")+" · último fechamento "+(metadata.latestFullMonth||"não informado")+
  (metadata.partial?" · posição recente com competências diferentes":"");
 $("v3Home").innerHTML=
  '<section class="v3-integrity v3-'+status.style+'" role="status"><div class="v3-integrity-main"><span class="v3-integrity-title">'+esc(status.title)+'</span>'+
  '<details class="v3-integrity-info"><summary>Detalhes da conferência</summary><p>'+esc(status.detail)+'</p><small>'+esc(metadata.filename||"Nenhum Excel identificado")+
  (metadata.importedAt?" · importado "+esc(new Date(metadata.importedAt).toLocaleDateString("pt-BR")):"")+'</small></details></div>'+
  '<button type="button" data-v3-reimport>Atualizar Excel</button></section>'+
  (mismatch?'<div class="v3-critical" role="alert">Previdência divergente: o Excel informa '+fmt(expectedPension)+', mas esta carteira exibe '+fmt(pension.total)+'. Reimporte e confira os registros.</div>':"")+
  '<section class="v3-key-figures"><div><span>Previdência</span><strong data-v3-money>'+fmt(pension.total)+'</strong><small>'+pct(all.total?pension.total/all.total*100:0)+' do patrimônio</small><button type="button" class="v3-text-button" data-v3-openpension>Ver histórico</button></div>'+
  '<div><span>Demais investimentos</span><strong data-v3-money>'+fmt(all.total-pension.total)+'</strong><small>Inclui ativos com diferentes condições de liquidez</small></div></section>'+
  '<article class="v3-card v3-home-trend"><div class="v3-card-top"><div><span class="v3-eyebrow">PATRIMÔNIO NO TEMPO</span><h3>Evolução mensal</h3></div><button type="button" class="v3-text-button" data-v3-openhistory>Explorar ›</button></div>'+
  '<div class="v3-chart-range">'+(first?'<span>'+esc(monthDate(first.month))+'<strong data-v3-money>'+fmt(first.value)+'</strong></span>':'')+
  (last?'<span>'+esc(monthDate(last.month))+'<strong data-v3-money>'+fmt(last.value)+'</strong></span>':'')+'</div>'+
  chart(recent,"Fechamentos disponíveis nos últimos 12 meses de calendário")+
  '<p class="v3-note">Evolução dos saldos, sem descontar aportes ou retiradas.</p></article>'+
  '<article class="v3-card v3-home-allocation"><div class="v3-card-top"><div><span class="v3-eyebrow">DISTRIBUIÇÃO ATUAL</span><h3>Por produto</h3></div><button type="button" class="v3-text-button" data-v3-openportfolio>Ver carteira ›</button></div>'+
  '<div class="v3-allocation-track" role="img" aria-label="Distribuição do patrimônio por '+all.groups.length+' produtos">'+
  all.groups.filter(g=>g.amount>0).map(g=>'<span data-v3-color="'+esc(g.color)+'" data-v3-share="'+Math.max(0,g.share).toFixed(5)+'" title="'+esc(g.label+" "+pct(g.share))+'"></span>').join("")+'</div>'+
  '<div class="v3-allocation-list">'+all.groups.map(g=>'<button type="button" class="v3-allocation-row" data-v3-product="'+esc(g.id)+'"><span class="v3-bullet" data-v3-color="'+esc(g.color)+'"></span><span class="v3-allocation-label">'+esc(g.label)+'</span><strong class="v3-allocation-amount" data-v3-money>'+fmt(g.amount)+'</strong><span class="v3-allocation-share">'+pct(g.share)+'</span><span aria-hidden="true" class="v3-chevron">›</span></button>').join("")+'</div></article>'+
  '<p class="v3-file-info">'+esc(sourceLine)+'. Valores da última observação por conta, não cotação em tempo real.</p>';
 document.querySelectorAll("#v3Home [data-v3-color]").forEach(x=>x.style.background=x.dataset.v3Color);
 document.querySelectorAll("#v3Home .v3-allocation-track [data-v3-share]").forEach(x=>{x.style.width=x.dataset.v3Share+"%";});

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
 $("v3PortfolioCount").textContent=out.count+" posições · "+out.groups.length+" categorias";
 $("v3PortfolioReset").hidden=!selection&&!search&&facet==="product";
 if(!out.groups.length){$("v3PortfolioCategories").innerHTML='<div class="v3-empty">Nenhum investimento encontrado para os filtros escolhidos.</div>';return;}
 $("v3PortfolioCategories").innerHTML=out.groups.map((g,i)=>'<details class="v3-group" '+((selection||search)?"open":"")+'><summary>'+
 '<span class="v3-bullet" data-v3-color="'+esc(g.color)+'"></span><span class="v3-group-name"><strong>'+esc(g.label)+'</strong><small>'+g.count+' posição(ões) • '+pct(all.total?100*g.amount/all.total:0)+' do total</small></span>'+
 '<strong class="v3-group-amount" data-v3-money>'+fmt(g.amount)+'</strong><span class="v3-chevron">⌄</span></summary><div class="v3-group-items">'+g.items.map(item=>
 '<button type="button" data-v3-detail="'+esc(item.id)+'" class="v3-item"><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.asOf)+' · '+esc(M.EXPOSURE[item.facets.exposure])+'</small></span><strong data-v3-money>'+fmt(item.amount)+'</strong><span class="v3-chevron">›</span></button>'
 ).join("")+'</div></details>').join("");
 document.querySelectorAll("#v3PortfolioCategories [data-v3-color]").forEach(x=>x.style.background=x.dataset.v3Color);
}
function renderHistory(){
 const data=getState();
 const values=M.trend(data,{dimension:historyDimension,category:historySelection,months:period,annual});
 const cohort=historySelection?M.group(data,historyDimension,historySelection).count:0;
 const groups=M.historyFacets(data,historyDimension);
 $("v3HistoryDimension").value=historyDimension;
 $("v3HistoryCategory").innerHTML=optionsWithLabels(groups,historySelection,"Todo o patrimônio");
 $("v3HistoryYears").innerHTML=['Tudo','12 meses','6 meses','3 meses'].map((label,i)=>'<button type="button" data-v3-months="'+[0,12,6,3][i]+'" class="'+(period===[0,12,6,3][i]?"chosen":"")+'">'+label+'</button>').join("");
 $("v3HistoricalMode").innerHTML=['Mensal','Anual'].map((label,i)=>'<button type="button" data-v3-annual="'+i+'" class="'+(annual===!!i?"chosen":"")+'">'+label+'</button>').join("");
 $("v3HistoryChart").innerHTML=chart(values,"Evolução patrimonial baseada nos registros do Excel");
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
function renderIncome(){
 const data=getState().dataEngine||{},years=L.yearList(data);if(!years.includes(incomeYear))incomeYear=years[0]||"2026";
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
  report.months.map(row=>'<div class="v3-income-row"><span>'+esc(monthDate(row.month))+'</span><span class="v3-income-track" role="img" aria-label="'+esc(monthDate(row.month)+" · "+(hidden?"valores ocultos":brl(row.total)))+'"><i></i><b></b><em></em></span><strong data-v3-money>'+fmt(row.total)+'</strong></div>').join("")+legend+
  '<p class="v3-income-data-note">Somente meses com lançamentos; meses ausentes não representam valor zero.</p>':
  '<p class="v3-empty">Sem proventos registrados para este ano.</p>';
 document.querySelectorAll("#v3IncomeMonths .v3-income-track").forEach((element,i)=>{
  const row=report.months[i];if(!row)return;
  element.children[0].style.width=(100*row.stock/ceiling).toFixed(2)+"%";
  element.children[1].style.width=(100*row.fiis/ceiling).toFixed(2)+"%";
  element.children[2].style.width=(100*row.other/ceiling).toFixed(2)+"%";
 });
}
function render(){
 if(!$("v3Home"))return;
 renderHome();renderPortfolio();renderHistory();renderIncome();
}
function mount(options){
 getState=options.getState;navigate=options.navigate;
 document.addEventListener("click",e=>{
  const point=e.target.closest("[data-v3-chartpoint]");
  if(point){const info=point.closest("[data-v3-chart]")?.querySelector(".v3-chart-picked");
   if(info){info.textContent=point.dataset.v3Chartpoint;info.hidden=false;}return;}
  const t=e.target.closest("[data-v3-togglefilters],[data-v3-facet],[data-v3-detail],[data-v3-product],[data-v3-months],[data-v3-annual],[data-v3-reset],[data-v3-private],[data-v3-openportfolio],[data-v3-openhistory],[data-v3-reimport],[data-v3-openpension]");
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
 });
 document.addEventListener("keydown",e=>{const point=e.target.closest?.("[data-v3-chartpoint]");if(point&&(e.key==="Enter"||e.key===" ")){e.preventDefault();point.dispatchEvent(new MouseEvent("click",{bubbles:true}));}});
 $("v3PortfolioCategory").addEventListener("change",e=>{selection=e.target.value;renderPortfolio();});
 $("v3PortfolioSearch").addEventListener("input",e=>{search=e.target.value;renderPortfolio();});
 $("v3HistoryDimension").addEventListener("change",e=>{historyDimension=e.target.value;historySelection="";renderHistory();});
 $("v3HistoryCategory").addEventListener("change",e=>{historySelection=e.target.value;renderHistory();});
 $("v3IncomeYear").addEventListener("change",e=>{incomeYear=e.target.value;renderIncome();});
 $("v3DetailDialog").addEventListener("click",e=>{if(e.target.closest("[data-v3-close]"))$("v3DetailDialog").close();});
 document.body.classList.add("v3-ready");
 render();
}
root.WealthV3View={mount,render,openDetail:showDetail,renderChart:chart};
})(window);