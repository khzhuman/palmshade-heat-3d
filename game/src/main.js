import {loadThree} from './three-loader.js';

async function boot() {
  await loadThree();
  const [{DISTRICTS,PRICES},{makeRng},input,{createWorld,makePerson,posePerson},
    {createVehicles,forward,syncCar},{createPlayer},{createPolice},{createMissions,JOBS},
    {createCombat},{createHud},{createMinimap},{createEffects}] = await Promise.all([
    import('./config.js'),import('./random.js'),import('./input.js'),import('./world.js'),
    import('./vehicles.js'),import('./player.js'),import('./police.js'),import('./missions.js'),
    import('./combat.js'),import('./hud.js'),import('./minimap.js'),import('./effects.js')
  ]);
  const query=new URLSearchParams(location.search), shot=query.get('shot');
  const rng=makeRng(Number(query.get('seed')||1)), V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(61,1,.12,620);
  scene.background=new THREE.Color(0xffbe9d);
  scene.fog=new THREE.FogExp2(0xffbaac,.009);
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  document.querySelector('#view').append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffe9ce,0x985b86,1.55));
  const sun=new THREE.DirectionalLight(0xffd4a0,1.6);
  sun.position.set(-110,55,-65);scene.add(sun);
  const world=createWorld(scene,rng),vehicles=createVehicles(scene,world,rng),effects=createEffects(scene);
  const hud=createHud(document.querySelector('#hud'));
  const map=createMinimap(document.querySelector('#minimap'),world);
  const fullCanvas=document.querySelector('#atlas'),atlas=createMinimap(fullCanvas,world);
  function resize() {
    renderer.setSize(innerWidth,innerHeight);
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    fullCanvas.width=Math.max(320,innerWidth);fullCanvas.height=Math.max(320,innerHeight);
  }
  resize();window.addEventListener('resize',resize);input.initInput();
  let save=null;
  if(!shot)try{save=JSON.parse(localStorage.getItem('palmshade-v1'));}catch{}
  let cash=Number.isFinite(save?.cash)?save.cash:300;
  let weapon='PISTOL',gunfire=0,clock=0,saving=0,full=false,stagedBust=0,stagedPrompt=null,recovering=false;
  const {shop,villa}=world.landmarks;
  function safe(x,z) {
    for(let r=0;r<=38;r+=2)for(let i=0;i<8;i++){
      const a=i*Math.PI/4,px=x+r*Math.cos(a),pz=z+r*Math.sin(a);
      if(!world.blocked(px,pz,1.3))return V(px,0,pz);
    }
    return V(x,0,z);
  }
  function place(point) {
    player.respawn(point.clone().add(V(0,0,8)));
    player.position.x=point.x;player.position.z=point.z;
  }
  function persist() {
    if(shot)return;
    const {x,z}=player.position;
    try{localStorage.setItem('palmshade-v1',JSON.stringify({cash,jobs:missions.jobIndex,x,z}));}catch{}
  }
  function reset(busted) {
    if(recovering)return;
    recovering=true;
    cash=Math.max(0,cash-(busted?Math.ceil(cash*PRICES.bustCut):PRICES.hospitalFee));
    missions.fail(busted?'Dispatch took your cut. Come back to the marker.':'Hospital bill’s paid. Come back when you’re ready.');
    const at=busted?shop:world.landmarks.hospital??world.landmarks.flats??shop;
    place(safe(at.x,at.z));police.clear();
    effects.floatText(player.position.clone().add(V(0,3,0)),busted?'BUSTED':'HOSPITAL','#ffb59b');
    persist();recovering=false;
  }
  function theft(car,driver) {
    if(shot)return;
    const witness=driver || car.police || police.units.some(u=>u.car&&u.distanceToPlayer<40) ||
      world.peds.some(p=>p.position?.distanceTo(player.position)<13 || p.mesh?.position.distanceTo(player.position)<13);
    if(witness)police.addWanted(1);
    world.scare(player.position,13,false);
  }
  function crash(...args) {
    const pos=args.find(a=>a?.isVector3)??player.position;
    effects.spark(pos.clone().add(V(0,.8,0)));world.scare(pos,20,false);
  }
  const player=createPlayer(scene,camera,world,vehicles,{onDeath:()=>reset(false),onCrash:crash});
  const police=createPolice(scene,world,vehicles,player,effects,{onBusted:()=>reset(true)});
  const combat=createCombat(scene,world,effects,{onFire:()=>{
    if(gunfire<=0&&!shot&&police.wanted<2)police.addWanted(1);
    gunfire=1.7;
  }});
  const missions=createMissions(world,player,police,hud,{
    scene,vehicles,combat,districts:DISTRICTS,jobsDone:shot==='gunfight'?2:shot==='hero'||shot==='complete'?1:save?.jobs,
    onJobComplete(job){cash+=job.payout;hud.showComplete(job,cash);persist();},
    onRivalAttack(pos){const a=pos.clone().add(V(0,1.15,0)),b=player.position.clone().add(V(0,1.2,0));effects.flash(a,b.clone().sub(a).normalize());effects.tracer(a,b);}
  });
  place(Number.isFinite(save?.x)&&Number.isFinite(save?.z)?safe(save.x,save.z):safe(shop.x,shop.z-8));
  const pin=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.15,8,32),new THREE.MeshBasicMaterial({color:0xffcb75}));
  ring.rotation.x=-Math.PI/2;pin.add(ring);
  const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(.7),new THREE.MeshBasicMaterial({color:0xffd689}));
  pin.add(beacon);scene.add(pin);
  const dTo=p=>Math.hypot(player.position.x-p.x,player.position.z-p.z);
  function nearbyCar() {
    let result=null, radius=5;
    for(const c of vehicles.cars) if(!c.disabled&&dTo(c)<radius){result=c;radius=dTo(c);}
    return result;
  }
  function refresh(bust,prompt) {
    const marker=missions.marker(),p=player.position;
    pin.visible=!!marker;
    if(marker){pin.position.set(marker.x,.14,marker.z);beacon.position.y=2.9+Math.sin(clock*4)*.35;beacon.rotation.y=clock*2;}
    const district=world.districtAt(p.x,p.z);
    hud.setStats({cash,jobs:missions.jobIndex,weapon,health:player.health,armour:player.armour,
      wanted:police.wanted,driving:!!player.car,speed:player.car?.speed??player.speed,district:district?.name??district});
    hud.setDispatch(police.units);hud.setMission(missions.stageText()??(missions.jobIndex===4?'ALL FOUR CONTRACTS CLOSED':null));
    hud.setBust(bust);hud.setPrompt(prompt);
    const state={position:p,yaw:player.car?.yaw??player.yaw,marker,units:police.units,wanted:police.wanted,jobs:missions.jobIndex};
    map.draw(state);fullCanvas.hidden=!full;
    if(full)atlas.draw({...state,full:true});
  }
  function aim(mouse) {
    const origin=player.position.clone().add(V(0,1.03,0)),facing=forward(player.yaw);
    const direction=facing.clone();
    let best=.39;
    for(const t of combat.targets) {
      const p=t.mesh.position.clone().add(V(0,1.1,0)),delta=p.clone().sub(origin);
      if(delta.length()>55)continue;
      const screen=p.project(camera);
      const score=mouse && Number.isFinite(input.mouse.x)
        ? Math.hypot(screen.x-(input.mouse.x/innerWidth*2-1),screen.y+(input.mouse.y/innerHeight*2-1))*.75
        : 1-delta.clone().normalize().dot(facing);
      if(screen.z>=1||score>=best)continue;
      best=score;direction.copy(delta.normalize());
    }
    combat.fire(origin,direction);
  }
  function step(dt) {
    clock+=dt;gunfire=Math.max(0,gunfire-dt);
    if(input.pressed('Digit1'))weapon='FISTS';
    if(input.pressed('Digit2'))weapon='PISTOL';
    if(input.pressed('KeyM'))full=!full;
    const cost=police.wanted*PRICES.clearPerStar;
    const canPay=cost>0&&cash>=cost&&dTo(shop)<10&&!missions.active;
    const canTalk=missions.canAccept(),steal=!player.car&&nearbyCar();
    const prompt=canPay?'E — SHINE SHOP  $'+cost:canTalk?'E — TALK TO MARA':player.car?'E — EXIT':steal?'E — STEAL':null;
    if(input.pressed('KeyE')) {
      if(player.interactCooldown<=0) {
        if(canPay){cash-=cost;if(player.car?.police)player.exit();police.clear();persist();}
        else if(canTalk)missions.acceptNearest();
        else if(player.car)player.exit();
        else if(steal){const driver=steal.driver;if(player.enter(steal))theft(steal,driver);}
        player.interactCooldown=.28;
      }
    }
    player.update(dt,clock);
    if(!player.car&&weapon==='PISTOL'&&(input.mouse.down||input.keys.Space||input.pressed('Space')))aim(input.mouse.down);
    vehicles.update(dt,player,clock,crash);
    if(player.car&&Math.abs(player.car.speed)>14)world.scare(player.position,12,false);
    if(player.car?.health<55&&Math.floor(clock*11)!==Math.floor((clock-dt)*11))effects.smoke(player.position.clone().addScaledVector(forward(player.car.yaw),2).add(V(0,.7,0)),.9);
    world.update(dt,player.position,gunfire>0);
    const bust=police.update(dt);
    if(player.health<=0)reset(false);
    missions.update(dt);effects.update(dt);player.updateCamera(dt);combat.update(dt,camera);
    if((saving+=dt)>4){persist();saving=0;}
    refresh(bust,prompt);hud.update();
  }
  function stageShot() {
    if(shot==='hero') {
      place(safe(shop.x,shop.z));missions.acceptNearest();
      const d=DISTRICTS.find(d=>d.name.includes('Neon'))??DISTRICTS[0];
      const cx=(d.x0+d.x1)/2,cz=(d.z0+d.z1)/2;
      const road=world.roadsX.reduce((a,b)=>Math.abs(b-cx)<Math.abs(a-cx)?b:a);
      const z=cz-12,x=road+3;
      place(V(x,0,z));
      const car=vehicles.spawn({x,z,yaw:0,parked:true,color:0xf48c62});
      player.enter(car);
      Object.assign(car,{x,z,yaw:0,speed:28,steer:.16});syncCar(car,.016,1);
      player.position.set(x,.15,z);player.yaw=0;
      police.setWanted(4);police.update(.016);
      for(const [i,u] of police.units.filter(u=>u.car&&u.role!=='ROADBLOCK').entries()){
        Object.assign(u.car,{x:x+[3.15,-4.3,-5,5][i],z:z+[-2,-3,12,21][i],yaw:[-.24,.15,.08,-.12][i],speed:23});
        syncCar(u.car,.016,1);u.distanceToPlayer=u.position.distanceTo(player.position);
      }
      const air=police.units.find(u=>!u.car);
      if(air){air.position.set(x-8,16,z+12);police.update(0);}
      effects.spark(V(x+1.75,.65,z-1.4));effects.smoke(V(x,.7,z+2),.8);
      for(const [i,side] of [-1,1].entries()){
        const bypass=vehicles.spawn({x:road+side*(6+i),z:z+12+i*11,parked:true,color:i?0xe4ab45:0x51c5b6});
        bypass.yaw=side*.45;syncCar(bypass,.016,1);
        const ped=makePerson(i?0xf5bd53:0x59e5c9);
        ped.position.set(road+side*9,0,z+10+i*6);ped.rotation.y=side*1.15;posePerson(ped,'flee',i+.7);scene.add(ped);
      }
      world.scare(player.position,35,false);world.update(.07,player.position,false);
      stagedBust=.43;
      camera.position.set(x+7,7.4,z-13);camera.lookAt(x-2,5,z+15);
    } else if(shot==='gunfight') {
      place(safe(villa.x,villa.z));missions.acceptNearest();
      const target=combat.targets[0];
      if(target){
        const p=target.mesh.position;
        const spots=[V(p.x-7,0,p.z-3),V(p.x+7,0,p.z-3),V(p.x-3,0,p.z+7),V(p.x+3,0,p.z+7)];
        const from=spots.find(a=>Array.from({length:8},(_,i)=>a.clone().lerp(p,i/8)).every(v=>!world.blocked(v.x,v.z,.25)))??safe(p.x-6,p.z);
        place(from);
        const dir=p.clone().sub(from).normalize(),side=V(dir.z,0,-dir.x);
        player.yaw=Math.atan2(dir.x,dir.z);player.mesh.rotation.y=player.yaw;
        posePerson(player.mesh,'idle',0);
        if(player.gun)player.gun.visible=true;
        for(const [i,state] of ['cower','flee','cower','flee'].entries()){
          const ped=makePerson([0xffba54,0x58ccba,0xf480ab,0xa2ddda][i]);
          ped.position.copy(from).addScaledVector(dir,3+i*.95).addScaledVector(side,i%2?3.3:-3);
          ped.rotation.y=player.yaw+(i%2?1.5:-1.4);posePerson(ped,state,i+.45);scene.add(ped);
        }
        const parked=from.clone().addScaledVector(side,5).addScaledVector(dir,1.5);
        const car=vehicles.spawn({x:parked.x,z:parked.z,yaw:player.yaw+.3,color:0xe49b48,parked:true});
        syncCar(car,0,0);
        combat.fire(from.clone().add(V(0,1.15,0)),dir);
        effects.update(.045);world.update(.04,from,true);
        camera.position.copy(from).addScaledVector(dir,-7).addScaledVector(side,2).add(V(0,4.1,0));
        camera.lookAt(from.clone().lerp(p,.68).add(V(0,1.5,0)));
      }
      stagedPrompt='E — STEAL';
    } else {
      if(shot==='complete'){cash=1100;hud.showComplete(JOBS[0],cash);}
      full=shot==='map';
      player.updateCamera(.016,true);
    }
    camera.updateMatrixWorld();
    combat.update(0,camera);refresh(stagedBust,stagedPrompt);renderer.render(scene,camera);
  }
  if(shot)stageShot();else player.updateCamera(.016,true);
  let last=performance.now();
  function frame(now) {
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    if(!shot)step(dt);else if(full)refresh(stagedBust,stagedPrompt);
    renderer.render(scene,camera);input.endFrame();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch(error=>{
  console.error(error);
  document.querySelector('#view').textContent='Palmshade could not start: '+error.message;
});
