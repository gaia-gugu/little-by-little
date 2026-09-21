// Bump this version whenever any app-shell asset changes.
const PREFIX='little-by-little:'+self.registration.scope+':';
const GATE_GENERATION='bea6716061615ebff1c238dcdebfc7a3';
const CACHE=PREFIX+'v13:'+GATE_GENERATION;
const AUDIO_CACHE=PREFIX+'audio-v2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./bootstrap.js','./gate.js','./gate-config.js','./core.js','./storage.js','./challenge.js','./challenge-ui.js','./challenge-storage.js','./challenge-dashboard.js','./audio-player.js','./audio-timings.js','./audio-ui.js','./audio-offline.js','./rewards.js','./companion-catalog.js','./companion-ui.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
const COMPANIONS_SCOPE=new URL('./assets/companions/v1/',self.registration.scope).href;
self.addEventListener('install',event=>{
  // Atomic precache. Do not skipWaiting: an open round keeps its current version.
  event.waitUntil((async()=>{
    const manifestUrl=new URL('./assets/companions/v1/manifest.json',self.registration.scope);
    const response=await fetch(new Request(manifestUrl,{cache:'reload'}));
    if(!response.ok)throw new Error('Companion manifest unavailable');
    const manifest=await response.json();
    const urls=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
    urls.add(manifestUrl.href);
    let artCount=0;
    for(const group of ['creatures','badges','backgrounds','decorations']){
      if(!Array.isArray(manifest[group]))throw new Error('Invalid companion manifest');
      for(const item of manifest[group]){
        if(!item||typeof item.src!=='string')throw new Error('Invalid companion path');
        const url=new URL(item.src,self.registration.scope);
        if(!url.href.startsWith(COMPANIONS_SCOPE)||url.search||url.hash)throw new Error('Out-of-scope companion path');
        if(++artCount>200)throw new Error('Too many companion assets');
        urls.add(url.href);
      }
    }
    if(!manifest.creatures.length)throw new Error('Missing companion creatures');
    // One atomic batch: incomplete new artwork must not replace a working offline release.
    const cache=await caches.open(CACHE);
    await cache.addAll([...urls].map(u=>new Request(u,{cache:'reload'})));
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE&&k!==AUDIO_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||!url.href.startsWith(self.registration.scope))return;
  if(new RegExp('^'+new URL('audio/v2/',self.registration.scope).pathname.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(female|male)-[1-9]\\.mp3$').test(url.pathname)){
    event.respondWith(caches.open(AUDIO_CACHE).then(async cache=>{
      const response=await cache.match(url.origin+url.pathname);
      if(!response)return fetch(event.request);
      const range=event.request.headers.get('Range');
      if(!range)return response;
      const bytes=await response.arrayBuffer(),size=bytes.byteLength;
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      // Unsupported multipart/malformed ranges may be ignored with a full 200.
      if(!match||(!match[1]&&!match[2]))return new Response(bytes,{headers:{'Content-Type':'audio/mpeg','Content-Length':String(size)}});
      const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
      const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
      if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
      return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1)}});
    }));return;
  }
  const shell=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
  const path=url.origin+url.pathname;
  if(!shell.has(path)&&!path.startsWith(COMPANIONS_SCOPE))return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(path))||fetch(event.request)));
});
