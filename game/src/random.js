let gameRng = Math.random;

export function createRng(seed) {
  let state = Number(seed) >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function setGameRng(rngOrSeed = Math.random) {
  gameRng = typeof rngOrSeed === 'function' ? rngOrSeed : createRng(rngOrSeed);
  return gameRng;
}

export function getGameRng() {
  return gameRng;
}

export function range(min, max, rng = gameRng) {
  return min + (max - min) * rng();
}

export function int(min, max, rng = gameRng) {
  return Math.floor(range(min, max + 1, rng));
}

export function pick(items, rng = gameRng) {
  if (!items.length) return undefined;
  return items[int(0, items.length - 1, rng)];
}

export function chance(probability, rng = gameRng) {
  return rng() < probability;
}
