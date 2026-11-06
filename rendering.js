/* Canvas rendering. Static plots are invalidated by inputs; animation is capped at 30 fps. */
const canvases = ["wave", "spectrum", "response"].map((id) => $(id));
const contexts = new Map(canvases.map((c) => [c.id, c.getContext("2d")]));
const visiblePlots = new Set(canvases.map((c) => c.id));
let dirty = { wave: true, spectrum: true, response: true },
  rafId = 0,
  frameTimer = 0,
  previousTime = 0,
  responseKey = [sr, state.bypass, ...state.gains].join(","),
  responseCache = null,
  waveKey = "",
  wavePlans = [];

function stopPlotLoop() {
  cancelAnimationFrame(rafId);
  clearTimeout(frameTimer);
  rafId = 0;
  frameTimer = 0;
  previousTime = 0;
}

function schedulePlots() {
  stopPlotLoop();
  if (
    !document.hidden &&
    [...visiblePlots].some((id) => dirty[id] || (id === "wave" && !frozen))
  )
    rafId = requestAnimationFrame(frame);
}

function invalidatePlots() {
  dirty.wave = true;
  dirty.spectrum = true;
  const key = [sr, state.bypass, ...state.gains].join(",");
  if (key !== responseKey) {
    responseKey = key;
    dirty.response = true;
    responseCache = null;
  }
  waveKey = "";
  schedulePlots();
}

const resizeObserver = new ResizeObserver((entries) => {
  for (const { target: c } of entries) {
    const b = c.getBoundingClientRect(),
      d = devicePixelRatio || 1,
      width = Math.round(b.width * d),
      height = Math.round(b.height * d);
    if (c.width !== width || c.height !== height) {
      c.width = width;
      c.height = height;
      dirty[c.id] = true;
    }
  }
  schedulePlots();
});
canvases.forEach((c) => resizeObserver.observe(c));

document.addEventListener(
  "contentvisibilityautostatechange",
  (event) => {
    const t = event.target,
      c = t && (t.tagName === "CANVAS" ? t : t.querySelector && t.querySelector("canvas"));
    if (c && dirty[c.id] !== undefined) {
      if (event.skipped) visiblePlots.delete(c.id);
      else visiblePlots.add(c.id);
      schedulePlots();
    }
  },
  { capture: true },
);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visiblePlots.add(e.target.id);
        else visiblePlots.delete(e.target.id);
      }
      schedulePlots();
    },
    { rootMargin: "200px" },
  );
  canvases.forEach((c) => observer.observe(c));
}

document.addEventListener("visibilitychange", schedulePlots);
$("window").onchange = () => {
  dirty.wave = true;
  waveKey = "";
  schedulePlots();
};

function plot(id) {
  const c = $(id),
    ctx = contexts.get(id),
    d = devicePixelRatio || 1,
    w = c.width / d,
    h = c.height / d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.font = "9px monospace";
  return { ctx, w, h, L: 42, R: w - 18, T: 20, B: h - 27 };
}

function grid(p) {
  const { ctx, L, R, T, B } = p;
  ctx.strokeStyle = "#34313b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let j = 0; j <= 4; j++) {
    const y = T + ((B - T) * j) / 4;
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#aaa6b0";
}

function drawWave() {
  const p = plot("wave");
  grid(p);
  const { ctx, L, R, T, B } = p,
    windowT = +$("window").value,
    ym = (T + B) / 2;
  const scale = Math.max(
    0.1,
    ...[dry, wet].map((ts) => ts.reduce((a, t) => a + t.a, 0)),
  );
  const key = [
    windowT,
    ...dry.flatMap((t) => [t.f, t.a, t.p]),
    ...wet.flatMap((t) => [t.f, t.a, t.p]),
  ].join(",");
  if (key !== waveKey) {
    waveKey = key;
    const highest = Math.max(
      1,
      ...dry.filter((t) => t.a > 1e-12).map((t) => t.f),
      ...wet.filter((t) => t.a > 1e-12).map((t) => t.f),
    );
    const count = Math.max(1200, Math.ceil(windowT * highest * 8));
    wavePlans = [
      makeSamplePlan(dry, windowT, count),
      makeSamplePlan(wet, windowT, count),
    ];
  }
  ctx.fillText("+" + scale.toFixed(1), 3, T + 4);
  ctx.fillText("0", 21, ym + 3);
  ctx.fillText("−" + scale.toFixed(1), 3, B + 3);
  for (let j = 0; j <= 4; j++) {
    const x = L + ((R - L) * j) / 4;
    ctx.fillText(((windowT * 1000 * j) / 4).toFixed(0) + " ms", x - 13, B + 18);
  }
  for (let k = 0; k < 2; k++) {
    const samples = fillSamplePlan(wavePlans[k], visualTime),
      N = samples.length - 1,
      pixels = Math.max(1, Math.floor(R - L));
    ctx.strokeStyle = k ? "#ffbd66" : "#8c83a0";
    ctx.lineWidth = k ? 1.6 : 1;
    ctx.beginPath();
    if (N <= pixels * 3) {
      for (let i = 0; i <= N; i++) {
        const x = L + ((R - L) * i) / N,
          y = ym - (samples[i] / scale) * (B - T) * 0.46;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    } else {
      for (let px = 0; px < pixels; px++) {
        let lo = Infinity,
          hi = -Infinity;
        const end = Math.min(N + 1, Math.ceil(((px + 1) * (N + 1)) / pixels));
        for (let i = Math.floor((px * (N + 1)) / pixels); i < end; i++) {
          if (samples[i] < lo) lo = samples[i];
          if (samples[i] > hi) hi = samples[i];
        }
        const x = L + px;
        ctx.moveTo(x, ym - (hi / scale) * (B - T) * 0.46);
        ctx.lineTo(x, ym - (lo / scale) * (B - T) * 0.46);
      }
    }
    ctx.stroke();
  }
}

const LOG1000 = Math.log(1000);
const freqX = (f, L, R) => L + (Math.log(f / 20) / LOG1000) * (R - L);

function frequencyLabels(p) {
  p.ctx.fillStyle = "#aaa6b0";
  for (const f of [20, 100, 1000, 10000, 20000]) {
    const x = freqX(f, p.L, p.R);
    p.ctx.fillText(f >= 1000 ? f / 1000 + "k" : f, x - 10, p.B + 18);
  }
}

function drawSpectrum() {
  const p = plot("spectrum");
  grid(p);
  const { ctx, L, R, T, B } = p;
  frequencyLabels(p);
  for (let j = 0; j <= 4; j++)
    ctx.fillText(String(24 - j * 21), 9, T + ((B - T) * j) / 4 + 3);
  for (const [ts, color, offset] of [
    [dry, "#8c83a0", -2],
    [wet, "#ffbd66", 2],
  ]) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const t of ts) {
      if (t.a < 1e-6) continue;
      const db = 20 * Math.log10(t.a),
        x = freqX(t.f, L, R) + offset,
        y = B - ((Math.max(-60, Math.min(24, db)) + 60) / 84) * (B - T);
      ctx.moveTo(x, B);
      ctx.lineTo(x, y);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    ctx.stroke();
  }
  if (wet.every((t) => t.a < 1e-10)) {
    ctx.fillStyle = "#ffbd66";
    ctx.fillText("Silence — zero resultant amplitude", L + 10, T + 20);
  }
}

function drawResponse() {
  const p = plot("response");
  grid(p);
  const { ctx, L, R, T, B } = p;
  frequencyLabels(p);
  for (let j = 0; j <= 4; j++)
    ctx.fillText(String(24 - j * 12), 9, T + ((B - T) * j) / 4 + 3);
  if (!responseCache) {
    responseCache = new Float64Array(251);
    if (!state.bypass) {
      for (let i = 0; i <= 250; i++)
        responseCache[i] =
          20 * Math.log10(responseAt(20 * 1000 ** (i / 250), state.gains, sr).mag);
    }
  }
  ctx.strokeStyle = "#f57ad6";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i <= 250; i++) {
    const y =
        B - ((Math.max(-24, Math.min(24, responseCache[i])) + 24) / 48) * (B - T),
      x = L + ((R - L) * i) / 250;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function frame(now) {
  rafId = 0;
  if (document.hidden) return;
  const animate = !frozen && visiblePlots.has("wave");
  if (animate) {
    if (previousTime)
      visualTime += Math.min((now - previousTime) / 1000, 0.1) * 0.07;
    dirty.wave = true;
  }
  previousTime = now;
  for (const [id, draw] of [
    ["wave", drawWave],
    ["spectrum", drawSpectrum],
    ["response", drawResponse],
  ])
    if (dirty[id] && visiblePlots.has(id)) {
      draw();
      dirty[id] = false;
    }
  if (animate)
    frameTimer = setTimeout(() => {
      frameTimer = 0;
      rafId = requestAnimationFrame(frame);
    }, 1000 / 30);
}
sync();
