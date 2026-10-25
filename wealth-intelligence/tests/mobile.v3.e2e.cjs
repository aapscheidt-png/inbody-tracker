"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");
(async()=>{
 const errors=[],browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:"pt-BR",acceptDownloads:true});
 const page=await context.newPage();
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
    {id:"old-fgts",name:"FUNDO ELET FGTS",type:"funds",currency:"BRL",account:"Carteira doméstica",observations:[{date:"2024-11-29",value:8100,source:{sheet:"2024",cell:"AT47"}},{date:"2024-12-31",value:7813.94,source:{sheet:"2024",cell:"AW47"}}]},
    {id:"new-fgts",name:"FUNDO  FGTS",type:"funds",currency:"BRL",account:"Carteira doméstica",observations:[{date:"2024-12-31",value:7813.94,source:{sheet:"2025",cell:"B55"}},{date:"2025-01-31",value:8282.04,source:{sheet:"2025",cell:"E55"}}]}
   ],
   reportedDistributions:[{date:"2026-01-01",kind:"stock_dividends_total",amount:360,source:"2026!C76"},{date:"2026-02-01",kind:"fii_income_total",amount:100,source:"2026!D79"}],
   reportedContributions:[],quality:[]}
 };
 await page.locator("#openSettings").click();
 page.once("dialog",d=>d.accept());
 await page.locator("#importBackup").setInputFiles({name:"synthetic-wallet.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(synthetic))});
 await page.waitForFunction(()=>document.querySelector("#modeBadge")?.textContent==="LOCAL");
 await page.locator(".tabbar [data-go='home']").click();
 assert.ok((await page.locator("#v3Home").textContent()).includes("Previdência"));
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
 await page.screenshot({path:"artifacts/v3-01-summary.png",fullPage:true});
 await page.locator("[data-v3-openpension]").click();
 assert.equal(await page.locator("#v3HistoryCategory").inputValue(),"pension");
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),2);
 await page.locator("#v3HistoryCategory").selectOption("");
 await page.locator(".tabbar [data-go='home']").click();
 await page.locator(".tabbar [data-go='portfolio']").click();
 await page.locator("#v3PortfolioCategories .v3-group").first().waitFor();
 assert.equal(await page.locator("#v3PortfolioCategories .v3-group").count(),7);
 await page.locator("#v3PortfolioCategory").selectOption("pension");
 assert.equal(await page.locator("#v3PortfolioTotal").textContent(),"R$ 210.000,00");
 assert.equal(await page.locator("#v3PortfolioCategories .v3-item").count(),2);
 await page.locator("#v3PortfolioCategories .v3-item").first().click();
 await page.locator("#v3DetailDialog").waitFor({state:"visible"});
 assert.ok((await page.locator("#v3DetailContent").textContent()).includes("Previdência"));
 await page.locator("[data-v3-close]").click();
 await page.screenshot({path:"artifacts/v3-02-pension-filter.png",fullPage:true});
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
 await page.screenshot({path:"artifacts/v3-03-fund-exposure.png",fullPage:true});
 await page.locator("[data-v3-reset]").click();
 assert.equal(await page.locator("#v3PortfolioCategories .v3-group").count(),7);
 await page.locator(".tabbar [data-go='history']").click();
 assert.ok(await page.locator("#v3HistoryChart svg").isVisible());
 const disconnected=await page.evaluate(()=>{
  const html=window.WealthV3View.renderChart([{month:"2026-01",value:100,complete:false},{month:"2026-03",value:130,complete:false}],"Interrupted history");
  return html.match(/<path d="([^"]+)"/)?.[1]||"";
 });
 assert.equal((disconnected.match(/M/g)||[]).length,2,"Missing February is not a drawn continuous line");
 assert.equal(await page.locator("#v3HistoryChart svg text").count(),0,"No overlapping labels inside small mobile SVG");
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),35);
 await page.locator("[data-v3-annual='1']").click();
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),4);
 assert.ok((await page.locator("#v3HistoryRows .v3-history-row").first().textContent()).includes("parcial"),"2026 annual value is Jan–Sep only");
 assert.ok((await page.locator("#v3HistoryRows").textContent()).includes("ano completo"),"2024 and 2025 Jan–Dec must be identified");
 await page.locator("[data-v3-annual='0']").click();
 await page.locator("#v3HistoryCategory").selectOption("pension");
 assert.ok((await page.locator("#v3HistoryDescription").textContent()).includes("cobertura histórica varia"));
 assert.ok((await page.locator("#v3HistoryDelta").textContent()).includes("N/D"));
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),2);
 await page.locator("#v3HistoryDimension").selectOption("account");
 await page.locator("#v3HistoryCategory").selectOption("Previdência");
 assert.equal(await page.locator("#v3HistoryRows .v3-history-row").count(),2);
 await page.locator("#v3HistoryDimension").selectOption("product");
 await page.locator("#v3HistoryCategory").selectOption("pension");
 await page.screenshot({path:"artifacts/v3-04-history.png",fullPage:true});
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
 await page.screenshot({path:"artifacts/v3-05-proventos.png",fullPage:true});
 await page.locator("[data-v3-private]").click();
 assert.ok((await page.locator("#v3IncomeTotal").textContent()).includes("•••"));
 await page.locator("[data-v3-private]").click();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert.ok(overflow<=3,"Unexpected horizontal page overflow: "+overflow);
 assert.deepEqual(errors,[],"No browser or CSP errors in V3 mobile flow");
 console.log("V3 mobile product facets, pension, history, privacy, income and screenshots: PASS");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
