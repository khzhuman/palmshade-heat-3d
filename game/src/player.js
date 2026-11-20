import { isDown, wasPressed } from './input.js';
import { START_CASH } from './config.js';
import { cars, resolveCarBuildings, updateCarVisuals } from './vehicles.js';

// createPlayer resets this public singleton. While driving, position is the car's
// own vector. Update it before traffic, and clear input edges after the frame.
export const player = {
  cash: START_CASH ?? 300, health: 100, armour: 0, mode: 'foot',
  currentCar: null, position: null, heading: 0, mesh: null,
  nearestCar: null, prompt: '', radius: 0.48, speed: 0, moving: false,
  bailouts: [], cameraReady: false
};
const limit = (value, lower, upper) => Math.max(lower, Math.min(upper, value));
const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));
let activeScene, activeWorld, lookPosition, walkingPosition;

function makeFigure(shirt = 0xe9b86f, skin = 0xb87956) {
  const T = globalThis.THREE;
  const figure = new T.Group();
  const surfaces = [shirt, skin, 0x354853, 0x353535].map(color => new T.MeshStandardMaterial({ color, roughness: 0.95 }));
  function piece(width, height, depth, x, y, z, surfaceIndex) {
    const object = new T.Mesh(new T.BoxGeometry(width, height, depth), surfaces[surfaceIndex]);
    object.position.set(x, y, z);
    object.castShadow = true;
    figure.add(object);
    return object;
  }
  piece(0.62, 0.65, 0.34, 0, 1.13, 0, 0);
  piece(0.4, 0.43, 0.39, 0, 1.68, 0, 1);
  piece(0.43, 0.13, 0.4, 0, 1.91, -0.02, 3);
  piece(0.29, 0.1, 0.035, 0, 1.72, 0.21, 3);
  const arms = [-1, 1].map(side => piece(0.19, 0.64, 0.22, side * 0.43, 1.08, 0, 1));
  const legs = [-1, 1].map(side => piece(0.23, 0.65, 0.26, side * 0.17, 0.46, 0, 2));
  for (const side of [-1, 1]) piece(0.26, 0.16, 0.4, side * 0.17, 0.1, 0.07, 3);
  figure.userData.limbs = { arms, legs };
  return figure;
}

export function createPlayer(scene, world = {}, options = {}) {
  const T = globalThis.THREE;
  if (player.mesh?.parent) player.mesh.parent.remove(player.mesh);
  for (const pedestrian of player.bailouts) {
    if (pedestrian.mesh?.parent) pedestrian.mesh.parent.remove(pedestrian.mesh);
  }
  if (player.currentCar) player.currentCar.controlled = false;
  activeScene = scene;
  activeWorld = world;
  const spawn = options.position ?? world.shineShopPos ?? { x: -34, y: 0.2, z: 18 };
  walkingPosition = new T.Vector3(spawn.x, 0.2, spawn.z);
  lookPosition = walkingPosition.clone();
  Object.assign(player, {
    cash: options.cash ?? START_CASH ?? 300, health: 100, armour: 0,
    mode: 'foot', currentCar: null, position: walkingPosition,
    heading: options.heading ?? 0, mesh: makeFigure(), nearestCar: null,
    prompt: '', moving: false, speed: 0, bailouts: [], cameraReady: false, walkTime: 0
  });
  player.mesh.position.copy(walkingPosition);
  player.mesh.rotation.y = player.heading;
  scene.add(player.mesh);
  return player;
}

function anyKey(source, edge, ...names) {
  const read = source?.[edge ? 'wasPressed' : 'isDown'] ?? (edge ? wasPressed : isDown);
  return names.some(name => !!read.call(source, name));
}

function canStand(x, z, world, fleet, ignoreCar = null) {
  const radius = player.radius;
  const boundary = world.bounds ?? { minX: -237, maxX: 237, minZ: -237, maxZ: 237 };
  if (x < boundary.minX + radius || x > boundary.maxX - radius || z < boundary.minZ + radius || z > boundary.maxZ - radius) return false;
  for (const obstacle of world.colliders ?? []) {
    const dx = x - limit(x, obstacle.minX, obstacle.maxX);
    const dz = z - limit(z, obstacle.minZ, obstacle.maxZ);
    if (dx * dx + dz * dz < radius * radius) return false;
  }
  for (const car of fleet) {
    if (car !== ignoreCar && Math.hypot(x - car.position.x, z - car.position.z) < radius + car.radius) return false;
  }
  return true;
}

function displaceDriver(car, ctx) {
  const pedestrian = car.driver;
  if (!pedestrian) return;
  const T = globalThis.THREE;
  pedestrian.state = 'fleeing';
  pedestrian.car = null;
  pedestrian.fleeTimer = 8;
  if (!pedestrian.position?.set) pedestrian.position = new T.Vector3();
  pedestrian.position.set(car.position.x + Math.cos(car.heading) * 3.3, 0.2, car.position.z - Math.sin(car.heading) * 3.3);
  pedestrian.fleeFrom = car.position.clone();
  if (!pedestrian.mesh) {
    pedestrian.mesh = makeFigure(0x95b8ab);
    pedestrian.mesh.position.copy(pedestrian.position);
    activeScene.add(pedestrian.mesh);
    pedestrian.managedByPlayer = true;
    player.bailouts.push(pedestrian);
  } else {
    pedestrian.mesh.visible = true;
    pedestrian.mesh.position.copy(pedestrian.position);
  }
  if (ctx.peds && !ctx.peds.includes(pedestrian)) ctx.peds.push(pedestrian);
  car.driver = null;
  if (ctx.onSteal) ctx.onSteal(car, pedestrian);
}

function useVehicle(ctx, fleet, world) {
  if (player.mode === 'drive') {
    const car = player.currentCar;
    if (Math.abs(car.speed) > 9) {
      player.prompt = 'SLOW DOWN TO EXIT';
      return;
    }
    for (const [side, forward] of [[-1, 0], [1, 0], [-1, -3], [1, -3], [0, -5]]) {
      const x = car.position.x + Math.cos(car.heading) * side * 3.4 + Math.sin(car.heading) * forward;
      const z = car.position.z - Math.sin(car.heading) * side * 3.4 + Math.cos(car.heading) * forward;
      if (!canStand(x, z, world, fleet)) continue;
      walkingPosition.set(x, 0.2, z);
      player.position = walkingPosition;
      car.controlled = false;
      car.parked = true;
      car.driver = null;
      player.currentCar = null;
      player.mode = 'foot';
      player.mesh.visible = true;
      player.speed = 0;
      return;
    }
    player.prompt = 'EXIT BLOCKED';
    return;
  }
  const car = player.nearestCar;
  if (!car || car.health <= 0 || Math.abs(car.speed) > 12) return;
  if (car.driver) displaceDriver(car, ctx);
  car.driver = player;
  car.controlled = true;
  car.parked = false;
  car.driftVelocity = new globalThis.THREE.Vector3();
  player.currentCar = car;
  player.position = car.position;
  player.mode = 'drive';
  player.mesh.visible = false;
}

function advanceDriving(dt, world, input) {
  const car = player.currentCar;
  const forward = anyKey(input, false, 'KeyW', 'w', 'W', 'ArrowUp');
  const reverse = anyKey(input, false, 'KeyS', 's', 'S', 'ArrowDown');
  const left = anyKey(input, false, 'KeyA', 'a', 'A', 'ArrowLeft');
  const right = anyKey(input, false, 'KeyD', 'd', 'D', 'ArrowRight');
  const boost = anyKey(input, false, 'ShiftLeft', 'ShiftRight', 'Shift');
  const handbrake = anyKey(input, false, 'Space', ' ', 'Spacebar');
  const previousHeading = car.heading;
  const previousSpeed = car.speed;
  if (car.health > 0) {
    if (forward) car.speed += (car.speed < -0.5 ? 30 : boost ? 32 : 19) * dt;
    if (reverse) car.speed -= (car.speed > 0.5 ? 36 : 12) * dt;
  }
  car.speed *= Math.exp(-(handbrake ? 2.1 : forward || reverse ? 0.22 : 0.8) * dt);
  if (car.health <= 0) car.speed *= Math.exp(-2 * dt);
  car.speed = limit(car.speed, -12, boost ? 49 : 33);
  const steering = Number(left) - Number(right);
  const authority = Math.min(1, Math.abs(car.speed) / 8) * Math.sign(car.speed);
  car.heading += steering * authority * (handbrake ? 2.5 : 1.6) * dt;
  const drift = car.driftVelocity;
  if (handbrake) {
    drift.x += Math.sin(previousHeading) * previousSpeed * dt * 0.8;
    drift.z += Math.cos(previousHeading) * previousSpeed * dt * 0.8;
  }
  drift.multiplyScalar(Math.exp(-(handbrake ? 1.5 : 7) * dt));
  car.position.x += (Math.sin(car.heading) * car.speed + drift.x) * dt;
  car.position.z += (Math.cos(car.heading) * car.speed + drift.z) * dt;
  if (resolveCarBuildings(car, world, dt)) drift.set(0, 0, 0);
  updateCarVisuals(car, 0);
  player.heading = car.heading;
  player.speed = car.speed;
}

function advanceWalking(dt, world, fleet, input) {
  let x = Number(anyKey(input, false, 'KeyD', 'd', 'D', 'ArrowRight')) - Number(anyKey(input, false, 'KeyA', 'a', 'A', 'ArrowLeft'));
  let z = Number(anyKey(input, false, 'KeyW', 'w', 'W', 'ArrowUp')) - Number(anyKey(input, false, 'KeyS', 's', 'S', 'ArrowDown'));
  const magnitude = Math.hypot(x, z);
  player.moving = magnitude > 0 && player.health > 0;
  player.speed = player.moving ? (anyKey(input, false, 'ShiftLeft', 'ShiftRight', 'Shift') ? 8.5 : 4.5) : 0;
  if (player.moving) {
    x /= magnitude;
    z /= magnitude;
    const position = player.position;
    const step = player.speed * dt;
    if (canStand(position.x + x * step, position.z, world, fleet)) position.x += x * step;
    if (canStand(position.x, position.z + z * step, world, fleet)) position.z += z * step;
    player.heading += wrapAngle(Math.atan2(x, z) - player.heading) * (1 - Math.exp(-16 * dt));
  }
  player.walkTime += dt * player.speed * 1.8;
  const swing = player.moving ? Math.sin(player.walkTime) * 0.55 : 0;
  const limbs = player.mesh.userData.limbs;
  limbs.legs.forEach((limb, index) => { limb.rotation.x = index ? -swing : swing; });
  limbs.arms.forEach((limb, index) => { limb.rotation.x = index ? swing : -swing; });
  player.mesh.position.copy(player.position);
  player.mesh.rotation.y = player.heading;
}

function followCamera(dt, camera) {
  if (!camera) return;
  const T = globalThis.THREE;
  const driving = player.mode === 'drive';
  const distance = driving ? 9 + Math.min(4, Math.abs(player.speed) * 0.07) : 6;
  const position = player.position;
  const heading = driving ? player.currentCar.heading : player.heading;
  const destination = new T.Vector3(position.x - Math.sin(heading) * distance, position.y + (driving ? 5 : 4), position.z - Math.cos(heading) * distance);
  const look = new T.Vector3(position.x, position.y + (driving ? 1.3 : 1.15), position.z);
  if (driving) {
    look.x += Math.sin(heading) * 3;
    look.z += Math.cos(heading) * 3;
  }
  if (!player.cameraReady) {
    camera.position.copy(destination);
    lookPosition.copy(look);
    player.cameraReady = true;
  } else {
    camera.position.lerp(destination, 1 - Math.exp(-(driving ? 4 : 6) * dt));
    lookPosition.lerp(look, 1 - Math.exp(-8 * dt));
  }
  camera.lookAt(lookPosition);
}

export function updatePlayer(dt, ctx = {}) {
  if (!player.mesh) throw new Error('Call createPlayer() before updatePlayer().');
  dt = limit(dt, 0, 0.05);
  const world = ctx.world ?? activeWorld;
  const fleet = ctx.cars ?? cars;
  const input = ctx.input;
  player.nearestCar = null;
  let nearestDistance = 5;
  if (player.mode === 'foot') {
    for (const car of fleet) {
      const distance = Math.hypot(player.position.x - car.position.x, player.position.z - car.position.z);
      if (distance < nearestDistance && car.health > 0 && Math.abs(car.speed) < 12) {
        nearestDistance = distance;
        player.nearestCar = car;
      }
    }
  }
  player.prompt = player.mode === 'drive' ? 'E — EXIT' : player.nearestCar ? (player.nearestCar.driver ? 'E — STEAL' : 'E — ENTER') : '';
  if (player.health > 0 && anyKey(input, true, 'KeyE', 'e', 'E')) useVehicle(ctx, fleet, world);
  if (player.mode === 'drive') advanceDriving(dt, world, input);
  else advanceWalking(dt, world, fleet, input);

  // Pedestrian AI may take over a displaced driver by clearing managedByPlayer.
  for (const pedestrian of player.bailouts) {
    if (!pedestrian.managedByPlayer || pedestrian.state !== 'fleeing') continue;
    const dx = pedestrian.position.x - pedestrian.fleeFrom.x;
    const dz = pedestrian.position.z - pedestrian.fleeFrom.z;
    const distance = Math.hypot(dx, dz) || 1;
    const x = pedestrian.position.x + dx / distance * 6 * dt;
    const z = pedestrian.position.z + dz / distance * 6 * dt;
    if (canStand(x, pedestrian.position.z, world, fleet)) pedestrian.position.x = x;
    if (canStand(pedestrian.position.x, z, world, fleet)) pedestrian.position.z = z;
    pedestrian.mesh.position.copy(pedestrian.position);
    pedestrian.mesh.rotation.y = Math.atan2(dx, dz);
    pedestrian.mesh.userData.limbs.legs.forEach((leg, index) => {
      leg.rotation.x = Math.sin(player.walkTime + pedestrian.fleeTimer * 12 + index * Math.PI) * 0.65;
    });
    pedestrian.fleeTimer -= dt;
    if (pedestrian.fleeTimer <= 0) pedestrian.state = 'walking';
  }
  followCamera(dt, ctx.camera);
  return player;
}
