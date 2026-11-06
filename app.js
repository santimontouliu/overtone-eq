const elementCache = new Map();
const $ = (id) => {
  if (!elementCache.has(id)) elementCache.set(id, document.getElementById(id));
  return elementCache.get(id);
};
let state = {
  f: 220,
  ...sourcePreset("sine"),
  gains: Array(6).fill(0),
  second: false,
  detune: 3,
  secondAmp: 1,
  phase: 0,
  bypass: false,
};
let selectedEQ = "flat";
let sr = 48000,
  dry = [],
  wet = [],
  processed = [],
  trim = 0.15,
  audio = null,
  master = null,
  voice = null,
  playing = false,
  busy = false,
  frozen = false,
  visualTime = 0,
  rebuildTimer = null;

$("harmonics").innerHTML = state.amps
  .map(
    (a, i) =>
      `<div class="fader"><output id="aOut${i}">${a.toFixed(2)}</output><input aria-label="Harmonic ${i + 1} amplitude" id="a${i}" type="range" min="0" max="1" step="0.01" value="${a}"><label for="a${i}">H${i + 1}</label><small id="hz${i}"></small></div>`,
  )
  .join("");
$("bands").innerHTML = CENTERS.map(
  (f, i) =>
    `<div class="fader"><output id="gOut${i}">0 dB</output><input aria-label="${f} Hz equalizer gain in decibels" id="g${i}" type="range" min="-12" max="12" step="0.5" value="0"><label for="g${i}">${f >= 1000 ? f / 1000 + "k" : f} Hz</label></div>`,
).join("");

const sourceButtons = [...document.querySelectorAll("[data-source]")];
const eqButtons = [...document.querySelectorAll("[data-eq]")];
const eqPresets = Object.fromEntries(
  Object.entries(PRESETS).map(([k, v]) => [k, v.gains]),
);

function update() {
  updatePresetExplanation();
  dry = sourceTones(state);
  processed = filteredTones(dry, state.gains, sr);
  wet = state.bypass ? dry : processed;
  updateGraphExample();
  const bound = Math.max(
    dry.reduce((s, t) => s + t.a, 0),
    processed.reduce((s, t) => s + t.a, 0),
  );
  trim = Math.min(0.15, 0.8 / Math.max(bound, 1));
  $("fundOut").textContent = state.f + " Hz";
  $("detuneOut").textContent = (state.detune >= 0 ? "+" : "") + state.detune + " Hz";
  $("secondAmpOut").textContent = state.secondAmp.toFixed(2);
  $("phaseOut").textContent = state.phase + "°";
  state.amps.forEach((a, i) => {
    $("aOut" + i).textContent = a.toFixed(2);
    $("hz" + i).textContent =
      state.f * (i + 1) + " Hz" + (state.phases[i] === Math.PI ? " · π" : "");
  });
  state.gains.forEach(
    (g, i) => ($("gOut" + i).textContent = (g > 0 ? "+" : "") + g.toFixed(1) + " dB"),
  );
  $("period").textContent = (1000 / state.f).toFixed(2) + " ms";
  $("wavelength").textContent = (343 / state.f).toFixed(3) + " m";
  $("beats").textContent = state.second ? Math.abs(state.detune) + " Hz" : "—";
  $("trim").textContent = (20 * Math.log10(trim)).toFixed(1) + " dB";
  $("responseStatus").textContent = state.bypass ? "Bypassed · flat response" : "EQ active";
  $("interference").textContent = !state.second
    ? "Enable the second wave to explore beats and cancellation."
    : state.detune === 0
      ? "Same frequency: amplitude and relative phase determine reinforcement or cancellation."
      : `Second tone: ${state.f + state.detune} Hz. The fundamental pair beats at ${Math.abs(state.detune)} Hz.`;
  invalidatePlots();
  if (playing && !rebuildTimer) {
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      rebuildAudio();
    }, 50);
  }
}

const scalarBindings = [
  ["fundamental", "f"],
  ["detune", "detune"],
  ["secondAmp", "secondAmp"],
  ["phase", "phase"],
];

function sync() {
  for (const [id, key] of scalarBindings) $(id).value = state[key];
  $("second").checked = state.second;
  $("bypass").checked = state.bypass;
  state.amps.forEach((a, i) => ($("a" + i).value = a));
  state.gains.forEach((g, i) => ($("g" + i).value = g));
  update();
}

for (const [id, key] of scalarBindings)
  $(id).oninput = () => {
    state[key] = +$(id).value;
    update();
  };
for (let i = 0; i < 8; i++)
  $("a" + i).oninput = () => {
    state.amps[i] = +$("a" + i).value;
    sourceButtons.forEach((b) => b.classList.remove("selected"));
    update();
  };
for (let i = 0; i < 6; i++)
  $("g" + i).oninput = () => {
    state.gains[i] = +$("g" + i).value;
    selectedEQ = null;
    update();
  };
for (const id of ["second", "bypass"])
  $(id).onchange = () => {
    state[id] = $(id).checked;
    update();
  };

function setSource(name) {
  Object.assign(state, sourcePreset(name));
  sourceButtons.forEach((b) => b.classList.toggle("selected", b.dataset.source === name));
}
sourceButtons.forEach((b) => (b.onclick = () => { setSource(b.dataset.source); sync(); }));
$("resetSource").onclick = () => {
  setSource("sine");
  Object.assign(state, { f: 220, second: false, detune: 3, phase: 0, secondAmp: 1 });
  sync();
};
$("flat").onclick = () => applyEQ("flat");

function applyEQ(key) {
  selectedEQ = key;
  state.gains = [...PRESETS[key].gains];
  state.bypass = false;
  sync();
}
eqButtons.forEach((b) => (b.onclick = () => applyEQ(b.dataset.eq)));

function updatePresetExplanation() {
  const preset = PRESETS[selectedEQ];
  $("presetName").textContent = preset ? preset.name : "Custom curve";
  $("presetWhy").textContent = preset
    ? preset.why
    : "You have edited the band gains. This is your own tonal balance, rather than a named preset.";
  $("presetHear").textContent = preset
    ? preset.hear
    : "Compare with bypass and listen for the effect of the bands you changed.";
  $("presetTrade").textContent = preset
    ? preset.trade
    : "Boosts affect all components near a band; larger boosts also use more playback headroom.";
  $("presetState").textContent = state.bypass
    ? "EQ is bypassed. These settings are saved but not applied."
    : "EQ is active. Selecting a mode changes only the EQ, not the source.";
  $("presetValues").textContent = CENTERS.map(
    (f, i) => `${f >= 1000 ? f / 1000 + "k" : f} Hz: ${state.gains[i] > 0 ? "+" : ""}${state.gains[i]} dB`,
  ).join(" · ");
  eqButtons.forEach((b) => {
    const active = b.dataset.eq === selectedEQ;
    b.classList.toggle("selected", active);
    b.setAttribute("aria-pressed", String(active));
  });
}

const lessons = {
  harmonics:
    "Listen to the odd-harmonic mixture. Lower H3, H5, or H7 one at a time. The finite sum has rounded edges and ringing; additional harmonics sharpen the transitions.",
  beats:
    "Press Listen. Two nearby tones produce 3 beats per second. Move Δf toward zero: the pulse slows, then becomes a steady tone. Use the 1 s view to see the envelope.",
  cancel:
    "The source is now two equal 220 Hz waves, 180° apart: their sum is zero. Sweep phase toward 0° to restore the signal. This is ideal mathematical cancellation.",
  filter:
    "Toggle Bypass EQ while listening. The harmonic balance changes, but f₀ remains 220 Hz. Now try boosting 12 kHz: there is no source component near that band center.",
};
document.querySelectorAll("[data-experiment]").forEach(
  (b) =>
    (b.onclick = () => {
      const mode = b.dataset.experiment;
      selectedEQ = mode === "filter" ? "bright" : "flat";
      Object.assign(state, {
        f: 220,
        second: mode === "beats" || mode === "cancel",
        detune: mode === "cancel" ? 0 : 3,
        phase: mode === "cancel" ? 180 : 0,
        secondAmp: 1,
        bypass: false,
        gains: mode === "filter" ? [...eqPresets.bright] : Array(6).fill(0),
      });
      setSource(mode === "harmonics" ? "square" : mode === "filter" ? "saw" : "sine");
      $("window").value = mode === "beats" ? "1" : "0.04";
      $("lesson").textContent = lessons[mode];
      sync();
    }),
);

$("play").onclick = async () => {
  if (busy) return;
  busy = true;
  try {
    if (playing) {
      playing = false;
      clearTimeout(rebuildTimer);
      rebuildTimer = null;
      stopVoice(voice);
      voice = null;
      $("play").textContent = "▶ Listen";
      $("audioStatus").textContent = "Sound off · plots are active";
    } else {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) throw Error("Web Audio is not available in this browser.");
      if (!audio) {
        audio = new C();
        sr = audio.sampleRate;
        master = audio.createGain();
        master.gain.value = +$("volume").value / 100;
        master.connect(audio.destination);
      }
      await audio.resume();
      if (audio.state !== "running")
        throw Error("Audio is paused by the browser. Try Listen again.");
      update();
      playing = true;
      rebuildAudio();
      $("play").textContent = "■ Stop sound";
      $("audioStatus").textContent = `Sound on · ${sr / 1000} kHz synthesis`;
    }
  } catch (e) {
    playing = false;
    $("audioStatus").textContent = e.message;
    $("play").textContent = "▶ Listen";
  } finally {
    busy = false;
  }
};
$("volume").oninput = () => {
  $("volumeOut").textContent = $("volume").value + "%";
  if (master)
    master.gain.setTargetAtTime(+$("volume").value / 100, audio.currentTime, 0.02);
};
$("freeze").onclick = () => {
  frozen = !frozen;
  $("freeze").textContent = frozen ? "Resume plots" : "Freeze plots";
  schedulePlots();
};
window.addEventListener("pagehide", () => {
  playing = false;
  clearTimeout(rebuildTimer);
  rebuildTimer = null;
  stopVoice(voice);
  voice = null;
  if (audio) audio.suspend();
  $("play").textContent = "▶ Listen";
  $("audioStatus").textContent = "Sound off · plots are active";
  stopPlotLoop();
});
window.addEventListener("pageshow", () => invalidatePlots());

function updateGraphExample() {
  const input = dry.find((t) => t.f === state.f),
    output = wet.find((t) => t.f === state.f);
  if (!input || input.a < 1e-10) {
    $("graphExample").textContent =
      `Current fundamental: no resultant component at ${state.f} Hz. It is absent or cancelled; EQ cannot create it.`;
    return;
  }
  const before = 20 * Math.log10(input.a),
    after = 20 * Math.log10(output.a),
    gain = after - before;
  $("graphExample").textContent =
    `Follow your fundamental at ${state.f} Hz: original ${before.toFixed(2)} dB + combined EQ ${gain.toFixed(2)} dB = output ${after.toFixed(2)} dB. Peak amplitude: ${input.a.toFixed(3)} → ${output.a.toFixed(3)}. ` +
    (state.bypass ? "Bypass is on." : "Levels are before playback volume and headroom trim.");
}
$("graphDemo").onclick = () => {
  setSource("square");
  Object.assign(state, { f: 250, second: false, bypass: false, gains: [0, 0, -12, 0, 0, 0] });
  selectedEQ = null;
  $("window").value = "0.04";
  $("lesson").textContent =
    "Compare the amber 750 Hz line against the original. Its amplitude is reduced by a factor of about 4 at the band center. Toggle bypass to compare the waveform; the fundamental remains 250 Hz.";
  sync();
};
