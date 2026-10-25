(function(root){
"use strict";
const M=root.WealthV3Model,L=root.WealthLedger;
let getState=()=>null,navigate=()=>{},facet="product",selection="",search="",period=0,annual=false,historySelection="",incomeYear="2026",hidden=false;
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brl=(v)=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const pct=(v)=>Number(v).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:2})+"%";
const fmt=v=>hidden?"••••••":brl(v),monthDate=s=>s.slice(5,7)+"/"+s.slice(0,4);
function chart(series,title){
 if(!series.length)return'<p class="v3-empty">Não há observações para este período.</p>';
 const w=360,h=180,l=55,r=11,t=15,b=30,vals=series.map(x=>x.value),lo=Math.min(...vals),hi=Math.max(...vals);
 const spread=Math.max(1,hi-lo),y=v=>t+(hi-v)/spread*(h-t-b),x=i=>l+i/Math.max(1,series.length-1)*(w-l-r);
 const pts=series.map((v,i)=>[x(i),y(v.value)]),path=pts.map(([px,py],i)=>(i?"L":"M")+px.toFixed(1)+" "+py.toFixed(1)).join(" ");
 const ymin=Math.max(0,lo-spread*.1),ymax=hi+spread*.1;
 const ticks=[0,1,2,3].map(i=>{let val=ymin+(ymax-ymin)*i/3,yy=y(val);return '<line x1="'+l+'" x2="'+(w-r)+'" y1="'+yy+'" y2="'+yy+'" stroke="#324653" stroke-opacity=".65"/><text x="2" y="'+(yy+3)+'" font-size="10" fill="#9aafb9">'+esc((val/1000).toLocaleString("pt-BR",{maximumFractionDigits:0})+" mil")+'</text>';}).join("");
 const dots=series.map((s,i)=>'<circle cx="'+pts[i][0]+'" cy="'+pts[i][1]+'" r="'+(i===series.length-1?3.5:2)+'" fill="#8ae8cf"><title>'+esc(monthDate(s.month)+" · "+brl(s.value)+(s.complete?"":" · parcial"))+'</title></circle>').join("");
 const a=pts[0],z=pts.at(-1);
 return'<div class="v3-chart-area"><svg viewBox="0 0 360 180" role="img" aria-label="'+esc(title)+'">'+ticks+'<path d="'+path+'" fill="none" stroke="#8ae8cf" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'<text x="'+l+'" y="174" font-size="11" fill="#93aeb8">'+esc(monthDate(series[0].month))+'</text><text x="'+(w-r)+'" y="174" text-anchor="end" font-size="11" fill="#93aeb8">'+esc(monthDate(series.at(-1).month))+'</text></svg></div>';
}
function optionsWithLabels(groups,chosen,all="Todas as categorias"){
 return'<option value="">'+esc(all)+'</option>'+groups.map(g=>'<option value="'+esc(g.id)+'"'+(chosen===g.id?' selected':'')+'>'+esc(g.label)+'</option>').join("");
}
function navChoices(){
 return Object.keys(M.dimensions).map(d=>'<button type="button" data-v3-facet="'+d+'" class="'+(facet===d?"chosen":"")+'" aria-pressed="'+(facet===d)+'">'+esc(M.dimensions[d].label)+'</button>').join("");
}
function showDetail(id){
 const data=getState(),item=M.entries(data).find(x=>x.id===id);if(!item)return;
 const dlg=$("v3DetailDialog"),series=(data.dataEngine?.assetHistory||[]).find(x=>x.name===item.name&&x.account===item.account);
 const obs=series?.observations||[],source=item.source?.sheet&&item.source?.cell?item.source.sheet+"!"+item.source.cell:"Cadastro manual";
 $("v3DetailContent").innerHTML=
 '<div class="v3-detail-heading"><span class="v3-eyebrow">'+esc(M.PRODUCT[item.facets.product]?.label||"Investimento")+'</span><h2>'+esc(item.name)+'</h2><strong class="v3-big-amount" data-v3-money>'+fmt(item.amount)+'</strong></div>'+
 '<dl class="v3-facts"><div><dt>Exposição</dt><dd>'+esc(M.EXPOSURE[item.facets.exposure])+'</dd></div><div><dt>Conta</dt><dd>'+esc(item.facets.account)+'</dd></div><div><dt>Data de referência</dt><dd>'+esc(item.asOf)+'</dd></div><div><dt>Origem no Excel</dt><dd>'+esc(source)+'</dd></div>'+
 (item.originalCurrency==="USD"?'<div><dt>Saldo em US$ informado</dt><dd>US$ '+Number(item.originalValue||0).toLocaleString("pt-BR",{minimumFractionDigits:2})+'</dd></div>':'')+
 '<div><dt>Liquidez</dt><dd>Não informada</dd></div><div><dt>Rentabilidade</dt><dd>Não calculável sem fluxos e custos</dd></div></dl>'+
 '<h3 class="v3-h3">Histórico de saldos observados</h3>'+
 (obs.length?chart(obs.slice(-14).map(o=>({value:o.value,month:o.date.slice(0,7),complete:false})),"Evolução observada"): '<p class="v3-empty">Não há série específica neste arquivo.</p>')+
 '<p class="v3-note">Saldos registrados, não rentabilidade. Histórico original: '+obs.length+' observação(ões).</p>';
 dlg.showModal();
}
function renderHome(){
 const data=getState(),all=M.group(data),pension=M.group(data,"product","pension");
 $("v3Home").innerHTML=
 '<section class="v3-key-figures"><div><span>Previdência</span><strong data-v3-money>'+fmt(pension.total)+'</strong><small>'+pct(all.total?pension.total/all.total*100:0)+' do patrimônio</small></div>'+
 '<div><span>Demais investimentos</span><strong data-v3-money>'+fmt(all.total-pension.total)+'</strong><small>Não significa valor disponível para saque</small></div></section>'+
 '<article class="v3-card"><div class="v3-card-top"><div><span class="v3-eyebrow">DISTRIBUIÇÃO</span><h3>Por produto</h3></div><button type="button" class="v3-text-button" data-v3-openportfolio>Ver carteira</button></div>'+
 '<div class="v3-donut-layout"><div class="v3-donut" style="background:'+M.makeDonut(all.groups,all.total)+'"><div class="v3-hole">'+all.groups.length+'<small>categorias</small></div></div><div class="v3-donut-list">'+
 all.groups.map(g=>'<button type="button" class="v3-donut-row" data-v3-product="'+esc(g.id)+'"><span class="v3-bullet" style="background:'+g.color+'"></span><span>'+esc(g.label)+'</span><strong>'+pct(g.share)+'</strong></button>').join("")+'</div></div>'+
 '<p class="v3-note">Valores da última observação de cada conta. Competências diferentes podem coexistir.</p></article>'+
 '<article class="v3-card"><div class="v3-card-top"><div><span class="v3-eyebrow">EVOLUÇÃO DO PATRIMÔNIO</span><h3>Histórico mensal</h3></div><button type="button" class="v3-text-button" data-v3-openhistory>Ver evolução</button></div>'+
 chart(M.trend(data,{months:12}),"Últimos 12 meses do patrimônio")+
 '<p class="v3-note">Variação do patrimônio registrado, não retorno financeiro ajustado por aportes.</p></article>'+
 '<p class="v3-file-info">Fonte: '+esc(data.dataEngine?.sourceMetadata?.filename||"Cadastro manual")+
 ' · último fechamento: '+esc(data.dataEngine?.sourceMetadata?.latestFullMonth||"não informado")+'</p>';
 $("v3PrivacyToggle").textContent=hidden?"Mostrar valores":"Ocultar valores";
 $("v3PrivacyToggle").setAttribute("aria-pressed",String(hidden));
}
function renderPortfolio(){
 const data=getState(),all=M.group(data),possible=M.group(data,facet,"",search),out=M.group(data,facet,selection,search);
 const choices=possible.groups.map(g=>({id:g.id,label:g.label}));
 $("v3PortfolioTabs").innerHTML=navChoices();
 $("v3PortfolioCategory").innerHTML=optionsWithLabels(choices,selection);
 $("v3PortfolioTotal").textContent=fmt(out.total);
 $("v3PortfolioCount").textContent=out.count+" investimentos • "+out.groups.length+" grupos";
 $("v3PortfolioReset").hidden=!selection&&!search&&facet==="product";
 if(!out.groups.length){$("v3PortfolioCategories").innerHTML='<div class="v3-empty">Nenhum investimento encontrado para os filtros escolhidos.</div>';return;}
 $("v3PortfolioCategories").innerHTML=out.groups.map((g,i)=>'<details class="v3-group" '+((selection||search||i===0)?"open":"")+'><summary>'+
 '<span class="v3-bullet" style="background:'+g.color+'"></span><span class="v3-group-name"><strong>'+esc(g.label)+'</strong><small>'+g.count+' posição(ões) • '+pct(all.total?100*g.amount/all.total:0)+' do total</small></span>'+
 '<strong class="v3-group-amount" data-v3-money>'+fmt(g.amount)+'</strong><span class="v3-chevron">⌄</span></summary><div class="v3-group-items">'+g.items.map(item=>
 '<button type="button" data-v3-detail="'+esc(item.id)+'" class="v3-item"><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.asOf)+' · '+esc(M.EXPOSURE[item.facets.exposure])+'</small></span><strong data-v3-money>'+fmt(item.amount)+'</strong><span class="v3-chevron">›</span></button>'
 ).join("")+'</div></details>').join("");
}
function renderHistory(){
 const data=getState();
 const values=M.trend(data,{dimension:"product",category:historySelection,months:period,annual});
 const groups=M.group(data).groups;
 $("v3HistoryCategory").innerHTML=optionsWithLabels(groups,historySelection,"Todo o patrimônio");
 $("v3HistoryYears").innerHTML=['Tudo','12 meses','6 meses','3 meses'].map((label,i)=>'<button type="button" data-v3-months="'+[0,12,6,3][i]+'" class="'+(period===[0,12,6,3][i]?"chosen":"")+'">'+label+'</button>').join("");
 $("v3HistoricalMode").innerHTML=['Mensal','Anual'].map((label,i)=>'<button type="button" data-v3-annual="'+i+'" class="'+(annual===!!i?"chosen":"")+'">'+label+'</button>').join("");
 $("v3HistoryChart").innerHTML=chart(values,"Evolução patrimonial baseada nos registros do Excel");
 const first=values[0],last=values.at(-1);
 $("v3HistoryFirst").textContent=first?fmt(first.value):"—";
 $("v3HistoryLast").textContent=last?fmt(last.value):"—";
 $("v3HistoryDelta").textContent=first&&last?fmt(last.value-first.value):"—";
 $("v3HistoryDescription").textContent=historySelection?
  "Série por categoria construída de saldos observados individualmente. A cobertura é parcial, podendo faltar ativos ou datas. Não corresponde necessariamente ao fechamento mensal completo.":
  "Fechamentos mensais informados na planilha. Outubro é provisório e reúne competências diferentes. Crescimento não equivale à rentabilidade.";
 $("v3HistoryRows").innerHTML=values.slice().reverse().map(x=>'<div class="v3-history-row"><span>'+esc(monthDate(x.month))+(x.complete?"":' <small>parcial</small>')+'</span><strong data-v3-money>'+fmt(x.value)+'</strong></div>').join("");
}
function renderIncome(){
 const data=getState().dataEngine||{},years=L.yearList(data);if(!years.includes(incomeYear))incomeYear=years[0]||"2026";
 $("v3IncomeYear").innerHTML=years.map(y=>'<option value="'+esc(y)+'" '+(incomeYear===y?"selected":"")+'>'+y+'</option>').join("");
 const report=L.incomeByYear(data,incomeYear);
 $("v3IncomeTotal").textContent=fmt(report.total);
 $("v3IncomeSplit").innerHTML='<div><span>Dividendos ações</span><strong data-v3-money>'+fmt(report.stocks)+'</strong></div><div><span>Rendimentos FIIs</span><strong data-v3-money>'+fmt(report.fiis)+'</strong></div>';
 const max=Math.max(1,...report.months.map(m=>m.total));
 $("v3IncomeMonths").innerHTML=report.months.length?report.months.map(row=>'<div class="v3-income-row"><span>'+esc(monthDate(row.month))+'</span><span class="v3-income-track"><i style="width:'+Math.min(100,100*row.stock/max).toFixed(1)+'%"></i><b style="width:'+Math.min(100,100*row.fiis/max).toFixed(1)+'%"></b></span><strong data-v3-money>'+fmt(row.total)+'</strong></div>').join(""):'<p class="v3-empty">Sem proventos registrados para este ano.</p>';
}
function render(){
 if(!$("v3Home"))return;
 renderHome();renderPortfolio();renderHistory();renderIncome();
}
function mount(options){
 getState=options.getState;navigate=options.navigate;
 document.addEventListener("click",e=>{
  const t=e.target.closest("[data-v3-facet],[data-v3-detail],[data-v3-product],[data-v3-months],[data-v3-annual],[data-v3-reset],[data-v3-private],[data-v3-openportfolio],[data-v3-openhistory]");
  if(!t)return;
  if(t.hasAttribute("data-v3-facet")){facet=t.dataset.v3Facet;selection="";renderPortfolio();}
  else if(t.hasAttribute("data-v3-detail"))showDetail(t.dataset.v3Detail);
  else if(t.hasAttribute("data-v3-product")){facet="product";selection=t.dataset.v3Product;renderPortfolio();navigate("portfolio");}
  else if(t.hasAttribute("data-v3-months")){period=Number(t.dataset.v3Months);renderHistory();}
  else if(t.hasAttribute("data-v3-annual")){annual=t.dataset.v3Annual==="1";renderHistory();}
  else if(t.hasAttribute("data-v3-reset")){facet="product";selection="";search="";$("v3PortfolioSearch").value="";renderPortfolio();}
  else if(t.hasAttribute("data-v3-private")){hidden=!hidden;document.body.classList.toggle("v3-private",hidden);render();}
  else if(t.hasAttribute("data-v3-openportfolio"))navigate("portfolio");
  else if(t.hasAttribute("data-v3-openhistory"))navigate("history");
 });
 $("v3PortfolioCategory").addEventListener("change",e=>{selection=e.target.value;renderPortfolio();});
 $("v3PortfolioSearch").addEventListener("input",e=>{search=e.target.value;renderPortfolio();});
 $("v3HistoryCategory").addEventListener("change",e=>{historySelection=e.target.value;renderHistory();});
 $("v3IncomeYear").addEventListener("change",e=>{incomeYear=e.target.value;renderIncome();});
 $("v3DetailDialog").addEventListener("click",e=>{if(e.target.closest("[data-v3-close]"))$("v3DetailDialog").close();});
 document.body.classList.add("v3-ready");
 render();
}
root.WealthV3View={mount,render,openDetail:showDetail};
})(window);