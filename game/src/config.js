// Shared colours for the city and its interface.
export const palette = {
  sun: 0xf6bc68,
  sky: 0x83c9d5,
  sea: 0x3f9da6,
  sand: 0xf0d398,
  coral: 0xef8178,
  mint: 0x8ecab2,
  lilac: 0xb89bd0,
  neonPink: 0xff4fa3,
  neonCyan: 0x43e6e1,
  neonYellow: 0xffdf5d,
  asphalt: 0x55565a,
  concrete: 0xc4bcb0,
  palm: 0x387d61
};

// Keep the district records in their established lookup order.
export const districts = [
  {
    name: 'Old Port', minX: -240, maxX: 0,
    minZ: 0, maxZ: 240, tint: 0xd1a66f
  },
  {
    name: 'Neon Mile', minX: 0, maxX: 240,
    minZ: 0, maxZ: 240, tint: 0x55b9bf
  },
  {
    name: 'Coral Heights', minX: 0, maxX: 240,
    minZ: -240, maxZ: 0, tint: 0xe58f84
  },
  {
    name: 'The Flats', minX: -240, maxX: 0,
    minZ: -240, maxZ: 0, tint: 0x9f88bd
  }
];

export const prices = {
  shinePerStar: 150,
  hospitalFee: 200,
  bustCut: 0.25
};

export const wanted = {
  maxStars: 5,
  spawnCounts: [0, 1, 2, 3, 4, 6],
  decaySeconds: 24,
  bustRange: 9,
  bustRate: 0.22,
  roadblockFrom: 3,
  helicopterFrom: 4
};

export const missionPayouts = [800, 1500, 2500, 4000];
export const startCash = 300;
export const worldSize = 480;
export const roadSpacing = 60;
