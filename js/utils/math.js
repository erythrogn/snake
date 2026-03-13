// js/utils/math.js
export const MathUtil = {
  clamp:   (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  lerp:    (a, b, t)   => a + (b - a) * t,
  dist:    (a, b)      => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2),
  rand:    (lo, hi)    => lo + Math.random() * (hi - lo),
  randInt: (lo, hi)    => Math.floor(lo + Math.random() * (hi - lo + 1)),
  tau:     Math.PI * 2,
  weightedRandom(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) { r -= item.weight; if (r <= 0) return item; }
    return items[items.length - 1];
  },
};
