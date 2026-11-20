/* Heading 0 faces +z; speed is signed metres/second. Positions alias mesh.position.
 * Call updateTraffic once per frame, including while the player is on foot.
 * ctx = {world, player}; world supplies colliders, bounds and spawnPoints. */
export const cars = [];
export const CAR_COLORS = [0xef8c78, 0x67b9b3, 0xf1cf7f, 0xb7a1cb, 0x91b67c, 0xe4d9bd, 0x537b9a];
let nextId = 1, seed = 981731;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angle = v => Math.atan2(Math.sin(v), Math.cos(v));

export function createCar(scene, options = {}) {
  const T = globalThis.THREE;
  const mesh = new T.Group(), body = new T.Group(); mesh.add(body);
  const color = options.color ?? CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
  const police = !!options.police;
  const paint = new T.MeshStandardMaterial({ color: police ? 0xf3f0df : color, roughness: 0.55 });
  const dark = new T.MeshStandardMaterial({ color: 0x26343e, roughness: 0.75 });
  const glass = new T.MeshStandardMaterial({ color: 0x75acbd, metalness: 0.25, roughness: 0.2 });
  const rubber = new T.MeshStandardMaterial({ color: 0x242b2d, roughness: 1 });
  function part(w, h, d, x, y, z, mat, parent = body) {
    const p = new T.Mesh(new T.BoxGeometry(w, h, d), mat); p.position.set(x, y, z); p.castShadow = true; parent.add(p); return p;
  }
  part(2.15, 0.65, 4.35, 0, 0.85, 0, paint);
  part(1.8, 0.8, 1.95, 0, 1.5, -0.25, glass);
  part(1.87, 0.14, 2.02, 0, 1.95, -0.25, police ? dark : paint);
  part(2.04, 0.18, 1.12, 0, 1.24, 1.48, police ? dark : paint);
  part(2.04, 0.17, 0.75, 0, 1.22, -1.75, police ? dark : paint);
  part(2.22, 0.22, 0.2, 0, 0.62, 2.2, dark); part(2.22, 0.22, 0.2, 0, 0.62, -2.2, dark);
  const wheels = [];
  for (const x of [-1.09, 1.09]) for (const z of [-1.4, 1.4]) {
    const wheel = new T.Mesh(new T.CylinderGeometry(0.43, 0.43, 0.28, 10), rubber);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.47, z); body.add(wheel); wheels.push(wheel);
  }
  const headMat = new T.MeshStandardMaterial({ color: 0xfff1b8, emissive: 0xffdf87, emissiveIntensity: 0.9 });
  const tailMat = new T.MeshStandardMaterial({ color: 0xe95d56, emissive: 0xff382d, emissiveIntensity: 0.5 });
  for (const x of [-0.73, 0.73]) { part(0.43, 0.23, 0.08, x, 0.99, 2.2, headMat); part(0.4, 0.23, 0.08, x, 1.02, -2.2, tailMat); }
  const sirenMaterials = [];
  if (police) {
    part(1.6, 0.12, 0.45, 0, 2.08, -0.2, dark);
    for (const [x, c] of [[-0.46, 0xff3039], [0.46, 0x389dff]]) {
      const mat = new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1 });
      part(0.62, 0.27, 0.4, x, 2.25, -0.2, mat); sirenMaterials.push(mat);
    }
  }
  const smoke = new T.Group(); mesh.add(smoke); smoke.visible = false;
  for (let i = 0; i < 6; i++) {
    const puff = new T.Mesh(new T.IcosahedronGeometry(0.3, 0), new T.MeshBasicMaterial({ color: 0x62696a, transparent: true, opacity: 0.42, depthWrite: false })); smoke.add(puff);
  }
  const car = {
    id: nextId++, mesh, body, position: mesh.position, heading: options.heading ?? 0,
    speed: 0, health: 100, radius: 2.35, color, police, driver: options.driver ?? null,
    parked: !!options.parked, controlled: false, smokeEmitter: false, smoke,
    wheels, paint, sirenMaterials, collisionCooldown: 0, time: random() * 20,
    ai: { targetHeading: options.heading ?? 0, cruiseSpeed: 9 + random() * 6, intersection: null },
    damage(amount) { this.health = clamp(this.health - Math.max(0, amount), 0, 100); updateCarVisuals(this, 0); }
  };
  car.position.set(options.x ?? options.position?.x ?? 0, options.y ?? 0.2, options.z ?? options.position?.z ?? 0);
  mesh.rotation.y = car.heading; mesh.name = police ? 'Police cruiser' : 'Traffic car'; mesh.userData.car = car;
  scene.add(mesh); cars.push(car); return car;
}

export function spawnTraffic(scene, world, count = 26, options = {}) {
  seed = (options.seed ?? 981731) >>> 0;
  const points = world.spawnPoints ?? [];
  const moving = points.filter(p => p.kind === 'traffic');
  const parked = points.filter(p => p.kind === 'parked');
  const created = [];
  for (let i = 0; i < count; i++) {
    const p = moving[i % moving.length] ?? { x: -163 + (i % 6) * 60, z: -177 + Math.floor(i / 6) * 60, heading: Math.PI / 2 };
    if (cars.some(c => Math.hypot(c.position.x - p.x, c.position.z - p.z) < 6)) continue;
    const driver = { state: 'driving', position: new globalThis.THREE.Vector3(p.x, 0, p.z), car: null };
    const car = createCar(scene, { ...p, driver }); driver.car = car; created.push(car);
  }
  for (const p of parked.slice(0, options.parkedCount ?? 14)) {
    if (!cars.some(c => Math.hypot(c.position.x - p.x, c.position.z - p.z) < 6)) created.push(createCar(scene, { ...p, parked: true }));
  }
  return created;
}

export function updateCarVisuals(car, dt) {
  car.time += dt; car.smokeEmitter = car.health < 35;
  car.smoke.visible = car.smokeEmitter;
  const dent = 1 - car.health / 100;
  car.paint.color.setHex(car.police ? 0xf3f0df : car.color).multiplyScalar(1 - dent * 0.45);
  car.body.rotation.z = Math.sin(car.id * 3) * dent * 0.085;
  car.body.rotation.x = dent * 0.035;
  car.body.scale.z = 1 - dent * 0.055;
  car.mesh.rotation.y = car.heading;
  for (const puff of car.smoke.children) {
    const i = car.smoke.children.indexOf(puff), t = (car.time * 0.65 + i / 6) % 1;
    puff.position.set(Math.sin(i * 4 + car.time) * t * 0.6, 1.4 + t * 3.5, 1.3 - t * 0.6);
    puff.scale.setScalar(0.4 + t * 2.1); puff.material.opacity = (1 - t) * 0.48;
  }
  car.sirenMaterials.forEach((m, i) => { m.emissiveIntensity = Math.sin(car.time * 16 + i * Math.PI) > 0 ? 2.7 : 0.15; });
}

// Shared by player driving and traffic. Returns whether a wall was contacted.
export function resolveCarBuildings(car, world, dt = 0) {
  let hit = false;
  for (const b of world?.colliders ?? []) {
    const p = car.position, qx = clamp(p.x, b.minX, b.maxX), qz = clamp(p.z, b.minZ, b.maxZ);
    let dx = p.x - qx, dz = p.z - qz, dist = Math.hypot(dx, dz);
    if (dist >= car.radius) continue;
    if (dist < 0.0001) {
      const edges = [[p.x - b.minX, -1, 0], [b.maxX - p.x, 1, 0], [p.z - b.minZ, 0, -1], [b.maxZ - p.z, 0, 1]].sort((a, c) => a[0] - c[0]);
      dx = edges[0][1]; dz = edges[0][2]; dist = 1;
      p.x += dx * (edges[0][0] + car.radius); p.z += dz * (edges[0][0] + car.radius);
    } else { p.x += dx / dist * (car.radius - dist); p.z += dz / dist * (car.radius - dist); }
    if (car.collisionCooldown <= 0 && Math.abs(car.speed) > 2) { car.damage(Math.abs(car.speed) * 1.5); car.collisionCooldown = 0.45; }
    car.speed *= -0.18; hit = true;
  }
  const b = world?.bounds ?? { minX: -237, maxX: 237, minZ: -237, maxZ: 237 };
  const x = clamp(car.position.x, b.minX + car.radius, b.maxX - car.radius), z = clamp(car.position.z, b.minZ + car.radius, b.maxZ - car.radius);
  if (x !== car.position.x || z !== car.position.z) { car.position.x = x; car.position.z = z; car.speed *= -0.2; hit = true; }
  return hit;
}

export function updateTraffic(dt, ctx = {}) {
  dt = clamp(dt, 0, 0.05);
  const world = ctx.world ?? ctx, playerCar = ctx.player?.currentCar;
  for (const car of cars) {
    car.collisionCooldown = Math.max(0, car.collisionCooldown - dt);
    if (!car.controlled && !car.parked && car.driver && car.health > 0) {
      const p = car.position;
      const horizontal = Math.abs(Math.sin(car.ai.targetHeading)) > 0.5;
      const dir = horizontal ? Math.sign(Math.sin(car.ai.targetHeading)) : Math.sign(Math.cos(car.ai.targetHeading));
      const progress = horizontal ? p.x : p.z;
      const cross = Math.round(progress / 60) * 60;
      const laneTarget = cross + dir * 3;
      const key = horizontal ? 'x' + cross + ':' + Math.round(p.z / 60) : 'z' + cross + ':' + Math.round(p.x / 60);
      if (Math.abs(progress - laneTarget) < Math.max(1, Math.abs(car.speed) * dt * 1.3) && car.ai.intersection !== key) {
        car.ai.intersection = key;
        const turn = random();
        if (turn < 0.48) car.ai.targetHeading += turn < 0.24 ? Math.PI / 2 : -Math.PI / 2;
      }
      if (Math.abs(p.x) > 218 || Math.abs(p.z) > 218) {
        car.ai.targetHeading = Math.abs(p.x) > Math.abs(p.z) ? (p.x > 0 ? -Math.PI / 2 : Math.PI / 2) : (p.z > 0 ? Math.PI : 0);
      }
      const targetHorizontal = Math.abs(Math.sin(car.ai.targetHeading)) > 0.5;
      const targetDir = targetHorizontal ? Math.sign(Math.sin(car.ai.targetHeading)) : Math.sign(Math.cos(car.ai.targetHeading));
      const lateral = targetHorizontal ? p.z : p.x;
      const lane = Math.round(lateral / 60) * 60 + (targetHorizontal ? targetDir * 3 : -targetDir * 3);
      const correction = clamp((lane - lateral) * 0.08, -0.35, 0.35);
      let desired = car.ai.targetHeading + (targetHorizontal ? -targetDir * correction : targetDir * correction);
      let targetSpeed = car.ai.cruiseSpeed;
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      for (const other of cars) {
        if (other === car) continue;
        const dx = other.position.x - p.x, dz = other.position.z - p.z;
        const forward = dx * fx + dz * fz, side = dx * fz - dz * fx;
        if (forward > 0 && forward < 12 && Math.abs(side) < 3.4) targetSpeed = Math.min(targetSpeed, Math.max(0, forward - 5));
        if (other === playerCar && Math.abs(other.speed) > 18 && Math.hypot(dx, dz) < 16) { desired += side > 0 ? -0.45 : 0.45; targetSpeed *= 0.6; }
      }
      for (const b of world.colliders ?? []) {
        const ax = p.x + fx * 7, az = p.z + fz * 7;
        if (ax > b.minX - 2 && ax < b.maxX + 2 && az > b.minZ - 2 && az < b.maxZ + 2) targetSpeed = 0;
      }
      car.heading += clamp(angle(desired - car.heading), -dt * 2.3, dt * 2.3);
      car.speed += clamp(targetSpeed - car.speed, -16 * dt, 5 * dt);
      p.x += Math.sin(car.heading) * car.speed * dt; p.z += Math.cos(car.heading) * car.speed * dt;
      resolveCarBuildings(car, world, dt);
    } else if (!car.controlled && Math.abs(car.speed) > 0.01) {
      car.position.x += Math.sin(car.heading) * car.speed * dt; car.position.z += Math.cos(car.heading) * car.speed * dt;
      car.speed *= Math.exp(-3 * dt); resolveCarBuildings(car, world, dt);
    }
  }
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j], dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
    const d = Math.hypot(dx, dz), r = a.radius + b.radius;
    if (d >= r) continue;
    const nx = d > 0.001 ? dx / d : 1, nz = d > 0.001 ? dz / d : 0, push = (r - d) / 2 + 0.001;
    a.position.x -= nx * push; a.position.z -= nz * push; b.position.x += nx * push; b.position.z += nz * push;
    const relative = Math.abs((Math.sin(a.heading) * a.speed - Math.sin(b.heading) * b.speed) * nx + (Math.cos(a.heading) * a.speed - Math.cos(b.heading) * b.speed) * nz);
    if (relative > 2 && a.collisionCooldown <= 0 && b.collisionCooldown <= 0) {
      a.damage(relative * 1.3); b.damage(relative * 1.3); a.collisionCooldown = b.collisionCooldown = 0.45;
      a.speed *= 0.35; b.speed *= 0.35;
    }
  }
  for (const car of cars) {
    resolveCarBuildings(car, world);
    if (car.driver?.position && !car.controlled) car.driver.position.copy(car.position);
    updateCarVisuals(car, dt);
  }
}
