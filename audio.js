/* Web Audio voice lifecycle. Phase/frequency changes crossfade; amplitude-only changes reuse nodes. */
const periodicWaves = new Map();
function periodicWave(phase) {
  const key = phase.toFixed(12);
  if (periodicWaves.has(key)) return periodicWaves.get(key);
  const wave = audio.createPeriodicWave(
    new Float32Array([0, Math.sin(phase)]),
    new Float32Array([0, Math.cos(phase)]),
    { disableNormalization: true },
  );
  if (periodicWaves.size >= 64)
    periodicWaves.delete(periodicWaves.keys().next().value);
  periodicWaves.set(key, wave);
  return wave;
}
function stopVoice(v) {
  if (!v || v.stopped) return;
  v.stopped = true;
  const now = audio.currentTime;
  v.gain.gain.cancelScheduledValues(now);
  v.gain.gain.setTargetAtTime(0, now, 0.012);
  for (const item of v.items) {
    item.oscillator.onended = () => {
      item.oscillator.disconnect();
      item.gain.disconnect();
    };
    item.oscillator.stop(now + 0.08);
  }
  setTimeout(() => v.gain.disconnect(), 150);
}
function rebuildAudio() {
  if (!playing || !audio) return;
  const tones = wet.filter((t) => t.a >= 1e-10 && t.f < sr / 2),
    signature = tones.map((t) => t.f + ":" + t.p.toFixed(12)).join("|"),
    now = audio.currentTime;
  if (voice && voice.signature === signature && !voice.stopped) {
    tones.forEach((t, i) =>
      voice.items[i].gain.gain.setTargetAtTime(t.a * trim, now, 0.015),
    );
    return;
  }
  const start = now + 0.015,
    group = audio.createGain();
  group.gain.value = 0;
  group.connect(master);
  const items = [];
  for (const t of tones) {
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.setPeriodicWave(periodicWave(t.p));
    oscillator.frequency.value = t.f;
    gain.gain.value = t.a * trim;
    oscillator.connect(gain).connect(group);
    oscillator.start(start);
    items.push({ oscillator, gain });
  }
  group.gain.setTargetAtTime(1, start, 0.012);
  const old = voice;
  voice = { gain: group, items, signature, stopped: false };
  stopVoice(old);
}
