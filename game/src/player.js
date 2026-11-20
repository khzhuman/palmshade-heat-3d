import { isDown, wasPressed } from './input.js';
import { START_CASH } from './config.js';
import { cars, resolveCarBuildings, updateCarVisuals } from './vehicles.js';

/* Mutable public singleton. position aliases currentCar.position in drive mode.
 * createPlayer(scene, world, options?) returns this same object.
 * updatePlayer(dt, {world, camera, input?, cars?, peds?, onSteal?}) runs once/frame.
 * Optional input implements isDown(key) and wasPressed(key); keys accept codes
 * or browser key names. Call before updateTraffic, then clear input edge state. */
export const player = {
  cash: START_CASH ?? 300, health: 100, armour: 0, mode: 'foot',
  currentCar: null, position: null, heading: 0, mesh: null,
  nearestCar: null, prompt: '', radius: 0.48, speed: 0, moving: false,
  bailouts: [], cameraReady: false
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
let sceneRef, worldRef, cameraLook, footPosition;

function humanoid(shirt = 0xe9b86f, skin = 0xb87956) {
  const T = globalThis.THREE, root = new T.Group();
  const materials = [shirt, skin, 0x354853, 0x353535].map(color => new T.MeshStandardMaterial({ color, roughness: 0.95 }));
  function block(w, h, d, x, y, z, material) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), materials[material]); m.position.set(x, y, z); m.castShadow = true; root.add(m); return m;
  }
  block(0.62, 0.65, 0.34, 0, 1.13, 0, 0);
  block(0.4, 0.43, 0.39, 0, 1.68, 0, 1); block(0.43, 0.13, 0.4, 0, 1.91, -0.02, 3);
  block(0.29, 0.1, 0.035, 0, 1.72, 0.21, 3);
  const arms = [-1, 1].map(s => block(0.19, 0.64, 0.22, s * 0.43, 1.08, 0, 1));
  const legs = [-1, 1].map(s => block(0.23, 0.65, 0.26, s * 0.17, 0.46, 0, 2));
  for (const s of [-1, 1]) block(0.26, 0.16, 0.4, s * 0.17, 0.1, 0.07, 3);
  root.userData.limbs = { arms, legs }; return root;
}

export function createPlayer(scene, world = {}, options = {}) {
  const T = globalThis.THREE;
  if (player.mesh?.parent) player.mesh.parent.remove(player.mesh);
  for (const ped of player.bailouts) if (ped.mesh?.parent) ped.mesh.parent.remove(ped.mesh);
  if (player.currentCar) player.currentCar.controlled = false;
  sceneRef = scene; worldRef = world;
  const p = options.position ?? world.shineShopPos ?? { x: -34, y: 0.2, z: 18 };
  footPosition = new T.Vector3(p.x, 0.2, p.z); cameraLook = footPosition.clone();
  Object.assign(player, { cash: options.cash ?? START_CASH ?? 300, health: 100, armour: 0, mode: 'foot', currentCar: null, position: footPosition,
    heading: options.heading ?? 0, mesh: humanoid(), nearestCar: null, prompt: '', moving: false, speed: 0, bailouts: [], cameraReady: false, walkTime: 0 });
  player.mesh.position.copy(footPosition); player.mesh.rotation.y = player.heading; scene.add(player.mesh);
  return player;
}

function keys(source, edge, ...names) {
  const fn = source?.[edge ? 'wasPressed' : 'isDown'] ?? (edge ? wasPressed : isDown);
  return names.some(name => !!fn.call(source, name));
}

function freeAt(x, z, world, fleet, ignoreCar = null) {
  const r = player.radius;
  const bounds = world.bounds ?? { minX: -237, maxX: 237, minZ: -237, maxZ: 237 };
  if (x < bounds.minX + r || x > bounds.maxX - r || z < bounds.minZ + r || z > bounds.maxZ - r) return false;
  for (const b of world.colliders ?? []) {
    const dx = x - clamp(x, b.minX, b.maxX), dz = z - clamp(z, b.minZ, b.maxZ);
    if (dx * dx + dz * dz < r * r) return false;
  }
  for (const c of fleet) if (c !== ignoreCar && Math.hypot(x - c.position.x, z - c.position.z) < r + c.radius) return false;
  return true;
}

function ejectDriver(car, ctx) {
  const ped = car.driver;
  if (!ped) return;
  const T = globalThis.THREE;
  ped.state = 'fleeing'; ped.car = null; ped.fleeTimer = 8;
  if (!ped.position?.set) ped.position = new T.Vector3();
  ped.position.set(car.position.x + Math.cos(car.heading) * 3.3, 0.2, car.position.z - Math.sin(car.heading) * 3.3);
  ped.fleeFrom = car.position.clone();
  if (!ped.mesh) {
    ped.mesh = humanoid(0x95b8ab); ped.mesh.position.copy(ped.position); sceneRef.add(ped.mesh);
    ped.managedByPlayer = true; player.bailouts.push(ped);
  } else { ped.mesh.visible = true; ped.mesh.position.copy(ped.position); }
  if (ctx.peds && !ctx.peds.includes(ped)) ctx.peds.push(ped);
  car.driver = null;
  if (ctx.onSteal) ctx.onSteal(car, ped);
}

function interact(ctx, fleet, world) {
  if (player.mode === 'drive') {
    const c = player.currentCar;
    if (Math.abs(c.speed) > 9) { player.prompt = 'SLOW DOWN TO EXIT'; return; }
    for (const [side, forward] of [[-1, 0], [1, 0], [-1, -3], [1, -3], [0, -5]]) {
      const x = c.position.x + Math.cos(c.heading) * side * 3.4 + Math.sin(c.heading) * forward;
      const z = c.position.z - Math.sin(c.heading) * side * 3.4 + Math.cos(c.heading) * forward;
      if (!freeAt(x, z, world, fleet)) continue;
      footPosition.set(x, 0.2, z); player.position = footPosition;
      c.controlled = false; c.parked = true; c.driver = null;
      player.currentCar = null; player.mode = 'foot'; player.mesh.visible = true; player.speed = 0; return;
    }
    player.prompt = 'EXIT BLOCKED'; return;
  }
  const c = player.nearestCar;
  if (!c || c.health <= 0 || Math.abs(c.speed) > 12) return;
  if (c.driver) ejectDriver(c, ctx);
  c.driver = player; c.controlled = true; c.parked = false;
  c.driftVelocity = new globalThis.THREE.Vector3();
  player.currentCar = c; player.position = c.position; player.mode = 'drive'; player.mesh.visible = false;
}

function drive(dt, world, input) {
  const c = player.currentCar;
  const forward = keys(input, false, 'KeyW', 'w', 'W', 'ArrowUp');
  const back = keys(input, false, 'KeyS', 's', 'S', 'ArrowDown');
  const left = keys(input, false, 'KeyA', 'a', 'A', 'ArrowLeft');
  const right = keys(input, false, 'KeyD', 'd', 'D', 'ArrowRight');
  const boost = keys(input, false, 'ShiftLeft', 'ShiftRight', 'Shift');
  const handbrake = keys(input, false, 'Space', ' ', 'Spacebar');
  const oldHeading = c.heading, oldSpeed = c.speed;
  if (c.health > 0) {
    if (forward) c.speed += (c.speed < -0.5 ? 30 : boost ? 32 : 19) * dt;
    if (back) c.speed -= (c.speed > 0.5 ? 36 : 12) * dt;
  }
  c.speed *= Math.exp(-(handbrake ? 2.1 : forward || back ? 0.22 : 0.8) * dt);
  if (c.health <= 0) c.speed *= Math.exp(-2 * dt);
  c.speed = clamp(c.speed, -12, boost ? 49 : 33);
  const steering = Number(left) - Number(right);
  const authority = Math.min(1, Math.abs(c.speed) / 8) * Math.sign(c.speed);
  c.heading += steering * authority * (handbrake ? 2.5 : 1.6) * dt;
  const v = c.driftVelocity;
  if (handbrake) {
    v.x += Math.sin(oldHeading) * oldSpeed * dt * 0.8;
    v.z += Math.cos(oldHeading) * oldSpeed * dt * 0.8;
  }
  v.multiplyScalar(Math.exp(-(handbrake ? 1.5 : 7) * dt));
  c.position.x += (Math.sin(c.heading) * c.speed + v.x) * dt;
  c.position.z += (Math.cos(c.heading) * c.speed + v.z) * dt;
  if (resolveCarBuildings(c, world, dt)) v.set(0, 0, 0);
  updateCarVisuals(c, 0); player.heading = c.heading; player.speed = c.speed;
}

function walk(dt, world, fleet, input) {
  let x = Number(keys(input, false, 'KeyD', 'd', 'D', 'ArrowRight')) - Number(keys(input, false, 'KeyA', 'a', 'A', 'ArrowLeft'));
  let z = Number(keys(input, false, 'KeyW', 'w', 'W', 'ArrowUp')) - Number(keys(input, false, 'KeyS', 's', 'S', 'ArrowDown'));
  const length = Math.hypot(x, z); player.moving = length > 0 && player.health > 0;
  player.speed = player.moving ? (keys(input, false, 'ShiftLeft', 'ShiftRight', 'Shift') ? 8.5 : 4.5) : 0;
  if (player.moving) {
    x /= length; z /= length;
    const p = player.position, step = player.speed * dt;
    if (freeAt(p.x + x * step, p.z, world, fleet)) p.x += x * step;
    if (freeAt(p.x, p.z + z * step, world, fleet)) p.z += z * step;
    player.heading += wrap(Math.atan2(x, z) - player.heading) * (1 - Math.exp(-16 * dt));
  }
  player.walkTime += dt * player.speed * 1.8;
  const swing = player.moving ? Math.sin(player.walkTime) * 0.55 : 0;
  const limbs = player.mesh.userData.limbs;
  limbs.legs.forEach((m, i) => { m.rotation.x = i ? -swing : swing; });
  limbs.arms.forEach((m, i) => { m.rotation.x = i ? swing : -swing; });
  player.mesh.position.copy(player.position); player.mesh.rotation.y = player.heading;
}

function cameraFollow(dt, camera) {
  if (!camera) return;
  const T = globalThis.THREE, driving = player.mode === 'drive';
  const distance = driving ? 9 + Math.min(4, Math.abs(player.speed) * 0.07) : 6;
  const p = player.position, heading = driving ? player.currentCar.heading : player.heading;
  const target = new T.Vector3(p.x - Math.sin(heading) * distance, p.y + (driving ? 5 : 4), p.z - Math.cos(heading) * distance);
  const look = new T.Vector3(p.x, p.y + (driving ? 1.3 : 1.15), p.z);
  if (driving) { look.x += Math.sin(heading) * 3; look.z += Math.cos(heading) * 3; }
  if (!player.cameraReady) { camera.position.copy(target); cameraLook.copy(look); player.cameraReady = true; }
  else { camera.position.lerp(target, 1 - Math.exp(-(driving ? 4 : 6) * dt)); cameraLook.lerp(look, 1 - Math.exp(-8 * dt)); }
  camera.lookAt(cameraLook);
}

export function updatePlayer(dt, ctx = {}) {
  if (!player.mesh) throw new Error('Call createPlayer() before updatePlayer().');
  dt = clamp(dt, 0, 0.05);
  const world = ctx.world ?? worldRef, fleet = ctx.cars ?? cars, input = ctx.input;
  player.nearestCar = null; let nearest = 5;
  if (player.mode === 'foot') for (const car of fleet) {
    const d = Math.hypot(player.position.x - car.position.x, player.position.z - car.position.z);
    if (d < nearest && car.health > 0 && Math.abs(car.speed) < 12) { nearest = d; player.nearestCar = car; }
  }
  player.prompt = player.mode === 'drive' ? 'E — EXIT' : player.nearestCar ? (player.nearestCar.driver ? 'E — STEAL' : 'E — ENTER') : '';
  if (player.health > 0 && keys(input, true, 'KeyE', 'e', 'E')) interact(ctx, fleet, world);
  if (player.mode === 'drive') drive(dt, world, input); else walk(dt, world, fleet, input);
  // Only fallback bailing figures are owned here; later pedestrian AI can take
  // ownership by setting managedByPlayer=false, preserving the same ped state.
  for (const ped of player.bailouts) {
    if (!ped.managedByPlayer || ped.state !== 'fleeing') continue;
    const dx = ped.position.x - ped.fleeFrom.x, dz = ped.position.z - ped.fleeFrom.z, d = Math.hypot(dx, dz) || 1;
    const x = ped.position.x + dx / d * 6 * dt, z = ped.position.z + dz / d * 6 * dt;
    if (freeAt(x, ped.position.z, world, fleet)) ped.position.x = x;
    if (freeAt(ped.position.x, z, world, fleet)) ped.position.z = z;
    ped.mesh.position.copy(ped.position); ped.mesh.rotation.y = Math.atan2(dx, dz);
    ped.mesh.userData.limbs.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(player.walkTime + ped.fleeTimer * 12 + i * Math.PI) * 0.65; });
    ped.fleeTimer -= dt; if (ped.fleeTimer <= 0) ped.state = 'walking';
  }
  cameraFollow(dt, ctx.camera);
  return player;
}
