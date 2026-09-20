export const INTRODUCTION = [3,4,6,7,8,9,11,12];
export const ALL = Array.from({length:12},(_,i)=>i+1);
export function localDay(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
const calendarNumber = day => Date.parse(`${day}T12:00:00Z`)/86400000;
export function mastery(fact) {
  let days=[], lastMiss=null;
  for (const e of fact.history) {
    if (!e.correct) { days=[]; lastMiss=e.day; }
    else if (e.eligible && (!lastMiss || e.day>lastMiss) && !days.includes(e.day)) days.push(e.day);
  }
  days.sort();
  const mastered=days.length>=3;
  return {status:mastered?'mastered':lastMiss?'needs':fact.history.length?'learning':'unseen',days,lastMiss};
}
export function priority(fact,day) {
  const m=mastery(fact), last=fact.history.at(-1);
  const gap=last?calendarNumber(day)-calendarNumber(last.day):Infinity;
  const base=m.status==='needs'?8:m.status==='unseen'?4:m.status==='learning'?2:gap>=7?1:0.08;
  return base/(gap<=0?1+fact.history.filter(e=>e.day===day).length*3:1);
}
export function startRound(state,day=localDay(),random=Math.random,id=crypto.randomUUID()) {
  if(state.round && state.round.phase!=='results') return state.round;
  const tables=[...(state.mode==='guided'?state.guided.tables:state.selection)];
  const newest=state.mode==='guided' && tables.length>4?tables.at(-1):null;
  const candidates=Object.keys(state.facts).filter(k=>tables.includes(Number(k.split('x')[0])));
  const used=new Set(),counts=Object.fromEntries(tables.map(t=>[t,0]));
  const pick=(pool,reserved=false)=>{
    const ranked=pool.filter(k=>!used.has(k)).map(k=>({k,rank:-Math.log(Math.max(0.000001,random()))/priority(state.facts[k],day)})).sort((a,b)=>a.rank-b.rank);
    const fact=ranked[0].k;used.add(fact);counts[Number(fact.split('x')[0])]++;
    return {fact,repeat:false,reserved,attempts:[]};
  };
  const queue=Array(10).fill(null);
  if(newest) for(const i of [0,2,4,6]) queue[i]=pick(candidates.filter(k=>k.startsWith(`${newest}x`)),true);
  for(let i=0;i<10;i++) if(!queue[i]) {
    const available=tables.filter(t=>candidates.some(k=>k.startsWith(`${t}x`)&&!used.has(k)));
    const min=Math.min(...available.map(t=>counts[t]));
    queue[i]=pick(candidates.filter(k=>counts[Number(k.split('x')[0])]===min));
  }
  state.round={id,day,mode:state.mode,tables,newest,queue,index:0,input:'',phase:'answer',feedback:null};
  return state.round;
}
export function product(key) { return key.split('x').reduce((a,b)=>a*Number(b),1); }
export function submit(state,day=localDay()) {
  const r=state.round;
  if(!r || !['answer','retry'].includes(r.phase) || !/^\d{1,3}$/.test(r.input)) return false;
  const q=r.queue[r.index],correct=Number(r.input)===product(q.fact);
  q.attempts.push({answer:Number(r.input),day,correct});
  state.facts[q.fact].history.push({day,correct,eligible:!q.repeat && q.attempts.length===1,roundId:r.id,slot:r.index,attempt:q.attempts.length});
  if(!correct && q.attempts.length===1) {
    if(!q.repeat && !r.queue.some(x=>x.repeat && x.fact===q.fact)) {
      const later=r.queue.findIndex((x,i)=>i>=r.index+2 && !x.reserved && !x.repeat && !x.attempts.length);
      if(later!==-1) r.queue[later]={fact:q.fact,repeat:true,reserved:false,attempts:[]};
    }
    r.phase='retry';r.input='';r.feedback='retry';
  } else {r.phase='feedback';r.feedback=correct?'correct':'reveal';}
  return true;
}
export function next(state) {
  const r=state.round;
  if(!r || r.phase!=='feedback') return;
  if(r.index===9) {r.phase='results';finishRound(state);return;}
  r.index++;r.input='';r.phase='answer';r.feedback=null;
}
export function finishRound(state) {
  const r=state.round;
  if(!r || r.phase!=='results') return null;
  const previous=state.results.find(x=>x.id===r.id);if(previous) return previous;
  const originals=r.queue.filter(q=>!q.repeat);
  const score=originals.filter(q=>q.attempts[0]?.correct).length;
  const newestFacts=originals.filter(q=>Number(q.fact.split('x')[0])===r.newest);
  const qualified=r.mode==='guided' && score>=8 && (!r.newest || (new Set(newestFacts.map(q=>q.fact)).size>=4 && newestFacts.filter(q=>q.attempts[0]?.correct).length>=3));
  let added=null;
  if(r.mode==='guided') {
    state.guided.streak=qualified?state.guided.streak+1:0;
    if(state.guided.streak===3) {added=INTRODUCTION.find(t=>!state.guided.tables.includes(t))??null;if(added)state.guided.tables.push(added);state.guided.streak=0;}
  }
  const result={id:r.id,day:r.day,mode:r.mode,score,missed:originals.filter(q=>!q.attempts[0]?.correct).map(q=>q.fact),qualified,added};
  state.results.push(result);return result;
}
export function createState() {
  return {version:2, challenge:{best:{},results:[]}, facts:Object.fromEntries(ALL.flatMap(a=>ALL.map(b=>[`${a}x${b}`,{history:[]}]))), guided:{tables:[1,2,5,10],streak:0}, selection:[1,2,5,10], mode:'guided', round:null, results:[]};
}
