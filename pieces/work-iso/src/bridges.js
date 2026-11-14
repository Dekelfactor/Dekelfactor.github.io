// ERAS, CAMERAS, BRIDGES — the ring's hole opens into each world (isometric ellipses, projected)
const ERA_BG = ['#101014', '#101014', '#101014', '#101014'];
function pieceCam(era, t) { return null; }
const ringHole = (R) => { setIso({ ox: 540, oy: 1060, u: 1 }); return facePts(faceOf([0, 0, 28], [1, 0, 0], [0, 1, 0]), ellipsePts(0, 0, R, R, 0, 64)); };
const BRIDGES = [
  { tc: 4.0, d: 0.5, A: () => ({ P: (setIso({ ox: 540, oy: 880, u: 1 }), facePts(faceOf([0, 0, 28], [1, 0, 0], [0, 1, 0]), ellipsePts(0, 0, 220, 220, 0, 64))), c: '#101014' }), B: () => ({ P: ringHole(260), c: '#101014' }) },
  { tc: 20.5, d: 0.5, A: () => ({ P: ringHole(260), c: '#101014' }), B: () => ({ P: ellipsePts(540, 800, 150, 150, 0, 64), c: '#101014' }) },
];
