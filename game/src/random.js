let activeGenerator = Math.random;

export function createRng(seed) {
  let accumulator = Number(seed) >>> 0;
  return function rng() {
    accumulator = (accumulator + 0x6d2b79f5) | 0;
    let mixed = accumulator;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function setGameRng(rngOrSeed = Math.random) {
  activeGenerator = typeof rngOrSeed === 'function'
    ? rngOrSeed
    : createRng(rngOrSeed);
  return activeGenerator;
}

export function getGameRng() {
  return activeGenerator;
}

export function range(min, max, rng = activeGenerator) {
  return min + (max - min) * rng();
}

export function int(min, max, rng = activeGenerator) {
  return Math.floor(range(min, max + 1, rng));
}

export function pick(items, rng = activeGenerator) {
  if (!items.length) {
    return undefined;
  }
  return items[int(0, items.length - 1, rng)];
}

export function chance(probability, rng = activeGenerator) {
  return rng() < probability;
}
