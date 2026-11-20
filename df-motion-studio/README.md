# DF Motion Studio

A mobile-first 3D motion editor that Claude can also drive. One `project.json` is the
single source of truth: the editor edits it, the Remotion renderer plays it, and Claude
reads and rewrites the same file from chat.

## Run it

```bash
npm install
npm run dev        # editor at http://localhost:5173
npm test           # unit tests (schema, keyframes, presets, safe area, Claude bridge)
npm run build      # static build in dist/
```

## Export an MP4 (on your computer)

1. In the app: **Export → Download project.json**. Media you imported is packed into the file.
2. Here: `npm run render -- studio-reveal.json --aspect 9:16` (also `1:1`, `16:9`).
3. The MP4 lands in `out/`. Flags: `--out file.mp4`, `--crf 18`, `--gl angle|swangle|egl|vulkan`.

The render refuses to start if a layer marked *Keep inside the frame* (your logo) leaves the
safe area on any frame. It names the layer and the time. `--allow-clipping` overrides it.

## Working with Claude

- **Copy project for Claude** (the send button or the Claude sheet) copies your instruction, a
  short guide to the format, and the project JSON. Paste it into a chat with Claude.
- Paste Claude's reply into **Paste Claude's reply**. It is validated with zod. Errors are shown
  in plain language, and valid changes apply as one undoable step: "Claude changed 4 keyframes."
- Claude can also edit a `project.json` file in this repository directly.

### project.json in brief

| Field | Notes |
|---|---|
| times, angles, colours | seconds, degrees, `#rrggbb` |
| animatable values | a plain value, or `{ "keys": [{ "t": 0, "v": 1, "ease": "smooth" }], "wiggle": {…} }` |
| eases | `linear hold ease easeIn easeOut easeInOut smooth snappy overshoot bounce`, `{ "bezier": [x1,y1,x2,y2] }`, `{ "spring": {…} }` |
| `layers[]` | `text`, `shape` (incl. `df-monogram`), `model` (GLB), `image`, `video`, `audio` |
| `lights.key/fill/rim` | azimuth, elevation, intensity, temperature (K), softness |
| `camera` | position, target, fov, roll, dof |
| `environment`, `effects` | studio/dusk/noir/daylight presets, ground, backdrop, fog; bloom, grain, vignette, grade, motion blur |

The schema lives in `src/schema/project.ts`. Unknown keys are rejected, so typos surface immediately.

## Layout

- `src/schema`: the zod schema and the sample project
- `src/engine`: keyframe evaluation (bezier and spring), presets, camera maths, the logo safe-area scan
- `src/remotion`: the composition (React Three Fiber in `@remotion/three`) used by both preview and render
- `src/store`: Zustand state, gesture-grouped undo/redo, autosave, asset hydration
- `src/ui`: stage, sheets, timeline, curve editor, inspectors (docked as panels on desktop)
- `scripts/render.mjs`: the local MP4 renderer

## Licences

Remotion is free for individuals and for-profit companies with up to 3 employees; larger companies
need a Company Licence (see `node_modules/remotion/LICENSE.md`). The DF monogram in the sample is a
stand-in built from extruded shapes: replace it with your logo as a GLB model layer with `"protect": true`.
