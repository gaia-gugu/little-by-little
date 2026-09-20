import {INTRODUCTION,product} from './core.js';

export function validateChallenges(s,events,{check,shape,integer,bool,id,date}) {
 const duration=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER-120000;
 const c=s.challenge;shape(c,['best','results']);
 check(c.best!==null&&typeof c.best==='object'&&!Array.isArray(c.best));
 check(Array.isArray(c.results)&&c.results.length<=100000);
 const ids=new Set(s.results.map(r=>r.id)),best={};
 const resultKeys=['id','day','table','score','errors','elapsedMs','penaltyMs','adjustedMs','recordEligible','newBest','guidedEligible','qualified','added'];
 for(const r of c.results){
  shape(r,resultKeys);
  check(id(r.id)&&!ids.has(r.id)&&date(r.day)&&integer(r.table,1,12)&&integer(r.score,0,12)&&integer(r.errors,12-r.score,2*(12-r.score)));
  ids.add(r.id);check(duration(r.elapsedMs)&&duration(r.adjustedMs)&&r.penaltyMs===r.errors*5000&&r.adjustedMs===r.elapsedMs+r.penaltyMs);
  check(bool(r.recordEligible)&&bool(r.newBest)&&bool(r.guidedEligible)&&bool(r.qualified)&&r.qualified===(r.guidedEligible&&r.score>=10));
  check(r.added===null||(INTRODUCTION.includes(r.added)&&r.qualified&&s.guided.tables.includes(r.added)));
  const isBest=r.recordEligible&&(!best[r.table]||r.adjustedMs<best[r.table].adjustedMs);check(r.newBest===isBest);if(isBest)best[r.table]=r;
  const evidence=[...events.values()].filter(e=>e.roundId===r.id);
  check(evidence.length===12&&new Set(evidence.map(e=>e.fact)).size===12&&evidence.every(e=>e.attempt===1&&e.eligible&&e.fact.startsWith(`${r.table}x`))&&evidence.filter(e=>e.correct).length===r.score);
 }
 shape(c.best,Object.keys(best));
 for(const [table,r] of Object.entries(best)){shape(c.best[table],resultKeys);check(resultKeys.every(k=>c.best[table][k]===r[k]));}
 const r=s.round;
 const challengeIds=new Set(c.results.map(x=>x.id));
 if(r?.mode==='challenge')challengeIds.add(r.id);
 for(const e of events.values())check(e.slot<=9||challengeIds.has(e.roundId));
 if(!r||r.mode!=='challenge')return;
 shape(r,['id','day','mode','table','guidedEligible','queue','index','input','phase','feedback','elapsedMs','errors','recordEligible']);
 check(id(r.id)&&date(r.day)&&integer(r.table,1,12)&&integer(r.index,0,11)&&duration(r.elapsedMs)&&integer(r.errors,0,24)&&bool(r.recordEligible)&&bool(r.guidedEligible));
 check(typeof r.input==='string'&&/^\d{0,3}$/.test(r.input));
 check(['countdown','answer','retry','feedback','results'].includes(r.phase)&&[null,'retry','correct','reveal'].includes(r.feedback));
 check(Array.isArray(r.queue)&&r.queue.length===12&&new Set(r.queue.map(q=>q.fact)).size===12);
 check(!r.queue.every((q,i)=>q.fact===`${r.table}x${i+1}`));
 let errors=0;
 for(const [i,q] of r.queue.entries()){
  shape(q,['fact','attempts']);check(Array.from({length:12},(_,j)=>`${r.table}x${j+1}`).includes(q.fact));
  check(Array.isArray(q.attempts)&&q.attempts.length<=2);
  for(const [j,a] of q.attempts.entries()){
   shape(a,['answer','day','correct']);check(integer(a.answer,0,999)&&date(a.day)&&bool(a.correct)&&a.correct===(a.answer===product(q.fact)));
   if(j===1)check(q.attempts[0].correct===false);
   if(!a.correct)errors++;
  }
  const e=events.get(`${r.id}:${i}:1`),a=q.attempts[0];
  if(a)check(e&&e.fact===q.fact&&e.day===a.day&&e.correct===a.correct&&e.eligible);else check(!e);
  check(!events.has(`${r.id}:${i}:2`));
  const completed=q.attempts.length===2||a?.correct===true;
  if(i<r.index||r.phase==='results')check(completed);
  if(i>r.index)check(q.attempts.length===0);
  if(i===r.index){
   if(['answer','countdown'].includes(r.phase))check(q.attempts.length===0&&r.feedback===null);
   if(r.phase==='retry')check(q.attempts.length===1&&!a.correct&&r.feedback==='retry');
   if(['feedback','results'].includes(r.phase))check(completed&&r.feedback===(q.attempts.at(-1).correct?'correct':'reveal'));
  }
 }
 check(errors===r.errors);
 if(r.phase==='countdown')check(r.index===0&&r.input===''&&r.elapsedMs===0);
 if(r.phase==='results'){
  const result=c.results.find(x=>x.id===r.id);check(r.index===11&&result);
  for(const k of ['day','table','errors','elapsedMs','recordEligible','guidedEligible'])check(r[k]===result[k]);
  check(result.score===r.queue.filter(q=>q.attempts[0].correct).length);
 }else{
  check(!ids.has(r.id)&&r.guidedEligible===(r.table===s.guided.tables.at(-1)));
  // Any load/restore interrupts the run; never trust a saved active record flag.
  r.recordEligible=false;
 }
}
