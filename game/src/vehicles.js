import { box, material } from './world.js';
import { rngPick, rngRange } from './random.js';

const T = window.THREE;
export const forward = yaw => new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
export function makeCar(scene, options = {}) {
  const { x = 0, z = 0, yaw = 0, color = 0xef9975, police = false, parked = false } = options;
  const mesh = new T.Group();
  scene.add(mesh);
  mesh.position.set(x, 0.15, z);
  mesh.rotation.y = yaw;
  const chassis = box(mesh, 2.5, 0.65, 5, police ? 0xe6e4d8 : color, 0, 0.75, 0);
  box(mesh, 2.6, 0.23, 5.1, 0x273742, 0, 0.38, 0);
  box(mesh, 2.14, 0.9, 2.45, police ? 0x253d50 : color, 0, 1.48, -0.15);
  box(mesh, 2.03, 0.65, 0.07, 0x6fb4c7, 0, 1.52, 1.12, { metalness: 0.3, roughness: 0.2 });
  box(mesh, 2.03, 0.6, 0.07, 0x457e9e, 0, 1.5, -1.41);
  for (const side of [-1, 1]) {
    box(mesh, 0.07, 0.62, 2.1, 0x507d95, side * 1.08, 1.52, -0.13);
    box(mesh, 0.12, 0.13, 0.65, 0xf0ded0, side * 1.26, 0.98, -0.32);
    box(mesh, 0.65, 0.24, 0.12, 0xffe9ab, side * 0.8, 0.86, 2.55, { emissive: 0xffe0a0, emissiveIntensity: 0.65 });
    box(mesh, 0.7, 0.23, 0.12, 0xf05b62, side * 0.8, 0.86, -2.55, { emissive: 0xef3344, emissiveIntensity: 0.4 });
    if (police) box(mesh, 0.05, 0.45, 3.8, 0x1d3449, side * 1.27, 0.83, 0);
  }
  const wheels = [];
  for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) {
    const wheel = new T.Mesh(new T.CylinderGeometry(0.51, 0.51, 0.32, 10), material(0x222a35));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(xSide * 1.26, 0.48, zSide * 1.55);
    mesh.add(wheel);
    box(mesh, 0.04, 0.44, 0.44, 0xa4b5bb, xSide * 1.44, 0.48, zSide * 1.55);
    wheels.push(wheel);
  }
  const sirens = [];
  if (police) {
    box(mesh, 1.8, 0.14, 0.5, 0x263a48, 0, 2.01, 0);
    for (const side of [-1, 1]) {
      const lamp = box(mesh, 0.73, 0.27, 0.45, side < 0 ? 0xff466d : 0x499eff, side * 0.48, 2.17, 0);
      lamp.material = lamp.material.clone();
      lamp.material.emissive.copy(lamp.material.color);
      sirens.push(lamp);
    }
  }
  const dents = [];
  for (const side of [-1, 1]) {
    const dent = box(mesh, 0.06, 0.3, 1.1, 0x3e4349, side * 1.29, 0.9, -0.8);
    dent.visible = false;
    dents.push(dent);
  }
  return { mesh, chassis, wheels, sirens, dents, x, z, yaw, speed: 0, health: 100, police, parked, driver: !parked, occupied: false, steer: 0, turnCooldown: 0, collisionCooldown: 0, smokeClock: 0, disabled: false };
}
export function damageCar(car, amount) {
  car.health = Math.max(0, car.health - amount);
  car.dents.forEach((dent, i) => { dent.visible = car.health < 85 - i * 25; });
  car.chassis.scale.x = 0.94 + car.health * 0.0006;
  car.chassis.rotation.z = (1 - car.health / 100) * 0.045;
  car.disabled = car.health <= 0;
}
export function syncCar(car, dt = 0, time = 0) {
  car.mesh.position.set(car.x, 0.15, car.z);
  car.mesh.rotation.y = car.yaw;
  car.mesh.rotation.z = -car.steer * Math.min(Math.abs(car.speed) / 50, 0.035);
  for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 1.8;
  car.sirens.forEach((lamp, i) => { lamp.material.emissiveIntensity = Math.sin(time * 18 + i * Math.PI) > 0 ? 3 : 0.2; });
}
export function moveCar(car, dt, world, onCrash) {
  if (car.disabled) car.speed *= Math.exp(-dt * 3);
  const oldX = car.x, oldZ = car.z;
  car.x += Math.sin(car.yaw) * car.speed * dt;
  car.z += Math.cos(car.yaw) * car.speed * dt;
  const b = world.bounds;
  car.x = T.MathUtils.clamp(car.x, b.minX - 5, b.maxX + 24);
  car.z = T.MathUtils.clamp(car.z, b.minZ - 5, b.maxZ + 5);
  car.collisionCooldown = Math.max(0, car.collisionCooldown - dt);
  if (world.blocked(car.x, car.z, 1.6) || car.x !== oldX && (car.x === b.minX - 5 || car.x === b.maxX + 24) || car.z !== oldZ && (car.z === b.minZ - 5 || car.z === b.maxZ + 5)) {
    const impact = Math.abs(car.speed);
    car.x = oldX;
    car.z = oldZ;
    car.speed *= -0.3;
    if (!car.collisionCooldown && impact > 5) {
      damageCar(car, impact * 0.55);
      car.collisionCooldown = 0.7;
      world.scare(car.mesh.position, 28);
      onCrash?.(car, impact);
    }
  }
}
export function createVehicles(scene, world, rng) {
  const cars = [];
  const colors = [0xf5ba63, 0x64c9bb, 0xee7c93, 0x7188b1, 0xf2dfbe, 0xa4bb8e];
  function spawn(options) {
    const car = makeCar(scene, options);
    cars.push(car);
    return car;
  }
  for (let i = 0; i < 42; i++) {
    const vertical = i % 2 === 0;
    const sign = i % 4 < 2 ? 1 : -1;
    const road = rngPick(rng, vertical ? world.roadsX : world.roadsZ);
    const b = world.bounds;
    const along = rngRange(rng, vertical ? b.minZ + 14 : b.minX + 14, vertical ? b.maxZ - 14 : b.maxX - 14);
    const parked = i % 5 === 0;
    const offset = parked ? 7 : 4;
    const car = spawn({ x: vertical ? road - sign * offset : along, z: vertical ? along : road + sign * offset, yaw: vertical ? sign > 0 ? 0 : Math.PI : sign > 0 ? Math.PI / 2 : -Math.PI / 2, color: rngPick(rng, colors), parked });
    car.speed = parked ? 0 : rngRange(rng, 8, 14);
    car.cruise = car.speed;
  }
  function nearest(position, maxDistance = 6) {
    let best = null, distance = maxDistance;
    for (const car of cars) {
      if (car.occupied || car.disabled) continue;
      const d = car.mesh.position.distanceTo(position);
      if (d < distance) { best = car; distance = d; }
    }
    return best;
  }
  function update(dt, player, time, effects) {
    const playerPosition = player.position;
    for (const car of cars) {
      if (!car.occupied && !car.police && !car.parked && car.driver) {
        let targetSpeed = car.cruise;
        const toPlayer = playerPosition.clone().sub(car.mesh.position);
        const ahead = toPlayer.dot(forward(car.yaw));
        const danger = player.car && Math.abs(player.car.speed) > 18 && toPlayer.length() < 24;
        car.steer = danger ? (Math.sin(car.yaw) * toPlayer.z - Math.cos(car.yaw) * toPlayer.x > 0 ? -1 : 1) : 0;
        if (danger) { targetSpeed = 4; car.yaw += car.steer * dt * 0.7; }
        for (const other of cars) {
          if (other === car) continue;
          const delta = other.mesh.position.clone().sub(car.mesh.position);
          if (delta.lengthSq() < 85 && delta.dot(forward(car.yaw)) > 0) targetSpeed = Math.min(targetSpeed, Math.max(0, other.speed - 3));
        }
        if (ahead > 0 && ahead < 12 && toPlayer.length() < 12) targetSpeed = 0;
        car.speed = T.MathUtils.damp(car.speed, targetSpeed, 2, dt);
        car.turnCooldown -= dt;
        const b = world.bounds;
        if (car.x < b.minX + 3 || car.x > b.maxX - 3 || car.z < b.minZ + 3 || car.z > b.maxZ - 3) {
          car.yaw += Math.PI;
          car.x = T.MathUtils.clamp(car.x, b.minX + 4, b.maxX - 4);
          car.z = T.MathUtils.clamp(car.z, b.minZ + 4, b.maxZ - 4);
        }
        if (car.turnCooldown <= 0 && rng() < dt * 0.3) {
          const cross = Math.abs(Math.sin(car.yaw)) < 0.5 ? world.roadsZ.find(z => Math.abs(z - car.z) < 2) : world.roadsX.find(x => Math.abs(x - car.x) < 2);
          if (cross !== undefined) { car.yaw += rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2; car.turnCooldown = 5; }
        }
        moveCar(car, dt, world);
      }
      if (car.health < 40) {
        car.smokeClock -= dt;
        if (car.smokeClock <= 0) { effects?.smoke?.(car.mesh.position.clone().add(new T.Vector3(0, 1.3, 1.5))); car.smokeClock = 0.15; }
      }
      syncCar(car, dt, time);
    }
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const dx = a.x - b.x, dz = a.z - b.z, distance = Math.hypot(dx, dz);
      if (distance > 3.3 || distance < 0.001) continue;
      const shift = (3.3 - distance) / 2;
      a.x += dx / distance * shift; a.z += dz / distance * shift;
      b.x -= dx / distance * shift; b.z -= dz / distance * shift;
      if (a.collisionCooldown || b.collisionCooldown) continue;
      const impact = Math.abs(a.speed - b.speed) + Math.abs(Math.sin(a.yaw - b.yaw)) * Math.abs(a.speed);
      damageCar(a, impact * 0.7); damageCar(b, impact * 0.7);
      a.speed *= 0.6; b.speed *= 0.6;
      a.collisionCooldown = b.collisionCooldown = 0.6;
      if (impact > 6) { world.scare(a.mesh.position, 30); effects?.sparks?.(a.mesh.position); }
    }
  }
  return { cars, spawn, nearest, update };
}
