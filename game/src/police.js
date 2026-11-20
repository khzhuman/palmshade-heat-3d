import { CITY, WANTED_TUNING as T } from './config.js';
import { forward, moveCar, syncCar, damageCar } from './vehicles.js';

export function createPolice(scene, world, vehicles, player, effects, hooks = {}) {
  const units = [];
  let wanted = 0, bust = 0, unseen = 0, time = 0;
  const angle = (x, z) => Math.atan2(x, z);
  const nearestRoad = (roads, value) => roads.reduce((a, b) => Math.abs(b-value) < Math.abs(a-value) ? b : a);
  const clamp = n => Math.min(CITY.size/2-12, Math.max(-CITY.size/2+12, n));
  function spawn(role, x, z, yaw) {
    const car = vehicles.spawn({ x, z, yaw, police: true, parked: role === 'ROADBLOCK', color: 0x273453 });
    Object.assign(car, { x, z, yaw, police: true, occupied: true, parked: role === 'ROADBLOCK' });
    syncCar(car, 0, time);
    const id = Array.from({length:6}, (_, i) => i+1).find(i => !units.some(u => u.callsign === 'PALM-'+i));
    const unit = { callsign:'PALM-'+id, role, car, position:car.mesh.position, distanceToPlayer:0 };
    units.push(unit);
    return unit;
  }
  function air() {
    const body = new THREE.Group();
    function part(w,h,d,x,y,z,color) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color}));
      m.position.set(x,y,z); body.add(m); return m;
    }
    part(3,2,5,0,0,0,0x233351);
    part(2.8,1.35,1.5,0,.24,2,0x78d4df);
    part(.5,.6,5,0,.1,-4,0x233351);
    part(.4,1.6,1,0,.65,-6,0x233351);
    for (const x of [-1.5,1.5]) part(.25,.25,5,x,-1.4,0,0x152038);
    const rotor = part(11,.13,.4,0,1.35,0,0x152038);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(6,1,24,1,true),
      new THREE.MeshBasicMaterial({color:0xffebaa, transparent:true, opacity:.23, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}));
    const light = new THREE.SpotLight(0xffedb7, 2, 90, .23, .6, 1);
    body.position.copy(player.position).add(new THREE.Vector3(0,22,16));
    scene.add(body, beam, light, light.target);
    units.push({callsign:'AIR-1',role:'SEARCH',position:body.position,distanceToPlayer:0, body, beam, light, rotor});
  }
  function remove(unit) {
    units.splice(units.indexOf(unit),1);
    if (unit.car) {
      const i = vehicles.cars.indexOf(unit.car);
      if (i >= 0) vehicles.cars.splice(i,1);
      scene.remove(unit.car.mesh);
    } else scene.remove(unit.body,unit.beam,unit.light,unit.light.target);
  }
  function setWanted(n) {
    wanted = Math.max(0, Math.min(T.maxStars, Math.round(n)));
    unseen = 0;
    if (!wanted) { for (const unit of [...units]) remove(unit); bust = 0; }
  }
  function dispatch(p, yaw) {
    const f = forward(yaw), alongX = Math.abs(f.x) > Math.abs(f.z);
    const road = alongX ? nearestRoad(world.roadsZ,p.z) : nearestRoad(world.roadsX,p.x);
    const roadCount = wanted >= T.roadblockAtStars ? 2 : 0;
    const roles = ['PURSUE','RAM','PIT','PURSUE'].slice(0,Math.min(4,wanted));
    for (const u of [...units]) {
      if (u.car?.disabled || (u.role === 'ROADBLOCK' && (roadCount === 0 || u.distanceToPlayer > 135)) ||
          (!u.car && wanted < T.heliAtStars)) remove(u);
    }
    let moving = units.filter(u => u.car && u.role !== 'ROADBLOCK');
    while (moving.length > roles.length) remove(moving.pop());
    for (let i=0; i<roles.length; i++) {
      if (moving[i]) { moving[i].role = roles[i]; continue; }
      const back = 24 + i*10;
      const x = alongX ? clamp(p.x-Math.sign(f.x)*back) : road+(i%2 ? -1 : 1)*CITY.laneOffset;
      const z = alongX ? road+(i%2 ? -1 : 1)*CITY.laneOffset : clamp(p.z-Math.sign(f.z)*back);
      moving.push(spawn(roles[i],x,z,angle(p.x-x,p.z-z)));
    }
    const blocks = units.filter(u => u.role === 'ROADBLOCK');
    for (let i=blocks.length; i<roadCount; i++) {
      const side = i ? -4 : 4;
      spawn('ROADBLOCK',alongX ? clamp(p.x+Math.sign(f.x)*43) : road+side,
        alongX ? road+side : clamp(p.z+Math.sign(f.z)*43),alongX ? 0 : Math.PI/2);
    }
    if (wanted >= T.heliAtStars && !units.some(u => u.body)) air();
  }
  function update(dt) {
    time += dt;
    if (!wanted) return 0;
    const p = player.position, yaw = player.car?.yaw ?? player.yaw;
    const f = forward(yaw);
    dispatch(p,yaw);
    let visible = false, close = false;
    for (const u of units) {
      if (u.body) {
        u.position.lerp(p.clone().addScaledVector(f,12).add(new THREE.Vector3(-9,23,0)),Math.min(1,dt*2));
        u.body.rotation.y = yaw; u.rotor.rotation.y += 35*dt;
        u.light.position.copy(u.position); u.light.target.position.copy(p);
        const ray = u.position.clone().sub(p);
        u.beam.position.copy(p).addScaledVector(ray,.5);
        u.beam.scale.y = ray.length();
        u.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),ray.normalize());
      } else if (u.role !== 'ROADBLOCK') {
        const c = u.car;
        const aim = p.clone();
        if (player.car && u.role === 'RAM') aim.addScaledVector(f,-3);
        if (player.car && u.role === 'PIT') aim.addScaledVector(f,-2).add(new THREE.Vector3(f.z*2,0,-f.x*2));
        const delta = angle(aim.x-c.x,aim.z-c.z)-c.yaw;
        const turn = Math.atan2(Math.sin(delta),Math.cos(delta));
        c.yaw += Math.max(-2.9*dt,Math.min(2.9*dt,turn));
        const gap = Math.hypot(p.x-c.x,p.z-c.z);
        const speed = gap < 9 && !player.car ? 4 : Math.abs(turn) > 1 ? 11 : 23+wanted*3;
        c.speed += (speed-c.speed)*Math.min(1,dt*2);
        moveCar(c,dt,world,() => { effects.spark(c.mesh.position); c.yaw += .8; });
        if (player.car && gap < 4.3 && gap > .01) {
          damageCar(player.car,dt*11);
          damageCar(c,dt*4);
          if (u.role !== 'PURSUE') player.car.yaw += dt*(u.role === 'PIT' ? 1.25 : .5);
          if (Math.floor(time*12) !== Math.floor((time-dt)*12)) effects.spark(p.clone().lerp(u.position,.5).add(new THREE.Vector3(0,.7,0)));
        }
        syncCar(c,dt,time);
      }
      if (u.car && u.car.health < 43 && Math.floor(time*10) !== Math.floor((time-dt)*10)) {
        effects.smoke(u.position.clone().addScaledVector(forward(u.car.yaw),2).add(new THREE.Vector3(0,1,0)),.7);
      }
      u.distanceToPlayer = u.position.distanceTo(p);
      if (u.car && u.distanceToPlayer < T.bustRange) close = true;
      if (u.distanceToPlayer < (u.car ? 43 : 46)) {
        const dx = p.x-u.position.x, dz = p.z-u.position.z;
        let clear = true;
        if (u.car) for (let a=.15; a<.95; a+=.17) if (world.blocked(u.position.x+dx*a,u.position.z+dz*a,.1)) { clear=false; break; }
        visible ||= clear;
      }
    }
    if (visible) unseen = 0;
    else if ((unseen += dt) >= T.decaySecondsPerStar) setWanted(wanted-1);
    bust = Math.max(0,bust + (close && Math.abs(player.car?.speed ?? player.speed) < 6 ? dt/T.bustFillSeconds : -dt*.63));
    if (bust >= 1) { bust = 0; hooks.onBusted?.(); }
    return bust;
  }
  return { get wanted(){return wanted;}, setWanted, addWanted:n=>setWanted(wanted+n), units, update, clear:()=>setWanted(0) };
}
