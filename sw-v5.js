'use strict';
const CACHE='health-tracker-v6-0-2-chart-shell';
const SHELL=['./','./index.html','./v7-preview.html','./styles.css','./v45.css','./v5.css','./v51.css','./v52.css','./core-v5.js','./crypto-v5.js','./charts-v5.js','./render-v5.js','./v51.js','./v52.js','./ui-v5.js','./crypto-ui-v5.js','./consult-v6.js','./icon.svg','./manifest-v5.webmanifest'];
const staticPaths=new Map(SHELL.map(p=>[new URL(p,self.registration.scope).pathname,p]));
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(async c=>{await Promise.allSettled(SHELL.map(p=>c.add(p)))}))});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==location.origin||!staticPaths.has(u.pathname))return;
 const canonical=new URL(staticPaths.get(u.pathname),self.registration.scope).href;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok)await cache.put(canonical,r.clone()).catch(()=>{});return r;}
  catch(err){return (await cache.match(canonical))||(await cache.match(e.request))||new Response('Recurso indisponível sem conexão. Abra o aplicativo conectado para preparar a cópia offline.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
 })());
});