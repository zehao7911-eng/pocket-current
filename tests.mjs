import assert from 'node:assert/strict';
import * as Core from './core.mjs';

let checks=0,campaigns=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};

function pilot(run,step,host,checkpointing=false){
 let focus=0,lastPulse=-100;
 for(let frame=0;frame<240/step&&run.phase!=='won';frame++){
  let ring=run.rings.find(r=>r.id===focus&&r.state==='free');
  if(!ring){ring=run.rings.find(r=>r.state==='free');focus=ring?.id;}
  if(ring){
   const target=Core.trays[run.index].pegs.map(([x,top])=>({x,top}))
    .sort((a,b)=>Math.abs(a.x-ring.x)-Math.abs(b.x-ring.x))[0];
   const error=target.x-ring.x;
   const desired=Math.max(-.8,Math.min(.8,error*1.65));
   Core.tilt(run,Math.max(-.7,Math.min(.7,(desired-ring.vx)*1.7)));
   const wait=Math.abs(ring.x)<.5?.24:.6;
   if(ring.y<target.top-.25&&ring.vy<.2&&run.time-lastPulse>wait){
    const side=ring.x<0?0:1;
    if(Core.pump(run,side,host)){
     if(Math.abs(ring.x)<.5)Core.pump(run,1-side,host);
     lastPulse=run.time;
    }
   }
   if(run.phase==='ready'){Core.pump(run,ring.x<0?0:1,host);lastPulse=0;}
  }else Core.tilt(run,0);
  Core.tick(run,step,host);
  run.events=[];
  if(checkpointing&&frame%79===0){
   const raw=Core.checkpoint(run);
   const restored=Core.restore(raw,{...Core.profile(),stars:Array(6).fill(3)});
   assert.deepEqual(Core.checkpoint(restored),raw);checks++;run=restored;
  }
 }
 return run;
}
for(const step of [1/60,1/120]){
 const p=Core.profile();
 for(let index=0;index<6;index++){
  let ends=0;
  const run=pilot(Core.makeRun(index),step,{start(){},end(){ends++;}},step===1/120);
  check(run.phase==='won'&&Core.caught(run)===run.rings.length,'tray '+index+' completes with ordinary inputs at '+step);
  check(ends===1,'a completed tray has one terminal event');
  check(Core.earn(run,p)>=1&&p.stars[index]>=1,'actual completion earns progress');
  for(const ring of run.rings){
   const peg=Core.trays[index].pegs[ring.peg];
   check(ring.x===peg[0]&&ring.angle===Math.PI/2,'parked ring is aligned around its real peg');
  }
  for(let a=0;a<run.rings.length;a++)for(let b=a+1;b<run.rings.length;b++){
   if(run.rings[a].peg===run.rings[b].peg)check(Math.abs(run.rings[a].y-run.rings[b].y)>.13,'stacked rings retain distinct physical heights');
  }
  const raw=Core.checkpoint(run);
  assert.deepEqual(Core.checkpoint(Core.restore(raw,p)),raw);checks++;
  Core.tick(run,2,{});
  check(!Core.pump(run,0),'completed tray ignores extra pump input');
  campaigns++;
 }
}
let run=Core.makeRun();
check(Core.pump(run,0)&&!Core.pump(run,0),'one accepted pulse per cooldown');
check(Core.pump(run,1)&&run.strokes===2,'both pumps act independently');
for(let i=0;i<800&&run.phase!=='won';i++)Core.tick(run,1/120);
check(run.phase==='won'&&run.strokes===2&&run.time<5,'first tray clears with two gentle pulses inside five seconds');
const cases=[
 {offset:0,angle:Math.PI/2,velocity:-1,z:0,expected:true},
 {offset:.2,angle:Math.PI/2,velocity:-1,z:0,expected:false},
 {offset:0,angle:0,velocity:-1,z:0,expected:false},
 {offset:0,angle:Math.PI/2,velocity:1,z:0,expected:false},
 {offset:0,angle:Math.PI/2,velocity:-1,z:.19,expected:false},
];
for(const item of cases){
 const trial=Core.makeRun(),[x,tip]=Core.trays[0].pegs[0],ring=trial.rings[0];
 Object.assign(ring,{x:x+item.offset,y:tip-.01,vy:item.velocity,angle:item.angle,z:item.z});
 check(Core.capture(trial,ring,tip+.1)===item.expected,'capture requires a descending clear hole over the real tip');
}
run=Core.makeRun();const [x,tip]=Core.trays[0].pegs[0];
for(const index of [1,0]){
 Object.assign(run.rings[index],{x,y:tip-.01,vy:-1,angle:Math.PI/2,z:0});
 check(Core.capture(run,run.rings[index],tip+.1),'reverse-order ring can catch');
}
check(run.rings[0].stack===1&&run.rings[1].stack===0,'stacking follows catch order, not identity');
run=Core.makeRun();Core.pump(run,0);
for(let i=0;i<37;i++)Core.tick(run,1/120);
const clone=Core.restore(Core.checkpoint(run),Core.profile());
for(let i=0;i<68;i++){Core.tick(run,1/120);Core.tick(clone,1/120);}
assert.deepEqual(Core.checkpoint(clone),Core.checkpoint(run));checks++;
check(Core.restore({...Core.checkpoint(run),phase:'settling'},Core.profile()).phase==='ready','inconsistent settling checkpoint is rejected');
check(Core.restore({...Core.checkpoint(run),index:5},Core.profile()).index===0,'locked checkpoint falls back safely');
const merged=Core.mergeProfile({stars:[3],best:[4.2],sound:false},{stars:[1,2],best:[6.1,12],rewards:{comment:true}});
check(merged.stars[0]===3&&merged.stars[1]===2&&merged.best[0]===4.2&&!merged.sound&&merged.rewards.comment,'best time and medals merge without lowering earned progress');
console.log(JSON.stringify({checks,campaigns,scope:'Buoyant ring simulation, genuine hole capture, stack separation and checkpoint regression'}));
