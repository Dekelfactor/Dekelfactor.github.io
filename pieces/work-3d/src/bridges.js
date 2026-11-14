// ERAS, CAMERAS, BRIDGES — the ring is every bridge: through its hole into the next world
const ERA_BG = ['#0b0816', '#1a0508', '#1a0d06', '#0b0816'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: 4.0, d: 0.5, A: () => ({ P: ellipsePts(540, 860, 230, 230, 0, 64), c: '#c9bcff' }), B: () => ({ P: ellipsePts(540, 1000, 300, 300, 0, 64), c: '#ff2d4a' }) },    // the ring's hole -> Open Stage Jam
  { tc: 20.5, d: 0.5, A: () => ({ P: ellipsePts(540, 1000, 300, 300, 0, 64), c: '#ff2d4a' }), B: () => ({ P: ellipsePts(540, 1080, 230, 230, 0, 64), c: '#e8925a' }) },  // the ring -> Season's orb
];
