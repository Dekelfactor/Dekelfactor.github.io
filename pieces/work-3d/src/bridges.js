// ERAS, CAMERAS, BRIDGES — through the ring into the story, and out of it into the process
const ERA_BG = ['#1a0508', '#07070b', '#0b0816', '#06121a'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: 19.5, d: 0.5, A: () => ({ P: ellipsePts(400, 1100, 260, 260, 0, 64), c: '#ff2d4a' }), B: () => ({ P: ellipsePts(648, 830, 200, 200, 0, 64), c: '#c9bcff' }) },   // the stage -> the ring (the turn)
  { tc: 24.5, d: 0.5, A: () => ({ P: ellipsePts(648, 830, 200, 200, 0, 64), c: '#c9bcff' }), B: () => ({ P: ellipsePts(540, 1000, 260, 260, 0, 64), c: '#8b6cff' }) },  // the ring -> how
];
