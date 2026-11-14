  // =====================================================================
  //  SCORE — Video A. Without: A minor, a thin nervous pulse, ticks under the clock, dead stop at 'Not tonight'.
  //  With: D major, a warm 16th groove that builds to the stage. The turn drops back; a glass chime on the promise.
  //  How: a steady groove, a tick per step; dry at 34.75, silence 35-36; the loudest hit on DM me APP.
  // =====================================================================
  const T = TIMELINE, cu = T.cues, R = RNG('scoreA');
  const each = (t0, t1, step, fn) => { for (let k = 0; t0 + k * step < t1 - 1e-6; k++) fn(t0 + k * step, k); };
  const FIG = [['D4', 'A4', 'Fs4', 'A4', 'D5', 'A4', 'Fs4', 'A4'], ['B3', 'Fs4', 'D4', 'Fs4', 'B4', 'Fs4', 'D4', 'Fs4'],
    ['G4', 'B4', 'D5', 'B4', 'G5', 'D5', 'B4', 'D5'], ['A4', 'Cs5', 'E5', 'Cs5', 'A5', 'E5', 'Cs5', 'E5']];
  const ROOT = ['D2', 'B1', 'G2', 'A2'];

  // ================= MUSIC =================
  to = 'm';
  // cold open + without: a low drone, a thin minor pulse on the beat
  drone(0.0, 9.05, nz('A1'), 0.03, { att: 0.8, rel: 0.1 });
  pad(0.0, 9.0, ['A2', 'E3', 'C4'], 0.018, { type: 'triangle', cut: 600, att: 1.0, rel: 0.05 });
  each(cu.b_scroll, 9.0, BEAT, (t, k) => pluck(t, nz(['A3', 'C4', 'E4', 'C4'][k % 4]), 0.04, Math.sin(k) * 0.2, 0.25, 1800, 0.15));
  // not tonight: near silence 9.0-11.0, then the rewind
  // with: the warm groove builds to the stage
  pad(cu.a_scan, 19.55, ['D3', 'A3', 'Fs4'], 0.022, { cut: 1100, att: 0.3, rel: 0.3, send: 0.3 });
  each(cu.a_scan, 19.5, E16, (t, k) => {
    const bar = Math.floor(k / 16) % 4, acc = k % 4 === 0 ? 1.25 : k % 2 === 0 ? 1.0 : 0.75, dens = t < cu.a_next ? k % 2 === 0 : true;
    if (dens) pluck(t, nz(FIG[bar][(k >> 1) % 8]), 0.036 * acc, Math.sin(k * 0.9) * 0.35, 0.28, 3200 + (t - 11.5) * 250, 0.16);
    if (k % 4 === 0) bass(t, nz(ROOT[bar]), 0.12);
    if (k % 8 === 0 && t >= cu.a_queue) sub(t, 0.04);
    if (k % 2 === 1 && t >= cu.a_next) noiseHit(t, 0.016, 'highpass', 8500, 0.7, 0.018, k % 4 === 1 ? 0.3 : -0.3);
  });
  // the turn: back to a soft pad; the promise gets a glass chime
  pad(19.5, 24.6, ['D3', 'A3', 'E4'], 0.018, { type: 'triangle', cut: 900, att: 0.4, rel: 0.3, send: 0.5 });
  chime(cu.thesis, [nz('D6'), nz('A6'), nz('E7')], 0.04, 0);
  // how + offer: a steady groove, dry in its last beat, a dead stop at the hold
  pad(24.5, cu.hold, ['B2', 'Fs3', 'D4'], 0.018, { cut: 1000, att: 0.3, rel: 0.02, send: 0.2 });
  each(24.5, cu.hold, E8, (t, k) => {
    const bar = Math.floor(k / 8) % 4, dry = t >= cu.hold - BEAT ? 0.02 : 0.15;
    pluck(t, nz(FIG[(bar + 1) % 4][k % 8]), 0.034 * (k % 2 ? 0.75 : 1), Math.sin(k * 0.8) * 0.3, t >= cu.hold - E8 ? 0.15 : 0.3, 3000, dry);
    if (k % 2 === 0) bass(t, nz(ROOT[(bar + 1) % 4]), 0.11);
  });
  // DM me APP: the stab and a sub on the hit, then a warm flat chord that fades
  ['D3', 'A3', 'D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => pluck(cu.slam + i * 0.006, nz(n), 0.38, (i - 2.5) * 0.15, 0.7, 5200, 0.4));
  pad(cu.slam, cu.slam + 0.4, ['D3', 'A3', 'D4', 'Fs4', 'A4', 'D5'], 0.5, { cut: 3600, att: 0.008, rel: 0.35, send: 0.3 });
  sub(cu.slam, 0.3);
  pad(36.4, 40.0, ['D3', 'A3', 'D4', 'Fs4'], 0.03, { cut: 1300, att: 0.25, rel: 0.6, send: 0.5 });
  drone(36.4, 40.0, nz('D2'), 0.04, { att: 0.12, rel: 0.6 });

  // ================= SFX =================
  to = 's';
  [cu.b_scroll + 0.2, cu.b_scroll + 0.7, cu.b_scroll + 1.2].forEach((t) => sweep(t, t + 0.18, 0.004, 1800, 900, 0));    // scroll flicks
  blip(cu.b_msg + 0.2, 1200, 1600, 0.05, 0.05, 0.3);                                                                    // message sent
  each(cu.b_wait, cu.b_out, BEAT / 2, (t) => noiseHit(t, 0.012, 'highpass', 6000, 2, 0.03, 0.1));                       // the clock
  sweep(cu.rewind, cu.rewind + 0.5, 0.012, 3000, 300, 0);                                                               // the rewind
  blip(cu.a_scan + 0.3, 1500, 2200, 0.04, 0.05, 0.2);                                                                   // scan
  [0, 0.08, 0.16].forEach((d) => noiseHit(cu.a_next + d, 0.05, 'bandpass', 180, 2, 0.08, 0));                          // the buzz
  [cu.h_res, cu.h_per, cu.h_flow, cu.h_des].forEach((t, i) => blip(t, 800 + i * 120, 1300 + i * 120, 0.05, 0.05, (i - 1.5) * 0.2));   // a tick per step
  [19.1, 24.1].forEach((t) => sweep(t, t + 0.4, 0.009, 500, 2600, 0));                                                  // whooshes into the morphs
