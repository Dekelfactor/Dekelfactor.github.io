// ERAS, CAMERAS, BRIDGES — through the ring into the story, and out of it into the process
const ERA_BG = ['#0b0816', '#07070b', '#1a0508', '#0b0816', '#06121a'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: 9.5, d: 0.5, A: () => ({ P: ellipsePts(648, 830, 200, 200, 0, 64), c: '#c9bcff' }), B: () => ({ P: ellipsePts(540, 900, 260, 260, 0, 64), c: '#9aa6c0' }) },   // the ring's hole -> the jam night
  { tc: 25.0, d: 0.5, A: () => ({ P: ellipsePts(400, 1100, 260, 260, 0, 64), c: '#ff2d4a' }), B: () => ({ P: ellipsePts(540, 1000, 260, 260, 0, 64), c: '#8b6cff' }) },  // the stage -> how
];
