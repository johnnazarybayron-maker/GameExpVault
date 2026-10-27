const V='gev-v1';
const SHELL=['./','index.html','egg-heist.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
/* online: always fetch fresh and keep a copy; offline: use the saved copy */
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.protocol!=='http:'&&u.protocol!=='https:')return;
  if(/peerjs\.com$/.test(u.hostname))return;
  e.respondWith(
    fetch(r).then(res=>{
      if(res&&(res.ok||res.type==='opaque')&&res.status!==206){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp)).catch(()=>{});}
      return res;
    }).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error())))
  );
});
