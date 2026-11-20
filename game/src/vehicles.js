// Heading zero faces +Z; signed speed is measured in metres per second.
// Each car shares its position vector with its mesh. Traffic advances every frame.
export const cars = [];
export const CAR_COLORS = [0xef8c78, 0x67b9b3, 0xf1cf7f, 0xb7a1cb, 0x91b67c, 0xe4d9bd, 0x537b9a];
let serial = 1;
let trafficSeed = 981731;
function nextRandom() {
  trafficSeed = (Math.imul(trafficSeed, 1664525) + 1013904223) >>> 0;
  return trafficSeed / 4294967296;
}
const limit = (value, lower, upper) => Math.max(lower, Math.min(upper, value));
const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));

export function createCar(scene, options = {}) {
  const T = globalThis.THREE;
  const mesh = new T.Group();
  const body = new T.Group();
  mesh.add(body);
  const color = options.color ?? CAR_COLORS[Math.floor(nextRandom() * CAR_COLORS.length)];
  const police = !!options.police;
  const paint = new T.MeshStandardMaterial({ color: police ? 0xf3f0df : color, roughness: 0.55 });
  const trim = new T.MeshStandardMaterial({ color: 0x26343e, roughness: 0.75 });
  const windows = new T.MeshStandardMaterial({ color: 0x75acbd, metalness: 0.25, roughness: 0.2 });
  const tyres = new T.MeshStandardMaterial({ color: 0x242b2d, roughness: 1 });
  function panel(width, height, depth, x, y, z, material, parent = body) {
    const object = new T.Mesh(new T.BoxGeometry(width, height, depth), material);
    object.position.set(x, y, z);
    object.castShadow = true;
    parent.add(object);
    return object;
  }
  panel(2.15, 0.65, 4.35, 0, 0.85, 0, paint);
  panel(1.8, 0.8, 1.95, 0, 1.5, -0.25, windows);
  panel(1.87, 0.14, 2.02, 0, 1.95, -0.25, police ? trim : paint);
  panel(2.04, 0.18, 1.12, 0, 1.24, 1.48, police ? trim : paint);
  panel(2.04, 0.17, 0.75, 0, 1.22, -1.75, police ? trim : paint);
  panel(2.22, 0.22, 0.2, 0, 0.62, 2.2, trim);
  panel(2.22, 0.22, 0.2, 0, 0.62, -2.2, trim);
  const wheels = [];
  for (const x of [-1.09, 1.09]) {
    for (const z of [-1.4, 1.4]) {
      const wheel = new T.Mesh(new T.CylinderGeometry(0.43, 0.43, 0.28, 10), tyres);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.47, z);
      body.add(wheel);
      wheels.push(wheel);
    }
  }
  const headlights = new T.MeshStandardMaterial({ color: 0xfff1b8, emissive: 0xffdf87, emissiveIntensity: 0.9 });
  const taillights = new T.MeshStandardMaterial({ color: 0xe95d56, emissive: 0xff382d, emissiveIntensity: 0.5 });
  for (const x of [-0.73, 0.73]) {
    panel(0.43, 0.23, 0.08, x, 0.99, 2.2, headlights);
    panel(0.4, 0.23, 0.08, x, 1.02, -2.2, taillights);
  }
  const sirenMaterials = [];
  if (police) {
    panel(1.6, 0.12, 0.45, 0, 2.08, -0.2, trim);
    for (const [x, hue] of [[-0.46, 0xff3039], [0.46, 0x389dff]]) {
      const material = new T.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 1 });
      panel(0.62, 0.27, 0.4, x, 2.25, -0.2, material);
      sirenMaterials.push(material);
    }
  }
  const smoke = new T.Group();
  mesh.add(smoke);
  smoke.visible = false;
  for (let puffIndex = 0; puffIndex < 6; puffIndex++) {
    const puff = new T.Mesh(new T.IcosahedronGeometry(0.3, 0), new T.MeshBasicMaterial({
      color: 0x62696a, transparent: true, opacity: 0.42, depthWrite: false
    }));
    smoke.add(puff);
  }
  const car = {
    id: serial++, mesh, body, position: mesh.position, heading: options.heading ?? 0,
    speed: 0, health: 100, radius: 2.35, color, police, driver: options.driver ?? null,
    parked: !!options.parked, controlled: false, smokeEmitter: false, smoke,
    wheels, paint, sirenMaterials, collisionCooldown: 0, time: nextRandom() * 20,
    ai: { targetHeading: options.heading ?? 0, cruiseSpeed: 9 + nextRandom() * 6, intersection: null },
    damage(amount) {
      this.health = limit(this.health - Math.max(0, amount), 0, 100);
      updateCarVisuals(this, 0);
    }
  };
  car.position.set(options.x ?? options.position?.x ?? 0, options.y ?? 0.2, options.z ?? options.position?.z ?? 0);
  mesh.rotation.y = car.heading;
  mesh.name = police ? 'Police cruiser' : 'Traffic car';
  mesh.userData.car = car;
  scene.add(mesh);
  cars.push(car);
  return car;
}

export function spawnTraffic(scene, world, count = 26, options = {}) {
  trafficSeed = (options.seed ?? 981731) >>> 0;
  const locations = world.spawnPoints ?? [];
  const movingSpawns = locations.filter(point => point.kind === 'traffic');
  const parkingSpawns = locations.filter(point => point.kind === 'parked');
  const created = [];
  for (let index = 0; index < count; index++) {
    const point = movingSpawns[index % movingSpawns.length] ?? {
      x: -163 + (index % 6) * 60, z: -177 + Math.floor(index / 6) * 60, heading: Math.PI / 2
    };
    if (cars.some(car => Math.hypot(car.position.x - point.x, car.position.z - point.z) < 6)) continue;
    const driver = { state: 'driving', position: new globalThis.THREE.Vector3(point.x, 0, point.z), car: null };
    const car = createCar(scene, { ...point, driver });
    driver.car = car;
    created.push(car);
  }
  for (const point of parkingSpawns.slice(0, options.parkedCount ?? 14)) {
    if (!cars.some(car => Math.hypot(car.position.x - point.x, car.position.z - point.z) < 6)) {
      created.push(createCar(scene, { ...point, parked: true }));
    }
  }
  return created;
}

export function updateCarVisuals(car, dt) {
  car.time += dt;
  car.smokeEmitter = car.health < 35;
  car.smoke.visible = car.smokeEmitter;
  const damageFraction = 1 - car.health / 100;
  car.paint.color.setHex(car.police ? 0xf3f0df : car.color).multiplyScalar(1 - damageFraction * 0.45);
  car.body.rotation.z = Math.sin(car.id * 3) * damageFraction * 0.085;
  car.body.rotation.x = damageFraction * 0.035;
  car.body.scale.z = 1 - damageFraction * 0.055;
  car.mesh.rotation.y = car.heading;
  for (const puff of car.smoke.children) {
    const index = car.smoke.children.indexOf(puff);
    const phase = (car.time * 0.65 + index / 6) % 1;
    puff.position.set(Math.sin(index * 4 + car.time) * phase * 0.6, 1.4 + phase * 3.5, 1.3 - phase * 0.6);
    puff.scale.setScalar(0.4 + phase * 2.1);
    puff.material.opacity = (1 - phase) * 0.48;
  }
  car.sirenMaterials.forEach((material, index) => {
    material.emissiveIntensity = Math.sin(car.time * 16 + index * Math.PI) > 0 ? 2.7 : 0.15;
  });
}

// Both driving paths use this collision response; true reports scenery contact.
export function resolveCarBuildings(car, world, dt = 0) {
  let contact = false;
  for (const obstacle of world?.colliders ?? []) {
    const position = car.position;
    const nearestX = limit(position.x, obstacle.minX, obstacle.maxX);
    const nearestZ = limit(position.z, obstacle.minZ, obstacle.maxZ);
    let dx = position.x - nearestX;
    let dz = position.z - nearestZ;
    let distance = Math.hypot(dx, dz);
    if (distance >= car.radius) continue;
    if (distance < 0.0001) {
      const exits = [
        [position.x - obstacle.minX, -1, 0], [obstacle.maxX - position.x, 1, 0],
        [position.z - obstacle.minZ, 0, -1], [obstacle.maxZ - position.z, 0, 1]
      ].sort((first, second) => first[0] - second[0]);
      dx = exits[0][1];
      dz = exits[0][2];
      distance = 1;
      position.x += dx * (exits[0][0] + car.radius);
      position.z += dz * (exits[0][0] + car.radius);
    } else {
      position.x += dx / distance * (car.radius - distance);
      position.z += dz / distance * (car.radius - distance);
    }
    if (car.collisionCooldown <= 0 && Math.abs(car.speed) > 2) {
      car.damage(Math.abs(car.speed) * 1.5);
      car.collisionCooldown = 0.45;
    }
    car.speed *= -0.18;
    contact = true;
  }
  const boundary = world?.bounds ?? { minX: -237, maxX: 237, minZ: -237, maxZ: 237 };
  const x = limit(car.position.x, boundary.minX + car.radius, boundary.maxX - car.radius);
  const z = limit(car.position.z, boundary.minZ + car.radius, boundary.maxZ - car.radius);
  if (x !== car.position.x || z !== car.position.z) {
    car.position.x = x;
    car.position.z = z;
    car.speed *= -0.2;
    contact = true;
  }
  return contact;
}

export function updateTraffic(dt, ctx = {}) {
  dt = limit(dt, 0, 0.05);
  const world = ctx.world ?? ctx;
  const playerCar = ctx.player?.currentCar;
  for (const car of cars) {
    car.collisionCooldown = Math.max(0, car.collisionCooldown - dt);
    if (!car.controlled && !car.parked && car.driver && car.health > 0) {
      const position = car.position;
      const horizontal = Math.abs(Math.sin(car.ai.targetHeading)) > 0.5;
      const direction = horizontal ? Math.sign(Math.sin(car.ai.targetHeading)) : Math.sign(Math.cos(car.ai.targetHeading));
      const progress = horizontal ? position.x : position.z;
      const crossing = Math.round(progress / 60) * 60;
      const laneTarget = crossing + direction * 3;
      const junction = horizontal
        ? 'x' + crossing + ':' + Math.round(position.z / 60)
        : 'z' + crossing + ':' + Math.round(position.x / 60);
      if (Math.abs(progress - laneTarget) < Math.max(1, Math.abs(car.speed) * dt * 1.3) && car.ai.intersection !== junction) {
        car.ai.intersection = junction;
        const turn = nextRandom();
        if (turn < 0.48) car.ai.targetHeading += turn < 0.24 ? Math.PI / 2 : -Math.PI / 2;
      }
      if (Math.abs(position.x) > 218 || Math.abs(position.z) > 218) {
        car.ai.targetHeading = Math.abs(position.x) > Math.abs(position.z)
          ? (position.x > 0 ? -Math.PI / 2 : Math.PI / 2)
          : (position.z > 0 ? Math.PI : 0);
      }
      const nextHorizontal = Math.abs(Math.sin(car.ai.targetHeading)) > 0.5;
      const nextDirection = nextHorizontal ? Math.sign(Math.sin(car.ai.targetHeading)) : Math.sign(Math.cos(car.ai.targetHeading));
      const lateral = nextHorizontal ? position.z : position.x;
      const lane = Math.round(lateral / 60) * 60 + (nextHorizontal ? nextDirection * 3 : -nextDirection * 3);
      const correction = limit((lane - lateral) * 0.08, -0.35, 0.35);
      let desiredHeading = car.ai.targetHeading + (nextHorizontal ? -nextDirection * correction : nextDirection * correction);
      let desiredSpeed = car.ai.cruiseSpeed;
      const forwardX = Math.sin(car.heading);
      const forwardZ = Math.cos(car.heading);
      for (const other of cars) {
        if (other === car) continue;
        const dx = other.position.x - position.x;
        const dz = other.position.z - position.z;
        const ahead = dx * forwardX + dz * forwardZ;
        const side = dx * forwardZ - dz * forwardX;
        if (ahead > 0 && ahead < 12 && Math.abs(side) < 3.4) {
          desiredSpeed = Math.min(desiredSpeed, Math.max(0, ahead - 5));
        }
        if (other === playerCar && Math.abs(other.speed) > 18 && Math.hypot(dx, dz) < 16) {
          desiredHeading += side > 0 ? -0.45 : 0.45;
          desiredSpeed *= 0.6;
        }
      }
      for (const obstacle of world.colliders ?? []) {
        const probeX = position.x + forwardX * 7;
        const probeZ = position.z + forwardZ * 7;
        if (probeX > obstacle.minX - 2 && probeX < obstacle.maxX + 2 && probeZ > obstacle.minZ - 2 && probeZ < obstacle.maxZ + 2) desiredSpeed = 0;
      }
      car.heading += limit(wrapAngle(desiredHeading - car.heading), -dt * 2.3, dt * 2.3);
      car.speed += limit(desiredSpeed - car.speed, -16 * dt, 5 * dt);
      position.x += Math.sin(car.heading) * car.speed * dt;
      position.z += Math.cos(car.heading) * car.speed * dt;
      resolveCarBuildings(car, world, dt);
    } else if (!car.controlled && Math.abs(car.speed) > 0.01) {
      car.position.x += Math.sin(car.heading) * car.speed * dt;
      car.position.z += Math.cos(car.heading) * car.speed * dt;
      car.speed *= Math.exp(-3 * dt);
      resolveCarBuildings(car, world, dt);
    }
  }
  for (let first = 0; first < cars.length; first++) {
    for (let second = first + 1; second < cars.length; second++) {
      const a = cars[first];
      const b = cars[second];
      const dx = b.position.x - a.position.x;
      const dz = b.position.z - a.position.z;
      const distance = Math.hypot(dx, dz);
      const combinedRadius = a.radius + b.radius;
      if (distance >= combinedRadius) continue;
      const normalX = distance > 0.001 ? dx / distance : 1;
      const normalZ = distance > 0.001 ? dz / distance : 0;
      const separation = (combinedRadius - distance) / 2 + 0.001;
      a.position.x -= normalX * separation;
      a.position.z -= normalZ * separation;
      b.position.x += normalX * separation;
      b.position.z += normalZ * separation;
      const impact = Math.abs((Math.sin(a.heading) * a.speed - Math.sin(b.heading) * b.speed) * normalX + (Math.cos(a.heading) * a.speed - Math.cos(b.heading) * b.speed) * normalZ);
      if (impact > 2 && a.collisionCooldown <= 0 && b.collisionCooldown <= 0) {
        a.damage(impact * 1.3);
        b.damage(impact * 1.3);
        a.collisionCooldown = b.collisionCooldown = 0.45;
        a.speed *= 0.35;
        b.speed *= 0.35;
      }
    }
  }
  for (const car of cars) {
    resolveCarBuildings(car, world);
    if (car.driver?.position && !car.controlled) car.driver.position.copy(car.position);
    updateCarVisuals(car, dt);
  }
}
