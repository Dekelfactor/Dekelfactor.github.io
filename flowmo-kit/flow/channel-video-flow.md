# Flowgen flow: "Client story reel"

Build once on a Flowgen canvas, then **Save as flow**. Wire Brand / Character / Product as **Brain Read** nodes so swapping the Product record re-targets the whole flow.

```
[Brain Read: Brand]──────┐
[Brain Read: Character]──┼──▶ [Text: Style lock] ─────────────┐
[Brain Read: Product]────┘                                    │
        │                                                      ▼
        ▼                                   ┌──▶ [Image gen ×8: Story stills]  (List / Iterator over beats)
[Items List: 8 story beats] ────────────────┤        model: GPT Image 2.6 · 9:16 · high · 2k
  (beat, caption, world=cold|warm, prompt)  │        refs: Paper-me face + body
                                            │        ▼
                                            │   [Pause for Approval: pick stills]
                                            │        ▼
                                            │   [Video gen ×8: Motion] model: Seedance 2.5 · 9:16 · 5 s
                                            │        (start frame = approved still, prompt = beat action)
                                            │
                                            ├──▶ [Image gen ×2: Turn + Close stills] → [Video gen ×2]
                                            │
[Assets: 4 real app screens] ──▶ [3D phone card ×4] (perspective ~18°, rim, shadow, label pill)
[Image gen: 3D CTA lettering] (transparent PNG, "Comment" cream + keyword red lacquer)
[Music: instrumental, upbeat, ~40 s]
        │
        ▼
[Video Editor / Render]  timeline:
  0–3 cold open · 3–11 without (blue) · 11–12 "Same night." flicker · 12–19.5 with (red) + phone cards
  19.5–25 turn · 25–36 close · 0.5 s black beat · 36.75–40.75 end card
  kinetic captions (Brand rules) · tag pill top centre · loudness −15 LUFS
        │
        ├──▶ [Export: Reels/TikTok]  end card = 3D "Comment <KEYWORD>" + Link in bio
        └──▶ [Export: LinkedIn]      end card = product logo + headline + byline
```

## Node settings
- **Story stills:** GPT Image 2.6, aspect 9:16, quality high, resolution 2k, references: `me-happy.png` + `me-body-wave.png` (stage shot: `me-body-cheer.png`). Prompts in `prompts.md`.
- **Motion:** Seedance 2.5, 9:16, 5 s (720p for story beats, 1080p for the hero/stage, turn and close shots). Gentle camera push; keep the paper border and clothes; no on-screen text.
- **Pause for Approval** after stills and after motion — the only places paid work waits for you.
- **Phone cards:** real screens only; one per "with" beat; no glow, no grey slab behind the phone.
- **End-card lettering:** GPT Image 2.6, transparent background, 4:3, high, 2k (prompt in `prompts.md`).

## Cost reference (Higgsfield, this run)
8 stills × 2.75 · 10 Seedance clips (28–96 each) · music ≈ 6 · lettering 2.75 each → about 510–530 credits per video.
