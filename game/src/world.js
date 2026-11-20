import { CITY, DISTRICTS, PALETTE } from './config.js';
import { rngRange, rngPick } from './random.js';

const T = window.THREE;
const materials = new Map();
export function material(color, extra = {}) {
  const key = String(color) + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness: 0.86, ...extra }));
  return materials.get(key);
}
export function box(parent, w, h, d, color, x = 0, y = 0, z = 0, extra = {}) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material(color, extra));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function palm(parent, x, z, scale = 1) {
  const tree = new T.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  const trunk = new T.Mesh(new T.CylinderGeometry(0.25, 0.48, 9, 6), material(0x95705b));
  trunk.position.y = 4.5;
  trunk.rotation.z = 0.09;
  tree.add(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new T.Mesh(new T.ConeGeometry(1.25, 6.6, 3), material(i % 2 ? 0x398776 : 0x236f64));
    const a = i * Math.PI * 2 / 7;
    leaf.position.set(Math.sin(a) * 2, 8.4, Math.cos(a) * 2);
    leaf.rotation.set(Math.cos(a) * 1.25, a, -Math.sin(a) * 1.25);
    tree.add(leaf);
  }
  parent.add(tree);
}
export function makePerson(color = 0xefb582) {
  const root = new T.Group();
  const body = box(root, 0.72, 1.02, 0.42, color, 0, 1.2, 0);
  const head = box(root, 0.47, 0.5, 0.46, 0xdba179, 0, 1.99, 0);
  box(head, 0.49, 0.14, 0.48, 0x332c38, 0, 0.25, 0);
  const legs = [-1, 1].map(side => box(root, 0.27, 0.83, 0.31, 0x34475b, side * 0.2, 0.42, 0));
  const arms = [-1, 1].map(side => {
    const pivot = new T.Group();
    pivot.position.set(side * 0.49, 1.63, 0);
    box(pivot, 0.23, 0.78, 0.25, color, 0, -0.36, 0);
    root.add(pivot);
    return pivot;
  });
  root.userData.rig = { body, head, legs, arms };
  return root;
}
export function posePerson(root, state, phase = 0) {
  const { arms, legs, body, head } = root.userData.rig;
  const cower = state === 'cower';
  body.position.y = cower ? 0.7 : 1.2;
  body.rotation.x = cower ? 0.55 : 0;
  head.position.y = cower ? 1.22 : 1.99;
  head.rotation.x = cower ? 0.65 : 0;
  arms.forEach((arm, i) => {
    arm.position.y = cower ? 1.15 : 1.63;
    arm.rotation.set(cower ? -2.5 : state === 'flee' ? -1.8 : Math.sin(phase + i * Math.PI) * 0.45, 0, cower ? (i ? -0.55 : 0.55) : 0);
  });
  legs.forEach((leg, i) => {
    leg.position.y = cower ? 0.25 : 0.42;
    leg.rotation.x = cower ? -0.95 : Math.sin(phase + i * Math.PI) * (state === 'idle' ? 0 : 0.55);
  });
}
export function createWorld(scene, rng) {
  const root = new T.Group();
  scene.add(root);
  const minX = Math.min(...DISTRICTS.map(d => d.x0));
  const maxX = Math.max(...DISTRICTS.map(d => d.x1));
  const minZ = Math.min(...DISTRICTS.map(d => d.z0));
  const maxZ = Math.max(...DISTRICTS.map(d => d.z1));
  const bounds = { minX, maxX, minZ, maxZ };
  const colliders = [];
  const peds = [];
  const roadsX = [], roadsZ = [];
  for (let x = minX; x <= maxX; x += CITY.roadEvery) roadsX.push(x);
  for (let z = minZ; z <= maxZ; z += CITY.roadEvery) roadsZ.push(z);
  const districtAt = (x, z) => DISTRICTS.find(d => x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) || DISTRICTS[0];
  const center = name => {
    const d = DISTRICTS.find(d => d.name === name) || DISTRICTS[0];
    return new T.Vector3((d.x0 + d.x1) / 2, 0, (d.z0 + d.z1) / 2);
  };
  box(root, maxX - minX + 35, 0.8, maxZ - minZ + 35, 0xc8b48f, (minX + maxX) / 2, -0.6, (minZ + maxZ) / 2);
  box(root, 180, 0.3, maxZ - minZ + 500, 0x398e9c, maxX + 105, -0.65, (minZ + maxZ) / 2, { metalness: 0.28, roughness: 0.35 });
  box(root, 30, 0.2, maxZ - minZ, 0xf3d7ac, maxX + 15, -0.12, (minZ + maxZ) / 2);
  for (const x of roadsX) {
    box(root, 17, 0.12, maxZ - minZ + 20, 0x444956, x, -0.06, (minZ + maxZ) / 2);
    for (let z = minZ; z < maxZ; z += 12) box(root, 0.16, 0.02, 5, 0xe7ca83, x, 0.015, z);
  }
  for (const z of roadsZ) {
    box(root, maxX - minX + 20, 0.13, 17, 0x444956, (minX + maxX) / 2, -0.05, z);
    for (let x = minX; x < maxX; x += 12) box(root, 5, 0.02, 0.16, 0xe7ca83, x, 0.025, z);
  }
  const landmarks = {
    dock: center('Old Port'), neon: center('Neon Mile'), villa: center('Coral Heights'), flats: center('The Flats'),
    shop: new T.Vector3(roadsX[2] || minX + 120, 0, (roadsZ[2] || minZ + 120) + 18),
    ferry: new T.Vector3(maxX - 5, 0, maxZ - 60)
  };
  const reserved = Object.values(landmarks);
  for (let ix = 0; ix < roadsX.length - 1; ix++) {
    for (let iz = 0; iz < roadsZ.length - 1; iz++) {
      const x = roadsX[ix] + 30, z = roadsZ[iz] + 30;
      box(root, 40, 0.22, 40, 0xe2cbb1, x, 0, z);
      const d = districtAt(x, z);
      const port = d.name === 'Old Port', hill = d.name === 'Coral Heights';
      for (let k = 0; k < 4; k++) {
        const bx = x + (k % 2 ? 10 : -10), bz = z + (k < 2 ? -10 : 10);
        if (reserved.some(v => Math.hypot(bx - v.x, bz - v.z) < 20)) continue;
        const height = port ? rngRange(rng, 7, 13) : hill ? rngRange(rng, 5, 10) : rngRange(rng, 10, 35);
        const color = rngPick(rng, [0xe7b4a0, 0xe8ccaa, 0x89b7af, 0xd496a9, 0xbcb4cb]);
        box(root, 16, height, 16, color, bx, height / 2, bz);
        box(root, 17, 0.55, 17, 0xf0dcc0, bx, height, bz);
        colliders.push({ x: bx, z: bz, hx: 8.6, hz: 8.6, height });
        for (let floor = 3; floor < height - 1; floor += 4) {
          for (const side of [-1, 1]) {
            box(root, 10, 1.5, 0.12, 0x416578, bx, floor, bz + side * 8.05, { emissive: 0x33516b, emissiveIntensity: 0.15 });
            box(root, 0.12, 1.5, 10, 0x416578, bx + side * 8.05, floor, bz);
          }
        }
        if (d.name === 'Neon Mile') box(root, 12, 0.4, 0.2, 0xff6fba, bx, 3, bz - 8.2, { emissive: 0xff3999, emissiveIntensity: 1.5 });
      }
      palm(root, x - 20, z - 20, rngRange(rng, 0.7, 1.1));
    }
  }
  const shop = landmarks.shop;
  box(root, 21, 8, 12, 0x58a6a5, shop.x, 4, shop.z + 7);
  box(root, 15, 5, 0.2, 0x253e4b, shop.x, 2.5, shop.z + 0.8);
  box(root, 23, 0.7, 14, 0xf9ac8c, shop.x, 8.2, shop.z + 7);
  box(root, 16, 1.2, 0.3, 0x92ffe0, shop.x, 6.6, shop.z + 0.5, { emissive: 0x52dfbb, emissiveIntensity: 1 });
  const villa = landmarks.villa;
  box(root, 20, 7, 13, 0xf8ddc1, villa.x, 3.5, villa.z + 13);
  box(root, 23, 0.6, 15, 0xd57876, villa.x, 7.2, villa.z + 13);
  box(root, 12, 0.1, 7, 0x68c7ce, villa.x + 18, 0.1, villa.z + 12);
  for (let z = minZ + 14; z < maxZ; z += 24) {
    palm(root, maxX + 6, z, 1.15);
    box(root, 2, 0.4, 4, 0xe99996, maxX + 22, 0.2, z);
  }
  const dock = landmarks.dock;
  for (let i = 0; i < 3; i++) {
    const x = dock.x - 22 + i * 20;
    box(root, 2, 29, 2, 0xeeb859, x, 14.5, dock.z + 20);
    box(root, 20, 1.3, 2, 0xeeb859, x + 8, 28, dock.z + 20);
    box(root, 0.12, 18, 0.12, 0x404c59, x + 17, 18, dock.z + 20);
    box(root, 12, 4, 5, i % 2 ? 0xd46e69 : 0x507a91, x, 2, dock.z - 16);
  }
  box(root, 18, 0.6, 42, 0x8c9a9f, landmarks.ferry.x + 8, 0.1, landmarks.ferry.z);
  for (let i = 0; i < 100; i++) {
    const street = rngPick(rng, roadsX);
    const person = makePerson(rngPick(rng, PALETTE.pedTones || [0xe89a91, 0x55afa8, 0xeac665]));
    person.position.set(street + (i % 2 ? 11 : -11), 0.12, rngRange(rng, minZ + 8, maxZ - 8));
    root.add(person);
    peds.push({ mesh: person, state: 'walk', fear: 0, cowers: i % 4 === 0, direction: i % 2 ? 1 : -1, phase: rng() * 6.28, away: new T.Vector3() });
  }
  function scare(position, radius = 35, gunfire = false) {
    for (const ped of peds) {
      if (ped.mesh.position.distanceTo(position) > radius) continue;
      ped.fear = gunfire ? 4.5 : 2.7;
      ped.state = gunfire && ped.cowers ? 'cower' : 'flee';
      ped.away.copy(ped.mesh.position).sub(position).setY(0).normalize();
      if (!ped.away.lengthSq()) ped.away.set(1, 0, 0);
    }
  }
  function blocked(x, z, radius = 1) {
    return colliders.some(c => Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius);
  }
  function update(dt) {
    for (const ped of peds) {
      ped.fear = Math.max(0, ped.fear - dt);
      if (!ped.fear) ped.state = 'walk';
      const p = ped.mesh.position;
      const oldX = p.x, oldZ = p.z;
      if (ped.state === 'flee') p.addScaledVector(ped.away, dt * 5.6);
      if (ped.state === 'walk') p.z += ped.direction * dt * 1.1;
      if (blocked(p.x, p.z, 0.5)) { p.x = oldX; p.z = oldZ; ped.away.applyAxisAngle(T.Object3D.DEFAULT_UP, 1.2); }
      p.x = T.MathUtils.clamp(p.x, minX - 5, maxX + 26);
      if (p.z < minZ + 4 || p.z > maxZ - 4) { ped.direction *= -1; p.z = T.MathUtils.clamp(p.z, minZ + 4, maxZ - 4); }
      ped.mesh.rotation.y = ped.state === 'flee' ? Math.atan2(ped.away.x, ped.away.z) : ped.direction > 0 ? 0 : Math.PI;
      ped.phase += dt * (ped.state === 'flee' ? 12 : 4);
      posePerson(ped.mesh, ped.state, ped.phase);
    }
  }
  return { root, bounds, roadsX, roadsZ, colliders, peds, landmarks, districtAt, blocked, scare, update };
}
