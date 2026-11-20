export function createCombat(scene, world, effects, hooks = {}) {
  const targets = [];
  const up = new THREE.Vector3(0,1,0);
  let cooldown = 0;
  function registerTarget(mesh, health, onDeath) {
    const meter = new THREE.Group();
    const panel = (w,h,color,z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color,depthTest:false}));
      m.position.z=z; m.renderOrder=8;
      meter.add(m); return m;
    };
    panel(1.32,.18,0x2c1732,0);
    const fill = panel(1.22,.10,0xff6966,.01);
    scene.add(meter);
    const target = {mesh,health,max:health,meter,fill,onDeath,dispose() {
      const i=targets.indexOf(target);
      if (i>=0) targets.splice(i,1);
      scene.remove(meter);
      for (const piece of meter.children) { piece.geometry.dispose(); piece.material.dispose(); }
    }};
    targets.push(target);
    return target;
  }
  function fire(origin, dir) {
    if (cooldown>0) return false;
    cooldown=.24;
    const aim=dir.clone().normalize();
    const muzzle=origin.clone().addScaledVector(aim,.6);
    let range=63, victim=null;
    for (let d=1;d<range;d+=.75) {
      if (world.blocked(muzzle.x+aim.x*d,muzzle.z+aim.z*d,.06)) {range=d;break;}
    }
    for (const target of targets) {
      const delta=target.mesh.position.clone().addScaledVector(up,1.1).sub(muzzle);
      const along=delta.dot(aim);
      if (along>0 && along<range && delta.addScaledVector(aim,-along).length()<1.2) {range=along;victim=target;}
    }
    const impact=muzzle.clone().addScaledVector(aim,range);
    world.scare(origin,35,true);
    effects.flash(muzzle,aim); effects.tracer(muzzle,impact);
    if (range<63) effects.spark(impact);
    if (victim) {
      const damage=Math.min(victim.health,30);
      victim.health-=damage;
      effects.floatText(impact.clone().addScaledVector(up,1.8),'-'+damage,'#ffcf8c');
      if (!victim.health) {victim.dispose();victim.onDeath?.();}
    }
    hooks.onFire?.();
    return true;
  }
  function update(dt,camera) {
    cooldown=Math.max(0,cooldown-dt);
    for (const t of targets) {
      t.meter.position.copy(t.mesh.position).addScaledVector(up,2.75);
      if (camera) t.meter.quaternion.copy(camera.quaternion);
      t.fill.scale.x=t.health/t.max;
      t.fill.position.x=(t.fill.scale.x-1)*.61;
    }
  }
  return {fire,registerTarget,targets,update};
}
