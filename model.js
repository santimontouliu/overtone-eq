/* Steady-state sinusoidal model. RBJ peaking EQ, Q=1.2. */
const CENTERS = [80, 250, 750, 2000, 5000, 12000];
let coeffKey = "",
  coeffCache = new Float64Array(30),
  activeBands = 0;

function getBiquadCoeffs(gains, sr) {
  const key = sr + ":" + gains.join(",");
  if (key === coeffKey) return coeffCache;
  coeffKey = key;
  activeBands = 0;
  for (let j = 0; j < gains.length; j++) {
    if (Math.abs(gains[j]) < 1e-12) continue;
    const A = 10 ** (gains[j] / 40),
      w0 = (2 * Math.PI * CENTERS[j]) / sr,
      cosW0 = Math.cos(w0),
      alpha = Math.sin(w0) / 2.4,
      invA0 = 1 / (1 + alpha / A),
      base = activeBands++ * 5;
    coeffCache[base] = (1 + alpha * A) * invA0;
    coeffCache[base + 1] = -2 * cosW0 * invA0;
    coeffCache[base + 2] = (1 - alpha * A) * invA0;
    coeffCache[base + 3] = coeffCache[base + 1];
    coeffCache[base + 4] = (1 - alpha / A) * invA0;
  }
  return coeffCache;
}

function responseAt(f, gains, sr = 48000) {
  const coeffs = getBiquadCoeffs(gains, sr);
  if (activeBands === 0) return { mag: 1, phase: 0 };
  const w = (2 * Math.PI * f) / sr,
    cw = Math.cos(w),
    sw = Math.sin(w),
    c2w = 2 * cw * cw - 1,
    s2w = 2 * sw * cw;
  let re = 1,
    im = 0;
  for (let j = 0; j < activeBands; j++) {
    const base = j * 5,
      b0 = coeffs[base],
      b1 = coeffs[base + 1],
      b2 = coeffs[base + 2],
      a1 = coeffs[base + 3],
      a2 = coeffs[base + 4];
    const nr = b0 + b1 * cw + b2 * c2w,
      ni = -b1 * sw - b2 * s2w,
      dr = 1 + a1 * cw + a2 * c2w,
      di = -a1 * sw - a2 * s2w,
      d = dr * dr + di * di,
      rr = (nr * dr + ni * di) / d,
      ii = (ni * dr - nr * di) / d,
      nextRe = re * rr - im * ii;
    im = re * ii + im * rr;
    re = nextRe;
  }
  return { mag: Math.hypot(re, im), phase: Math.atan2(im, re) };
}

function mergeTones(tones) {
  const map = new Map();
  for (const t of tones) {
    let z = map.get(t.f);
    if (!z) {
      z = { re: 0, im: 0 };
      map.set(t.f, z);
    }
    if (t.a !== 0) {
      z.re += t.a * Math.cos(t.p);
      z.im += t.a * Math.sin(t.p);
    }
  }
  return [...map].map(([f, z]) => {
    const mag = Math.hypot(z.re, z.im);
    return { f, a: mag < 1e-12 ? 0 : mag, p: Math.atan2(z.im, z.re) };
  });
}

function sourceTones(state) {
  const tones = state.amps.map((a, i) => ({
    f: state.f * (i + 1),
    a,
    p: state.phases[i],
  }));
  if (state.second)
    tones.push({
      f: state.f + state.detune,
      a: state.secondAmp,
      p: (state.phase * Math.PI) / 180,
    });
  return mergeTones(tones);
}

function filteredTones(tones, gains, sr) {
  return tones.map((t) => {
    if (t.a === 0) return { ...t, a: 0 };
    const h = responseAt(t.f, gains, sr);
    return { ...t, a: t.a * h.mag, p: t.p + h.phase };
  });
}

function sample(tones, t) {
  let sum = 0;
  for (let i = 0; i < tones.length; i++) {
    const o = tones[i];
    if (o.a !== 0) sum += o.a * Math.sin(2 * Math.PI * o.f * t + o.p);
  }
  return sum;
}

function sourcePreset(name) {
  const amps = Array(8).fill(0),
    phases = Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    const n = i + 1;
    if (name === "sine") amps[i] = i === 0 ? 1 : 0;
    if (name === "square") amps[i] = n % 2 ? 1 / n : 0;
    if (name === "saw") amps[i] = 1 / n;
    if (name === "triangle") {
      amps[i] = n % 2 ? 1 / n ** 2 : 0;
      phases[i] = n % 4 === 3 ? Math.PI : 0;
    }
  }
  return { amps, phases };
}

/* Uniform samples by angle-addition recurrence: no trigonometry in the sample loop. */
function makeSamplePlan(tones, duration, count) {
  return {
    count,
    duration,
    values: new Float64Array(count + 1),
    tones: tones
      .filter((t) => t.a > 1e-12)
      .map((t) => {
        const delta = (2 * Math.PI * t.f * duration) / count;
        return { ...t, cosDelta: Math.cos(delta), sinDelta: Math.sin(delta) };
      }),
  };
}

function fillSamplePlan(plan, start) {
  const values = plan.values;
  values.fill(0);
  for (const t of plan.tones) {
    const phase = 2 * Math.PI * t.f * start + t.p;
    let sin = Math.sin(phase),
      cos = Math.cos(phase);
    for (let i = 0; i <= plan.count; i++) {
      values[i] += t.a * sin;
      const next = sin * t.cosDelta + cos * t.sinDelta;
      cos = cos * t.cosDelta - sin * t.sinDelta;
      sin = next;
    }
  }
  return values;
}
