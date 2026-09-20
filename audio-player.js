import {AUDIO_TIMINGS} from './audio-timings.js';
export const AUDIO_KEY='little-by-little-audio-v1';
export const SPEEDS={slow:1,normal:1.15,fast:1.3};
export class AudioPlayer {
 constructor(media,storage,onChange=()=>{}) {
  this.media=media;this.storage=storage;this.onChange=onChange;
  this.table=1;this.voice='female';this.speed='slow';this.mode='single';this.status='Ready';this.active=false;this.token=0;this.notice='';
  try {const p=JSON.parse(storage.getItem(AUDIO_KEY));if(p){if(['male','female'].includes(p.voice))this.voice=p.voice;if(Object.hasOwn(SPEEDS,p.speed))this.speed=p.speed;if(Number.isInteger(p.table)&&p.table>=1&&p.table<=9)this.table=p.table;}}catch{}
  media.preload='metadata';
  for(const event of ['timeupdate','seeked','loadedmetadata'])media.addEventListener(event,()=>this.changed());
  media.addEventListener('ended',()=>this.ended());
  media.addEventListener('error',()=>{this.token++;this.active=false;media.pause();this.status='Audio unavailable. Connect or save audio offline, then tap Play to retry.';this.changed();});
  for(const event of ['waiting','playing'])media.addEventListener(event,()=>{if(this.active){this.status=event==='waiting'?'Loading…':'Playing';this.changed();}});
  media.addEventListener('pause',()=>{if(this.active&&!media.ended){this.active=false;this.token++;this.status='Paused';this.changed();}});
  this.source();
 }
 get track(){return AUDIO_TIMINGS[`${this.voice}-${this.table}`];}
 get equation(){
  // Media time already accounts for playbackRate, pauses and seeking. Hold the
  // previous phrase through its pause; show the first before speech, last at end.
  const timeline=this.track.timeline;
  const fact=timeline.findLast(f=>f.start<=this.media.currentTime)||timeline[0];
  return `${fact.table} × ${fact.multiplier} = ${fact.product}`;
 }
 source(){this.media.src='./'+this.track.file;this.media.load();this.rate();}
 rate(){this.media.playbackRate=SPEEDS[this.speed];this.media.preservesPitch=true;this.media.webkitPreservesPitch=true;this.media.mozPreservesPitch=true;}
 save(){try{this.storage.setItem(AUDIO_KEY,JSON.stringify({voice:this.voice,speed:this.speed,table:this.table}));}catch{this.notice='Playback choices cannot be saved on this device.';}}
 changed(){this.onChange();}
 async play(){
  const token=++this.token;this.active=true;this.status='Loading…';this.changed();
  if(this.media.error)this.source();this.rate();
  try {await this.media.play();if(token!==this.token){if(!this.active)this.media.pause();return;}this.status='Playing';}
  catch {if(token!==this.token)return;this.active=false;this.status='Tap Play to start audio. If unavailable, reconnect and retry.';}
  this.changed();
 }
 pause(){this.token++;this.active=false;this.media.pause();this.status='Paused';this.changed();}
 stop(){this.pause();this.media.currentTime=0;this.status='Ready';this.changed();}
 select({voice=this.voice,table=this.table}){
  if(!['male','female'].includes(voice)||!Number.isInteger(table)||table<1||table>9)return;
  this.stop();this.voice=voice;this.table=table;if(this.mode==='all')this.mode='single';this.source();this.save();this.changed();
 }
 setMode(mode){
  if(!['repeat','all'].includes(mode))return;
  if(mode===this.mode){this.mode='single';this.changed();return;}
  this.mode=mode;
  if(mode==='all'){this.stop();this.table=1;this.source();this.save();}
  this.changed();
 }
 ended(){
  if(!this.active)return;
  if(this.mode==='repeat'){this.media.currentTime=0;void this.play();}
  else if(this.mode==='all'&&this.table<9){this.table++;this.source();this.save();void this.play();}
  else {this.active=false;this.status='Finished';this.changed();}
 }
 setSpeed(speed){if(!Object.hasOwn(SPEEDS,speed))return;this.speed=speed;this.rate();this.save();this.changed();}
}
