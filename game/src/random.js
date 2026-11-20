export function makeRng(seed) {
  let state = Number(seed) >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngInt(rng, lo, hi) {
  const low = Math.ceil(Math.min(lo, hi));
  const high = Math.floor(Math.max(lo, hi));
  return low + Math.floor(rng() * (high - low + 1));
}

export function rngRange(rng, lo, hi) {
  return lo + (hi - lo) * rng();
}

export function rngPick(rng, arr) {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}
