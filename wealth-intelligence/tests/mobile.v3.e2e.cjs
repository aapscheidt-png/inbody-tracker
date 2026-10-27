"use strict";
const assert=require("node:assert/strict");
const {chromium,webkit}=require("playwright-core");
(async()=>{
 const browserType=process.env.WEALTH_BROWSER==="webkit"?webkit:chromium;
 const errors=[],browser=await browserType.launch(browserType===chromium?{channel:"chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]}:{headless:true});
 try{
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:"pt-BR",acceptDownloads:true});
 const page=await context.newPage();
 // Playwright's WebKit screenshot machinery itself injects two temporary inline
 // styles per capture; our production CSP correctly refuses those styles.
 // Keep screenshots on Chrome; run WebKit with zero screenshot-side effects,
 // preserving every functional / CSP assertion against the app itself.
 const takeScreenshot=async path=>{
  if(browserType!==webkit)await page.screenshot({path,fullPage:false,caret:"initial",animations:"allow"});
 };
 page.on("pageerror",e=>errors.push(e.message));
 page.on("console",msg=>{if(msg.type()==="error"&& !msg.text().includes("favicon"))errors.push(msg.text());});
 await page.goto("http://127.0.0.1:3000/",{waitUntil:"networkidle"});
 await page.locator(".v3-ready").waitFor();
 assert.equal(await page.locator(".tabbar [data-go]").count(),4);
 assert.ok(await page.locator("#v3Home").isVisible());
 function pos(name,type,price,account,originalCurrency="BRL"){
  return{id:"v3test"+name.replace(/\W/g,"").slice(0,13),name,type,account,currency:"BRL",units:1,price,costKnown:false,cost:0,asOf:type==="pension"?"2026-09-30":"2026-10-15",originalCurrency,originalValue:originalCurrency==="USD"?price/5:price,source:{sheet:"2026",cell:"A1"}};
 }
 const positions=[
 pos("Santander Previ","pension",160000,"Previdência"),
 pos("Banesprev","pension",50000,"Previdência"),
 pos("TREND OURO","metals",65000,"Carteira doméstica"),
 pos("TREND OURO DOLAR","metals",15000,"Carteira doméstica"),
 pos("TREND PRATA","metals",29000,"Carteira doméstica"),
 pos("ARX FUJI RF","fixed_income",70000,"Carteira doméstica"),
 pos("TREND IA","funds",6000,"Carteira doméstica"),
 pos("FUND IMOBILIÁRIO","reits",50000,"Carteira doméstica"),
 pos("FUNDO  FGTS","funds",19000,"Carteira doméstica"),
 pos("POUP STD","cash",1000,"Carteira doméstica"),
 pos("ABCB4","stocks",9200,"Carteira de ações"),
 pos("Exterior · Variável","international",10500,"Investimentos internacionais","USD"),
 pos("Mercado BTC","crypto",1000,"Cripto")
 ];
 const history=Array.from({length:35},(_,i)=>({date:new Date(Date.UTC(2023,i+11,0)).toISOString().slice(0,10),total:320000+12500*i,flow:0,flowKnown:false,source:"synthetic"}));
 const synthetic={version:1,mode:"personal",fx:5,benchmarkAnnualPct:10,positions,history,
  assumptions:{target:1500000,monthly:10000,years:12,rate:8,vol:10,inflation:4},
  dataEngine:{sourceMetadata:{filename:"V3-synthetic.xlsx",latestDate:"2026-10-15",latestFullMonth:"2026-09-30",latestPensionDate:"2026-09-30",partial:true,sourceVerified:true,sourceTotal:485700,calculatedTotal:485700,sourceBuckets:[{key:"domestic",excelValue:264200,importedValue:264200,matched:true},{key:"international",excelValue:10500,importedValue:10500,matched:true},{key:"pension",excelValue:210000,importedValue:210000,matched:true},{key:"crypto",excelValue:1000,importedValue:1000,matched:true}]},
   sourceRates:[{date:"2026-08-01",rate:5},{date:"2026-09-01",rate:5},{date:"2026-10-01",rate:5}],
   assetHistory:[
    {id:"santander",name:"Santander Previ",type:"pension",currency:"BRL",account:"Previdência",observations:[{date:"2026-08-01",value:150000},{date:"2026-09-01",value:160000}]},
    {id:"banes",name:"Banesprev",type:"pension",currency:"BRL",account:"Previdência",observations:[{date:"2026-09-01",value:50000}]},
    {id:"old-fgts",name:"FUNDO ELET FGTS",type:"funds",currency:"BRL",account:"Carteira doméstica",observations:[{date:"2024-11-29",value:8100,source:{sheet:"2024",cell:"AT47"}},{date:"2024-12-31",value:7800.50,source:{sheet:"2024",cell:"AW47"}}]},
    {id:"new-fgts",name:"FUNDO  FGTS",type:"funds",currency:"BRL",account:"Carteira doméstica",observations:[{date:"2024-12-31",value:7800.50,source:{sheet:"2025",cell:"B55"}},{date:"2025-01-31",value:8299.25,source:{sheet:"2025",cell:"E55"}}]}
   ],
   reportedDistributions:[{date:"2026-01-01",kind:"stock_dividends_total",amount:360,source:"2026!C76"},{date:"2026-02-01",kind:"fii_income_total",amount:100,source:"2026!D79"}],
   reportedContributions:[],quality:[]}
 };
 synthetic.dataEngine.sourceMetadata.sourcePositionFingerprint=await page.evaluate(items=>window.WealthEngine.positionFingerprint(items),positions);
 await page.locator("#openSettings").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#importBackup").setInputFiles({name:"synthetic-wallet.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(synthetic))});
 await page.waitForFunction(()=>document.querySelector("#modeBadge")?.textContent==="LOCAL");
 await page.locator(".tabbar [data-go='home']").click();
 assert.ok((await page.locator("#v3Home").textContent()).includes("Previdência"));
 assert.equal(await page.locator(".v3-allocation-row").count(),7,"Seven product groups remain accessible at a glance");
 assert.ok(await page.locator(".v3-home-trend").isVisible());
 assert.ok(await page.locator(".v3-home-trend [data-v3-y-label]").count()>=3,"Summary chart has monetary scale");
 assert.ok(await page.locator(".v3-home-trend [data-v3-x-label]").count()>=2,"Summary chart shows month/year");
 assert.ok(await page.locator(".v3-home-allocation").isVisible());
 assert.equal(await page.locator(".v3-allocation-track svg rect").count(),7,"All seven products occupy the SVG composition bar");
 assert.ok(Number(await page.locator(".v3-allocation-track svg rect").first().getAttribute("width"))>0,"SVG bar must have positive geometry without inline CSS");
 assert.ok(await page.evaluate(()=>document.querySelector(".v3-home-trend").getBoundingClientRect().top <
  document.querySelector(".v3-home-allocation").getBoundingClientRect().top),"Balance evolution precedes allocation");
 assert.ok((await page.locator("#v3Home").textContent()).includes("210.000,00"));
 assert.ok((await page.locator(".v3-integrity").textContent()).includes("Subtotais conferidos com o Excel"));
 // Direct reconciliation CTA must open the existing local Excel picker.
 const chooserPromise=page.waitForEvent("filechooser");
 await page.locator("[data-v3-reimport]").click();
 const chooser=await chooserPromise;
 assert.equal(chooser.isMultiple(),false);
 await chooser.setFiles([]);
 await page.locator("#settingsDialog").evaluate(x=>x.open&&x.close());
 // Capture the actual layout after temporary import confirmation disappears.
 await page.waitForFunction(()=>!document.querySelector("#toast")?.classList.contains("show"),null,{timeout:6000});
 await page.waitForTimeout(350);
 await takeScreenshot("artifacts/v3-01-summary.png");
 await page.locator("[data-v3-openpension]").click();
 assert.equal(await page.locator("#v3HistoryCategory").inputValue(),"pension");
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),2);
 await page.locator("#v3HistoryCategory").selectOption("");
 await page.locator(".tabbar [data-go='home']").click();
 await page.locator(".tabbar [data-go='portfolio']").click();
 await page.locator("#v3PortfolioCategories .v3-group").first().waitFor();
 assert.equal(await page.locator("#v3PortfolioFilterArea").isVisible(),false,"Advanced filters should be out of the way by default");
 assert.equal(await page.locator("#v3PortfolioCategories .v3-group[open]").count(),0,"Initial portfolio shows the categories without expanding a long list");
 await page.locator("[data-v3-togglefilters]").click();
 assert.equal(await page.locator("#v3PortfolioFilterArea").isVisible(),true,"Filters should open on demand");
 assert.equal(await page.locator("#v3PortfolioCategories .v3-group").count(),7);
 await page.locator("#v3PortfolioCategory").selectOption("pension");
 assert.equal(await page.locator("#v3PortfolioTotal").textContent(),"R$ 210.000,00");
 assert.equal(await page.locator("#v3PortfolioCategories .v3-item").count(),2);
 await page.locator("#v3PortfolioCategories .v3-item").first().click();
 await page.locator("#v3DetailDialog").waitFor({state:"visible"});
 assert.ok((await page.locator("#v3DetailContent").textContent()).includes("Previdência"));
 await page.locator("[data-v3-close]").click();
 await takeScreenshot("artifacts/v3-02-pension-filter.png");
 await page.locator("#v3PortfolioCategory").selectOption("fund");
 assert.equal(await page.locator("#v3PortfolioCategories .v3-item").count(),6);
 assert.ok((await page.locator("#v3PortfolioCategories").textContent()).includes("FUNDO  FGTS"));
 await page.locator("#v3PortfolioCategories .v3-item").filter({hasText:"FUNDO  FGTS"}).click();
 await page.locator("#v3DetailDialog").waitFor({state:"visible"});
 assert.ok((await page.locator("#v3DetailContent").textContent()).includes("série histórica unifica"));
 assert.ok((await page.locator("#v3DetailContent").textContent()).includes("3 registros de origem"));
 await page.locator("[data-v3-close]").click();
 assert.ok((await page.locator("#v3PortfolioTotal").textContent()).includes("204.000,00"));
 assert.ok((await page.locator("#v3PortfolioCategories").textContent()).includes("ARX FUJI RF"));
 await page.locator("[data-v3-facet=exposure]").click();
 await page.locator("#v3PortfolioCategory").selectOption("metals");
 assert.equal(await page.locator("#v3PortfolioCategories .v3-item").count(),3);
 await takeScreenshot("artifacts/v3-03-fund-exposure.png");
 await page.locator("[data-v3-reset]").click();
 assert.equal(await page.locator("#v3PortfolioCategories .v3-group").count(),7);
 await page.locator(".tabbar [data-go='history']").click();
 assert.ok(await page.locator("#v3HistoryChart svg").isVisible());
 assert.equal(await page.locator(".v3-history-context").evaluate(x=>x.open),false,"Financial caveats should remain available without crowding the plot");
 await page.locator("#v3HistoryShort").click();
 assert.ok(await page.locator("#v3HistoryDescription").isVisible(),"History methodology can be expanded");
 await page.locator("#v3HistoryShort").click();
 await page.locator("#v3HistoryChart [data-v3-chartpoint]").last().click();
 assert.ok(await page.locator("#v3HistoryChart .v3-chart-picked").isVisible(),"Tap a monthly balance to show its date and amount");
 assert.ok((await page.locator("#v3HistoryChart .v3-chart-picked").textContent()).includes("09/2026"));
 const segmentChecks=await page.evaluate(()=>{
  const render=window.WealthV3View.renderChart;
  const disconnected=render([{month:"2026-01",value:100,complete:false},{month:"2026-03",value:130,complete:false}],"Interrupted history");
  const partial=render([{month:"2026-01",value:100,complete:false},{month:"2026-02",value:130,complete:false}],"Partial");
  const complete=render([{month:"2026-01",value:100,complete:true},{month:"2026-02",value:130,complete:true}],"Complete");
  const count=html=>(html.match(/<path d=/g)||[]).length;
  return{gap:count(disconnected),partial:count(partial),dashed:partial.includes('stroke-dasharray="5 5"'),
   complete:count(complete),solid:!complete.includes("stroke-dasharray")};
 });
 assert.equal(segmentChecks.gap,0,"No visual line across missing February");
 assert.equal(segmentChecks.partial,1,"Partial data still displays its observed movement");
 assert.equal(segmentChecks.dashed,true,"Partial observations must be visibly dashed");
 assert.equal(segmentChecks.complete,1);
 assert.equal(segmentChecks.solid,true,"Complete observed months use solid line");
 const annualEdges=await page.evaluate(()=>{
  const chart=window.WealthV3View.renderChart;
  const base={month:"2025-12",value:200,complete:true,yearComplete:true,monthsObserved:12};
  const current={month:"2026-09",value:220,complete:true,yearComplete:false,monthsObserved:9};
  const contiguous=chart([base,current],"Year to date");
  const missing=chart([base,{...current,monthsObserved:8}],"Incomplete year");
  return{continuous:(contiguous.match(/<path d=/g)||[]).length,
   dashed:contiguous.includes('stroke-dasharray="5 5"'),
   missing:(missing.match(/<path d=/g)||[]).length};
 });
 assert.equal(annualEdges.continuous,1,"Nine consecutive 2026 months may connect to 2025 close");
 assert.equal(annualEdges.dashed,true,"2026 is a partial year, never a solid annual return");
 assert.equal(annualEdges.missing,0,"Annual series with a missing month must remain disconnected");
 assert.ok(await page.locator("#v3HistoryChart [data-v3-y-label]").count()>=3,"Visible monetary y-axis ticks");
 assert.ok(await page.locator("#v3HistoryChart [data-v3-x-label]").count()>=2,"Dated x-axis ticks");
 assert.ok((await page.locator("#v3HistoryChart").textContent()).includes("Saldo (R$)"),"Chart states its monetary unit");
 assert.ok((await page.locator("#v3HistoryChart").textContent()).includes("Mensal"),"Chart states its time resolution");
 const monthlyTicks=await page.locator("#v3HistoryChart [data-v3-x-label]").allTextContents();
 assert.ok(monthlyTicks.some(t=>t.includes("/")),"Months are labeled MM/YYYY");
 await page.locator("[data-v3-annual='1']").click();
 assert.ok((await page.locator("#v3HistoryChart").textContent()).includes("Anual"));
 const yearTicks=await page.locator("#v3HistoryChart [data-v3-x-label]").allTextContents();
 assert.ok(yearTicks.includes("2026*"),"The unfinished year is visibly flagged");
 assert.ok((await page.locator("#v3HistoryChart").textContent()).includes("Ano incompleto"),"Annual asterisk has a textual explanation");
 await page.locator("[data-v3-annual='0']").click();
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),35);
 await page.locator("[data-v3-annual='1']").click();
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),4);
 assert.ok((await page.locator("#v3HistoryRows .v3-history-row").first().textContent()).includes("parcial"),"2026 annual value is Jan–Sep only");
 assert.ok((await page.locator("#v3HistoryRows").textContent()).includes("ano completo"),"2024 and 2025 Jan–Dec must be identified");
 await page.locator("[data-v3-annual='0']").click();
 await page.locator("#v3HistoryCategory").selectOption("pension");
 assert.ok((await page.locator("#v3HistoryDescription").textContent()).includes("cobertura histórica pode variar"));
 assert.ok((await page.locator("#v3History .v3-card-top h3").first().textContent()).includes("Previdência"),"History chart identifies the selected product");
 assert.ok((await page.locator("#v3HistoryDelta").textContent()).includes("N/D"));
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),2);
 await page.locator("#v3HistoryDimension").selectOption("account");
 await page.locator("#v3HistoryCategory").selectOption("Previdência");
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),2);
 await page.locator("#v3HistoryDimension").selectOption("product");
 await page.locator("#v3HistoryCategory").selectOption("pension");
 await page.evaluate(()=>scrollTo(0,0));
 await takeScreenshot("artifacts/v3-04-history.png");
 // Stale or edited wallet must never keep the source-verified banner.
 await page.evaluate(()=>{
  const key="wealth-intelligence-ai.v1",raw=JSON.parse(localStorage.getItem(key));
  raw.positions.filter(x=>x.type==="pension").forEach(x=>{x.price=0;});
  localStorage.setItem(key,JSON.stringify(raw));
 });
 await page.reload({waitUntil:"networkidle"});
 assert.ok((await page.locator(".v3-integrity").textContent()).includes("Carteira diferente do Excel"));
 assert.ok((await page.locator("#v3Home").textContent()).includes("Previdência divergente"));
 assert.ok((await page.locator("#v3Home .v3-key-figures strong").first().textContent()).includes("0,00"),"Zero pension must remain explicitly visible, regardless of currency spacing");
 // Restore a clean synthetic fixture before continuing standard flow.
 await page.locator("#openSettings").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#importBackup").setInputFiles({name:"synthetic-restored.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(synthetic))});
 await page.waitForFunction(()=>document.querySelector(".v3-integrity")?.textContent.includes("Subtotais conferidos"));
 await page.locator(".tabbar [data-go='income']").click();
 assert.ok((await page.locator("#v3IncomeTotal").textContent()).includes("460,00"));
 assert.ok((await page.locator("#v3IncomeMonths").textContent()).includes("Escala em R$"),"Proventos exposes monetary units");
 assert.equal(await page.locator(".v3-income-ticks span").count(),3,"Proventos scale has baseline, middle and ceiling");
 assert.ok((await page.locator("#v3IncomeMonths").textContent()).includes("Somente meses com lançamentos"));
 assert.ok((await page.locator("#v3IncomeMonths").textContent()).includes("Ações"));
 assert.ok((await page.locator("#v3IncomeMonths").textContent()).includes("FIIs"));
 assert.ok(Number(await page.locator(".v3-income-track svg rect").first().getAttribute("width"))>0,"Monthly stock bar uses SVG geometry under CSP");
 await page.waitForFunction(()=>!document.querySelector("#toast")?.classList.contains("show"),null,{timeout:6000});
 await page.evaluate(()=>scrollTo(0,0));
 await page.waitForTimeout(350);
 await takeScreenshot("artifacts/v3-05-proventos.png");
 await page.locator("[data-v3-private]").click();
 assert.ok((await page.locator("#v3IncomeTotal").textContent()).includes("•••"));
 assert.ok((await page.locator(".v3-income-ticks").textContent()).includes("•••"),"Privacy also hides chart scales");
 await page.locator(".tabbar [data-go='home']").click();
 assert.ok(!(await page.locator("#v3Home").textContent()).match(/\d+[.,]\d+%/),"Private home hides allocation percentages");
 assert.ok((await page.locator("#v3Home .v3-allocation-track svg rect title").first().textContent()).includes("•••"),"Allocation tooltip contains no exposed percentage");
 await page.locator(".tabbar [data-go='portfolio']").click();
 assert.ok(!(await page.locator("#v3PortfolioCategories").textContent()).match(/\d+[.,]\d+%/),"Private portfolio hides allocation percentages");
 await page.locator(".tabbar [data-go='income']").click();
 await page.locator("[data-v3-private]").click();
 // Real workbook has 35 monthly balances for BOTH plans; test the same coverage pattern.
 await page.evaluate(()=>{
  const key="wealth-intelligence-ai.v1",data=JSON.parse(localStorage.getItem(key));
  const mk=(base,step)=>Array.from({length:35},(_,i)=>({
   date:new Date(Date.UTC(2023,11+i,0)).toISOString().slice(0,10),
   value:base+i*step,source:{sheet:i<14?"2024":i<26?"2025":"2026",cell:"K116"}
  }));
  data.dataEngine.assetHistory=data.dataEngine.assetHistory.filter(x=>x.type!=="pension");
  data.dataEngine.assetHistory.push(
   {id:"p0",name:"Santander Previ",type:"pension",account:"Previdência",currency:"BRL",observations:mk(126000,1000)},
   {id:"p1",name:"Banesprev",type:"pension",account:"Previdência",currency:"BRL",observations:mk(33000,500)}
  );
  localStorage.setItem(key,JSON.stringify(data));
 });
 await page.reload({waitUntil:"networkidle"});
 await page.locator(".tabbar [data-go='home']").click();
 await page.locator("[data-v3-openpension]").click();
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),35);
 assert.ok((await page.locator("#v3HistoryDescription").textContent()).includes("Dois planos de previdência"));
 assert.ok((await page.locator("#v3HistoryDelta").textContent()).includes("51.000,00"),"Full pension history must display the observed balance change");
 await page.locator("[data-v3-annual='1']").click();
 assert.ok((await page.locator("#v3HistoryRows").textContent()).includes("ano completo"),"2024 and 2025 pension years have full monthly coverage");
 assert.ok((await page.locator("#v3HistoryRows .v3-history-row").first().textContent()).includes("parcial"),"Sep-2026 is not a full calendar year");
 await takeScreenshot("artifacts/v3-06-pension-history-35-months.png");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert.ok(overflow<=3,"Unexpected horizontal page overflow: "+overflow);
 // Simulate common iPhone narrow/standard/large CSS viewports on the same private wallet.
 for(const width of [320,375,393,430]){
  await page.setViewportSize({width,height:852});
  for(const pageName of ["home","portfolio","history","income"]){
   await page.locator(".tabbar [data-go='"+pageName+"']").click();
   const measures=await page.evaluate(()=>{
    const w=document.documentElement.clientWidth,full=document.documentElement.scrollWidth;
    const tab=document.querySelector(".tabbar")?.getBoundingClientRect();
    const chart=document.querySelector(".page.active .v3-chart-area svg")?.getBoundingClientRect();
    return{w,full,tabLeft:tab?.left,tabRight:tab?.right,chartLeft:chart?.left,chartRight:chart?.right};
   });
   assert.ok(measures.full-measures.w<=3,"Horizontal overflow at "+width+"px on "+pageName+": "+JSON.stringify(measures));
   assert.ok(measures.tabLeft>=-2&&measures.tabRight<=width+2,"Navigation fits viewport "+width+"px on "+pageName);
   if(measures.chartLeft!==undefined)assert.ok(measures.chartLeft>=-2&&measures.chartRight<=width+2,"Chart fits viewport "+width+"px on "+pageName);
  }
 }
 await page.setViewportSize({width:393,height:852});
 // Browser-native XLSX import regression, all values generated synthetically in memory.
 // This runs on both Chromium and WebKit, exercising the actual ZIP/XML import UI.
 const {fixture}=require("./synthetic-xlsx.cjs");
 await page.locator("#openSettings").click();
 await page.locator("#importXlsx").setInputFiles({
  name:"v3-safe-synthetic.xlsx",
  mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  buffer:fixture()
 });
 await page.locator("#xlsxDialog").waitFor({state:"visible",timeout:15000});
 assert.equal(await page.locator("#confirmXlsx").isEnabled(),true,"Reconciled Excel enables explicit approval");
 assert.ok((await page.locator("#xlsxPreview").textContent()).includes("SALDOS PROVISÓRIOS"),"Excel preview describes mixed-date positions");
 page.once("dialog",d=>d.accept());
 await page.locator("#confirmXlsx").click();
 await page.waitForFunction(()=>document.querySelector(".v3-integrity")?.textContent.includes("Subtotais conferidos"),null,{timeout:10000});
 assert.ok((await page.locator("#heroTotal").textContent()).includes("1.037,50"),"Headline uses verified source positions, not dashboard");
 assert.equal(await page.locator("#reconcileSources .reconcile-bucket").count(),4,"Four Excel source totals were verified");
 const beforeInvalid=await page.evaluate(()=>localStorage.getItem("wealth-intelligence-ai.v1"));
 assert.ok(beforeInvalid&&beforeInvalid.includes("sourceVerified"),"Validated Excel has been persisted privately");
 await page.locator("#importXlsx").setInputFiles({
  name:"v3-rejected-synthetic.xlsx",
  mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  buffer:fixture(true)
 });
 await page.waitForFunction(()=>document.querySelector("#importStatus")?.textContent?.includes("Importação interrompida"),null,{timeout:10000});
 assert.equal(await page.evaluate(()=>localStorage.getItem("wealth-intelligence-ai.v1")),beforeInvalid,"Rejected Excel must never replace a prior valid wallet");
 assert.deepEqual(errors,[],"No browser or CSP errors in V3 mobile flow");
 console.log("V3 mobile product facets, pension, history, privacy, income and screenshots on "+browserType.name()+": PASS");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
