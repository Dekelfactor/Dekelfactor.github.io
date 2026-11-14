  // =====================================================================
  //  SCORE — D major, 120 BPM. The arc: near silence (asleep) -> lamp click, a soft pad, the hero's rising fifth ->
  //  plucks and scissor snips (cut) -> the fullest 16th groove (build) -> dead stop at 14.5 (the hold) ->
  //  the loudest hit at 15.5 (launch): stab + sub, then a flat chord -> warm and fading (home), the motif once more.
  // =====================================================================
  const T = TIMELINE, cu = T.cues, R = RNG('score');
  const FIG = [['D4', 'A4', 'Fs4', 'A4', 'D5', 'A4', 'Fs4', 'A4'], ['B3', 'Fs4', 'D4', 'Fs4', 'B4', 'Fs4', 'D4', 'Fs4'],
    ['G4', 'B4', 'D5', 'B4', 'G5', 'D5', 'B4', 'D5'], ['A4', 'Cs5', 'E5', 'Cs5', 'A5', 'E5', 'Cs5', 'E5']];
  const ROOT = ['D2', 'B1', 'G2', 'A2'];
  const motif = (t, vel, notes = [['D4', 0], ['A4', E8]]) => notes.forEach(([n, dt], i) => pluck(t + dt, nz(n), vel, 0.1 - i * 0.1, 0.6, 2600, 0.35));
  const each = (t0, t1, step, fn) => { for (let k = 0; t0 + k * step < t1 - 1e-6; k++) fn(t0 + k * step, k); };

  // ================= MUSIC =================
  to = 'm';
  // 1. asleep: only a faint low drone; the lamp clicks on, a soft pad arrives, the hero's motif when it wakes
  drone(0.0, 1.6, nz('D2'), 0.012, { att: 0.5, rel: 0.2 });
  pad(cu.lamp, 6.0, ['D3', 'A3', 'Fs4'], 0.022, { type: 'triangle', cut: 800, att: 0.4, rel: 0.3 });
  motif(cu.ray5, 0.2);
  each(cu.sketch0, 5.5, BEAT, (t, k) => pluck(t, nz(FIG[0][(k * 2) % 8]), 0.035, Math.sin(k) * 0.3, 0.5, 2200, 0.3));
  // 2. cut: 8th plucks over a pad, a bass on the beat
  pad(6.0, 10.5, ['B2', 'Fs3', 'D4'], 0.022, { cut: 900, att: 0.25, rel: 0.2, send: 0.3 });
  each(6.0, 10.5, E8, (t, k) => {
    const bar = Math.floor(k / 8) % 4;
    pluck(t, nz(FIG[bar][k % 8]), 0.042 * (k % 2 ? 0.75 : 1), Math.sin(k * 0.9) * 0.3, 0.32, 3000, 0.2);
    if (k % 2 === 0) bass(t, nz(ROOT[bar]), 0.11);
  });
  // 3. build: the fullest, a 16th groove that thickens on every cue; dry in its last beat, dead stop at the hold
  pad(10.5, cu.hold, ['D3', 'A3', 'E4', 'A4'], 0.02, { cut: 1300, att: 0.2, rel: 0.02, send: 0.1 });
  each(10.5, cu.hold, E16, (t, k) => {
    const bar = Math.floor(k / 16) % 4, fig = FIG[bar], acc = k % 4 === 0 ? 1.25 : k % 2 === 0 ? 1.0 : 0.75, dry = t >= cu.hold - BEAT ? 0.02 : 0.14;
    const dens = t < cu.cards ? k % 2 === 0 : true;
    if (dens) pluck(t, nz(fig[(k >> 1) % 8]), 0.038 * acc, Math.sin(k * 0.9) * 0.35, t >= cu.hold - E8 ? 0.15 : 0.28, 3800 + (t - 10.5) * 300, dry);
    if (k % 4 === 0) bass(t, nz(ROOT[bar]), 0.12);
    if (k % 8 === 0 && t >= cu.hero) sub(t, 0.045);
    if (k % 2 === 1 && t >= cu.cards) noiseHit(t, 0.016, 'highpass', 8500, 0.7, 0.02, k % 4 === 1 ? 0.3 : -0.3);
  });
  // 4. the hold: silence (nothing sounds from 14.5 to 15.5)
  // 5. launch: the stab + a sub on the hit, then a flat warm chord and a few bright notes as the confetti falls
  ['D3', 'A3', 'D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => pluck(cu.slam + i * 0.006, nz(n), 0.38, (i - 2.5) * 0.15, 0.7, 5200, 0.4));
  pad(cu.slam, cu.slam + 0.4, ['D3', 'A3', 'D4', 'Fs4', 'A4', 'D5'], 0.5, { cut: 3600, att: 0.008, rel: 0.35, send: 0.3 });
  pad(16.0, 18.1, ['D3', 'A3', 'D4', 'Fs4', 'A4'], 0.034, { cut: 1300, att: 0.25, rel: 0.4, send: 0.5 });
  drone(16.0, 18.1, nz('D2'), 0.045, { att: 0.12, rel: 0.4 });
  [[16.25, 'A5'], [16.5, 'Fs5'], [16.75, 'D6'], [17.0, 'A5'], [17.25, 'E5']].forEach(([t, n], i) => pluck(t, nz(n), 0.025, (i - 2) * 0.2, 0.5, 4200, 0.4));
  sub(cu.slam, 0.3);
  // 6. home: back to the opening pad, warmer; the motif one last time on the title, fading out
  pad(18.0, 20.0, ['D3', 'A3', 'Fs4', 'A4'], 0.011, { type: 'triangle', cut: 900, att: 0.3, rel: 0.6 });
  motif(cu.title, 0.07, [['D4', 0], ['A4', E8], ['D5', BEAT]]);

  // ================= SFX =================
  to = 's';
  noiseHit(cu.lamp, 0.03, 'bandpass', 2400, 2, 0.12, 0.3);                                     // the lamp switch
  for (let t = cu.sketch0; t < cu.sketch1 - 1e-6; t += E16) noiseHit(t + 0.01, 0.1, 'bandpass', 2800 + R.n(500), 1.4, 0.022 * (0.7 + R.f() * 0.5), -0.1);   // pencil
  [0, 0.5, 1.0].forEach((d) => blip(cu.notes + d, 900, 1300, 0.06, 0.05, 0.2));                // sticky notes pop
  for (let t = cu.snip0; t < cu.snip1 - 1e-6; t += E8) noiseHit(t, 0.045, 'highpass', 5200, 1.2, 0.05, 0.15);   // scissor snips on the 8ths
  blip(cu.lift, 600, 1200, 0.12, 0.06, 0);                                                       // the badge lifts
  [cu.nav, cu.hero, cu.cards, cu.cards + 0.25].forEach((t, i) => blip(t, 700 + i * 150, 1100 + i * 150, 0.05, 0.05, (i - 1.5) * 0.2));   // screens pop in
  blip(cu.click, 1800, 2400, 0.03, 0.07, 0.2);                                                   // the click
  [5.6, 10.1, 17.6].forEach((t) => sweep(t, t + 0.4, t > 17 ? 0.005 : 0.011, 500, 2600, 0));                       // paper swishes into the morphs
  chime(cu.slam + 0.05, [nz('D6'), nz('A6')], 0.03, 0);                                          // sparkle on the sign
