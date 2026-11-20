import {loadThree} from './three-loader.js';
import {buildWorld} from './world.js';
import {createCar,spawnTraffic,updateTraffic,cars,resolveCarBuildings,updateCarVisuals} from './vehicles.js';
import {createPolice} from './police.js';
import {createMissions} from './missions.js';
import {createCombat} from './combat.js';
import {createHUD} from './hud.js';
import {createMinimap} from './minimap.js';
import {createEffects} from './effects.js';

export const player={cash:300,health:100,armour:50,mode:'foot',currentCar:null,position:null,mesh:null,speed:0};
export async function boot(){
  const T=await loadThree(),query=new URLSearchParams(location.search),shot=query.get('shot');
  Object.assign(player,{cash:300,health:100,armour:50,mode:'foot',currentCar:null,speed:0});
  let seed=Number(query.get('seed')??17)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const scene=new T.Scene();scene.background=new T.Color(0xe5aa7d);scene.fog=new T.Fog(0xe5aa7d,100,340);
  const camera=new T.PerspectiveCamera(shot==='hero'?62:55,innerWidth/innerHeight,.1,650);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  if(T.ACESFilmicToneMapping!==undefined){renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;}
  document.getElementById('game').append(renderer.domElement);scene.add(new T.HemisphereLight(0xffedcc,0x456c78,2));
  const sun=new T.DirectionalLight(0xffd49a,3);sun.position.set(-70,110,55);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-160,right:160,top:160,bottom:-160,far:400});scene.add(sun);
  const world=buildWorld(scene);spawnTraffic(scene,world,30,{seed:query.get('seed')??1});
  function humanoid(color){
    const mesh=new T.Group(),limbs=[],material=new T.MeshStandardMaterial({color}),skin=new T.MeshStandardMaterial({color:0xb77c56});
    const body=new T.Mesh(new T.BoxGeometry(.6,.85,.38),material);body.position.y=1.1;mesh.add(body);
    const head=new T.Mesh(new T.SphereGeometry(.24,10,8),skin);head.position.y=1.78;mesh.add(head);
    for(const side of [-1,1]){
      const leg=new T.Mesh(new T.BoxGeometry(.2,.75,.23),new T.MeshStandardMaterial({color:0x243443}));leg.position.set(side*.17,.4,0);mesh.add(leg);
      const arm=new T.Mesh(new T.BoxGeometry(.16,.7,.18),skin);arm.position.set(side*.4,1.14,0);mesh.add(arm);limbs.push({leg,arm,side});
    }
    mesh.traverse(o=>{if(o.isMesh)o.castShadow=true;});mesh.userData.limbs=limbs;scene.add(mesh);return mesh;
  }
  const avatar=humanoid(0xf0be58);player.mesh=avatar;player.position=world.maraPos.clone().add(new T.Vector3(2,0,2));avatar.position.copy(player.position);
  const effects=createEffects(T,scene,camera),police=createPolice(T,scene,player,effects),missions=createMissions(T,scene,player,world,police,effects);
  const hud=createHUD(player,police,missions),minimap=createMinimap(player,police,missions,world);
  const keys=new Set();let interact=false,mapPress=false;
  addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!e.repeat&&e.code==='KeyE')interact=true;if(!e.repeat&&e.code==='KeyM')mapPress=true;keys.add(e.code);});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
  const peds=[];
  for(let i=0;i<38;i++){
    const mesh=humanoid([0xefb95c,0xe67b77,0x67bdb1,0xd5d4b9][i%4]),street=(Math.floor(random()*7)-3)*60;
    mesh.position.set(i%2?street+8:(random()-.5)*420,0,i%2?(random()-.5)*420:street+8);peds.push({mesh,state:'walk',fear:0,heading:i%2?0:Math.PI/2,index:i});
  }
  function frighten(position){for(const ped of peds)if(ped.mesh.position.distanceTo(position)<48){ped.fear=7;ped.state=ped.index%2?'flee':'cower';ped.heading=Math.atan2(ped.mesh.position.x-position.x,ped.mesh.position.z-position.z);}}
  const combat=createCombat(T,scene,player,missions,police,effects,frighten);
  let yaw=0,clock=0,last=performance.now(),saveClock=0,staged=false;
  function moveTo(position){player.position.copy(position);player.position.y=0;avatar.position.copy(player.position);}
  function enter(car){player.currentCar=car;player.mode='car';car.controlled=true;car.occupied=true;car.speed=car.speed??0;avatar.visible=false;moveTo(car.position);yaw=car.heading??car.mesh.rotation.y;}
  function exit(){const car=player.currentCar;if(!car)return;car.controlled=false;car.occupied=false;moveTo(car.position.clone().add(new T.Vector3(3,0,0)));player.currentCar=null;player.mode='foot';avatar.visible=true;}
  function respawn(kind){exit();player.cash=Math.max(0,kind==='busted'?Math.floor(player.cash*.75):player.cash-200);player.health=100;player.armour=0;moveTo(missions.shop);police.clear();effects.text(player.position,kind==='busted'?'BUSTED · 25% SEIZED':'HOSPITAL · $200');}
  if(!shot&&!query.has('seed')){try{const data=JSON.parse(localStorage.getItem('palmshade-v1')??'null');if(data){player.cash=Number.isFinite(data.cash)?data.cash:300;missions.done=Math.max(0,Math.min(4,data.jobs??0));if(Array.isArray(data.position)&&data.position.length===3&&data.position.every(Number.isFinite))moveTo(new T.Vector3(...data.position));}}catch{}}
  const marked=createCar(scene,{x:missions.port.x,z:missions.port.z,color:0xf2b34e,parked:true});missions.markedCar=marked;
  const carBeacon=effects.halo(marked.position.clone().add(new T.Vector3(0,3,0)),0xffda85,4);
  for(let i=0;i<12;i++)effects.halo(new T.Vector3(-70+i*12,4,8),0xffbc7e,2.5);
  if(shot==='hero'){
    const car=createCar(scene,{x:60,z:60,color:0xe7ae53,parked:true});enter(car);car.speed=8;missions.start(3);missions.dialogue='MARA: Last ferry. Every unit on the island is on your tail.';missions.dialogueUntil=9999;police.setWanted(5);police.update(0,0);police.bust=50;
    police.units.forEach((u,i)=>{u.position.copy(player.position).add(new T.Vector3(i<3?(i-1)*2.2:(i-4)*3,0,i<3?-2-i:26));u.mesh.rotation.y=i>=3?Math.PI/2:.3;if(i>=3)u.blockPosition=u.position.clone();});
  }else if(shot==='gunfight'){
    missions.start(2);missions.stage=1;moveTo(missions.villa.clone().add(new T.Vector3(0,0,12)));yaw=Math.PI;avatar.rotation.y=yaw;
    marked.position.copy(player.position).add(new T.Vector3(3,0,0));missions.dialogueUntil=9999;police.setWanted(2);combat.fire(true);effects.setFrozen(true);
  }else if(shot==='complete'){missions.start(0);missions.complete();moveTo(missions.shop.clone().add(new T.Vector3(0,0,5)));}
  else if(shot==='map'){minimap.setOpen(true);moveTo(missions.mara);}
  if(shot){peds.slice(0,10).forEach((p,i)=>{p.mesh.position.copy(player.position).add(new T.Vector3((i%5-2)*3,0,3+Math.floor(i/5)*5));p.state=i%2?'flee':'cower';p.fear=9999;});staged=shot==='hero'||shot==='gunfight';}
  function cameraOffset(){if(shot==='hero')return new T.Vector3(8,42,-46);if(shot==='gunfight')return new T.Vector3(14,12,22);return player.currentCar?new T.Vector3(-Math.sin(yaw)*30,24,-Math.cos(yaw)*30):new T.Vector3(0,25,28);}
  function focusCamera(immediate=false){const follow=player.position.clone().add(cameraOffset());if(immediate)camera.position.copy(follow);else camera.position.lerp(follow,.16);camera.lookAt(player.position.clone().add(new T.Vector3(0,shot==='hero'?7:1,0)));}
  focusCamera(true);
  function blocked(next,radius){return (world.colliders??[]).some(c=>{const b=c.box??c;return next.x>(b.min?.x??b.minX)-radius&&next.x<(b.max?.x??b.maxX)+radius&&next.z>(b.min?.z??b.minZ)-radius&&next.z<(b.max?.z??b.maxZ)+radius;});}
  function frame(now){
    requestAnimationFrame(frame);const dt=Math.min(.04,Math.max(.001,(now-last)/1000));last=now;clock+=dt;
    if(mapPress){minimap.toggle();mapPress=false;}
    const throttle=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    const steer=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
    if(throttle||steer||interact||keys.has('Space')){staged=false;effects.setFrozen(false);}
    if(player.currentCar){
      const car=player.currentCar;
      if(!staged){yaw=car.heading??yaw;car.speed=(car.speed+throttle*22*dt)*Math.exp(-dt*(keys.has('Space')?5:(throttle ? .18 : 1.2)));car.speed=Math.max(-12,Math.min(42,car.speed));yaw+=steer*dt*1.7*(car.speed<0?-1:1)*Math.min(1,Math.abs(car.speed)/5);car.position.add(new T.Vector3(Math.sin(yaw)*car.speed*dt,0,Math.cos(yaw)*car.speed*dt));car.heading=yaw;resolveCarBuildings(car,world,dt);updateCarVisuals(car,dt);}
      moveTo(car.position);
    }else{
      const movement=new T.Vector3(-steer,0,throttle),moving=movement.lengthSq()>0;
      player.speed=moving?(keys.has('ShiftLeft')||keys.has('ShiftRight')?8.5:7):0;
      if(moving){movement.normalize();yaw=Math.atan2(movement.x,movement.z);const next=player.position.clone().add(movement.multiplyScalar(player.speed*dt));if(!blocked(next,.35)&&Math.abs(next.x)<235&&Math.abs(next.z)<235)moveTo(next);}
      avatar.rotation.y=yaw;
      avatar.userData.limbs.forEach(({leg,arm,side})=>{leg.rotation.x=arm.rotation.x=moving?Math.sin(clock*9+side)*.45:0;});
    }
    let nearest=null,distance=Infinity;for(const car of cars){const d=car.position.distanceTo(player.position);if(d<distance){nearest=car;distance=d;}}
    let prompt='';const atShop=player.position.distanceTo(missions.shop)<8,atMara=player.position.distanceTo(missions.mara)<6;
    if(player.currentCar)prompt='E — EXIT';else if(atShop&&police.wanted)prompt='E — SHINE SHOP — CLEAR WANTED $150/STAR';else if(atMara&&!missions.active)prompt='E — TALK TO MARA';else if(distance<6)prompt='E — STEAL';
    if(shot==='gunfight'&&staged)prompt='E — STEAL';
    if(interact){
      if(atShop&&police.wanted&&!player.currentCar){const fee=150*police.wanted;if(player.cash>=fee){player.cash-=fee;police.clear();}else effects.text(player.position,'NOT ENOUGH CASH');}
      else if(atMara&&!missions.active&&!player.currentCar)missions.update(0,true);
      else if(player.currentCar)exit();else if(nearest&&distance<6){enter(nearest);police.setWanted(Math.max(1,police.wanted));}interact=false;
    }
    if(!staged){updateTraffic(dt,{world,player});if(police.update(dt,clock))respawn('busted');missions.update(dt);combat.update(dt,keys.has('Space'));}
    else{police.update(0,clock);combat.update(0);missions.update(0);}
    if(player.health<=0)respawn('hospital');
    for(const ped of peds){
      if(!staged)ped.fear-=dt;if(ped.fear<=0)ped.state='walk';const cower=ped.state==='cower';ped.mesh.scale.y=cower ? .58 : 1;
      ped.mesh.userData.limbs.forEach(({leg,arm,side})=>{arm.rotation.z=cower?side*2.6:0;arm.position.y=cower?1.65:1.14;arm.position.x=cower?side*.22:side*.4;arm.rotation.x=cower?0:Math.sin(clock*(ped.state==='flee'?12:5)+side)*.6;leg.rotation.x=cower?-.7:Math.sin(clock*(ped.state==='flee'?12:5)+side)*.45;});
      if(!cower&&!staged){ped.mesh.rotation.y=ped.heading;const speed=ped.state==='flee'?5:1;ped.mesh.position.x+=Math.sin(ped.heading)*speed*dt;ped.mesh.position.z+=Math.cos(ped.heading)*speed*dt;if(Math.abs(ped.mesh.position.x)>230||Math.abs(ped.mesh.position.z)>230)ped.heading+=Math.PI;}
    }
    carBeacon.visible=missions.active&&missions.index===0&&!missions.stage;carBeacon.position.copy(marked.position).add(new T.Vector3(0,3,0));focusCamera();
    effects.update(dt,cars);hud.update(prompt);minimap.update();renderer.render(scene,camera);
    saveClock+=dt;if(saveClock>3&&!shot){saveClock=0;try{localStorage.setItem('palmshade-v1',JSON.stringify({cash:player.cash,jobs:missions.done,position:player.position.toArray()}));}catch{}}
  }
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  document.getElementById('loading').remove();requestAnimationFrame(frame);window.palmshade={player,police,missions,combat,effects,peds,world,camera};
}
