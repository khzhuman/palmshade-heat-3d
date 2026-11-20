export const PALETTE = {
  sky: 0xf6bd82,
  fog: 0xf6bd82,
  sun: 0xffe2a2,
  road: 0x41464b,
  sidewalk: 0xc5b49b,
  curb: 0xf1d1a4,
  buildingA: 0xd58e76,
  buildingB: 0x8c9eaa,
  buildingC: 0xe6c99a,
  buildingD: 0xa5aa8f,
  neonPink: 0xff4f9a,
  neonTeal: 0x36e0cf,
  palmTrunk: 0x8c6244,
  palmLeaf: 0x347e63,
  sand: 0xe9c994,
  water: 0x277b87,
  policeBody: 0xe6e6de,
  policeStripe: 0x283c65,
  playerBody: 0xd65443,
  rivalBody: 0x403d54,
  pedTones: [0xc98062, 0xe2b58a, 0x875946, 0xd8aa91, 0xa96e58]
};

export const DISTRICTS = [
  { name: 'Old Port', x0: -240, z0: -240, x1: 0, z1: 0, tint: 0x9b7964 },
  { name: 'Neon Mile', x0: 0, z0: -240, x1: 240, z1: 0, tint: 0x7ca8a5 },
  { name: 'Coral Heights', x0: -240, z0: 0, x1: 0, z1: 240, tint: 0xc88f78 },
  { name: 'The Flats', x0: 0, z0: 0, x1: 240, z1: 240, tint: 0xa5a08a }
];

export const CITY = { size: 480, roadEvery: 60, laneOffset: 4, blockInset: 8 };

export const WANTED_TUNING = {
  maxStars: 5,
  bustRange: 9,
  bustFillSeconds: 3.5,
  decaySecondsPerStar: 14,
  heliAtStars: 4,
  roadblockAtStars: 3
};

export const PAYOUTS = { 1: 800, 2: 1500, 3: 2500, 4: 4000 };

export const PRICES = { clearPerStar: 150, bustCut: 0.25, hospitalFee: 200 };
