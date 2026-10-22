"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright-core");

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "pt-BR"
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", msg => { if (msg.type() === "error") errors.push("console: "+msg.text()); });
  const base = "http://127.0.0.1:3000";
  await page.goto(base, {waitUntil: "networkidle", timeout: 30000});
  await page.locator("#heroTotal").waitFor();
  const before = await page.locator("#heroTotal").textContent();
  assert.ok(before.includes("1.329.973,50"), "Demo balance displays exact cents, got "+before+"; JS errors: "+errors.join(" | "));
  assert.ok(await page.locator("#demoNotice").isVisible(), "Demo notice is visible");
  await page.screenshot({path:"artifacts/01-home-demo.png",fullPage:true});

  // Five screens and Monte Carlo render without DOM or script errors.
  for (const [key,selector] of [["portfolio","#positionsList .asset-line"],["scenario","#projectionChart svg"],["insights","#scoreNumber"],["history","#historyChart svg"],["home","#heroSpark svg"]]) {
    await page.locator(".tabbar [data-go='"+key+"']").click();
    await page.locator(selector).first().waitFor({state:"visible"});
  }
  await page.locator(".tabbar [data-go='scenario']").click();
  await page.locator("#simMonthly").fill("9500");
  await page.locator("#simYears").fill("10");
  await page.locator("#runSimulation").click();
  assert.ok((await page.locator("#forecastMedian").textContent()).startsWith("R$"));
  await page.screenshot({path:"artifacts/02-scenarios.png",fullPage:true});

  // Create personal wallet, register real-looking but synthetic position.
  await page.locator(".tabbar [data-go='home']").click();
  await page.locator("#demoNotice [data-action='start']").click();
  await page.locator("#positionsList [data-action='add-position']").click();
  await page.locator("#posName").fill("Teste CDI local");
  await page.locator("#posTicker").fill("TESTE1");
  await page.locator("#posQty").fill("10");
  await page.locator("#posCost").fill("100");
  await page.locator("#posPrice").fill("105");
  await page.locator("#positionForm button[type=submit]").click();
  assert.ok((await page.locator("#portfolioTotal").textContent()).includes("1.050"), "Value is computed from unit quantity and price");
  assert.equal(await page.locator("#positionsList .asset-line").count(),1);
  await page.screenshot({path:"artifacts/03-wallet.png",fullPage:true});

  // Store survives refresh and is never replaced by the demo.
  await page.reload({waitUntil:"networkidle"});
  await page.locator(".tabbar [data-go='portfolio']").click();
  assert.equal(await page.locator("#positionsList .asset-line").count(),1);
  assert.equal(await page.locator("#demoNotice").isVisible(),false);
  await page.locator(".tabbar [data-go='scenario']").click();
  const forecast = await page.locator("#forecastMedian").textContent();
  assert.ok(forecast&&forecast.includes("R$"), "Personal scenario works");

  // CSV import replaces positions without mixing demonstration holdings.
  await page.locator("#openSettings").click();
  const csv = 'nome;codigo;classe;moeda;quantidade;custo_unitario;preco_atual;data_preco\n"ETF internacional";WRLD;Internacional;USD;2;100;120;2026-10-12';
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#importCsv").setInputFiles({
    name:"holdings.csv", mimeType:"text/csv", buffer:Buffer.from(csv,"utf8")
  });
  await page.locator(".tabbar [data-go='portfolio']").click();
  await page.locator("#positionsList .asset-line").first().waitFor();
  assert.equal(await page.locator("#positionsList .asset-line").count(),1);
  assert.ok((await page.locator("#positionsList .asset-line").first().textContent()).includes("ETF internacional"));
  await page.screenshot({path:"artifacts/04-imported-wallet.png",fullPage:true});

  // Historical holdings have only balances, not transaction costs or reconciled net contributions.
  await page.locator("#openSettings").click();
  const unknown={version:1,mode:"personal",fx:5.2,benchmarkAnnualPct:10,
    assumptions:{target:5000000,monthly:7000,years:12,rate:10,vol:12,inflation:4},
    positions:[{id:"legacy1",name:"Posição histórica demonstrativa",ticker:"HIST",type:"pension",currency:"BRL",units:1,cost:0,costKnown:false,price:75000,asOf:"2026-05-31"}],
    history:[{date:"2025-12-31",total:60000,flow:0,flowKnown:false},{date:"2026-05-31",total:75000,flow:0,flowKnown:false}]};
  page.once("dialog", dialog=>dialog.accept());
  await page.locator("#importBackup").setInputFiles({name:"historical.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(unknown))});
  await page.locator(".tabbar [data-go='home']").click();
  assert.ok((await page.locator("#heroTotal").textContent()).includes("75.000"));
  assert.ok((await page.locator("#heroGain").textContent()).includes("indisponível"));
  await page.locator(".tabbar [data-go='portfolio']").click();
  assert.ok((await page.locator("#positionsList").textContent()).includes("Saldo informado no extrato"));
  await page.locator(".tabbar [data-go='history']").click();
  assert.equal(await page.locator("#historyTwr").textContent(),"—");
  assert.equal(await page.locator("#performanceXirr").textContent(),"—");
  await page.screenshot({path:"artifacts/05-valuation-only.png",fullPage:true});

  // Privacy-safe synthetic XLSX exercises the native ZIP/XML parser in a real mobile browser.
  const {fixture}=require("./synthetic-xlsx.cjs");
  await page.locator("#openSettings").click();
  await page.locator("#importXlsx").setInputFiles({
    name:"synthetic-wealth.xlsx",
    mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer:fixture()
  });
  await page.locator("#xlsxDialog").waitFor({state:"visible",timeout:15000});
  assert.ok((await page.locator("#xlsxPreview").textContent()).includes("PATRIMÔNIO PROVISÓRIO"));
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#confirmXlsx").click();
  await page.locator("#dataQualityStrip").waitFor({state:"visible"});
  await page.locator("#reconciliationPanel").waitFor({state:"visible"});
  assert.equal(await page.locator("#demoNotice").isVisible(),false,"Demo notice must be hidden after personal Excel import");
  assert.ok((await page.locator("#heroTotal").textContent()).includes("2.500,00"),"Dashboard original should be the headline");
  assert.ok((await page.locator("#reconcileReported").textContent()).includes("2.500,00"));
  assert.ok((await page.locator("#reconcileCalculated").textContent()).includes("R$"));
  assert.ok((await page.locator("#reconcileExplanation").textContent()).includes("dois valores não fecham"));
  await page.screenshot({path:"artifacts/07-reconciliation-home.png",fullPage:true});
  await page.locator(".tabbar [data-go='portfolio']").click();
  assert.ok(await page.locator("#portfolioBreakdown").isVisible());
  assert.ok(await page.locator("#positionsList .asset-group").count()>=3);
  await page.locator("#portfolioSearch").fill("ABCB4");
  assert.equal(await page.locator("#positionsList .asset-line").count(),1);
  assert.ok((await page.locator("#positionsList .asset-line").textContent()).includes("ABCB4"));
  await page.screenshot({path:"artifacts/08-grouped-portfolio.png",fullPage:true});
  await page.locator("#portfolioSearch").fill("");

  assert.ok((await page.locator("#heroAsOf").textContent()).includes("PARCIAL"));
  await page.locator(".tabbar [data-go='history']").click();
  await page.locator("#assetHistoryPanel").waitFor({state:"visible"});
  await page.locator("[data-history-view=ledger]").click();
  assert.ok(await page.locator("#reportedFlowsPanel").isVisible());
  assert.ok((await page.locator("#reportedTotalFlows").textContent()).includes("13.260"));
  const receivedIncome=await page.locator("#reportedTotalIncome").textContent();
  assert.ok(receivedIncome.includes("1.319,54"),"Reported income was "+receivedIncome+"; ledger "+(await page.locator("#reportedFlowsList").textContent()).slice(0,250));

  await page.locator("[data-history-view=audit]").click();
  assert.ok(await page.locator("#dataAuditPanel").isVisible());
  assert.ok((await page.locator("#auditIssues").textContent()).includes("SEPTEMBER_TOTAL_FORMULA"));
  await page.screenshot({path:"artifacts/06-xlsx-history.png",fullPage:true});
  assert.deepEqual(errors, [], "No browser errors on core flows");
  console.log("PASS: Chromium mobile UX, all 5 views, simulation, local storage, CSV import");
  await browser.close();
})().catch(error => {console.error(error); process.exit(1);});
