// =====================================================================
//  ERAS, CAMERAS, BRIDGES — read by kit/morph.js
// =====================================================================
const ERA_BG = ['#26315f', '#3f9f9a', '#f8c3d4', '#cfe2ee', '#f6cf55'];
function pieceCam(era, t) {
  if (era === 2) return push(t, TIMELINE.cues.hold, TIMELINE.cues.hold + 0.9, { z: 1.45, p: [330, 860], to: [500, 900] });   // the hold: in on the spark
  return null;
}
const BRIDGES = [
  { tc: 6.0, d: 0.4, A: () => ({ P: ellipsePts(540, 1050, 190, 180, 0, 64), c: PAL.charcoal }), B: () => ({ P: ellipsePts(540, 1050, 210, 210, 0, 64), c: PAL.mustard }) },   // the sketched ring -> the badge
  { tc: 10.5, d: 0.4, A: () => ({ P: ellipsePts(540, 1050, 210, 210, 0, 64), c: PAL.mustard }), B: () => ({ P: rect(90, 540, 900, 820, 10), c: PAL.paper }) },            // the badge -> the browser
  { tc: 18.0, d: 0.4, A: () => ({ P: ellipsePts(540, 690, 150, 150, 0, 64), c: PAL.mustard }), B: () => ({ P: ellipsePts(540, 1030, 190, 190, 0, 64), c: PAL.mustard }) },   // the sign -> the mark on the sheet
];
