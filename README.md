# Overtone — Sound & waves lab

An interactive equalizer and wave-physics lab. Ink-black, amber, and magenta palette. All code runs locally in your browser; no build, account, recording, API key, or external network dependency is needed.

## GitHub Pages

1. Extract the ZIP.
2. Upload the extracted files (not the ZIP or its containing folder) to your repository root. Keep index.html, style.css, model.js, and app.js together.
3. Commit to main.
4. In Settings → Pages choose Deploy from a branch → main → /(root), and save.
5. Wait for deployment, then use the URL shown in Pages settings.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

You can also open index.html locally. Press Listen to enable sound; browser audio requires a user gesture. Start with low device volume. Mobile silent modes and device audio routing can affect playback.

## Try these experiments

- Build a square wave from odd harmonics.
- Hear 3 beats per second from 220 and 223 Hz.
- Cancel two equal tones with a 180-degree phase difference.
- Shape a harmonic-rich source using EQ; compare with bypass.

The page includes equations for traveling waves, Fourier synthesis, beats, phase cancellation, decibels, complex frequency response, and digital biquads, plus definitions and model notes.

## Files

- index.html: interface, lessons, equations, references
- style.css: responsive layout and palette
- model.js: sinusoidal model, phasor summation, RBJ equalizer response
- app.js: controls, visualization, and Web Audio playback
- .nojekyll: serve directly on GitHub Pages

## Model

Six Q=1.2 peaking filters are evaluated in the frequency domain. Their steady-state gain AND phase are applied to the synthesized tones; this is equivalent to filtering those tones after transients have settled. No microphone or music-file processing is included. Plots use the analytic signal, not a live FFT. Playback uses a common oscillator start, crossfades on changes, output-volume control, and conservative amplitude-bound headroom trim. Plot amplitude is untrimmed; audio volume does not change the plots. Harmonic presets are finite eight-term approximations.

Math and gain checks passed for flat EQ, all band-center gains, beats, cancellation, reinforcement, and Fourier presets. Browser checks verified audio startup, volume adjustment, experiments, bypass, and stop with no console errors.

## Listening modes

Rock, Jazz, Soul, Pop, Electronic, Vocal, Flat, and descriptive EQ presets now include explanations, listening cues, trade-offs, and exact band gains. These are illustrative Overtone curves, not standardized genre definitions. presets.js contains the preset data and must be uploaded alongside the other JavaScript files. Editing a band selects Custom curve.

## Typeset equations

Equations are pre-rendered from LaTeX with KaTeX 0.19.1, including accessible MathML and embedded TeX annotations. The vendor/katex folder contains the local stylesheet, fonts, and MIT license. Upload that entire folder with the other files. No CDN or runtime math renderer is required.

## Reading the graphs

The graph guide explains time-domain waveforms, frequency-domain line spectra, the logarithmic frequency axis, amplitude levels in dB, original/processed colors, automatic waveform scaling, and EQ gain versus signal level. A live readout follows the fundamental through the EQ, and a one-click experiment cuts the third harmonic of a 250 Hz source.

## Optimized implementation

Upload audio.js and rendering.js alongside app.js, model.js, and presets.js. Rendering uses cached recurrence sampling, pixel envelopes for dense waveforms, and an animation cap of 30 fps. Static charts update only when inputs change. Animation stops for frozen, hidden, or offscreen plots. Audio reuses oscillators for amplitude-only updates and crossfades phase/frequency changes. Fonts use locally bundled WOFF2. No build step is needed.
