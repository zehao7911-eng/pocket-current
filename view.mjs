import {tank,trays,colors} from './core.mjs';

function roundedGeometry(width,height,depth,radius=.15){
 const r=Math.min(radius,width/2-.002,height/2-.002),x=-width/2,y=-height/2,s=new THREE.Shape();
 s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
 s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
 s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);
 s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const bevel=Math.min(.07,depth*.24);
 const g=new THREE.ExtrudeGeometry(s,{depth:depth-bevel*2,bevelEnabled:true,
  bevelSegments:4,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:7});
 g.translate(0,0,-depth/2+bevel);g.computeVertexNormals();return g;
}
function canvas(width,height){
 const node=document.createElement('canvas');node.width=width;node.height=height;return node;
}
function texture(node){
 const tex=new THREE.CanvasTexture(node);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=2;return tex;
}
function woodTexture(){
 const node=canvas(1024,256),c=node.getContext('2d');
 c.fillStyle='#b7733f';c.fillRect(0,0,1024,256);
 let seed=815;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let y=0;y<256;y++){
  const tone=70+Math.floor(rand()*90);
  c.strokeStyle='rgba('+tone+','+Math.floor(tone*.58)+','+Math.floor(tone*.3)+','+(.03+rand()*.14)+')';
  c.beginPath();c.moveTo(0,y);
  for(let x=0;x<1040;x+=16)c.lineTo(x,y+Math.sin(x*.008+y*.13)*(.25+rand()*1.4));
  c.stroke();
 }
 for(let j=0;j<5;j++){
  c.fillStyle='#774a2d20';c.fillRect(0,j*52,1024,1);
  c.fillStyle='#f1c78c2b';c.fillRect(0,j*52+1,1024,1);
 }
 return texture(node);
}
function backdropTexture(){
 const node=canvas(1024,768),c=node.getContext('2d');
 const gradient=c.createLinearGradient(0,0,0,768);
 gradient.addColorStop(0,'#f7ead5');gradient.addColorStop(1,'#e7d4ba');
 c.fillStyle=gradient;c.fillRect(0,0,1024,768);
 c.filter='blur(27px)';
 for(const [color,x,y,w,h] of [['#b6d8cb',60,180,150,380],['#adc9d4',268,262,180,260],['#edbdac',522,240,155,250],['#d0dcae',760,200,125,325]]){
  c.fillStyle=color;c.fillRect(x,y,w,h);
 }
 c.filter='none';
 return texture(node);
}
function studioEnvironment(renderer){
 const faces=[];
 for(let i=0;i<6;i++){
  const n=canvas(64,64),c=n.getContext('2d');
  const g=c.createLinearGradient(0,0,0,64);g.addColorStop(0,'#fcf3e4');g.addColorStop(1,'#9eaab1');
  c.fillStyle=g;c.fillRect(0,0,64,64);
  if(i===0||i===4){c.fillStyle='#fffdf2';c.fillRect(8,6,23,40);c.fillStyle='#c4d1d4';c.fillRect(36,9,12,32);}
  faces.push(n);
 }
 const cube=new THREE.CubeTexture(faces);cube.needsUpdate=true;cube.encoding=THREE.sRGBEncoding;
 const pmrem=new THREE.PMREMGenerator(renderer),result=pmrem.fromCubemap(cube);
 pmrem.dispose();cube.dispose();return result.texture;
}
function labelTexture(){
 const node=canvas(768,220),c=node.getContext('2d');
 c.fillStyle='#1a2f39';c.fillRect(0,0,768,220);
 c.strokeStyle='#fff1cd';c.lineWidth=6;c.strokeRect(10,10,748,200);
 c.textAlign='center';c.textBaseline='middle';
 c.fillStyle='#fff5de';c.font='900 70px system-ui';c.fillText('POCKET CURRENT',384,89);
 c.fillStyle='#c3ded2';c.font='700 24px system-ui';c.fillText('A LITTLE WATER • A LITTLE WONDER',384,156);
 return texture(node);
}
function shadowTexture(){
 const n=canvas(256,128),c=n.getContext('2d'),g=c.createRadialGradient(128,64,7,128,64,118);
 g.addColorStop(0,'rgba(37,30,27,.48)');g.addColorStop(.55,'rgba(37,30,27,.18)');g.addColorStop(1,'rgba(37,30,27,0)');
 c.save();c.translate(128,64);c.scale(1,.42);c.translate(-128,-64);
 c.fillStyle=g;c.fillRect(0,0,256,128);c.restore();return texture(n);
}
function causticTexture(){
 const n=canvas(256,256),c=n.getContext('2d');c.clearRect(0,0,256,256);
 for(let i=0;i<14;i++){
  c.strokeStyle='rgba(224,255,239,.13)';c.lineWidth=1.8;
  c.beginPath();
  for(let x=-20;x<280;x+=4){
   const y=i*20+Math.sin(x*.04+i)*8+Math.sin(x*.015-i)*16;
   x===-20?c.moveTo(x,y):c.lineTo(x,y);
  }
  c.stroke();
 }
 const tex=texture(n);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;
}
const mat=(color,roughness=.3,metalness=.04)=>{
 const material=new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.48,clearcoatRoughness:.18,envMapIntensity:.3});
 material.color.convertSRGBToLinear();
 return material;
};
function mesh(parent,geometry,material,x=0,y=0,z=0){
 const item=new THREE.Mesh(geometry,material);item.position.set(x,y,z);parent.add(item);return item;
}

export class View{
 constructor(node){
  this.node=node;
  this.renderer=new THREE.WebGLRenderer({canvas:node,alpha:false,antialias:true,powerPreference:'low-power'});
  this.renderer.outputEncoding=THREE.sRGBEncoding;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=.94;
  this.renderer.setClearColor('#eee0c9');
  this.scene=new THREE.Scene();
  this.scene.environment=studioEnvironment(this.renderer);
  this.camera=new THREE.PerspectiveCamera(32,1,.1,90);
  this.scene.add(new THREE.HemisphereLight('#fff9e7','#a6bac1',.75));
  const key=new THREE.DirectionalLight('#fff0d8',1.55);key.position.set(-6,10,8);this.scene.add(key);
  const fill=new THREE.DirectionalLight('#c5ebf0',.8);fill.position.set(6,5,-1);this.scene.add(fill);
  const back=mesh(this.scene,new THREE.PlaneGeometry(28,17),
   new THREE.MeshBasicMaterial({map:backdropTexture()}),0,7,-8);
  const tabletop=new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.67,metalness:0,color:'#f3c591'});
  this.table=mesh(this.scene,new THREE.PlaneGeometry(55,50),tabletop,0,-.9,0);this.table.rotation.x=-Math.PI/2;
  const shadow=mesh(this.scene,new THREE.PlaneGeometry(9,4),new THREE.MeshBasicMaterial({
   map:shadowTexture(),transparent:true,depthWrite:false,opacity:.75}),.4,-.895,.5);
  shadow.rotation.x=-Math.PI/2;
  this.root=new THREE.Group();this.scene.add(this.root);
  this.red=mat('#e72e35',.255,.06);this.red.clearcoat=.8;this.red.envMapIntensity=.48;
  this.side=mat('#aa1e2b',.32,.04);
  this.white=mat('#f3e5ce',.34,.01);
  this.gold=mat('#d7a95c',.21,.6);
  this.chrome=mat('#b8d1d2',.2,.65);
  this.tankBase=mat('#d3e4d4',.42,.05);
  this.createCase();
  this.createWater();
  this.ringMeshes=[];
  this.ringGeometry=new THREE.TorusGeometry(tank.radius,tank.tube,10,42);
  this.ringMaterials=colors.map(color=>mat(color,.28,.045));
  this.pegMeshes=[];
  this.pegs=new THREE.Group();this.root.add(this.pegs);
  this.bubbleList=[];this.bubbleDummy=new THREE.Object3D();
  this.bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),
   new THREE.MeshBasicMaterial({color:'#ebffff',transparent:true,opacity:.3,depthWrite:false}),110);
  this.bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.bubbles.count=0;this.root.add(this.bubbles);
  this.flashes=[];
  this.haloGeometry=new THREE.RingGeometry(.22,.235,40);
  this.prismColors=colors.map(color=>new THREE.Color(color));
  this.bubbleWhite=new THREE.Color('#e7fff4');
  this.index=-1;this.skin='';this.width=1;this.height=1;
 }
 createCase(){
  mesh(this.root,roundedGeometry(5.92,1.02,1.38,.18),this.red,0,-.21,0);
  mesh(this.root,roundedGeometry(5.82,.31,1.34,.11),this.side,0,-.69,-.01);
  mesh(this.root,roundedGeometry(5.78,.53,1.18,.16),this.red,0,5.98,-.01);
  mesh(this.root,roundedGeometry(5.62,.09,1.03,.03),this.side,0,5.68,-.01);
  mesh(this.root,roundedGeometry(5.02,.13,.78,.045),this.tankBase,0,.37,0);
  for(const x of [-2.18,2.18]){
   mesh(this.root,roundedGeometry(.58,.12,.8,.04),mat('#605a57',.6,0),x,-.8,0);
  }
  const glass=new THREE.MeshPhysicalMaterial({color:'#b9e8df',metalness:0,roughness:.06,
   transparent:true,opacity:.115,clearcoat:1,clearcoatRoughness:.04,depthWrite:false,side:THREE.DoubleSide});
  for(const x of [-2.54,2.54]){
   mesh(this.root,new THREE.BoxGeometry(.045,5.31,.82),glass,x,3.03,0);
   mesh(this.root,new THREE.BoxGeometry(.025,5.25,.025),new THREE.MeshBasicMaterial({
    color:'#f3fff7',transparent:true,opacity:.5}),x,3.05,.42);
  }
  mesh(this.root,new THREE.BoxGeometry(5.08,5.31,.025),glass,0,3.03,-.415);
  this.front=mesh(this.root,new THREE.PlaneGeometry(5.08,5.31),glass,0,3.03,.43);
  this.front.renderOrder=4;
  const reflection=new THREE.MeshBasicMaterial({color:'#f5fff6',transparent:true,opacity:.17,depthWrite:false});
  mesh(this.root,new THREE.PlaneGeometry(.07,3.7),reflection,-2.28,3.47,.445).rotation.z=-.012;
  mesh(this.root,new THREE.PlaneGeometry(.022,4.65),reflection,2.38,3.01,.445);
  mesh(this.root,roundedGeometry(2.63,.52,.045,.06),mat('#eee1ba',.3,.4),0,-.23,.719);
  mesh(this.root,new THREE.PlaneGeometry(2.55,.43),new THREE.MeshBasicMaterial({map:labelTexture()}),0,-.23,.747);
  for(const x of [-1.47,1.47]){
   const screw=mesh(this.root,new THREE.CylinderGeometry(.035,.035,.016,10),this.chrome,x,-.23,.722);
   screw.rotation.x=Math.PI/2;
  }
  this.buttons=[];
  for(const x of [-2.04,2.04]){
   mesh(this.root,roundedGeometry(.98,.78,.13,.16),this.red,x,-.21,.72);
   const rim=mesh(this.root,new THREE.CylinderGeometry(.372,.39,.12,40),this.white,x,-.21,.815);
   rim.rotation.x=Math.PI/2;
   const cap=mesh(this.root,new THREE.CylinderGeometry(.335,.345,.17,42),this.white,x,-.21,.9);
   cap.rotation.x=Math.PI/2;
   const lip=mesh(this.root,new THREE.TorusGeometry(.35,.017,6,40),mat('#fff1d6',.5,0),x,-.21,.99);
   this.buttons.push({cap,lip,rim,x});
  }
  // The refill cap and molded ribs are part of the case, rather than screen-space decoration.
  mesh(this.root,roundedGeometry(.48,.08,.41,.06),mat('#e8c375',.4,.02),.76,6.285,-.05);
  for(const x of [-2.5,-2.24,2.24,2.5]){
   mesh(this.root,roundedGeometry(.028,.2,.025,.007),this.side,x,-.61,.7);
  }
 }
 createWater(){
  const volume=new THREE.MeshBasicMaterial({color:'#a6d8d1',transparent:true,opacity:.09,depthWrite:false,side:THREE.BackSide});
  mesh(this.root,new THREE.BoxGeometry(4.98,4.88,.73),volume,0,2.825,0);
  mesh(this.root,new THREE.PlaneGeometry(4.98,4.85),new THREE.MeshBasicMaterial({
   color:'#84c6c5',transparent:true,opacity:.13,depthWrite:false}),0,2.825,.396).renderOrder=2;
  this.foam=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,5),
   new THREE.MeshBasicMaterial({color:'#effff6',transparent:true,opacity:.48,depthWrite:false}),31);
  this.foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(this.foam);
  this.foamDummy=new THREE.Object3D();
  this.surfaceGeometry=new THREE.PlaneGeometry(4.98,.74,30,4);
  this.surfaceGeometry.rotateX(-Math.PI/2);
  this.waterSurface=mesh(this.root,this.surfaceGeometry,new THREE.MeshPhysicalMaterial({
   color:'#b7eee1',roughness:.13,metalness:.12,transparent:true,opacity:.28,
   clearcoat:1,depthWrite:false,side:THREE.DoubleSide}),0,5.25,0);
  this.surfaceBase=new Float32Array(this.surfaceGeometry.attributes.position.array);
  this.linePoints=new Float32Array(35*3);
  this.waterLine=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(this.linePoints,3)),
   new THREE.LineBasicMaterial({color:'#6eaaa5',transparent:true,opacity:.72,depthWrite:false}));
  this.root.add(this.waterLine);
  this.caustics=causticTexture();
  const floor=mesh(this.root,new THREE.PlaneGeometry(4.8,.72),new THREE.MeshBasicMaterial({
   map:this.caustics,transparent:true,opacity:.52,depthWrite:false}),0,.449,0);
  floor.rotation.x=-Math.PI/2;
  for(const x of [-1.8,1.8]){
   const nozzle=mesh(this.root,new THREE.CylinderGeometry(.16,.21,.06,22),this.white,x,.48,0);
   for(let i=-1;i<=1;i++){
    const hole=mesh(this.root,new THREE.CylinderGeometry(.021,.021,.006,7),mat('#347c87',.5,0),x+i*.07,.513,.012);
   }
  }
 }
 load(index){
  this.index=index;
  for(const flash of this.flashes){this.root.remove(flash.mesh);flash.mesh.material.dispose();}
  this.flashes=[];
  for(const ring of this.ringMeshes)this.root.remove(ring);
  this.ringMeshes=trays[index].rings.map((_,i)=>{
   const ring=mesh(this.root,this.ringGeometry,this.ringMaterials[i%colors.length]);
   return ring;
  });
  for(const peg of this.pegMeshes){this.pegs.remove(peg);peg.geometry.dispose();}
  this.pegMeshes=[];
  for(const [x,top] of trays[index].pegs){
   const stem=mesh(this.pegs,new THREE.CylinderGeometry(.035,.044,top-.48,14),this.chrome,x,(top+.48)/2,0);
   const knob=mesh(this.pegs,new THREE.SphereGeometry(.047,12,8),this.chrome,x,top,0);
   const base=mesh(this.pegs,new THREE.CylinderGeometry(.14,.18,.11,22),this.white,x,.49,0);
   this.pegMeshes.push(stem,knob,base);
  }
 }
 resize(light){
  const rect=this.node.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const ratio=Math.min(devicePixelRatio||1,light?1.15:1.65);
  this.renderer.setPixelRatio(ratio);this.renderer.setSize(rect.width,rect.height,false);
  this.width=rect.width;this.height=rect.height;
  this.camera.aspect=rect.width/rect.height;
  const framingHeight=Math.max(8.15,6.35/this.camera.aspect);
  const distance=(framingHeight*.5)/Math.tan(THREE.MathUtils.degToRad(this.camera.fov*.5));
  this.camera.position.set(distance*.105,3.17+distance*.18,distance);
  this.camera.lookAt(0,2.85,0);this.camera.updateProjectionMatrix();
 }
 effect(events,comment){
  for(const event of events){
   if(event.type==='pump'){
    for(let i=0;i<13;i++)this.bubbleList.push({x:(event.side?1.8:-1.8)+(Math.random()-.5)*.32,y:.5,
     z:(Math.random()-.5)*.28,r:.018+Math.random()*.023,speed:1.1+Math.random()*1.3,life:2.5+Math.random()});
   }
   if(event.type==='catch'){
    const peg=trays[this.index].pegs[event.peg];
    for(let i=0;i<12;i++)this.bubbleList.push({x:peg[0]+(Math.random()-.5)*.55,y:peg[1],
     z:(Math.random()-.5)*.2,r:.016+Math.random()*.02,speed:.7+Math.random()*.9,life:1.3});
    const material=new THREE.MeshBasicMaterial({color:comment?'#b0eee0':'#f7df9a',
     transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide});
    const halo=mesh(this.root,this.haloGeometry,material,peg[0],peg[1],.28);
    this.flashes.push({mesh:halo,age:0});
   }
  }
  if(this.bubbleList.length>110)this.bubbleList.splice(0,this.bubbleList.length-110);
 }
 controls(){
  this.root.updateMatrixWorld(true);
  return this.buttons.map(button=>{
   const center=this.root.localToWorld(new THREE.Vector3(button.x,-.21,.99)).project(this.camera);
   const edge=this.root.localToWorld(new THREE.Vector3(button.x+.39,-.21,.99)).project(this.camera);
   return {x:(center.x+1)*this.width/2,y:(1-center.y)*this.height/2,
    size:Math.max(44,Math.abs(edge.x-center.x)*this.width)};
  });
 }
 paint(run,p,dt,time,held){
  if(this.index!==run.index)this.load(run.index);
  if(this.skin!==p.skin){
   this.skin=p.skin;
   const choices={red:'#df2933',cream:'#f0cc91',teal:'#378d89'};
   this.red.color.set(choices[p.skin]).convertSRGBToLinear();this.side.color.set(choices[p.skin]).convertSRGBToLinear().multiplyScalar(.65);
  }
  this.root.rotation.z=-run.lean*.105;
  this.root.position.y=Math.abs(run.lean)*.15;
  for(let i=0;i<this.buttons.length;i++){
   const button=this.buttons[i],press=held[i]||run.jet[i]>.6;
   button.cap.position.z+=( (press?.815:.9)-button.cap.position.z)*Math.min(1,dt*24);
   button.lip.position.z=button.cap.position.z+.09;
   button.rim.material=p.rewards.like?this.gold:this.white;
  }
  run.rings.forEach((ring,i)=>{
   const mesh=this.ringMeshes[i];mesh.position.set(ring.x,ring.y,ring.z);
   mesh.rotation.set(ring.angle,Math.sin(time*.7+i)*.07,ring.state==='free'?Math.sin(time*.5+i)*.08:0);
  });
  const positions=this.surfaceGeometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const x=this.surfaceBase[i*3],z=this.surfaceBase[i*3+2];
   positions.setY(i,run.lean*.105*x+Math.sin(x*2.4+time*2.2)*.019+
    Math.sin(z*5+time*2.8)*.014+(run.jet[0]+run.jet[1])*.013*Math.sin(x*5-time*7));
  }
  positions.needsUpdate=true;this.surfaceGeometry.computeVertexNormals();
  for(let i=0;i<35;i++){
   const x=-2.48+i/34*4.96;
   this.linePoints[i*3]=x;
   this.linePoints[i*3+1]=5.26+run.lean*.105*x+Math.sin(x*2.4+time*2.2)*.019+Math.sin(.36*5+time*2.8)*.014;
   this.linePoints[i*3+2]=.37;
  }
  this.waterLine.geometry.attributes.position.needsUpdate=true;
  for(let i=0;i<31;i++){
   const x=-2.42+i/30*4.84;
   this.foamDummy.position.set(x,5.255+run.lean*.105*x+Math.sin(x*2.4+time*2.2)*.019,.35+Math.sin(i*12)*.015);
   this.foamDummy.scale.setScalar(.009+(Math.sin(i*17)+1)*.007);
   this.foamDummy.updateMatrix();this.foam.setMatrixAt(i,this.foamDummy.matrix);
  }
  this.foam.instanceMatrix.needsUpdate=true;
  this.caustics.offset.set(Math.sin(time*.17)*.04,time*.014%1);
  this.bubbleList=this.bubbleList.filter(b=>b.life>0&&b.y<5.23);
  this.bubbles.count=this.bubbleList.length;
  this.bubbleList.forEach((bubble,i)=>{
   bubble.life-=dt;bubble.y+=bubble.speed*dt;
   this.bubbleDummy.position.set(bubble.x+Math.sin(time*4+i)*.025,bubble.y,bubble.z);
   this.bubbleDummy.scale.setScalar(bubble.r);
   this.bubbleDummy.updateMatrix();this.bubbles.setMatrixAt(i,this.bubbleDummy.matrix);
   this.bubbles.setColorAt(i,p.rewards.comment?this.prismColors[i%this.prismColors.length]:this.bubbleWhite);
  });
  if(this.bubbles.instanceColor)this.bubbles.instanceColor.needsUpdate=true;
  this.bubbles.instanceMatrix.needsUpdate=true;
  for(const flash of this.flashes){
   flash.age+=dt;
   flash.mesh.scale.setScalar(1+flash.age*2.8);
   flash.mesh.material.opacity=Math.max(0,.75*(1-flash.age/.7));
  }
  this.flashes=this.flashes.filter(flash=>{
   if(flash.age<.7)return true;
   this.root.remove(flash.mesh);flash.mesh.material.dispose();return false;
  });
  this.renderer.render(this.scene,this.camera);
 }
 stop(){
  this.renderer.dispose();
  this.scene.environment?.dispose();
 }
}

