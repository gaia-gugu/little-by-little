// Presentation only: never reads or writes learning state.
export function createCompanionMotion({root=document,random=Math.random,setTimer=setTimeout,clearTimer=clearTimeout}={}) {
 let timer=null,finish=null,target=null,view='',visible=true,index=0;
 const idleNames=['sway','bob','tilt'];
 function cancel(){clearTimer(timer);clearTimer(finish);timer=finish=null;if(target)delete target.dataset.motion;target=null;}
 function animate(node,name,duration){
  if(!node)return;
  target=node;node.dataset.motion=name;
  finish=setTimer(()=>{delete node.dataset.motion;target=null;finish=null;},duration);
 }
 function schedule(){
  if(!visible||!['home','companions'].includes(view))return;
  const node=root.querySelector('.companion-scene-large .companion-motion');if(!node)return;
  timer=setTimer(()=>{timer=null;animate(node,idleNames[index++%idleNames.length],1100);schedule();},15000+Math.max(0,Math.min(1,random()))*5000);
 }
 return {sync(nextView,nextVisible=true){cancel();view=nextView;visible=nextVisible;schedule();},
  // Invoked only by a newly accepted correct submission, never by rendering saved feedback.
  hop(){if(visible&&view==='practice'){cancel();animate(root.querySelector('.question-companion .companion-motion'),'hop',700);}},cancel};
}
