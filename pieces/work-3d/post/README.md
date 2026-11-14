# Video A post-production (on top of the Katana master)

The Katana master (`renders/katana-final.mp4`, not in git) is kept as is; these scripts add the finishing touches.

- `screencards3d.py <out_dir>` — the floating 3D app cards (15.0–26.4s): one real Open Stage Jam screen per moment
  (checked in · your place in line · live alert · chords on stage), perspective turn, rounded metal edge, soft shadow,
  white label pill. Screens come from dekelfactordesigns.com/work/assets (o-checkedin, s-queueline, f-lock, o-onstage2).
- `endcards.py <out_dir> reels3d|linkedin3d` — the 4.0s end cards from 36.75s (3D "Comment JAM" lettering rendered with
  Higgsfield GPT Image 2.6, or the 3D LinkedIn "Designed & built Open Stage Jam" card).
- Assembly: ffmpeg blurs the old Katana insets with feathered masks (15.0–23.17s), overlays the cards at 15.0s,
  trims at 36.75s and joins the end card; the Katana audio runs underneath. See the session for the exact filter graph.

Paths inside the scripts point at this session's scratch folder; adjust them when re-running elsewhere.

## Open Stage Jam logo
The original logo is the inline SVG of the app's welcome screen (`<svg class="ws-hero-logo">` in
Dekelfactor/openstagejam `index.html`). `logo.cjs <svg> <out.png> <width>` renders it to a transparent PNG with the
app's own red glow; `screencards3d.py` splits it into the mic mark and the wordmark for the "with Open Stage Jam" tag
(14.75–26.4s, covering the baked Katana tag), and `endcards.py <out> linkedin-logo` places it under a 3D
"Designed & built" line on the LinkedIn end card. The logo files themselves stay out of this public repo.
