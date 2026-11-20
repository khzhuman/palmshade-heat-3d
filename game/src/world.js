/* City coordinates use y-up, with streets every 60 metres. Collider bounds
 * are world-space {minX,maxX,minZ,maxZ}; only solid structures are included. */
export function buildWorld(scene) {
  const T = globalThis.THREE;
  if (!T) throw new Error('Call loadThree() before buildWorld().');
  const root = new T.Group();
  root.name = 'Palmshade';
  scene.add(root);
  const colliders = [], labels = [], spawnPoints = [];
  const shineShopPos = new T.Vector3(-34, 0, 18);
  const maraPos = new T.Vector3(-179, 0, -150);
  const ferryPos = new T.Vector3(-213, 0, -199);
  let seed = 46819;
  function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function material(geometry, color, glow = false) {
    const c = new T.Color(color), count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    return new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.83, ...(glow ? { emissive: color, emissiveIntensity: 0.65 } : {}) });
  }
  function mesh(geometry, color, x, y, z, glow = false) {
    const m = new T.Mesh(geometry, material(geometry, color, glow));
    m.position.set(x, y, z); m.castShadow = y > 0.5; m.receiveShadow = true; root.add(m); return m;
  }
  function box(x, y, z, w, h, d, color, solid = false, glow = false) {
    const m = mesh(new T.BoxGeometry(w, h, d), color, x, y, z, glow);
    if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, mesh: m });
    return m;
  }
  function sign(text, x, y, z, size = 12, color = '#fff4cd') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
    const c = canvas.getContext('2d'); c.fillStyle = '#19353b'; c.fillRect(0, 0, 1024, 160);
    c.strokeStyle = color; c.lineWidth = 8; c.strokeRect(8, 8, 1008, 144);
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 72px sans-serif'; c.fillText(text, 512, 83, 970);
    const tex = new T.CanvasTexture(canvas);
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false }));
    s.position.set(x, y, z); s.scale.set(size, size / 6.4, 1); root.add(s); labels.push(s); return s;
  }
  function palm(x, z, h = 8) {
    const trunk = mesh(new T.CylinderGeometry(0.23, 0.43, h, 6), 0x94724c, x, h / 2, z);
    trunk.rotation.z = 0.08;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const leaf = mesh(new T.ConeGeometry(1.1, 5.4, 3), 0x497d50, x + Math.sin(a) * 1.8, h, z + Math.cos(a) * 1.8);
      leaf.rotation.set(Math.cos(a) * 1.23, a, Math.sin(a) * 1.23);
    }
  }
  function districtAt(x, z) { return z < 0 ? (x < 0 ? 'Old Port' : 'The Flats') : (x < 0 ? 'Coral Heights' : 'Neon Mile'); }
  box(0, -0.4, 0, 480, 0.7, 480, 0xb9b88a);
  const districts = [
    { name: 'Old Port', x: -120, z: -120, color: 0xa5b0a2 },
    { name: 'The Flats', x: 120, z: -120, color: 0xcdb68f },
    { name: 'Coral Heights', x: -120, z: 120, color: 0xa7b987 },
    { name: 'Neon Mile', x: 120, z: 120, color: 0xdfc5b3 }
  ];
  for (const d of districts) { box(d.x, -0.025, d.z, 240, 0.08, 240, d.color); sign(d.name.toUpperCase(), d.x, 30, d.z, 40); }
  for (let n = -240; n <= 240; n += 60) {
    box(n, 0.02, 0, 18, 0.14, 480, 0xbcb9ae); box(0, 0.025, n, 480, 0.14, 18, 0xbcb9ae);
    box(n, 0.11, 0, 12, 0.08, 480, 0x485258); box(0, 0.115, n, 480, 0.08, 12, 0x485258);
    for (let k = -228; k < 240; k += 12) {
      if (Math.abs(k / 60 - Math.round(k / 60)) > 0.12) {
        box(n, 0.16, k, 0.18, 0.015, 4.5, 0xeee0a1); box(k, 0.17, n, 4.5, 0.015, 0.18, 0xeee0a1);
      }
    }
  }
  const colors = [0xe7a792, 0xa7c8be, 0xe1c18b, 0xb6b3d2, 0xc7d8ad, 0xd88f91];
  for (let x = -210; x <= 210; x += 60) for (let z = -210; z <= 210; z += 60) {
    if ((x === -30 && z === 30) || (x < -150 && z < -90) || (x > 150 && z > 0)) continue;
    const district = districtAt(x, z), villa = district === 'Coral Heights';
    const h = villa ? 5 + rand() * 4 : 9 + rand() * (district === 'Neon Mile' ? 30 : 19);
    const w = villa ? 22 : 25 + rand() * 10, depth = villa ? 19 : 25 + rand() * 10;
    if (villa) {
      box(x, 0.25, z, 42, 0.35, 42, 0x8caa77);
      box(x + 14, 0.47, z + 8, 8, 0.1, 14, 0x65c4d2);
      box(x, 0.8, z - 21, 43, 1.3, 0.6, 0xead8bd, true);
      palm(x - 16, z + 14);
    }
    box(x, h / 2 + 0.2, z, w, h, depth, colors[Math.floor(rand() * colors.length)], true);
    box(x, h + 0.5, z, w + 1, 0.7, depth + 1, villa ? 0xd67d61 : 0xe6dac4);
    for (let y = 3; y < h - 1; y += 4) for (let dx = -w / 2 + 3; dx < w / 2 - 1; dx += 5) {
      box(x + dx, y, z + depth / 2 + 0.06, 2.1, 1.8, 0.13, district === 'Neon Mile' ? 0xff80c9 : 0x466b79, false, district === 'Neon Mile');
      box(x + dx, y, z - depth / 2 - 0.06, 2.1, 1.8, 0.13, 0x7197a4);
    }
    if (district === 'Neon Mile') sign(['SUNSET CLUB', 'CORAL ARCADE', 'HOTEL HEAT'][Math.floor(rand() * 3)], x, 5.5, z + depth / 2 + 0.3, 19, '#ff80cc');
    if (district === 'The Flats') for (let j = 0; j < 2; j++) {
      const sx = x - 12 + j * 15, sz = z + 21;
      box(sx, 1, sz, 6, 2, 3, 0xa98155, true); box(sx, 3.3, sz, 8, 0.35, 5, j ? 0xe6b35c : 0xc57881);
      for (const side of [-1, 1]) box(sx + side * 3, 2.1, sz, 0.15, 2.4, 0.15, 0x6a7460);
    }
  }
  // Beachfront and open sea lie beyond the eastern promenade.
  box(221, 0.02, 123, 35, 0.1, 228, 0xefd39b);
  box(305, -0.16, 0, 130, 0.12, 700, 0x469fae);
  for (let z = 18; z < 230; z += 23) {
    palm(201, z, 8 + rand() * 3);
    mesh(new T.ConeGeometry(2.6, 1, 8), z % 2 ? 0xf0aa95 : 0x88c5bc, 223, 2.7, z);
    box(223, 1.2, z, 0.12, 2.4, 0.12, 0xd9c39a);
  }
  // Working harbour: water basin, quays, cargo sheds and lifting cranes.
  box(-219, -0.1, -153, 42, 0.1, 169, 0x438d9c);
  box(-191, 0.6, -153, 13, 1.2, 168, 0x9a9b8b, true);
  for (const z of [-210, -165, -120]) {
    box(-215, 0.65, z, 44, 1.1, 10, 0x967a59);
    box(-164, 6, z + 8, 25, 12, 25, 0xa1aaa2, true);
    box(-164, 12.3, z + 8, 27, 0.7, 27, 0x637f84);
    box(-195, 12, z - 10, 2, 24, 2, 0xe8b554, true);
    box(-207, 24, z - 10, 27, 1.5, 1.5, 0xe8b554);
    box(-218, 19, z - 10, 0.13, 10, 0.13, 0x424f51);
  }
  const ramp = box(ferryPos.x, 0.6, ferryPos.z, 20, 0.6, 9, 0x90958b); ramp.rotation.z = -0.06;
  sign('PALMSHADE FERRY', -204, 6, -199, 22);
  // A deliberately clear forecourt supports repairs, deliveries and respawns.
  box(-30, 0.2, 29, 42, 0.25, 42, 0xc4b8a0);
  box(-30, 4.3, 43, 30, 8, 12, 0x55bcb5, true);
  box(-30, 8.7, 43, 32, 0.7, 14, 0xf0cf83);
  box(-30, 3.3, 36.9, 11, 5.5, 0.15, 0x294b59);
  sign('SHINE SHOP', -30, 10.6, 36, 27, '#ffe184');
  const shopMarker = mesh(new T.RingGeometry(3.5, 3.8, 40), 0x83f4d3, shineShopPos.x, 0.38, shineShopPos.z, true); shopMarker.rotation.x = -Math.PI / 2;
  const maraMarker = mesh(new T.RingGeometry(1.7, 2.1, 24), 0xffce77, maraPos.x, 0.27, maraPos.z, true); maraMarker.rotation.x = -Math.PI / 2;
  sign('MARA', maraPos.x, 4, maraPos.z, 7, '#ffd184');
  for (let x = -180; x <= 180; x += 60) for (let z = -180; z <= 180; z += 60) {
    box(x + 8, 3.8, z + 11, 0.2, 7.6, 0.2, 0x566c69);
    box(x + 7, 7.6, z + 11, 2.5, 0.2, 0.5, 0x566c69);
    box(x + 6, 7.45, z + 11, 0.8, 0.12, 0.6, 0xffe4a3, false, true);
    if (z >= 0) palm(x + 10, z + 20, 7);
    spawnPoints.push({ x: x + 17, y: 0.2, z: z + 3, heading: Math.PI / 2, district: districtAt(x + 17, z + 3), kind: 'traffic' });
    spawnPoints.push({ x: x - 13, y: 0.2, z: z - 5, heading: -Math.PI / 2, district: districtAt(x - 13, z - 5), kind: 'parked' });
  }
  const ambient = new T.HemisphereLight(0xffe3b6, 0x59756d, 1.65); scene.add(ambient);
  const sun = new T.DirectionalLight(0xffcf91, 2.3); sun.position.set(-160, 190, 80); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 650 }); scene.add(sun);
  scene.background = new T.Color(0xf0bd99); scene.fog = new T.Fog(0xf0bd99, 170, 540);
  return { root, colliders, shineShopPos, maraPos, ferryPos, districtAt, districts, spawnPoints, labels, bounds: { minX: -237, maxX: 237, minZ: -237, maxZ: 237 }, roadSpacing: 60, laneOffset: 3 };
}
