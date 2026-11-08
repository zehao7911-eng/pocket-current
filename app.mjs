import * as Core from './core.mjs';
import {View} from './view.mjs';
import {bridge} from './sdk.mjs';

const $=id=>document.getElementById(id);
const storageKey='pocket-current-v1';
const dialog=$('dialog');
const pumpHeld=[false,false],tiltHeld=[false,false];
const pointerSlots=new Map(),keyboard=new Set();
let view=null,sdk,run,player,frame=0,previous=0,accumulator=0,viewTime=0;
let needsFit=true,repaint=true,mode='',audio=null,drag=null,lastSaved=0,uiKey='',wonHandled=false;

function localState(){
 try{return JSON.parse(localStorage.getItem(storageKey))||{};}catch{return {};}
}
const boot=localState();
player=Core.profile(boot.profile);
run=Core.restore(boot.active,player);
try{view=new View($('canvas'));}catch(error){
 $('error').hidden=false;
 $('pumpLeft').disabled=$('pumpRight').disabled=true;
}
$('reload').addEventListener('click',()=>location.reload());

function persist(){
 player=Core.mergeProfile(player,localState().profile);
 try{localStorage.setItem(storageKey,JSON.stringify({profile:player,active:Core.checkpoint(run)}));}catch{}
 lastSaved=run.time;
}
function connect(){
 sdk=bridge({
  read:()=>player,
  write:(incoming,merge)=>{player=merge?Core.mergeProfile(player,incoming):Core.profile(incoming);persist();repaint=true;},
  changed:event=>{
   needsFit=true;
   if(event.type==='reward'){
    play('catch');
    view?.effect([{type:'pump',side:0},{type:'pump',side:1}],player.rewards.comment);
   }
   if(dialog.open&&mode==='settings')socialContents();
  },
 });
}
function fit(){
 needsFit=false;
 const viewport=sdk?.viewport();
 $('app').style.width=viewport?Math.min(innerWidth,viewport.width)+'px':'';
 $('app').style.height=viewport?Math.min(innerHeight,viewport.height)+'px':'';
 view?.resize(player.light);
 repaint=true;
}
function audioReady(){
 if(!player.sound)return;
 try{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(Context&&!audio)audio=new Context();
  if(audio?.state==='suspended')audio.resume().catch(()=>{});
 }catch{}
}
function play(type){
 if(!player.sound||!audio||audio.state!=='running')return;
 const notes={
  pump:[[190,.08],[105,.14]],
  catch:[[740,.18],[1109,.25]],
  win:[[523,.22],[659,.22],[784,.29],[1047,.4]],
 }[type];
 if(!notes)return;
 notes.forEach(([frequency,duration],i)=>{
  const time=audio.currentTime+i*.065;
  const oscillator=audio.createOscillator(),gain=audio.createGain();
  oscillator.type=type==='pump'?'triangle':'sine';
  oscillator.frequency.setValueAtTime(frequency,time);
  oscillator.frequency.exponentialRampToValueAtTime(frequency*(type==='pump'?.52:.98),time+duration);
  gain.gain.setValueAtTime(.001,time);gain.gain.exponentialRampToValueAtTime(type==='pump'?.055:.08,time+.012);
  gain.gain.exponentialRampToValueAtTime(.001,time+duration);
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(time);oscillator.stop(time+duration+.02);
 });
}
function neutral(){
 pumpHeld.fill(false);tiltHeld.fill(false);pointerSlots.clear();keyboard.clear();drag=null;
 Core.tilt(run,0);
}
function events(){
 const queue=run.events.splice(0);
 if(!queue.length)return;
 view?.effect(queue,player.rewards.comment);
 let save=false;
 for(const event of queue){
  play(event.type);
  if(event.type==='catch')save=true;
  if(event.type==='win'&&!wonHandled){
   wonHandled=true;
   Core.earn(run,player);neutral();save=true;sdk.save();
  }
 }
 if(save)persist();
 updateUI();repaint=true;
}
function pulse(side){
 if(dialog.open||!view)return false;
 audioReady();
 const accepted=Core.pump(run,side,sdk);
 if(accepted){events();persist();}
 return accepted;
}
function pumpDown(event,side){
 if(event.button!==0||dialog.open||!view||run.phase==='won')return;
 event.preventDefault();
 event.currentTarget.setPointerCapture?.(event.pointerId);
 pointerSlots.set(event.pointerId,{type:'pump',side});
 pumpHeld[side]=true;pulse(side);
}
function release(event){
 const slot=pointerSlots.get(event.pointerId);
 if(!slot)return;
 if(slot.type==='pump')pumpHeld[slot.side]=false;
 else tiltHeld[slot.side]=false;
 pointerSlots.delete(event.pointerId);persist();
}
for(const [side,name] of ['pumpLeft','pumpRight'].entries()){
 const element=$(name);
 element.addEventListener('pointerdown',event=>pumpDown(event,side));
 element.addEventListener('pointerup',release);
 element.addEventListener('pointercancel',release);
 element.addEventListener('lostpointercapture',release);
 element.addEventListener('click',event=>{if(event.detail===0)pulse(side);});
}
for(const [side,name] of ['tiltLeft','tiltRight'].entries()){
 const element=$(name);
 element.addEventListener('pointerdown',event=>{
  if(event.button!==0||dialog.open)return;
  event.preventDefault();element.setPointerCapture?.(event.pointerId);
  pointerSlots.set(event.pointerId,{type:'tilt',side});tiltHeld[side]=true;
 });
 element.addEventListener('pointerup',release);
 element.addEventListener('pointercancel',release);
 element.addEventListener('lostpointercapture',release);
}
$('canvas').addEventListener('pointerdown',event=>{
 if(event.button!==0||dialog.open)return;
 event.preventDefault();drag={id:event.pointerId,start:event.clientX,x:event.clientX};
 $('canvas').setPointerCapture?.(event.pointerId);
});
$('canvas').addEventListener('pointermove',event=>{if(drag?.id===event.pointerId)drag.x=event.clientX;});
for(const event of ['pointerup','pointercancel','lostpointercapture']){
 $('canvas').addEventListener(event,e=>{if(drag?.id===e.pointerId){drag=null;persist();}});
}
addEventListener('keydown',event=>{
 if(dialog.open)return;
 const recognized=['ArrowLeft','ArrowRight','Space','KeyQ','KeyE'].includes(event.code);
 if(recognized){
  event.preventDefault();
  if(!event.repeat){
   if(event.code==='ArrowLeft'||event.code==='Space')pulse(0);
   if(event.code==='ArrowRight'||event.code==='Space')pulse(1);
  }
  keyboard.add(event.code);
 }
 if(event.code==='Escape')openMenu('settings');
});
addEventListener('keyup',event=>{keyboard.delete(event.code);});
addEventListener('blur',neutral);

function clock(seconds){
 const s=Math.floor(seconds);
 return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
function updateUI(){
 const stage=Core.trays[run.index],count=Core.caught(run);
 const key=[run.index,run.phase,count,Math.floor(run.time*2),run.strokes,player.stars.join(',')].join('|');
 if(key===uiKey)return;
 uiKey=key;
 $('trayNumber').textContent='TRAY '+String(run.index+1).padStart(2,'0')+' / 06';
 $('trayName').textContent=stage.name;$('trayNote').textContent=stage.subtitle;
 $('caught').textContent=count+' / '+run.rings.length;$('timer').textContent=clock(run.time);
 const won=run.phase==='won';
 $('win').hidden=!won;$('next').hidden=!won;$('actions').hidden=won;
 $('pumpLeft').disabled=$('pumpRight').disabled=won||!view;
 $('hint').textContent=run.phase==='ready'?'Tap a white pump. Let the rings fall.':
  run.phase==='settling'?'All caught. Watch them slide home.':
  run.time<7?'Now release — let the rings fall.':'A gentle tilt helps the next ring find its peg.';
 $('progress').textContent=count?count+' lovely '+(count===1?'landing':'landings')+' · '+run.strokes+(run.strokes===1?' pulse':' pulses'):
  run.phase==='ready'?'Two pumps. No rush.':run.strokes+(run.strokes===1?' pulse':' pulses')+' · a little patience';
 if(won){
  const stars=1+Number(run.strokes<=stage.par)+Number(run.time<=stage.time);
  $('winKicker').textContent=run.index===5?'THE CLUB IS COMPLETE':'ALL RINGS HOME';
  $('stars').textContent='★ '.repeat(stars)+'☆ '.repeat(3-stars);
  $('winStats').textContent=clock(run.time)+' · '+run.strokes+' PULSES';
  $('next').textContent=run.index===5?'Visit the tray book →':'Next tray →';
 }
}
function swap(index){
 neutral();sdk.end();sdk.prepare();
 run=Core.makeRun(index);wonHandled=false;uiKey='';lastSaved=0;
 if(view)view.bubbleList=[];
 persist();updateUI();repaint=true;
}
function button(parent,title,detail,handler,{disabled=false,selected=false}={}){
 const element=document.createElement('button');element.type='button';
 element.className='row'+(selected?' selected':'');element.disabled=disabled;element.append(title);
 if(detail){const note=document.createElement('small');note.textContent=detail;element.append(note);}
 element.addEventListener('click',handler);parent.append(element);
}
function menuContents(){
 const body=$('modalBody');body.replaceChildren();
 const rows=document.createElement('div');rows.className='rows';body.append(rows);
 if(mode==='book'){
  $('modalTitle').textContent='Your little trays';
  Core.trays.forEach((stage,i)=>{
   const locked=i>0&&!player.stars[i-1],stars=player.stars[i];
   button(rows,String(i+1).padStart(2,'0')+'  '+stage.name,
    locked?'Finish the previous tray':stars?'★'.repeat(stars)+' · Best '+clock(player.best[i]):stage.rings.length+' rings to bring home',
    ()=>{swap(i);dialog.close();},{disabled:locked,selected:i===run.index});
  });
 }else if(mode==='guide'){
  $('modalTitle').textContent='A gentle little game';
  const p=document.createElement('div');p.className='instructions';
  p.innerHTML='<b>Tap a white pump</b> to send up bubbles and rings.<br><b>Release</b> and let them drift down.<br><b>Tilt gently</b> with ↶ ↷ or drag the glass.<br><br>A ring catches when its hole drops over a peg. Holding a pump makes repeated pulses. Keep pumping if you need more height.<br><br>Earn a star for finishing, another for using fewer pulses, and another for a quick clear. Every tray stays available for replay.';
  rows.append(p);
 }else{
  $('modalTitle').textContent='A quiet moment';
  button(rows,'Resume',null,()=>{
   if(inMotion())sdk.start();
   dialog.close();
  });
  button(rows,'Sound '+(player.sound?'on':'off'),null,()=>{player.sound=!player.sound;persist();audioReady();menuContents();});
  button(rows,'Light rendering '+(player.light?'on':'off'),'Lower pixel density for smaller screens.',()=>{
   player.light=!player.light;persist();needsFit=true;menuContents();
  });
  button(rows,'How to play',null,()=>{mode='guide';menuContents();});
  button(rows,'Restart this tray','Fresh rings, same best record.',()=>{swap(run.index);dialog.close();});
  const cleared=player.stars.filter(Boolean).length;
  for(const [skin,name,needed] of [['red','Cherry Red',0],['cream','Vanilla Cream',2],['teal','Sea Glass',4]]){
   button(rows,name,cleared<needed?'Clear '+needed+' trays to unlock':'Case finish',()=>{
    player.skin=skin;persist();sdk.save();menuContents();repaint=true;
   },{disabled:cleared<needed,selected:player.skin===skin});
  }
  const social=document.createElement('div');social.id='socialRewards';social.className='rows';body.append(social);socialContents();
 }
}
function socialContents(){
 const container=$('socialRewards');if(!container)return;
 container.replaceChildren();
 const support=sdk.support();
 if(support.like)button(container,player.rewards.like?'Gold pump rims earned':'Gold pump rims','Optional GameWave like cosmetic.',()=>{},{disabled:true});
 if(support.comment)button(container,player.rewards.comment?'Prism bubbles earned':'Prism bubbles','Optional GameWave direct comment cosmetic.',()=>{},{disabled:true});
}
function openMenu(type){
 neutral();mode=type;menuContents();
 if(!dialog.open)dialog.showModal();
 repaint=true;
}
function inMotion(){
 return run.phase==='settling'||run.phase==='running'&&run.rings.some(r=>r.state==='latched'||
  r.state==='free'&&(Math.abs(r.vx)+Math.abs(r.vy)>.06||r.y>.95));
}
$('pause').addEventListener('click',()=>openMenu('settings'));
$('book').addEventListener('click',()=>openMenu('book'));
$('guide').addEventListener('click',()=>openMenu('guide'));
$('close').addEventListener('click',()=>{if(inMotion())sdk.start();dialog.close();});
$('next').addEventListener('click',()=>{if(run.index===5)openMenu('book');else swap(run.index+1);});
dialog.addEventListener('close',()=>{previous=0;repaint=true;});

function drawControls(){
 if(!view)return;
 view.controls().forEach((control,i)=>{
  const element=$(i?'pumpRight':'pumpLeft');
  element.style.left=control.x+'px';element.style.top=control.y+'px';
  element.style.width=control.size+'px';element.style.height=control.size+'px';
 });
}
function loop(now){
 frame=requestAnimationFrame(loop);
 if(needsFit)fit();
 if(document.hidden||!view)return;
 const elapsed=previous?(now-previous)/1000:0;
 const rate=player.light?30:45;
 if(previous&&elapsed<1/rate&&!repaint)return;
 previous=now;
 if(dialog.open&&!repaint)return;
 const dt=dialog.open?0:Math.min(.1,elapsed);
 if(!dialog.open){
  const lean=Number(tiltHeld[1]||keyboard.has('KeyE'))-Number(tiltHeld[0]||keyboard.has('KeyQ'));
  const swipe=drag?(drag.x-drag.start)/Math.max(35,$('canvas').clientWidth*.35):0;
  Core.tilt(run,Math.max(-1,Math.min(1,lean*.65+swipe)));
  accumulator+=dt;
  while(accumulator>=1/120){
   accumulator-=1/120;
   for(let side=0;side<2;side++){
    if(pumpHeld[side]||keyboard.has(side?'ArrowRight':'ArrowLeft')||keyboard.has('Space'))Core.pump(run,side,sdk);
   }
   Core.tick(run,1/120,sdk);events();
  }
  if(run.phase==='running'&&run.time-lastSaved>2)persist();
 }
 viewTime+=dt;
 view.paint(run,player,dt,viewTime,pumpHeld);
 drawControls();updateUI();repaint=false;
}
addEventListener('resize',()=>{needsFit=true;});
new ResizeObserver(()=>{needsFit=true;}).observe($('stage'));
document.addEventListener('visibilitychange',()=>{
 neutral();previous=0;
 if(document.hidden){persist();audio?.suspend().catch(()=>{});}
 else if((run.phase==='running'||run.phase==='settling')&&!dialog.open)openMenu('settings');
});
addEventListener('pagehide',()=>{persist();sdk.stop();cancelAnimationFrame(frame);});
addEventListener('pageshow',event=>{
 if(event.persisted){connect();previous=0;frame=requestAnimationFrame(loop);openMenu('settings');}
});
connect();updateUI();
if(run.phase==='running'||run.phase==='settling')openMenu('settings');
frame=requestAnimationFrame(loop);
