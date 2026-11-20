export const JOBS = [
  {title:'Hot Dock',payout:800,stages:['STEAL THE MARKED CAR','DELIVER TO SHINE SHOP'],limit:150},
  {title:'Neon Run',payout:1500,stages:['COLLECT THE THREE DROPS'],wanted:2},
  {title:'Hill Debt',payout:2500,stages:['DRIVE TO THE VILLA','CLEAR THE RIVALS','GRAB THE CASE','ESCAPE TO SHINE SHOP']},
  {title:'Last Ferry',payout:4000,stages:['REACH THE FERRY RAMP'],wanted:3,limit:120}
];
export function createMissions(T,scene,player,world,police,effects) {
  const vec=(p,f)=>p?.clone?p.clone():new T.Vector3(p?.x??f[0],0,p?.z??f[1]);
  const shop=vec(world.shineShopPos,[0,0]),mara=vec(world.maraPos,[8,8]),ferry=vec(world.ferryPos,[-213,-199]);
  const port=new T.Vector3(-180,0,-180),villa=new T.Vector3(-120,0,120);
  const drops=[new T.Vector3(60,0,60),new T.Vector3(120,0,60),new T.Vector3(120,0,120)];
  const state={done:0,active:false,index:0,stage:0,timer:0,drop:0,rivals:[],marker:null,markedCar:null,dialogue:'',dialogueUntil:0,completion:null};
  const ring=new T.Mesh(new T.TorusGeometry(2,.16,8,40),new T.MeshBasicMaterial({color:0xffda85}));ring.rotation.x=Math.PI/2;scene.add(ring);
  const beam=new T.Mesh(new T.CylinderGeometry(.15,.15,7,8),new T.MeshBasicMaterial({color:0xffda85,transparent:true,opacity:.5}));scene.add(beam);
  const caseMesh=new T.Mesh(new T.BoxGeometry(.9,.5,.65),new T.MeshStandardMaterial({color:0xe5bc66,metalness:.6,roughness:.3}));caseMesh.position.copy(villa).add(new T.Vector3(0,.4,0));caseMesh.visible=false;scene.add(caseMesh);
  function rival(x,z) {
    const mesh=new T.Group();const mat=new T.MeshStandardMaterial({color:0xb53559});
    const torso=new T.Mesh(new T.BoxGeometry(.8,1.1,.5),mat);torso.position.y=1.2;mesh.add(torso);
    const head=new T.Mesh(new T.SphereGeometry(.3,10,8),new T.MeshStandardMaterial({color:0xb9744e}));head.position.y=2;mesh.add(head);
    for(const n of [-.23,.23]){const leg=new T.Mesh(new T.BoxGeometry(.25,.8,.3),new T.MeshStandardMaterial({color:0x222b40}));leg.position.set(n,.4,0);mesh.add(leg);}
    mesh.position.set(x,0,z);scene.add(mesh);return {mesh,position:mesh.position,health:100,maxHealth:100,rival:true,attack:0};
  }
  function spawnRivals(){for(const r of state.rivals)scene.remove(r.mesh);state.rivals=[rival(villa.x-4,villa.z),rival(villa.x+4,villa.z-4)];}
  function start(index=state.done%4) {
    state.index=index;state.active=true;state.stage=0;state.drop=0;state.timer=JOBS[index].limit??0;state.completion=null;
    state.dialogue=['MARA: A hot set of wheels is waiting at Old Port. Bring it home clean.','MARA: Three drops. Neon Mile. Keep moving, the whole strip is listening.','MARA: The villa crew has our case. Park up, then finish this on foot.','MARA: Last ferry leaves soon. Make that ramp before the island locks down.'][index];state.dialogueUntil=10;
    if(index===0&&state.markedCar){state.markedCar.position.copy(port);state.markedCar.speed=0;state.markedCar.parked=true;}
    if(JOBS[index].wanted)police.setWanted(JOBS[index].wanted);if(index===2)spawnRivals();
  }
  function complete(){const job=JOBS[state.index];player.cash+=job.payout;state.done=Math.min(4,state.done+1);state.active=false;state.completion={title:job.title,payout:job.payout,jobs:state.done,cash:player.cash,topWanted:police.topWanted};effects?.text(player.position,`+$${job.payout}`, '#ffda85');}
  function objective(){if(!state.active)return mara;if(state.index===0)return state.stage?shop:state.markedCar?.mesh?.position??port;if(state.index===1)return drops[Math.min(2,state.drop)];if(state.index===2)return state.stage>=3?shop:villa;return ferry;}
  function update(dt,interact=false){
    state.dialogueUntil=Math.max(0,state.dialogueUntil-dt);state.marker=objective();ring.position.copy(state.marker);ring.position.y=.2;beam.position.copy(state.marker);beam.position.y=3.5;caseMesh.visible=state.active&&state.index===2&&state.stage===2;
    if(!state.active){if(interact&&!player.currentCar&&player.position.distanceTo(mara)<6)start();return;}
    if(JOBS[state.index].limit){state.timer-=dt;if(state.timer<=0){state.active=false;state.dialogue='MARA: Time is up. Come back and we will try again.';state.dialogueUntil=7;return;}}
    const near=player.position.distanceTo(state.marker)<6;
    if(state.index===0){if(!state.stage&&player.currentCar&&(!state.markedCar||player.currentCar===state.markedCar))state.stage=1;else if(state.stage&&near&&player.currentCar===state.markedCar)complete();}
    if(state.index===1&&near){state.drop++;effects?.text(player.position,`DROP ${state.drop}/3`);if(state.drop===3)complete();}
    if(state.index===2){if(!state.stage&&near&&player.currentCar)state.stage=1;if(state.stage===1&&state.rivals.every(r=>r.health<=0))state.stage=2;if(state.stage===2&&near&&!player.currentCar)state.stage=3;else if(state.stage===3&&near)complete();}
    if(state.index===3&&near)complete();
  }
  function line(){if(!state.active)return `JOB ${state.done%4+1}/4 · ${JOBS[state.done%4].title} · AVAILABLE · NEXT: TALK TO MARA`;const job=JOBS[state.index];return `JOB ${state.index+1}/4 · ${job.title} · ${job.stages[state.stage]}${state.timer?' · '+Math.ceil(state.timer)+'s':''} · NEXT: ${state.index===1?`DROP ${state.drop+1}/3`:job.stages[state.stage]}`;}
  return Object.assign(state,{start,complete,update,line,objective,spawnRivals,shop,mara,ferry,port,villa});
}
