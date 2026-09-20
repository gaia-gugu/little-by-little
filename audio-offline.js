import {AUDIO_TIMINGS} from './audio-timings.js';
export const AUDIO_FILES=Object.values(AUDIO_TIMINGS).map(track=>'./'+track.file);
export class OfflineAudio {
 constructor(onChange=()=>{}){this.onChange=onChange;this.busy=false;this.count=0;this.message='Audio is not saved offline yet.';this.cacheName='little-by-little:'+new URL('./',location.href).href+':audio-v2';}
 async cache(){if(!('caches' in globalThis)||!navigator.serviceWorker?.controller)throw Error('Offline setup is not ready. Connect and reload, then retry.');return caches.open(this.cacheName);}
 async check(){
  if(this.busy)return;
  try{const cache=await this.cache();this.count=(await Promise.all(AUDIO_FILES.map(f=>cache.match(new URL(f,location.href).href)))).filter(Boolean).length;this.message=this.count===18?'18 of 18 saved · audio ready offline on this device.':`${this.count} of 18 saved. Save both voices for offline listening.`;}
  catch{this.message='Audio not ready offline. Connect and wait for app setup, then retry.';}
  this.onChange();
 }
 async save(){
  if(this.busy)return;this.busy=true;this.message='Preparing audio…';this.onChange();
  try{
   const cache=await this.cache();this.count=0;
   for(const file of AUDIO_FILES){
    const url=new URL(file,location.href).href;
    if(!(await cache.match(url))){
     const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
     if(response.status!==200||!response.headers.get('Content-Type')?.includes('audio/'))throw Error('Audio download failed.');
     const data=await response.arrayBuffer();if(!data.byteLength)throw Error('Empty audio file.');
     await cache.put(url,new Response(data,{headers:{'Content-Type':'audio/mpeg','Content-Length':String(data.byteLength)}}));
    }
    this.count++;this.message=`Saving audio: ${this.count} of 18`;this.onChange();
   }
   this.message='18 of 18 saved · audio ready offline on this device.';
  }catch{this.message=`Audio save incomplete. ${this.count} checked this time. Connect and tap Save audio offline to retry. Previously saved files are kept.`;}
  finally{this.busy=false;this.onChange();}
 }
}
