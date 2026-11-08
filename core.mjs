export const tank={halfWidth:2.45,bottom:.38,top:5.3,radius:.245,tube:.064,hole:.175};
export const trays=[
 {name:'First Bubbles',subtitle:'A little lift. A gentle landing.',rings:[-1.15,1.15],pegs:[[-1.07,2.2],[1.08,2.58]],par:8,time:40,current:0,theme:0},
 {name:'Three Little Wishes',subtitle:'Give each ring a little room.',rings:[-1.7,-.15,1.65],pegs:[[-.95,2.45],[.96,2.85]],par:16,time:65,current:.018,theme:0},
 {name:'Sea Glass Afternoon',subtitle:'Tilt gently to find the middle.',rings:[-1.9,-.65,.65,1.9],pegs:[[-1.15,2.7],[1.15,3.1]],par:24,time:90,current:.035,theme:1},
 {name:'The Tall One',subtitle:'A second pulse reaches a little higher.',rings:[-1.65,-.3,.9,1.85],pegs:[[-1.12,2.65],[1.06,3.65]],par:26,time:95,current:-.03,theme:1},
 {name:'Coral Club',subtitle:'Let the water settle between pulses.',rings:[-1.9,-.95,0,.95,1.9],pegs:[[-1.3,2.55],[0,3.05],[1.3,3.5]],par:34,time:120,current:.04,theme:2},
 {name:'Six Keepsakes',subtitle:'One last handful of lovely little loops.',rings:[-2,-1.2,-.4,.4,1.2,2],pegs:[[-1.23,3.05],[1.23,3.55]],par:42,time:150,current:-.045,theme:2},
];
export const colors=['#f26765','#f4bf50','#63bb9a','#5c9dd4','#b887cc','#ee94b2'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const valid=(value,a,b)=>Number.isInteger(value)&&value>=a&&value<=b;

export function profile(data={}){
 if(!object(data))data={};
 return {
  stars:trays.map((_,i)=>valid(data.stars?.[i],0,3)?data.stars[i]:0),
  best:trays.map((_,i)=>Number.isFinite(data.best?.[i])&&data.best[i]>0?Math.min(99999,data.best[i]):0),
  sound:data.sound!==false,light:data.light!==false,
  skin:['red','cream','teal'].includes(data.skin)?data.skin:'red',
  rewards:{like:data.rewards?.like===true,comment:data.rewards?.comment===true},
 };
}
export function mergeProfile(local,remote){
 const a=profile(local),b=profile(remote);
 for(let i=0;i<trays.length;i++){
  a.stars[i]=Math.max(a.stars[i],b.stars[i]);
  a.best[i]=a.best[i]&&b.best[i]?Math.min(a.best[i],b.best[i]):a.best[i]||b.best[i];
 }
 a.rewards.like ||= b.rewards.like;
 a.rewards.comment ||= b.rewards.comment;
 return a;
}
export function makeRun(index=0){
 const stage=trays[index];
 return {index,phase:'ready',time:0,strokes:0,tilt:0,lean:0,jet:[0,0],cool:[0,0],
  rings:stage.rings.map((x,i)=>({x,y:.72+(i%2)*.025,z:(i%3-1)*.023,vx:0,vy:0,
   angle:(i%2?-.12:.14),omega:0,state:'free',peg:-1,slide:0,stack:-1,id:i})),
  events:[]};
}
export function checkpoint(run){
 const copy=JSON.parse(JSON.stringify(run));delete copy.events;return copy;
}
export function restore(raw,p){
 if(!object(raw)||!valid(raw.index,0,trays.length-1))return makeRun();
 const initial=makeRun(raw.index);
 if(raw.index>0&&!p.stars[raw.index-1])return makeRun();
 if(!['ready','running','settling','won'].includes(raw.phase)||
  !Number.isFinite(raw.time)||raw.time<0||raw.time>99999||!valid(raw.strokes,0,999999)||
  !Number.isFinite(raw.tilt)||Math.abs(raw.tilt)>1||!Number.isFinite(raw.lean)||Math.abs(raw.lean)>1.01)return initial;
 if(!Array.isArray(raw.rings)||raw.rings.length!==initial.rings.length)return initial;
 for(const [i,r] of raw.rings.entries()){
  if(!object(r)||r.id!==i||!['free','latched','parked'].includes(r.state)||
   ![r.x,r.y,r.z,r.vx,r.vy,r.angle,r.omega,r.slide].every(Number.isFinite)||
   Math.abs(r.x)>2.65||r.y<.38||r.y>5.9||Math.abs(r.z)>.2||Math.abs(r.vx)>8||Math.abs(r.vy)>9||
   Math.abs(r.omega)>20||r.slide<0||r.slide>1||
   (r.state!=='free'&&(!valid(r.peg,0,trays[raw.index].pegs.length-1)||!valid(r.stack,0,raw.rings.length-1))))return initial;
 }
 if(!Array.isArray(raw.jet)||!Array.isArray(raw.cool)||raw.jet.length!==2||raw.cool.length!==2||
  [...raw.jet,...raw.cool].some(n=>!Number.isFinite(n)||n<0||n>1.01))return initial;
 if(raw.phase==='won'&&(!p.stars[raw.index]||raw.rings.some(r=>r.state!=='parked')))return initial;
 if(raw.phase==='settling'&&raw.rings.some(r=>r.state==='free'))return initial;
 return {...JSON.parse(JSON.stringify(raw)),events:[]};
}
export function pump(run,side,host){
 if(!['ready','running'].includes(run.phase)||![0,1].includes(side)||run.cool[side]>0)return false;
 if(run.phase==='ready')run.phase='running';
 host?.start();
 run.cool[side]=.19;run.jet[side]=1;run.strokes++;
 const source=side===0?-1.8:1.8;
 for(const ring of run.rings){
  if(ring.state!=='free')continue;
  const influence=Math.exp(-Math.pow((ring.x-source)/1.55,2))*Math.max(.22,1-ring.y*.105);
  ring.vy=Math.min(5.5,ring.vy+5*influence);
  ring.vx+=(side===0?1:-1)*.12*influence;
  ring.omega=clamp(ring.omega+(side===0?1:-1)*(2.8+ring.id*.15)*influence*(.12+.88*Math.abs(Math.cos(ring.angle))),-9,9);
 }
 run.events.push({type:'pump',side});
 return true;
}
export function tilt(run,value){
 if(!Number.isFinite(value))return false;
 run.tilt=clamp(value,-1,1);return true;
}
export function caught(run){return run.rings.filter(r=>r.state!=='free').length;}
export function capture(run,ring,oldY){
 if(ring.state!=='free'||ring.vy>=0)return false;
 const pegs=trays[run.index].pegs;
 for(let i=0;i<pegs.length;i++){
  const [px,tip]=pegs[i];
  if(!(oldY>tip&&ring.y<=tip))continue;
  const holeClear=Math.hypot(ring.x-px,ring.z)<tank.hole-.022;
  const horizontal=Math.abs(Math.sin(ring.angle))>.6;
  if(!holeClear||!horizontal)continue;
  ring.stack=run.rings.filter(other=>other.state!=='free'&&other.peg===i).length;
  ring.state='latched';ring.peg=i;ring.slide=0;ring.vx=0;ring.vy=0;ring.omega=0;
  ring.y=tip;run.events.push({type:'catch',ring:ring.id,peg:i});
  return true;
 }
 return false;
}
function separate(rings){
 for(let i=0;i<rings.length;i++)for(let j=i+1;j<rings.length;j++){
  const a=rings[i],b=rings[j];
  if(a.state!=='free'||b.state!=='free')continue;
  const dx=b.x-a.x,dy=b.y-a.y;
  const distance=Math.hypot(dx,dy),minimum=.29;
  if(distance>=minimum||distance<.00001)continue;
  const overlap=(minimum-distance)*.22,nx=dx/distance,ny=dy/distance;
  a.x-=nx*overlap;b.x+=nx*overlap;
  a.y-=ny*overlap;b.y+=ny*overlap;
  const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
  if(closing<0){
   const force=closing*.35;
   a.vx+=force*nx;b.vx-=force*nx;
   a.vy+=force*ny;b.vy-=force*ny;
  }
 }
}
export function tick(run,dt,host){
 if(run.phase==='won')return;
 if(run.phase==='ready'){run.lean+=(run.tilt-run.lean)*Math.min(1,dt*6);return;}
 const stage=trays[run.index];
 run.time=Math.min(99999,run.time+dt);
 run.lean+=(run.tilt-run.lean)*Math.min(1,dt*6);
 for(let i=0;i<2;i++){
  run.jet[i]=Math.max(0,run.jet[i]-dt*2.3);
  run.cool[i]=Math.max(0,run.cool[i]-dt);
 }
 for(const ring of run.rings){
  if(ring.state==='parked')continue;
  if(ring.state==='latched'){
   ring.slide=Math.min(1,ring.slide+dt*1.4);
   const [px,top]=stage.pegs[ring.peg];
   const end=.67+ring.stack*.145;
   const ease=1-Math.pow(1-ring.slide,3);
   ring.x+=(px-ring.x)*Math.min(1,dt*13);
   ring.z*=Math.exp(-dt*12);
   ring.y=top+(end-top)*ease;
   ring.angle+=(Math.PI/2-ring.angle)*Math.min(1,dt*15);
   if(ring.slide===1){ring.state='parked';ring.x=px;ring.y=end;ring.angle=Math.PI/2;}
   continue;
  }
  const oldY=ring.y;
  ring.vx+=(run.lean*2.2+stage.current*Math.sin(run.time*1.2+ring.y))*dt;
  ring.vx*=Math.exp(-dt*.9);
  ring.vy-=dt*1.8;
  ring.vy*=Math.exp(-dt*.36);
  ring.vy=Math.max(-2.15,ring.vy);
  ring.x+=ring.vx*dt;ring.y+=ring.vy*dt;
  ring.z=Math.sin(run.time*.8+ring.id*1.8)*.035;
  // Weighted rings settle toward a horizontal plane while fluid drag damps their spin.
  ring.omega+=Math.sin(2*(Math.PI/2-ring.angle))*.65*dt;
  ring.omega*=Math.exp(-dt*1.25);
  ring.angle+=ring.omega*dt;
  const halfY=Math.abs(Math.cos(ring.angle))*tank.radius+tank.tube;
  if(ring.x<-tank.halfWidth+tank.radius){
   const impact=Math.abs(ring.vx);
   ring.x=-tank.halfWidth+tank.radius;ring.vx=impact*.45;
   if(impact>.1)ring.omega+=Math.min(.8,impact*.2);
  }
  if(ring.x>tank.halfWidth-tank.radius){
   const impact=Math.abs(ring.vx);
   ring.x=tank.halfWidth-tank.radius;ring.vx=-impact*.45;
   if(impact>.1)ring.omega-=Math.min(.8,impact*.2);
  }
  if(ring.y<tank.bottom+halfY){
   ring.y=tank.bottom+halfY;ring.vy=Math.abs(ring.vy)*.08;
   ring.vx*=Math.exp(-dt*1.9);
  }
  if(ring.y>tank.top-halfY){ring.y=tank.top-halfY;ring.vy=-Math.abs(ring.vy)*.16;ring.omega+=.3;}
  ring.omega=clamp(ring.omega,-9,9);
  if(capture(run,ring,oldY))continue;
  for(const [px,top] of stage.pegs){
   const dx=ring.x-px;
   if(ring.y<=top&&ring.y>top-.15&&Math.abs(dx)<.30&&oldY>top&&ring.vy<0){
    ring.y=top+.055;ring.vy=Math.max(.28,-ring.vy*.25);
    ring.vx+=(dx<0?-1:1)*.13;ring.omega+=(dx<0?-1:1)*.7;
   }
  }
 }
 separate(run.rings);
 if(run.phase==='running'&&caught(run)===run.rings.length)run.phase='settling';
 if(run.phase==='settling'&&run.rings.every(r=>r.state==='parked')){
  run.phase='won';run.tilt=0;
  run.events.push({type:'win'});host?.end();
 }
}
export function earn(run,p){
 if(run.phase!=='won')return 0;
 const stage=trays[run.index],stars=1+Number(run.strokes<=stage.par)+Number(run.time<=stage.time);
 p.stars[run.index]=Math.max(p.stars[run.index],stars);
 p.best[run.index]=p.best[run.index]?Math.min(p.best[run.index],run.time):run.time;
 return stars;
}


