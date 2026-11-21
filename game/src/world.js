// The city uses a vertical Y axis. Solid scenery supplies X/Z collision bounds.
export function buildWorld(scene) {
  const T = globalThis.THREE;
  if (!T) throw new Error('Call loadThree() before buildWorld().');
  const root = new T.Group();
  root.name = 'Palmshade';
  scene.add(root);
  const colliders = [];
  const labels = [];
  const spawnPoints = [];
  const shineShopPos = new T.Vector3(-34, 0, 18);
  const maraPos = new T.Vector3(-180.5, 0, -150);
  const ferryPos = new T.Vector3(-213, 0, -199);
  let citySeed = 46819;
  function nextRandom() {
    citySeed = (Math.imul(citySeed, 1664525) + 1013904223) >>> 0;
    return citySeed / 4294967296;
  }
  function surface(geometry, color, glow = false) {
    const shade = new T.Color(color);
    const vertexCount = geometry.attributes.position.count;
    const channels = new Float32Array(vertexCount * 3);
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      channels[vertex * 3] = shade.r;
      channels[vertex * 3 + 1] = shade.g;
      channels[vertex * 3 + 2] = shade.b;
    }
    geometry.setAttribute('color', new T.BufferAttribute(channels, 3));
    return new T.MeshStandardMaterial({
      vertexColors: true, roughness: 0.83,
      ...(glow ? { emissive: color, emissiveIntensity: 0.65 } : {})
    });
  }
  function placeMesh(geometry, color, x, y, z, glow = false) {
    const object = new T.Mesh(geometry, surface(geometry, color, glow));
    object.position.set(x, y, z);
    object.castShadow = y > 0.5;
    object.receiveShadow = true;
    root.add(object);
    return object;
  }
  function block(x, y, z, width, height, depth, color, solid = false, glow = false) {
    const object = placeMesh(new T.BoxGeometry(width, height, depth), color, x, y, z, glow);
    if (solid) {
      colliders.push({
        minX: x - width / 2, maxX: x + width / 2,
        minZ: z - depth / 2, maxZ: z + depth / 2, mesh: object
      });
    }
    return object;
  }
  function billboard(text, x, y, z, size = 12, color = '#fff4cd') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    context.fillStyle = '#19353b';
    context.fillRect(0, 0, 1024, 160);
    context.strokeStyle = color;
    context.lineWidth = 8;
    context.strokeRect(8, 8, 1008, 144);
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold 72px sans-serif';
    context.fillText(text, 512, 83, 970);
    const texture = new T.CanvasTexture(canvas);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthWrite: false }));
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size / 6.4, 1);
    root.add(sprite);
    labels.push(sprite);
    return sprite;
  }
  function palmTree(x, z, height = 8) {
    const trunk = placeMesh(new T.CylinderGeometry(0.23, 0.43, height, 6), 0x94724c, x, height / 2, z);
    trunk.rotation.z = 0.08;
    for (let frond = 0; frond < 6; frond++) {
      const angle = frond * Math.PI / 3;
      const leaf = placeMesh(new T.ConeGeometry(1.1, 5.4, 3), 0x497d50,
        x + Math.sin(angle) * 1.8, height, z + Math.cos(angle) * 1.8);
      leaf.rotation.set(Math.cos(angle) * 1.23, angle, Math.sin(angle) * 1.23);
    }
  }
  function districtAt(x, z) {
    return z < 0 ? (x < 0 ? 'Old Port' : 'The Flats') : (x < 0 ? 'Coral Heights' : 'Neon Mile');
  }

  block(0, -0.4, 0, 480, 0.7, 480, 0xc79f5f);
  const districts = [
    { name: 'Old Port', x: -120, z: -120, color: 0x679a7f },
    { name: 'The Flats', x: 120, z: -120, color: 0xd18f3e },
    { name: 'Coral Heights', x: -120, z: 120, color: 0x67a34c },
    { name: 'Neon Mile', x: 120, z: 120, color: 0xda7355 }
  ];
  for (const district of districts) {
    block(district.x, -0.025, district.z, 240, 0.08, 240, district.color);
    billboard(district.name.toUpperCase(), district.x, 30, district.z, 40);
  }
  for (let street = -240; street <= 240; street += 60) {
    block(street, 0.02, 0, 18, 0.14, 480, 0xcfa96a);
    block(0, 0.025, street, 480, 0.14, 18, 0xcfa96a);
    block(street, 0.11, 0, 12, 0.08, 480, 0x1f2329);
    block(0, 0.115, street, 480, 0.08, 12, 0x1f2329);
    for (let stripe = -228; stripe < 240; stripe += 12) {
      if (Math.abs(stripe / 60 - Math.round(stripe / 60)) > 0.12) {
        block(street, 0.16, stripe, 0.18, 0.015, 4.5, 0xeee0a1);
        block(stripe, 0.17, street, 4.5, 0.015, 0.18, 0xeee0a1);
      }
    }
  }
  const facadePalettes = {
    'Old Port': [0x64b6ac, 0x8fd0c2, 0x5aa7a0, 0xf2e3c6, 0x7fc4b5],
    'The Flats': [0xe0a458, 0xd9834f, 0xe8bc7a, 0xc96f4a, 0xe5cfa3],
    'Coral Heights': [0xf2a65a, 0xef8354, 0xf7c59f, 0xe76f51, 0xf4a261],
    'Neon Mile': [0xff8fab, 0x7bdff2, 0xb2f7ef, 0xf9c74f, 0xf372b5]
  };
  for (let x = -210; x <= 210; x += 60) {
    for (let z = -210; z <= 210; z += 60) {
      if ((x === -30 && z === 30) || (x < -150 && z < -90) || (x > 150 && z > 0)) continue;
      const district = districtAt(x, z);
      const facades = facadePalettes[district];
      const villa = district === 'Coral Heights';
      const height = villa ? 5 + nextRandom() * 4 : 9 + nextRandom() * (district === 'Neon Mile' ? 30 : 19);
      const width = villa ? 22 : 25 + nextRandom() * 10;
      const depth = villa ? 19 : 25 + nextRandom() * 10;
      if (villa) {
        block(x, 0.25, z, 42, 0.35, 42, 0x8caa77);
        block(x + 14, 0.47, z + 8, 8, 0.1, 14, 0x65c4d2);
        block(x, 0.8, z - 21, 43, 1.3, 0.6, 0xead8bd, true);
        palmTree(x - 16, z + 14);
      }
      block(x, height / 2 + 0.2, z, width, height, depth, facades[Math.floor(nextRandom() * facades.length)], true);
      block(x, height + 0.5, z, width + 1, 0.7, depth + 1, villa ? 0xd67d61 : 0xcf9a68);
      for (let y = 3; y < height - 1; y += 4) {
        for (let offset = -width / 2 + 3; offset < width / 2 - 1; offset += 5) {
          block(x + offset, y, z + depth / 2 + 0.06, 2.1, 1.8, 0.13,
            district === 'Neon Mile' ? 0xff80c9 : 0x466b79, false, district === 'Neon Mile');
          block(x + offset, y, z - depth / 2 - 0.06, 2.1, 1.8, 0.13, 0x7197a4);
        }
      }
      if (district === 'Neon Mile') {
        billboard(['SUNSET CLUB', 'CORAL ARCADE', 'HOTEL HEAT'][Math.floor(nextRandom() * 3)], x, 5.5, z + depth / 2 + 0.3, 19, '#ff80cc');
      }
      if (district === 'The Flats') {
        for (let stall = 0; stall < 2; stall++) {
          const stallX = x - 12 + stall * 15;
          const stallZ = z + 21;
          block(stallX, 1, stallZ, 6, 2, 3, 0xa98155, true);
          block(stallX, 3.3, stallZ, 8, 0.35, 5, stall ? 0xe6b35c : 0xc57881);
          for (const side of [-1, 1]) block(stallX + side * 3, 2.1, stallZ, 0.15, 2.4, 0.15, 0x6a7460);
        }
      }
    }
  }

  // Sand, water and umbrellas along the east side.
  block(221, 0.02, 123, 35, 0.1, 228, 0xf2cf8f);
  block(305, -0.16, 0, 130, 0.12, 700, 0x14919b);
  for (let z = 18; z < 230; z += 23) {
    palmTree(201, z, 8 + nextRandom() * 3);
    placeMesh(new T.ConeGeometry(2.6, 1, 8), z % 2 ? 0xf0aa95 : 0x88c5bc, 223, 2.7, z);
    block(223, 1.2, z, 0.12, 2.4, 0.12, 0xd9c39a);
  }
  // Harbour basin and its repeating dock equipment.
  block(-219, -0.1, -153, 42, 0.1, 169, 0x12768a);
  block(-191, 0.6, -153, 13, 1.2, 168, 0x9a9b8b, true);
  for (const z of [-210, -165, -120]) {
    block(-215, 0.65, z, 44, 1.1, 10, 0x967a59);
    block(-164, 6, z + 8, 25, 12, 25, 0xa1aaa2, true);
    block(-164, 12.3, z + 8, 27, 0.7, 27, 0x637f84);
    block(-195, 12, z - 10, 2, 24, 2, 0xe8b554, true);
    block(-207, 24, z - 10, 27, 1.5, 1.5, 0xe8b554);
    block(-218, 19, z - 10, 0.13, 10, 0.13, 0x424f51);
  }
  const ferryRamp = block(ferryPos.x, 0.6, ferryPos.z, 20, 0.6, 9, 0x90958b);
  ferryRamp.rotation.z = -0.06;
  billboard('PALMSHADE FERRY', -204, 6, -199, 22);

  // Shop forecourt and mission markers.
  block(-30, 0.2, 29, 42, 0.25, 42, 0xcfa96a);
  block(-30, 4.3, 43, 30, 8, 12, 0x55bcb5, true);
  block(-30, 8.7, 43, 32, 0.7, 14, 0xf0cf83);
  block(-30, 3.3, 36.9, 11, 5.5, 0.15, 0x294b59);
  billboard('SHINE SHOP', -30, 10.6, 36, 27, '#ffe184');
  const shopRing = placeMesh(new T.RingGeometry(3.5, 3.8, 40), 0x83f4d3, shineShopPos.x, 0.38, shineShopPos.z, true);
  shopRing.rotation.x = -Math.PI / 2;
  const maraRing = placeMesh(new T.RingGeometry(1.7, 2.1, 24), 0xffce77, maraPos.x, 0.27, maraPos.z, true);
  maraRing.rotation.x = -Math.PI / 2;
  billboard('MARA', maraPos.x, 4, maraPos.z, 7, '#ffd184');
  for (let x = -180; x <= 180; x += 60) {
    for (let z = -180; z <= 180; z += 60) {
      block(x + 8, 3.8, z + 11, 0.2, 7.6, 0.2, 0x566c69);
      block(x + 7, 7.6, z + 11, 2.5, 0.2, 0.5, 0x566c69);
      block(x + 6, 7.45, z + 11, 0.8, 0.12, 0.6, 0xffe4a3, false, true);
      if (z >= 0) palmTree(x + 10, z + 20, 7);
      spawnPoints.push({ x: x + 17, y: 0.2, z: z + 3, heading: Math.PI / 2, district: districtAt(x + 17, z + 3), kind: 'traffic' });
      spawnPoints.push({ x: x - 13, y: 0.2, z: z - 5, heading: -Math.PI / 2, district: districtAt(x - 13, z - 5), kind: 'parked' });
    }
  }
  const fillLight = new T.HemisphereLight(0xffe3b6, 0x59756d, 0.7);
  scene.add(fillLight);
  const sunlight = new T.DirectionalLight(0xffc384, 2.2);
  sunlight.position.set(-160, 190, 80);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 650 });
  scene.add(sunlight);
  scene.background = new T.Color(0xf2a56b);
  scene.fog = new T.Fog(0xf2a56b, 430, 900);
  return {
    root, colliders, shineShopPos, maraPos, ferryPos, districtAt, districts, spawnPoints, labels,
    bounds: { minX: -237, maxX: 237, minZ: -237, maxZ: 237 }, roadSpacing: 60, laneOffset: 3
  };
}
