import config from './gate-config.js';
const main=document.querySelector('#main');
export const unlockKey='little-by-little-gate:'+new URL('./',import.meta.url).pathname;
let busy=false;
function message(title,copy){main.innerHTML=`<section class="gate"><h1>${title}</h1><p>${copy}</p></section>`;}
function valid(c){return c?.configured===true&&c.version===1&&Number.isInteger(c.iterations)&&c.iterations>=210000&&c.iterations<=2000000&&/^[a-f0-9]{32}$/.test(c.salt)&&/^[a-f0-9]{64}$/.test(c.verifier)&&typeof c.generation==='string'&&c.generation.length>0;}
async function boot(notice=''){
 try{await import('./app.js');if(notice){const el=document.createElement('p');el.className='gate-notice';el.setAttribute('role','status');el.textContent=notice;document.querySelector('.masthead').after(el);}}
 catch{message('Practice could not load','Your saved progress has not been cleared. Connect to the internet and reload to retry.');}
}
async function verify(value){
 const hex=s=>Uint8Array.from(s.match(/../g),x=>parseInt(x,16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);
 const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:hex(config.salt),iterations:config.iterations,hash:'SHA-256'},key,256));
 return bits.reduce((difference,b,i)=>difference|(b^hex(config.verifier)[i]),0)===0;
}
if(!valid(config)){message('App passcode not configured yet','Ask the app owner to finish local setup. Your saved progress has not been changed.');}
else {
 let remembered=false;try{remembered=localStorage.getItem(unlockKey)===config.generation;}catch{}
 if(remembered&&!new URL(location.href).searchParams.has('locked'))void boot();
 else{
 main.innerHTML='<section class="gate" aria-labelledby="gate-title"><p class="eyebrow">LITTLE BY LITTLE</p><h1 id="gate-title">Welcome back.</h1><p class="intro">Enter the app passcode to start learning.</p><form id="gate-form"><label for="passcode">Passcode</label><input id="passcode" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="current-password" aria-describedby="gate-help gate-message"><p id="gate-help" class="small muted">6 digits. This browser stays unlocked until you choose Lock app or clear site data.</p><button class="primary large" type="submit">Unlock</button><p id="gate-message" role="status" aria-live="polite"></p></form><p class="small muted">A casual privacy screen, not secure sign-in. App files are still public. Only unlock on a device you trust.</p></section>';
 document.querySelector('#gate-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;
 const input=document.querySelector('#passcode'),button=event.currentTarget.querySelector('button'),status=document.querySelector('#gate-message');button.disabled=true;status.textContent='Checking…';
 let value=input.value;input.value='';
 try{
 if(!/^[0-9]{6}$/.test(value)||!await verify(value)){status.textContent='Passcode not recognised. Try again.';input.focus();return;}
 let notice='';try{localStorage.setItem(unlockKey,config.generation);}catch{notice='This browser cannot remember the unlock. You will need the passcode again after closing or reloading.';}
 const url=new URL(location.href);url.searchParams.delete('locked');history.replaceState(null,'',url.href);
 await boot(notice);
 }catch{status.textContent='Unable to check the passcode. Use HTTPS or localhost, then reload to retry.';input.focus();}
 finally{value='';busy=false;button.disabled=false;}
 });
 }
}
