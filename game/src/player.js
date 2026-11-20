import { keys, pressed } from './input.js';
import { makePerson, posePerson, box } from './world.js';
import { forward, moveCar, syncCar } from './vehicles.js';

const T = window.THREE;
export function createPlayer(scene, camera, world, vehicles, hooks = {}) {
  const mesh = makePerson(0xefdbbd);
  scene.add(mesh);
  const gun = new T.Group();
  box(gun, 0.16, 0.18, 0.65, 0x283849, 0, 0, 0.18);
  box(gun, 0.14, 0.27, 0.18, 0x283849, 0, -0.17, 0);
  gun.position.set(0.59, 1.53, 0.43);
  mesh.add(gun);
  const start = world.landmarks.shop.clone().add(new T.Vector3(-6, 0, -9));
  mesh.position.copy(start);
  const cameraTarget = start.clone();
  const cameraPosition = start.clone().add(new T.Vector3(0, 8, -15));
  camera.position.copy(cameraPosition);
  const player = {
    mesh, gun, car: null, mode: 'ON FOOT', health: 100, armour: 75, cash: 650,
    weapon: 'PISTOL', yaw: 0, phase: 0, interactCooldown: 0, respawnCooldown: 0,
    prompt: '', aiming: false, moving: false, cameraOverride: null,
    get position() { return this.car ? this.car.mesh.position : this.mesh.position; },
    get speed() { return this.car ? Math.abs(this.car.speed) : this.moving ? 5 : 0; }
  };
  function enter(car, silent = false) {
    if (!car || car.disabled || car.occupied || player.car) return false;
    const stolen = car.driver;
    if (stolen) {
      const driverMesh = makePerson(0xdca9be);
      const side = forward(car.yaw + Math.PI / 2);
      driverMesh.position.copy(car.mesh.position).addScaledVector(side, 2.4);
      scene.add(driverMesh);
      world.peds.push({ mesh: driverMesh, state: 'flee', fear: 8, cowers: false, direction: 1, phase: 0, away: side });
    }
    car.driver = false;
    car.parked = false;
    car.occupied = true;
    player.car = car;
    player.mode = 'DRIVE';
    mesh.visible = false;
    player.yaw = car.yaw;
    if (!silent) {
      hooks.onCrime?.(1, stolen ? 'Vehicle theft witnessed' : 'Vehicle theft reported', car.mesh.position);
      hooks.onEvent?.(stolen ? 'DRIVER BAILED · VEHICLE TAKEN' : 'VEHICLE TAKEN');
    }
    return true;
  }
  function exit() {
    const car = player.car;
    if (!car) return;
    const side = forward(car.yaw + Math.PI / 2);
    const exitPosition = car.mesh.position.clone().addScaledVector(side, 3.2);
    if (world.blocked(exitPosition.x, exitPosition.z, 0.5)) exitPosition.copy(car.mesh.position).addScaledVector(side, -3.2);
    mesh.position.copy(exitPosition).setY(0.12);
    player.yaw = car.yaw;
    car.occupied = false;
    car.parked = true;
    car.speed *= 0.4;
    player.car = null;
    player.mode = 'ON FOOT';
    mesh.visible = true;
  }
  function respawn(position = world.landmarks.shop) {
    exit();
    mesh.position.copy(position).add(new T.Vector3(0, 0.12, -8));
    player.health = 100;
    player.armour = 50;
    player.respawnCooldown = 2;
    cameraTarget.copy(mesh.position);
    cameraPosition.copy(mesh.position).add(new T.Vector3(0, 8, -15));
  }
  function hurt(amount) {
    if (player.respawnCooldown > 0 || player.health <= 0) return;
    const absorbed = Math.min(player.armour, amount * 0.65);
    player.armour -= absorbed;
    player.health = Math.max(0, player.health - (amount - absorbed));
    if (player.health === 0) {
      if (hooks.onDeath) hooks.onDeath();
      else { player.cash = Math.max(0, player.cash - 200); respawn(); }
    }
  }
  function update(dt, time) {
    player.interactCooldown = Math.max(0, player.interactCooldown - dt);
    player.respawnCooldown = Math.max(0, player.respawnCooldown - dt);
    if (pressed('Digit1')) player.weapon = 'FISTS';
    if (pressed('Digit2')) player.weapon = 'PISTOL';
    gun.visible = player.weapon === 'PISTOL';
    player.prompt = '';
    const near = player.car ? null : vehicles.nearest(player.position, 6);
    if (near) player.prompt = 'E — STEAL';
    if (player.car) player.prompt = 'E — EXIT';
    if (pressed('KeyE') && !player.interactCooldown) {
      if (player.car) exit();
      else if (near) enter(near);
      player.interactCooldown = 0.45;
    }
    if (player.car) {
      const car = player.car;
      const throttle = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const steering = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
      const boost = keys.ShiftLeft || keys.ShiftRight;
      const drag = keys.Space ? 3.4 : 0.36;
      const acceleration = throttle > 0 ? 22 : car.speed > 2 ? 36 : 12;
      car.speed += throttle * acceleration * dt;
      if (!throttle || keys.Space) car.speed *= Math.exp(-drag * dt);
      car.speed = T.MathUtils.clamp(car.speed, -12, boost ? 61 : 46);
      if (car.disabled) car.speed *= Math.exp(-dt * 4);
      car.steer = T.MathUtils.damp(car.steer, steering, 8, dt);
      car.yaw += car.steer * Math.min(Math.abs(car.speed) / 10, 1) * Math.sign(car.speed) * dt * (keys.Space ? 1.9 : 1.05);
      moveCar(car, dt, world, (_, impact) => { if (impact > 22) hurt(impact * 0.16); hooks.onCrash?.(car, impact); });
      syncCar(car, dt, time);
      player.yaw = car.yaw;
      if (Math.abs(car.speed) > 20) world.scare(car.mesh.position.clone().addScaledVector(forward(car.yaw), 7), 16);
      if (car.health <= 0) player.prompt = 'ENGINE WRECKED · E — EXIT';
    } else {
      player.aiming = !!(keys.KeyQ || keys.ControlLeft);
      const horizontal = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      const vertical = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const direction = new T.Vector3(horizontal, 0, vertical);
      player.moving = direction.lengthSq() > 0;
      if (player.moving) {
        direction.normalize();
        const speed = keys.ShiftLeft || keys.ShiftRight ? 9 : 4.8;
        const p = mesh.position;
        const dx = direction.x * speed * dt, dz = direction.z * speed * dt;
        if (!world.blocked(p.x + dx, p.z, 0.55)) p.x += dx;
        if (!world.blocked(p.x, p.z + dz, 0.55)) p.z += dz;
        const b = world.bounds;
        p.x = T.MathUtils.clamp(p.x, b.minX - 4, b.maxX + 27);
        p.z = T.MathUtils.clamp(p.z, b.minZ - 4, b.maxZ + 4);
        player.yaw = Math.atan2(direction.x, direction.z);
      }
      mesh.rotation.y = player.yaw;
      player.phase += dt * (player.moving ? 10 : 0);
      posePerson(mesh, player.moving ? 'walk' : 'idle', player.phase);
    }
    updateCamera(dt);
  }
  function updateCamera(dt, snap = false) {
    if (player.cameraOverride) {
      camera.position.copy(player.cameraOverride.position);
      camera.lookAt(player.cameraOverride.target);
      return;
    }
    const p = player.position;
    const driving = !!player.car;
    const distance = driving ? 14 + Math.min(player.speed * 0.08, 4) : 10;
    const desired = p.clone().addScaledVector(forward(player.yaw), -distance);
    desired.y = p.y + (driving ? 7 : 6);
    const look = p.clone().addScaledVector(forward(player.yaw), driving ? 6 : 3);
    look.y += 1.2;
    const blend = snap ? 1 : 1 - Math.exp(-dt * (driving ? 3.3 : 5));
    cameraPosition.lerp(desired, blend);
    cameraTarget.lerp(look, snap ? 1 : 1 - Math.exp(-dt * 5));
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);
    camera.fov = T.MathUtils.damp(camera.fov, driving ? 59 + Math.min(player.speed * 0.12, 7) : 58, 3, dt);
    camera.updateProjectionMatrix();
  }
  return Object.assign(player, { enter, exit, respawn, hurt, update, updateCamera });
}
