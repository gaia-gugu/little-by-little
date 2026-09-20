import {ALL,INTRODUCTION,localDay,product} from './core.js';

export function startChallenge(state,table,day=localDay(),random=Math.random,id=crypto.randomUUID()) {
 if(state.round&&state.round.phase!=='results')return state.round;
 if(!ALL.includes(table))throw Error('Choose a table from 1 to 12.');
 const multipliers=[...ALL];
 for(let i=11;i>0;i--){const j=Math.floor(random()*(i+1));[multipliers[i],multipliers[j]]=[multipliers[j],multipliers[i]];}
 if(multipliers.every((n,i)=>n===i+1))[multipliers[0],multipliers[1]]=[multipliers[1],multipliers[0]];
 state.round={id,day,mode:'challenge',table,guidedEligible:table===state.guided.tables.at(-1),queue:multipliers.map(n=>({fact:`${table}x${n}`,attempts:[]})),index:0,input:'',phase:'countdown',feedback:null,elapsedMs:0,errors:0,recordEligible:true};
 return state.round;
}
export function interruptChallenge(state) {
 const r=state.round;if(r?.mode==='challenge'&&r.phase!=='results')r.recordEligible=false;
}
// The monotonic anchor is memory-only; persist accumulated duration, never a wall-clock deadline.
// Call sync before state transitions, then after them to start/stop the next active segment.
export function createClock(now=()=>performance.now()) {
 let target=null,anchor=null;
 return {sync(round,visible){
  const time=now();
  if(target&&anchor!==null){target.elapsedMs+=Math.max(0,time-anchor);anchor=Math.max(time,anchor);}
  const running=visible&&round?.mode==='challenge'&&['answer','retry'].includes(round.phase);
  if(!running){target=null;anchor=null;return;}
  if(target!==round){target=round;anchor=time;}
 }};
}
export function beginAnswering(state) {
 if(state.round?.mode==='challenge'&&state.round.phase==='countdown')state.round.phase='answer';
}
export function submitChallenge(state,day=localDay()) {
 const r=state.round;
 if(r?.mode!=='challenge'||!['answer','retry'].includes(r.phase)||!/^\d{1,3}$/.test(r.input))return false;
 const q=r.queue[r.index],correct=Number(r.input)===product(q.fact);
 q.attempts.push({answer:Number(r.input),day,correct});
 // Only first attempts are learning evidence in this mode.
 if(q.attempts.length===1)state.facts[q.fact].history.push({day,correct,eligible:true,roundId:r.id,slot:r.index,attempt:1});
 if(!correct)r.errors++;
 if(!correct&&q.attempts.length===1){r.phase='retry';r.input='';r.feedback='retry';}
 else {r.phase='feedback';r.feedback=correct?'correct':'reveal';}
 return true;
}
export function nextChallenge(state) {
 const r=state.round;
 if(r?.mode!=='challenge'||r.phase!=='feedback')return;
 if(r.index===11){r.phase='results';finishChallenge(state);return;}
 r.index++;r.input='';r.phase='answer';r.feedback=null;
}
export function finishChallenge(state) {
 const r=state.round;
 if(r?.mode!=='challenge'||r.phase!=='results')return null;
 state.challenge??={best:{},results:[]};
 const previous=state.challenge.results.find(x=>x.id===r.id);if(previous)return previous;
 const score=r.queue.filter(q=>q.attempts[0]?.correct).length;
 const qualified=r.guidedEligible&&score>=10;
 let added=null;
 if(r.guidedEligible){state.guided.streak=qualified?state.guided.streak+1:0;if(state.guided.streak===3){added=INTRODUCTION.find(t=>!state.guided.tables.includes(t))??null;if(added)state.guided.tables.push(added);state.guided.streak=0;}}
 const adjustedMs=r.elapsedMs+r.errors*5000;
 const newBest=r.recordEligible&&(!state.challenge.best[r.table]||adjustedMs<state.challenge.best[r.table].adjustedMs);
 const result={id:r.id,day:r.day,table:r.table,score,errors:r.errors,elapsedMs:r.elapsedMs,penaltyMs:r.errors*5000,adjustedMs,recordEligible:r.recordEligible,newBest,guidedEligible:r.guidedEligible,qualified,added};
 state.challenge.results.push(result);
 if(newBest)state.challenge.best[r.table]={...result};
 return result;
}
