const $=s=>document.querySelector(s);
if('serviceWorker' in navigator && window.isSecureContext) {
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>{
  const status=$('#offline-status');
  navigator.serviceWorker.ready.then(()=>{status.textContent='Ready offline · only on this device';});
  const updated=()=>{if(registration.waiting)status.textContent='Update ready · close all app tabs, then reopen';};
  updated();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',updated));
 }).catch(()=>{$('#offline-status').textContent='Offline setup unavailable · connect and reload to retry';});
} else $('#offline-status').textContent='Offline mode needs HTTPS or localhost';


import('./gate.js').catch(()=>{document.querySelector('#main').innerHTML='<section class="gate"><h1>Passcode screen could not load</h1><p>Your progress has not been cleared. Connect and reload to retry.</p></section>';});
