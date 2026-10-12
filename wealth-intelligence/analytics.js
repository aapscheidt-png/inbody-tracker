"use strict";
(function(global){
  const MS_DAY=86400000;
  const parse=(value)=>{const t=Date.parse(String(value)+"T00:00:00Z");return Number.isFinite(t)?t:null;};
  const normalizeRows=(rows)=>Array.isArray(rows)?rows.filter(x=>x&&parse(x.date)!==null&&Number.isFinite(Number(x.total))&&Number.isFinite(Number(x.flow||0))).map(x=>({date:x.date,total:Number(x.total),flow:Number(x.flow||0)})).sort((a,b)=>a.date.localeCompare(b.date)):[];
  function periodHistory(rows,key,now){
    const all=normalizeRows(rows),months={m1:1,m3:3,m6:6,y1:12,all:0},n=months[key];
    if(!n||!all.length)return all;
    const endDate=now||all[all.length-1].date,end=new Date(endDate+"T00:00:00Z");
    if(!Number.isFinite(end.getTime()))return all;
    const cutoff=new Date(end.getTime());cutoff.setUTCMonth(cutoff.getUTCMonth()-n);
    const cut=cutoff.toISOString().slice(0,10);
    let anchor=-1;
    for(let i=0;i<all.length;i++)if(all[i].date<=cut)anchor=i;
    if(anchor>=0)return all.slice(anchor);
    return all.filter(x=>x.date>=cut);
  }
  function growthBridge(rows){
    const a=normalizeRows(rows);
    if(a.length<2)return {ready:false,opening:null,closing:null,netFlows:0,result:0,change:0,returnOnOpening:null};
    const opening=a[0].total,closing=a[a.length-1].total;
    const netFlows=a.slice(1).reduce((v,x)=>v+x.flow,0);
    const result=closing-opening-netFlows,change=closing-opening;
    return{ready:true,opening,closing,netFlows,result,change,returnOnOpening:opening>0?100*result/opening:null,
      from:a[0].date,to:a[a.length-1].date,intervals:a.length-1};
  }
  function milestones(rows){
    const a=normalizeRows(rows),thresholds=[100000,250000,500000,1000000,2000000,3000000,5000000,10000000,20000000,50000000];
    return thresholds.map(value=>{const hit=a.find(x=>x.total>=value);return hit?{value,date:hit.date,observed:true}:null;}).filter(Boolean).reverse();
  }
  function adjustedPeriodReturns(rows){
    const h=normalizeRows(rows),points=[];
    for(let i=1;i<h.length;i++){
      const prev=h[i-1],next=h[i],days=(parse(next.date)-parse(prev.date))/MS_DAY;
      if(days<7||prev.total<=0||next.total<0)continue;
      const r=(next.total-next.flow)/prev.total-1;
      if(r<=-1||!Number.isFinite(r))continue;
      points.push({from:prev.date,to:next.date,days,return:r,annualizedLogReturn:Math.log1p(r)*365.25/days});
    }
    return points;
  }
  function historicalCalibration(rows){
    const h=normalizeRows(rows),periods=adjustedPeriodReturns(h);
    const elapsed=h.length<2?0:(parse(h[h.length-1].date)-parse(h[0].date))/MS_DAY;
    const intervals=periods.length;
    if(intervals<12||elapsed<360)return{available:false,reason:"Requer pelo menos 12 intervalos válidos e um ano de histórico com fluxos líquidos registrados.",intervals,elapsedDays:elapsed};
    const logs=periods.map(r=>Math.log1p(r.return));
    const totalDays=periods.reduce((s,p)=>s+p.days,0);
    if(totalDays<=0)return{available:false,reason:"Datas históricas insuficientes."};
    const annualLog=logs.reduce((a,b)=>a+b,0)*365.25/totalDays;
    const mean=logs.reduce((a,b)=>a+b,0)/logs.length;
    const variance=logs.reduce((s,r,i)=>s+(r-mean)**2/periods[i].days,0)*365.25/Math.max(1,logs.length-1);
    const vol=Math.sqrt(Math.max(0,variance));
    const rate=Math.expm1(annualLog);
    if(!Number.isFinite(rate)||!Number.isFinite(vol)||rate < -.5||rate>.5||vol>.6)return{available:false,reason:"Retornos históricos extremos ou inconsistentes para calibração automática.",intervals,elapsedDays:elapsed};
    return{available:true,rate:100*rate,vol:100*vol,intervals,elapsedDays:elapsed,from:h[0].date,to:h[h.length-1].date};
  }
  function portfolioRisk(profile){
    if(!profile.items.length)return {score:0,label:"Sem posições"};
    const w=profile.items.map(x=>x.value/(profile.total||1));
    const effective=1/w.reduce((s,z)=>s+z*z,0);
    const n=profile.items.length;
    const countPenalty=Math.max(0,8-n)*4;
    const topPenalty=Math.max(0,profile.topAssetShare-25)*.55;
    const classPenalty=Math.max(0,profile.topClassShare-35)*.38;
    const effectivePenalty=Math.max(0,5-effective)*2;
    const intlPenalty=profile.intlShare<10?5:0;
    const outdatedWeight=profile.items.reduce((s,p)=>s+(global.WealthEngine.daysOld(p.asOf)>30?p.value:0),0)/(profile.total||1);
    const freshnessPenalty=outdatedWeight*15;
    const score=Math.round(Math.max(0,Math.min(90,90-countPenalty-topPenalty-classPenalty-effectivePenalty-intlPenalty-freshnessPenalty)));
    return{score,label:score>=80?"Bem distribuída no índice":score>=60?"Distribuição com pontos de atenção":"Concentração ou dados insuficientes",effectiveAssets:effective,stalePct:100*outdatedWeight,method:"Índice heurístico de diversificação (não mede correlação, crédito, duration ou liquidez)."};
  }
  global.WealthAnalytics={periodHistory,growthBridge,milestones,adjustedPeriodReturns,historicalCalibration,portfolioRisk};
})(window);
