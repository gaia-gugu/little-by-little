import {AudioPlayer} from './audio-player.js';
import {OfflineAudio} from './audio-offline.js';
export function createAudioUI(storage,button,heading) {
 const media=document.createElement('audio');media.hidden=true;media.setAttribute('aria-hidden','true');document.body.append(media);
 const offline=new OfflineAudio(update);
 const p=new AudioPlayer(media,storage,update);
 function update(){
  const page=document.querySelector('.audio-page');if(!page)return;
  const offlineStatus=page.querySelector('#audio-offline-status');if(offlineStatus.textContent!==offline.message)offlineStatus.textContent=offline.message;
  page.querySelector('[data-action="audio:offline"]').disabled=offline.busy;
  page.querySelector('#audio-title').textContent=`Table ${p.table}`;
  const status=page.querySelector('#audio-status');if(status.textContent!==p.status)status.textContent=p.status;
  const equation=page.querySelector('#audio-equation');if(equation.textContent!==p.equation)equation.textContent=p.equation;
  const notice=page.querySelector('#audio-notice');if(notice.textContent!==p.notice)notice.textContent=p.notice;
  const play=page.querySelector('[data-action="audio:play"]');play.textContent=p.active?'Pause':'Play';
  for(const el of page.querySelectorAll('[aria-pressed]')) {
   const [,kind,value]=el.dataset.action.split(':');
   const selected=kind==='table'?p.table===Number(value):kind==='voice'?p.voice===value:kind==='speed'?p.speed===value:p.mode===value;
   el.setAttribute('aria-pressed',String(selected));
  }
  page.querySelector('#audio-mode').textContent=p.mode==='repeat'?'Repeating this table.':p.mode==='all'?'Tables 1–9, once in order.':'One table, once.';
 }
 function pressed(label,kind,value,selected){return button(label,`audio:${kind}:${value}`,'audio-option',`aria-pressed="${selected}"${kind==='table'?` aria-label="Table ${value}"`:''}`);}
 return {player:p,
  html(){return `<section class="settings audio-page">${button('← Home','home','text-button')}${heading('LISTEN & LEARN','Learn tables (Cantonese)','Listen, then say it in your own time.')}<p class="small muted">Listening is just for learning. It does not change mastery, scores or personal bests.</p><h2>Choose a table</h2><div class="audio-tables" role="group" aria-label="Audio table">${Array.from({length:9},(_,i)=>pressed(String(i+1),'table',i+1,p.table===i+1)).join('')}</div>${button('View full table','reference','secondary reference-open')}<div class="audio-options"><fieldset><legend>Voice</legend><div class="audio-segment">${['female','male'].map(v=>pressed(v==='female'?'Female':'Male','voice',v,p.voice===v)).join('')}</div></fieldset><fieldset><legend>Speed</legend><div class="audio-segment">${['slow','normal','fast'].map(v=>pressed(v[0].toUpperCase()+v.slice(1),'speed',v,p.speed===v)).join('')}</div></fieldset></div><div class="audio-player"><div class="audio-equation-wrap"><span id="audio-equation-label" class="small muted">Current equation</span><div id="audio-equation" aria-labelledby="audio-equation-label" aria-live="off">${p.equation}</div></div><div><h2 id="audio-title">Table ${p.table}</h2><p id="audio-status" role="status">${p.status}</p></div>${button(p.active?'Pause':'Play','audio:play','primary large')}<div class="audio-modes">${pressed('Repeat table','mode','repeat',p.mode==='repeat')}${pressed('Play all · 1–9','mode','all',p.mode==='all')}</div><p id="audio-mode" class="small muted">One table, once.</p></div><p class="small muted">Changing table or voice stops playback. Tap Play to begin. Audio pauses when you leave the app.</p><p id="audio-notice" class="small muted" role="status">${p.notice}</p><section class="audio-offline"><h2>Listen without a connection</h2><p class="small muted">Save both voices and all nine tables (about 2.2 MB). App offline readiness does not include audio. Browser storage can be cleared or evicted.</p>${button('Save audio offline','audio:offline')}<p id="audio-offline-status" class="small muted" role="status">${offline.message}</p></section></section>`;},
  act(action){const [,kind,value]=action.split(':');if(kind==='offline'){void offline.save();}else if(kind==='play'){if(p.active)p.pause();else void p.play();}else if(kind==='table')p.select({table:Number(value)});else if(kind==='voice')p.select({voice:value});else if(kind==='speed')p.setSpeed(value);else if(kind==='mode'){p.setMode(value);if(value==='all'&&p.mode==='all')void p.play();}},
  update,refreshOffline:()=>offline.check()
 };
}
