import {ALL, INTRODUCTION, product, mastery} from './core.js';
import {validateChallenges} from './challenge-storage.js';
import {deriveRewards, validateRewards} from './rewards.js';
export const STORAGE_KEY='little-by-little-v1';
const fail=()=>{throw new Error('This file is not a valid Little by Little backup. Nothing was changed.');};
const check=condition=>{if(!condition)fail();};
const shape=(x,keys)=>{check(x!==null && typeof x==='object' && !Array.isArray(x));check(Object.keys(x).sort().join('|')===[...keys].sort().join('|'));};
const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const bool=x=>typeof x==='boolean';
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const tables=x=>Array.isArray(x)&&x.length>=1&&x.length<=12&&new Set(x).size===x.length&&x.every(t=>integer(t,1,12));
const mode=x=>['manual','guided'].includes(x);
const guided=x=>tables(x)&&JSON.stringify(x)===JSON.stringify([1,2,5,10,...INTRODUCTION].slice(0,x.length))&&x.length>=4;
const factKeys=ALL.flatMap(a=>ALL.map(b=>`${a}x${b}`));
export function openStore(disk) {
  let state=null,warning='',corrupt=false;
  try {const raw=disk.getItem(STORAGE_KEY);if(raw!==null) {try{state=parseBackup(raw);}catch(e){warning=e.message;corrupt=true;}}}
  catch {warning='Device storage is unavailable. Progress is not saved; export a backup before leaving.';}
  return {state,warning,corrupt,save(value) {
    try {disk.setItem(STORAGE_KEY,JSON.stringify(value));return {ok:true,warning:''};}
    catch {return {ok:false,warning:'Progress is not saved. Device storage is full or unavailable. Export a backup before leaving.'};}
  }};
}
export function parseBackup(text) {
  check(typeof text==='string'&&text.length<=10_000_000);
  let s;try{s=JSON.parse(text,(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))fail();return value;});}catch{fail();}
  check(s&&[1,2,3].includes(s.version));
  shape(s,['version','facts','guided','selection','mode','round','results',...(s.version>=2?['challenge']:[]),...(s.version>=3?['rewards']:[])]);
  const legacyRewards=s.version<3;
  if(s.version===1){s.version=2;s.challenge={best:{},results:[]};}
  if(s.version===2){s.version=3;s.rewards=null;}
  check(tables(s.selection)&&mode(s.mode));shape(s.guided,['tables','streak']);check(guided(s.guided.tables)&&integer(s.guided.streak,0,2));
  shape(s.facts,factKeys);
  const events=new Map();
  for(const [key,f] of Object.entries(s.facts)) {
    shape(f,['history']);check(Array.isArray(f.history)&&f.history.length<=100000);
    for(const e of f.history) {
      shape(e,['day','correct','eligible','roundId','slot','attempt']);
      check(date(e.day)&&bool(e.correct)&&bool(e.eligible)&&id(e.roundId)&&integer(e.slot,0,11)&&integer(e.attempt,1,2));
      check(!e.eligible||e.attempt===1);
      const token=`${e.roundId}:${e.slot}:${e.attempt}`;check(!events.has(token));events.set(token,{...e,fact:key});
    }
  }
  check(Array.isArray(s.results)&&s.results.length<=100000);const resultIds=new Set();
  for(const r of s.results) {
    shape(r,['id','day','mode','score','missed','qualified','added']);
    check(id(r.id)&&!resultIds.has(r.id)&&date(r.day)&&mode(r.mode)&&integer(r.score,0,10)&&bool(r.qualified));resultIds.add(r.id);
    check(Array.isArray(r.missed)&&new Set(r.missed).size===r.missed.length&&r.missed.every(k=>factKeys.includes(k))&&r.missed.length<=10);
    check(r.added===null||INTRODUCTION.includes(r.added));check(!r.qualified||(r.mode==='guided'&&r.score>=8));check(r.added===null||r.qualified);
  }
  validateChallenges(s,events,{check,shape,integer,bool,id,date});
  if(legacyRewards) s.rewards=deriveRewards(s,Object.values(s.facts).filter(f=>mastery(f).status==='mastered').length);
  validateRewards(s.rewards,{check,shape,integer,date});
  if(s.round!==null&&s.round.mode!=='challenge') {
    const r=s.round;shape(r,['id','day','mode','tables','newest','queue','index','input','phase','feedback']);
    check(id(r.id)&&date(r.day)&&mode(r.mode)&&tables(r.tables)&&integer(r.index,0,9));
    check(typeof r.input==='string'&&/^\d{0,3}$/.test(r.input));
    check(['answer','retry','feedback','results'].includes(r.phase)&&[null,'retry','correct','reveal'].includes(r.feedback));
    check(r.newest===(r.mode==='guided'&&r.tables.length>4?r.tables.at(-1):null));
    if(r.mode==='guided')check(guided(r.tables)&&r.tables.every(t=>s.guided.tables.includes(t)));
    check(Array.isArray(r.queue)&&r.queue.length===10);
    const originals=new Set(),repeats=new Set();
    for(const [i,q] of r.queue.entries()) {
      shape(q,['fact','repeat','reserved','attempts']);check(factKeys.includes(q.fact)&&r.tables.includes(Number(q.fact.split('x')[0]))&&bool(q.repeat)&&bool(q.reserved));
      check(Array.isArray(q.attempts)&&q.attempts.length<=2);
      if(q.repeat) {check(!q.reserved&&!repeats.has(q.fact));repeats.add(q.fact);check(r.queue.some((p,j)=>j<=i-2&&!p.repeat&&p.fact===q.fact&&p.attempts[0]?.correct===false));}
      else {check(!originals.has(q.fact));originals.add(q.fact);}
      if(q.reserved)check(r.newest!==null&&q.fact.startsWith(`${r.newest}x`)&&!q.repeat);
      for(const [j,a] of q.attempts.entries()) {
        shape(a,['answer','day','correct']);check(integer(a.answer,0,999)&&date(a.day)&&bool(a.correct)&&a.correct===(a.answer===product(q.fact)));
        if(j===1)check(q.attempts[0].correct===false);
        const e=events.get(`${r.id}:${i}:${j+1}`);check(e&&e.fact===q.fact&&e.correct===a.correct&&e.day===a.day&&e.eligible===(!q.repeat&&j===0));
      }
      check(!events.has(`${r.id}:${i}:${q.attempts.length+1}`));
      const completed=q.attempts.length===2||q.attempts[0]?.correct===true;
      if(i<r.index||r.phase==='results')check(completed);
      if(i>r.index)check(q.attempts.length===0);
      if(i===r.index) {
        if(r.phase==='answer')check(q.attempts.length===0&&r.feedback===null);
        if(r.phase==='retry')check(q.attempts.length===1&&!q.attempts[0].correct&&r.feedback==='retry');
        if(['feedback','results'].includes(r.phase))check(completed&&r.feedback===(q.attempts.at(-1).correct?'correct':'reveal'));
      }
    }
    check(r.queue.filter(q=>q.reserved).length===(r.newest?4:0));
    if(r.phase==='results') {
      check(r.index===9&&resultIds.has(r.id));const result=s.results.find(x=>x.id===r.id);
      check(result.score===r.queue.filter(q=>!q.repeat&&q.attempts[0].correct).length);
      check(JSON.stringify(result.missed)===JSON.stringify(r.queue.filter(q=>!q.repeat&&!q.attempts[0].correct).map(q=>q.fact)));
    } else check(!resultIds.has(r.id));
  }
  return s;
}
