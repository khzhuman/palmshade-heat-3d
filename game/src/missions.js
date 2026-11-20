import { PAYOUTS } from './config.js';
import { makePerson, posePerson } from './world.js';

export const JOBS = [
  {id:1,title:'Hot Dock',payout:PAYOUTS[1],dialogue:['Port security clocks out in a minute. Take the marked car to my shop.'],stages:['Steal the marked car at Old Port','Deliver the car to Shine Shop']},
  {id:2,title:'Neon Run',payout:PAYOUTS[2],dialogue:['Three drops on the strip. Keep moving; dispatch already knows your plates.'],stages:['Collect the first drop','Collect the second drop','Collect the last drop']},
  {id:3,title:'Hill Debt',payout:PAYOUTS[3],dialogue:['The villa has my case and two runners who won’t give it back. I need you on foot.'],stages:['Deal with both rival runners','Pick up Mara’s case','Escape to Shine Shop']},
  {id:4,title:'Last Ferry',payout:PAYOUTS[4],dialogue:['The ferry leaves on the minute. If a cruiser blocks the ramp, find another way through.'],stages:['Reach the ferry ramp before departure']}
];

export function createMissions(world, player, police, hud, hooks) {
  const {shop,dock,villa,ferry} = world.landmarks;
  const {scene,vehicles,combat} = hooks;
  let jobIndex = Math.min(4, Math.max(0, hooks.jobsDone ?? 0));
  let stage = 0, active = null, clock = 0, marked = null, rivals = [], phase = 0;
  const v = (x,z) => new THREE.Vector3(x,0,z);
  const starts = [shop,shop,villa,shop];
  const distance = p => p ? Math.hypot(player.position.x-p.x,player.position.z-p.z) : Infinity;
  const near = (p,n=8) => distance(p) < n;
  function open(x,z) {
    for (let r=0;r<=24;r+=2) {
      for (let i=0;i<8;i++) {
        const a=i*Math.PI/4, px=x+Math.cos(a)*r, pz=z+Math.sin(a)*r;
        if (!world.blocked(px,pz,1.5)) return v(px,pz);
      }
    }
    return v(x,z);
  }
  function district(name,fallback) {
    const found = hooks.districts?.find(d=>d.name.includes(name));
    return found ? open((found.x0+found.x1)/2,(found.z0+found.z1)/2) : fallback;
  }
  const neon = district('Neon',shop);
  const dx = Math.abs(neon.x)>160 ? -Math.sign(neon.x) : 1;
  const drops = [open(neon.x-25*dx,neon.z),open(neon.x+8*dx,neon.z+22),open(neon.x+40*dx,neon.z-10)];
  const caseAt = open(villa.x+8,villa.z);
  function marker() {
    if (!active) return starts[jobIndex];
    if (active.id===1) return stage ? shop : marked;
    if (active.id===2) return drops[stage];
    if (active.id===3) return stage===0 ? rivals.find(r=>!r.dead)?.mesh.position ?? villa : stage===1 ? caseAt : shop;
    return ferry;
  }
  function clearRivals() {
    for (const r of rivals) { r.target?.dispose(); scene.remove(r.mesh); }
    rivals = [];
  }
  function finish() {
    const job = active;
    active = null;
    clearRivals();
    jobIndex++;
    hooks.onJobComplete(job);
  }
  function fail(line) {
    if (!active) return;
    active = null;
    clearRivals();
    hud.showDialogue(line,2600);
  }
  function acceptNearest() {
    if (active || jobIndex>=JOBS.length || !near(starts[jobIndex],12)) return false;
    active = JOBS[jobIndex]; stage=0; clock=0;
    hud.showDialogue(active.dialogue[0],4800);
    if (active.id===1) {
      const p = open(dock.x+7,dock.z);
      marked = vehicles.spawn({x:p.x,z:p.z,yaw:0,color:0xffaa44,parked:true});
    }
    if (active.id===2) police.setWanted(Math.max(2,police.wanted));
    if (active.id===3) for (const [i,color] of [0xed574f,0xa05ae0].entries()) {
      const mesh = makePerson(color);
      mesh.position.copy(open(villa.x+10+i*7,villa.z+5+i*5));
      scene.add(mesh);
      const r = {mesh,dead:false,cool:2+i};
      r.target = combat.registerTarget(mesh,60,()=>{r.dead=true; scene.remove(mesh);});
      rivals.push(r);
    }
    if (active.id===4) { clock=95; police.setWanted(Math.max(3,police.wanted)); }
    return true;
  }
  function update(dt) {
    if (!active) return;
    phase+=dt;
    if (clock>0 && (clock-=dt)<=0) { fail('Too late. Come back to the marker and we’ll reset.'); return; }
    if (active.id===1) {
      if (!stage && player.car===marked) { stage=1; clock=90; }
      if (stage && marked.disabled) fail('That car is finished. Come back for another run.');
      else if (stage && player.car===marked && near(shop,13)) finish();
    } else if (active.id===2) {
      if (police.wanted<2) police.setWanted(2);
      if (near(drops[stage]) && ++stage===drops.length) finish();
    } else if (active.id===3) {
      if (!stage) {
        for (const r of rivals) if (!r.dead) {
          const p = r.mesh.position, gap=distance(p);
          r.mesh.rotation.y=Math.atan2(player.position.x-p.x,player.position.z-p.z);
          posePerson(r.mesh,'idle',phase);
          if (gap<20 && !player.car && (r.cool-=dt)<=0) {
            r.cool=1.7; hooks.onRivalAttack?.(p); player.hurt(8);
          }
        }
        if (rivals.every(r=>r.dead)) stage++;
      } else if (stage===1 && !player.car && near(caseAt,5)) { stage++; police.setWanted(Math.max(2,police.wanted)); }
      else if (stage===2 && near(shop,12)) finish();
    } else {
      if (police.wanted<3) police.setWanted(3);
      if (near(ferry,13)) finish();
    }
  }
  return {get active(){return active;},get jobIndex(){return jobIndex;},marker,update,acceptNearest,fail,
    canAccept:()=>!active && jobIndex<4 && near(starts[jobIndex],12),
    stageText:()=>active ? 'JOB '+active.id+'/4 · '+active.title+' · '+(stage+1)+'/'+active.stages.length+' · NEXT: '+active.stages[stage]+(clock>0?' · '+Math.ceil(clock)+'s':'') : null};
}
