import {ALL,INTRODUCTION,createState,mastery,startRound,submit,next,product,localDay} from './core.js';
import {openStore,parseBackup,STORAGE_KEY} from './storage.js';
import {startChallenge,beginAnswering,submitChallenge,nextChallenge,interruptChallenge,createClock} from './challenge.js';
import {challengeViews,challengeHistory,seconds} from './challenge-ui.js';
import {createAudioUI} from './audio-ui.js';
import {bestBoard,bestDetail} from './challenge-dashboard.js';
const $=s=>document.querySelector(s);
let disk;try{disk=localStorage;}catch{disk={getItem(){throw Error();},setItem(){throw Error();}};}
const THEME_KEY='little-by-little-theme-v1';
const THEMES={mint:'Mint',ocean:'Ocean Blue',lavender:'Lavender',peach:'Peach'};
let theme='mint',themeNotice='';
try {const saved=disk.getItem(THEME_KEY);if(Object.hasOwn(THEMES,saved))theme=saved;}catch{}
function applyTheme() {document.documentElement.dataset.theme=theme;}
applyTheme();
function themePicker() {
 return `<section class="theme-picker" aria-labelledby="theme-title"><h2 id="theme-title">Colour theme</h2><p class="small muted">Make this space yours.</p><div class="theme-options" role="group" aria-label="Colour theme">${Object.entries(THEMES).map(([value,label])=>`<button class="theme-option" data-action="theme:${value}" aria-pressed="${value===theme}" aria-label="${label}"><span class="theme-swatch swatch-${value}" aria-hidden="true"></span><span>${label}</span><span class="theme-tick" aria-hidden="true">${value===theme?'✓':''}</span></button>`).join('')}</div><p id="theme-notice" class="small muted" role="status">${themeNotice}</p></section>`;
}
const store=openStore(disk);
let state=store.state??createState(),view=state.round?(state.round.phase==='results'?'results':'practice'):'home';
let blocked=store.corrupt;
let challengeTable=state.guided.tables.at(-1),bestTable=1,suspended=false;
const clock=createClock();
const clockVisible=()=>!blocked&&!document.hidden&&!suspended&&view==='practice';
function syncClock(){clock.sync(state.round,clockVisible());}
function pauseChallenge(){if(state.round?.mode!=='challenge'||state.round.phase==='results')return;clock.sync(state.round,false);interruptChallenge(state);save();}
const challengeUI=()=>challengeViews(state,button,heading,challengeTable);
function warning(text) {$('#warning').textContent=text;$('#warning').hidden=!text;}
warning(store.warning);
function save() {
  syncClock();
  if(blocked)return false;
  const result=store.save(state);warning(result.warning);$('#save-status').textContent=result.ok?'Saved on this device':'Not saved · export a backup';return result.ok;
}
const button=(text,action,cls='secondary',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const audioUI=createAudioUI(disk,button,heading);
const equation=key=>`${key.replace('x',' × ')} = ${product(key)}`;
const masteredCount=()=>Object.values(state.facts).filter(f=>mastery(f).status==='mastered').length;
function progressBar() {const n=masteredCount();return `<div class="mastery-label"><span>Facts mastered</span><strong>${n} <span class="muted">/ 144</span></strong></div><progress max="144" value="${n}" aria-label="${n} of 144 facts mastered"></progress>`;}
function heading(kicker,title,copy='') {return `<p class="eyebrow">${kicker}</p><h1>${title}</h1>${copy?`<p class="intro">${copy}</p>`:''}`;}
function home() {
 const active=state.round&&state.round.phase!=='results';
 return `<section class="home-layout"><div class="home-main">${heading('SMALL STEPS. STRONG FOUNDATIONS.','A little practice.<br>A lot of possibility.','Ten questions. Time to think. A chance to try again.')}<div class="start-block">${button(active?(state.round.mode==='challenge'?'Resume challenge':'Resume practice'):'Start practice','start','primary large')}<span class="muted">No clock. No rush.</span></div><div class="current"><span class="eyebrow">${state.mode==='guided'?'YOUR GUIDED TABLES':'YOUR CHOSEN TABLES'}</span><div class="table-chips">${(state.mode==='guided'?state.guided.tables:state.selection).map(t=>`<span>${t}</span>`).join('')}</div></div></div><aside class="home-aside"><div class="learning-note"><p>Confidence grows<br><strong>little by little.</strong></p></div>${progressBar()}<p class="small muted">Mastery means remembering across different days—not getting it right just once.</p></aside></section><nav class="home-nav" aria-label="Learning">${button('Learn tables (Cantonese)','learn','nav-button')}${button('Time challenge','challenge','nav-button')}${button('Choose tables <span aria-hidden="true">↗</span>','choose','nav-button')}${button('Progress <span aria-hidden="true">↗</span>','progress','nav-button')}</nav>${themePicker()}`;
}
function practice() {
 const r=state.round,q=r.queue[r.index],done=r.phase==='feedback',timed=r.mode==='challenge',total=timed?12:10;
 if(timed&&r.phase==='countdown')return challengeUI().countdown();
 const message=r.phase==='retry'?'Not quite. You have one more try.':done?(r.feedback==='correct'?(q.attempts.length===1?'That’s it. Nicely done!':'You got it on your retry.'): `Let’s remember:<strong>${equation(q.fact)}</strong>`):'Think it through. You’ve got time.';
 return `<section class="practice${timed?' timed-practice':''}"><div class="practice-top">${button('← Pause','home','text-button')}<span>Question <strong>${r.index+1}</strong> of ${total}</span><span class="mode-label">${timed?`<span class="challenge-clock">Answer time <output id="challenge-clock" aria-live="off">${seconds(r.elapsedMs)}</output><small id="challenge-penalty">+ ${seconds(r.errors*5000)} penalties</small></span>`:q.repeat?'Try again later':r.mode==='guided'?'Guided':'Your tables'}</span></div><div class="steps" aria-hidden="true">${r.queue.map((_,i)=>`<span class="${i<r.index?'complete':i===r.index?'current-step':''}"></span>`).join('')}</div><p class="eyebrow question-label">${q.repeat?'A LITTLE EXTRA PRACTICE':'WHAT IS'}</p><h1 class="equation" aria-label="${q.fact.replace('x',' times ')}">${q.fact.replace('x',' <span>×</span> ')}</h1><label class="sr-only" for="answer">Your answer</label><input id="answer" aria-label="Your answer" type="text" inputmode="none" autocomplete="off" maxlength="3" pattern="[0-9]*" value="${r.input}" ${done?'readonly':''} placeholder="?" aria-describedby="feedback"><p id="feedback" class="feedback ${done?(r.feedback==='correct'?'success':'reveal'):''}" role="status">${message}</p>${done?`<div class="next-area">${r.feedback==='reveal'?button(r.index===total-1?'See results':'Next question','next','primary large'):''}<p class="small muted">${q.repeat?'Extra practice does not change your score.':'First-try answers build your score. Retries help you learn.'}</p></div>`:`<div class="keypad" aria-label="Answer keypad">${[1,2,3,4,5,6,7,8,9].map(n=>button(n,`digit:${n}`,'key')).join('')}<span></span>${button('0','digit:0','key')}${button('⌫','delete','key delete','aria-label="Delete digit"')}${button('Check answer','check','primary check',r.input?'':'disabled')}</div>`}</section>`;
}
function results() {
 if(state.round?.mode==='challenge')return challengeUI().results();
 const r=state.results.find(x=>x.id===state.round?.id)??state.results.at(-1);
 return `<section class="results">${heading('TEN SMALL STEPS FORWARD','Round complete.','Every try is practice for next time.')}<div class="result-score"><span id="score">${r.score} / 10</span><span>correct on your first try</span></div><p class="small muted">Retries and extra-practice repeats don’t add to this score.</p>${r.added?`<p class="celebration">A new chapter: the ${r.added} times table is ready!</p>`:r.mode==='guided'?`<p>${r.qualified?'A strong guided round.':'Keep practising. Your next round is a fresh start.'} <strong>${state.guided.streak} / 3</strong> qualifying rounds toward the next table.</p>`:'<p>Your chosen tables helped your facts grow. Guided progress is unchanged.</p>'}<div class="result-review"><h2>${r.missed.length?'A few to remember':'A clean first try'}</h2>${r.missed.length?`<ul class="equation-list">${r.missed.map(k=>`<li>${equation(k)}</li>`).join('')}</ul>`:'<p>You answered every original question correctly.</p>'}</div>${progressBar()}<div class="actions">${button('Practise again','start','primary')}${button('Home','home')}${button('Progress','progress')}</div></section>`;
}
let chosen=[...state.selection];
function choose() {
 const nextTable=INTRODUCTION.find(t=>!state.guided.tables.includes(t));
 const active=state.round&&state.round.phase!=='results';
 const entry=`<div class="practice-entry">${active&&state.round.mode==='challenge'?'<p>Finish your paused challenge before starting practice. Your chosen settings apply to the next round.</p>':''}${button(active?(state.round.mode==='challenge'?'Resume challenge':'Resume practice'):'Start practice','start','primary')}<p class="small muted">${active?'Your unfinished round is kept exactly as you left it.':`Start with ${state.mode==='guided'?'guided':'your saved chosen'} tables, or update your selection below.`}</p></div>`;
 return `<section class="settings">${button('← Home','home','text-button')}${heading('CHOOSE TABLES','Make it your practice.','Pick one table or mix a few. You can change these any time.')}${entry}<div class="guided-panel"><h2>Follow a gentle path</h2><p>Build confidence with ${state.guided.tables.join(', ')}.${nextTable?` The ${nextTable} times table comes next.`:' All tables are now open.'}</p><p class="small">${state.guided.streak} of 3 strong guided rounds. Aim for 8 first-try answers out of 10${state.guided.tables.length>4?', including 3 of 4 different facts from your newest table':''}.</p>${button('Use guided learning','guided','primary')}</div><h2>Or choose your own</h2><div class="selection-tools">${button('All tables','all','text-button')}${button('Clear selection','clear','text-button')}</div><div class="table-picker" role="group" aria-label="Times tables">${ALL.map(t=>button(`<span>${t}</span><small>times table</small>`,`table:${t}`,chosen.includes(t)?'table-option selected':'table-option',`aria-label="${t} times table" aria-pressed="${chosen.includes(t)}"`)).join('')}</div>${button('View full table','reference','secondary reference-open',chosen.length?'':'disabled')}<p class="small muted">Chosen-table rounds grow fact mastery, but don’t unlock guided tables.${state.round&&state.round.phase!=='results'?' Your paused round stays the same. These settings apply to the next round.':''}</p>${button('Use chosen tables','manual','primary large',chosen.length?'':'disabled')}</section>`;
}
const statuses={unseen:['·','Not yet tried'],learning:['◐','Learning'],needs:['↻','Needs practice'],mastered:['✓','Mastered']};
function backupControls() {return `<section class="backup"><h2>Keep a copy of your progress</h2><p class="small muted">Your learning lives only in this browser, on this device. There are no accounts, automatic cloud backups or syncing. Clearing browser data can erase it. Export a file and keep it somewhere safe.</p><div class="actions">${button('Export backup','export')}<label class="file-button" for="restore-file">Restore backup<input id="restore-file" type="file" accept=".json,application/json"></label></div><p class="small muted">Restoring replaces this device’s progress. We’ll ask before changing anything.</p><p id="backup-message" role="status"></p></section>`;}
function progress() {
 const trouble=Object.entries(state.facts).filter(([,f])=>mastery(f).status==='needs').sort((a,b)=>b[1].history.filter(e=>!e.correct).length-a[1].history.filter(e=>!e.correct).length);
 return `<section class="progress-page">${button('← Home','home','text-button')}${heading('YOUR PROGRESS','See your remembering grow.','Each square is one fact. Tap to see its story.')}${progressBar()}<p class="small muted">A fact is mastered after correct first tries on 3 different local calendar days. There is no minimum time span. A mistake starts a new sequence. Retries and repeats don’t count toward mastery.</p><div class="legend">${Object.entries(statuses).map(([k,[symbol,label]])=>`<span><b class="${k}">${symbol}</b> ${label}</span>`).join('')}</div><p class="small muted">Scroll the grid sideways on a small screen. Rows are tables; columns are multipliers. 2 × 3 and 3 × 2 are tracked separately.</p><div class="grid-scroll" tabindex="0" role="region" aria-label="Multiplication fact progress, horizontally scrollable"><table class="fact-grid"><caption class="sr-only">All 144 multiplication facts</caption><thead><tr><th scope="col">×</th>${ALL.map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${ALL.map(a=>`<tr><th scope="row">${a}</th>${ALL.map(b=>{const key=`${a}x${b}`,status=mastery(state.facts[key]).status;return `<td>${button(statuses[status][0],`fact:${key}`,`fact ${status}`,`data-fact="${key}" aria-label="${a} times ${b}: ${statuses[status][1]}"`)}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div><section class="trouble"><h2>A little extra attention</h2>${trouble.length?`<div class="trouble-list">${trouble.map(([key])=>button(equation(key),`fact:${key}`)).join('')}</div>`:'<p class="muted">No tricky facts yet. When one needs practice, you’ll find it here.</p>'}</section><section class="recent-rounds"><h2>Recent rounds</h2><p class="small muted">Latest 10 rounds. First-try scores only; all history stays in your backup.</p><ol class="history-list">${state.results.slice(-10).reverse().map(r=>`<li><time>${r.day}</time><strong>${r.score} / 10</strong> · ${r.mode==='guided'?'Guided':'Chosen tables'}${r.added?` · Unlocked ${r.added}`:''}</li>`).join('')||'<li>No rounds completed yet.</li>'}</ol></section>${challengeHistory(state)}${backupControls()}</section>`;
}
let pendingRestore=null,dialogOpener=null;
function closeDialog() {const d=$('dialog');d?.close();d?.remove();pendingRestore=null;dialogOpener?.focus({preventScroll:true});}
function dialog(content) {
 dialogOpener=document.activeElement;
 const d=document.createElement('dialog');d.setAttribute('aria-labelledby','dialog-title');d.innerHTML=content;document.body.append(d);d.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});d.showModal();
}
function referenceTable(table) {
 const d=$('dialog.table-reference');if(!d||!ALL.includes(table))return;
 d.querySelector('#dialog-title').textContent=`${table} times table`;
 d.querySelector('.reference-equations').innerHTML=ALL.map(n=>`<li>${table} × ${n} = ${table*n}</li>`).join('');
}
function openReference() {
 const tables=view==='choose'?chosen:view==='challenge'?[challengeTable]:view==='learn'?[audioUI.player.table]:[];
 if(!tables.length)return;
 dialog(`<div class="dialog-top"><p class="eyebrow">TABLE REFERENCE</p>${button('Close table','close','text-button')}</div><div class="reference-body"><h2 id="dialog-title"></h2>${tables.length>1?`<label for="reference-table">Reference table</label><select id="reference-table">${tables.map(n=>`<option value="${n}">${n} times table</option>`).join('')}</select>`:''}<p class="small muted">${view==='learn'?'Audio teaches multipliers 1–9. This full reference goes up to 12.':'For learning before a round. Viewing this table does not change your progress.'}</p><ol class="reference-equations"></ol></div>`);
 $('dialog').classList.add('table-reference');referenceTable(tables[0]);
}
function history(key) {
 const f=state.facts[key],m=mastery(f);
 dialog(`<div class="dialog-top"><p class="eyebrow">FACT HISTORY</p>${button('Close history','close','text-button')}</div><h2 id="dialog-title">${equation(key)}</h2><p class="status-tag ${m.status}">${statuses[m.status][0]} ${statuses[m.status][1]}</p><p class="small muted">${m.days.length} qualifying successful days in the current sequence. A miss on a day blocks all later successes that day.</p><ol class="history-list">${[...f.history].reverse().map(e=>`<li><time>${e.day}</time><span>${e.correct?'Correct':'Miss'} · ${e.eligible?'first try':e.attempt===2?'retry':'extra practice'}</span></li>`).join('')||'<li>Not tried yet. Your story starts with practice.</li>'}</ol>`);
}
function download(text,name) {const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function restore(file) {
 if(!file)return;
 try {if(file.size>10_000_000)throw Error('This backup is too large. Nothing was changed.');const candidate=parseBackup(await file.text());pendingRestore=candidate;dialog(`<h2 id="dialog-title">Replace this device’s progress?</h2><p>This will overwrite all current fact history, guided progress and any paused round with the selected backup. Export your current progress first if you want to keep it.</p><div class="actions">${button('Cancel','close')}${button('Replace progress','restore-confirm','primary')}</div>`);}
 catch(e){$('#backup-message').textContent=e.message;}
 finally {$('#restore-file').value='';}
}
function advance() {
 syncClock();if(state.round.mode==='challenge')nextChallenge(state);else next(state);view=state.round.phase==='results'?'results':'practice';save();render(true);
}
let successTimer=null,countdownTimer=null;
function scheduleCountdown(){
 clearTimeout(countdownTimer);countdownTimer=null;
 const r=state.round;if(!clockVisible()||r?.mode!=='challenge'||r.phase!=='countdown')return;
 const id=r.id;let count=3;
 const tick=()=>{
  if(!clockVisible()||state.round?.id!==id||state.round.phase!=='countdown')return;
  count--;if(!count){beginAnswering(state);save();render(true);return;}
  const el=$('#countdown');if(el){el.textContent=count;el.setAttribute('aria-label',`Starting in ${count} seconds`);}
  countdownTimer=setTimeout(tick,1000);
 };
 const el=$('#countdown');if(el){el.textContent='3';el.setAttribute('aria-label','Starting in 3 seconds');}
 countdownTimer=setTimeout(tick,1000);
}
function scheduleSuccess() {
 clearTimeout(successTimer);successTimer=null;
 const r=state.round;
 if(blocked||document.hidden||suspended||view!=='practice'||r?.phase!=='feedback'||r.feedback!=='correct')return;
 const {id,index}=r;
 successTimer=setTimeout(()=>{
  successTimer=null;
  if(!blocked&&!document.hidden&&!suspended&&view==='practice'&&state.round?.id===id&&state.round.index===index&&state.round.phase==='feedback'&&state.round.feedback==='correct')advance();
 },1000);
}
function renderNavigation() {
 // An older HTTP-cached shell may not yet contain the new navigation mount.
 // Restore this structural element rather than aborting all page rendering.
 if(!$('.bottom-nav')) {
  const nav=document.createElement('nav');
  nav.className='bottom-nav';nav.setAttribute('aria-label','Main navigation');
  document.body.append(nav);
 }
 const active=view==='home'?'home':view==='learn'?'learn':view==='progress'?'progress':['challenge','bests','best-detail'].includes(view)||(['practice','results'].includes(view)&&state.round?.mode==='challenge')?'challenge':'choose';
 $('.bottom-nav').innerHTML=[['home','Home'],['choose','Practice'],['challenge','Challenge'],['learn','Listen'],['progress','Progress']].map(([route,label])=>`<a href="#${route}" data-route="${route}"${active===route?' aria-current="page"':''}>${label}</a>`).join('');
}
function render(focus=false) {
 renderNavigation();
 $('#main').innerHTML=blocked?`<section class="recovery">${heading('SAVED DATA PROBLEM','Your saved progress needs attention.','We could not read the saved data. It has not been erased or overwritten. Download it for safekeeping, restore a valid backup, or explicitly start fresh.')}<div class="actions">${button('Download damaged data','damaged')}${button('Start fresh','reset')}</div>${backupControls()}</section>`:view==='bests'?bestBoard(state,button):view==='best-detail'?bestDetail(state,bestTable,button):view==='learn'?audioUI.html():view==='progress'?progress():view==='practice'?practice():view==='results'?results():view==='choose'?choose():view==='challenge'?challengeUI().choose():home();
 if(['home','progress'].includes(view))$('#main').insertAdjacentHTML('beforeend',`<section class="lock-controls">${button('Lock app','lock')}<p class="small muted">Keeps your progress, theme and saved audio.</p></section>`);
 if(focus) {const el=view==='practice'?($('[data-action="next"]')??$('#answer')):$('#main');el?.focus({preventScroll:true});}
 audioUI.update();syncClock();scheduleSuccess();scheduleCountdown();
}
function input(value) {
 if(view!=='practice'||!['answer','retry'].includes(state.round.phase))return;
 state.round.input=value.replace(/\D/g,'').slice(0,3);$('#answer').value=state.round.input;
 $('[data-action="check"]').disabled=!state.round.input;save();
}
function act(action) {
 if(action==='lock'&&['home','progress'].includes(view)){
  suspended=true;audioUI.player.stop();pauseChallenge();clearTimeout(successTimer);clearTimeout(countdownTimer);
  try{disk.removeItem('little-by-little-gate:'+new URL('./',import.meta.url).pathname);}catch{}
  const url=new URL(location.href);url.searchParams.set('locked','1');location.replace(url.href);return;
 }
 if(action==='reference'){openReference();return;}
 if(action==='close'){closeDialog();return;}
 syncClock();
 if(action.startsWith('audio:')){if(view==='learn')audioUI.act(action);return;}
 if(view==='learn'&&action!=='learn')audioUI.player.stop();
 if(action==='learn'){if(view==='practice'){suspended=true;pauseChallenge();}view='learn';render(true);void audioUI.refreshOffline();return;}
 if(['home','progress','choose','challenge'].includes(action)&&view==='practice'){suspended=true;pauseChallenge();}
 if(action==='bests'){view='bests';render(true);return;}
 if(action.startsWith('best-table:')){const table=Number(action.split(':')[1]);if(!ALL.includes(table))return;bestTable=table;view='best-detail';render(true);return;}
 if(action==='challenge'){challengeTable=state.guided.tables.at(-1);view='challenge';render(true);return;}
 if(action.startsWith('challenge-table:')){challengeTable=Number(action.split(':')[1]);render();$(`[data-action="${action}"]`)?.focus({preventScroll:true});return;}
 if(action==='challenge-start'&&view==='challenge'&&!blocked){startChallenge(state,challengeTable);suspended=false;view='practice';save();render(true);return;}
 if(action.startsWith('theme:')) {
  const value=action.slice(6);if(!Object.hasOwn(THEMES,value))return;
  theme=value;applyTheme();themeNotice=`${THEMES[value]} theme selected.`;
  try{disk.setItem(THEME_KEY,value);}catch{themeNotice+=' This choice could not be saved; it lasts until this page closes.';}
  for(const el of document.querySelectorAll('.theme-option')){const selected=el.dataset.action===action;el.setAttribute('aria-pressed',String(selected));el.querySelector('.theme-tick').textContent=selected?'✓':'';}
  const notice=$('#theme-notice');if(notice)notice.textContent=themeNotice;
  return;
 }
 if(action==='damaged'){try{download(disk.getItem(STORAGE_KEY)??'',`little-by-little-damaged-${localDay()}.json`);}catch{warning('The damaged data could not be read. Nothing was changed.');}return;}
 if(action==='reset'){dialog(`<h2 id="dialog-title">Erase damaged progress?</h2><p>This permanently replaces the saved data with an empty profile. Download the damaged data first if you want to keep a copy.</p><div class="actions">${button('Cancel','close')}${button('Erase and start fresh','reset-confirm','primary')}</div>`);return;}
 if(action==='reset-confirm'&&blocked){const candidate=createState(),result=store.save(candidate);warning(result.warning);if(!result.ok)return;state=candidate;blocked=false;closeDialog();view='home';render(true);return;}
 if(action==='progress'){view='progress';render(true);return;}
 if(action.startsWith('fact:')){history(action.slice(5));return;}
 if(action==='close'){closeDialog();return;}
 if(action==='export'){if(blocked){act('damaged');return;}download(JSON.stringify(state,null,2),`little-by-little-${localDay()}.json`);return;}
 if(action==='restore-confirm'&&pendingRestore){const candidate=pendingRestore;const result=store.save(candidate);warning(result.warning);if(!result.ok)return;state=candidate;blocked=false;chosen=[...state.selection];closeDialog();view='progress';render(true);$('#backup-message').textContent='Backup restored and saved on this device.';return;}
 if(action==='start'){if(blocked)return;startRound(state);suspended=false;view='practice';save();render(true);}
 else if(action==='choose'){chosen=[...state.selection];view='choose';render(true);}
 else if(action==='all'||action==='clear'||action.startsWith('table:')) {if(action==='all')chosen=[...ALL];else if(action==='clear')chosen=[];else{const t=Number(action.split(':')[1]);chosen=chosen.includes(t)?chosen.filter(n=>n!==t):[...chosen,t].sort((a,b)=>a-b);}render();$(`[data-action="${action}"]`)?.focus({preventScroll:true});}
 else if(action==='guided'||action==='manual') {if(action==='manual'&&!chosen.length)return;state.mode=action;if(action==='manual')state.selection=[...chosen];save();view='home';render(true);}
 else if(action==='home'){view='home';render(true);}
 else if(action.startsWith('digit:'))input(state.round.input+action.split(':')[1]);
 else if(action==='delete')input(state.round.input.slice(0,-1));
 else if(action==='check'){if((state.round?.mode==='challenge'?submitChallenge(state):submit(state))){save();render(true);}}
 else if(action==='next'&&view==='practice'&&state.round.phase==='feedback'&&state.round.feedback==='reveal')advance();
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){audioUI.player.pause();suspended=true;pauseChallenge();}else{suspended=false;syncClock();}
 scheduleSuccess();scheduleCountdown();
});
 window.addEventListener('pagehide',()=>{audioUI.player.stop();suspended=true;pauseChallenge();clearTimeout(successTimer);clearTimeout(countdownTimer);});
 window.addEventListener('pageshow',()=>{suspended=false;syncClock();scheduleSuccess();scheduleCountdown();});
 let clockTicks=0;
 setInterval(()=>{if(state.round?.mode!=='challenge'||!clockVisible())return;syncClock();const el=$('#challenge-clock');if(el)el.textContent=seconds(state.round.elapsedMs);if(++clockTicks%4===0)save();},250);
document.addEventListener('click',e=>{
 const route=e.target.closest('[data-route],.wordmark');
 if(route){e.preventDefault();act(route.dataset.route??'home');window.scrollTo(0,0);return;}
 const b=e.target.closest('[data-action]');if(b&&!b.disabled){if(b.dataset.action==='reference')b.focus({preventScroll:true});act(b.dataset.action);}
});
document.addEventListener('input',e=>{if(e.target.id==='answer')input(e.target.value);});
document.addEventListener('change',e=>{if(e.target.id==='restore-file')restore(e.target.files[0]);if(e.target.id==='reference-table')referenceTable(Number(e.target.value));});
document.addEventListener('keydown',e=>{
 if(view!=='practice'||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Enter'&&e.target.id==='answer'){e.preventDefault();act(state.round.phase==='feedback'?'next':'check');}
 else if(e.target.tagName!=='INPUT'&&e.target.tagName!=='BUTTON'&&/^\d$/.test(e.key)){e.preventDefault();input(state.round.input+e.key);}
});
render();
