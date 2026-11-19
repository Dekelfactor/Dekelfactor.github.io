# DF Motion Studio: Phase 0 directions

Three mobile directions (390×844, rendered at 2×) for review. Nothing in the app is built yet.

- `screens/a-timeline.png`: **A, timeline-first.** A classic multi-track editor, close to CapCut, VN and LumaFusion.
- `screens/b-stage.png`: **B, stage-first.** A full-bleed 3D viewport with floating glass tools and a bottom-sheet inspector, close to Spline and Higgsfield 3D Jutsu.
- `screens/c-director.png`: **C, director-first.** Shot beats, four control pads and a prompt bar for Claude, close to Runway Edit Studio and CapCut AI Lab.
- `screens/compare.png`: all three side by side.

## How the images were made

The preview frames, filmstrip and mood thumbnails are real three.js renders (`source/scene.html`, `source/render.mjs`). They are not illustrations.

`render.mjs` projects the logo's bounding box into every frame. If the logo is closer than 8% to any frame edge, the render fails. For the B viewport, the logo must also fit between the top bar and the scrub bar. All frames currently pass.

The DF monogram here is a stand-in made from extruded shapes. Replace it with the real logo file in Phase 1.

## Shared tokens

| Token | Value | Use |
|---|---|---|
| `--char-0` | `#15120f` | Base background, a warm charcoal |
| `--char-1` | `#1d1915` | Surfaces |
| `--char-2` | `#27221d` | Raised surfaces |
| `--ink` | `#ede4d6` | Text, a soft off-white |
| `--accent` | `#f2a541` | Tungsten, the only accent: playhead, selected keyframe, key light, primary action |

Type: Newsreader for project titles, Geist for the UI, and Geist Mono only for timecodes and numeric values.

## Remotion licence (checked 2026-11)

The free licence covers individuals and companies under the headcount limit. Larger companies need a Company Licence: Creators is $25 per seat per month, and Automators is $0.01 per render with a $100 monthly minimum. Confirm the current terms at remotion.dev/docs/license before launch.
