# storyboard.json reference

```jsonc
{
  "title": "My launch video",          // also the output file name
  "format": "9:16",                    // "9:16" | "16:9" | "1:1" | "4:5" | {"width":1280,"height":720}
  "fps": 30,
  "language": "en",                    // picks a default voice; captions follow the narration
  "theme": "midnight",                 // preset name, or an object (see Theme)
  "voice": { "provider": "auto", "voice": "en-US-AndrewNeural", "rate": "+5%" },
  "music": { "generate": "pulse", "volume_db": -16 },   // or {"file": "assets/track.mp3"} or "none"
  "captions": { "max_words": 3 },      // true | false | object (see Captions)
  "transition": "push",                // default transition between scenes
  "transition_duration": 0.5,
  "sfx": true,                         // automatic sound effects
  "voice_lead": 0.3,                   // silence before narration starts in each scene (s)
  "voice_tail": 0.45,                  // hold after narration ends (s)
  "loudness_lufs": -14,
  "scenes": [ /* see Scenes */ ]
}
```

## Scenes

Every scene:

| field | meaning |
|---|---|
| `id` | unique, letters/digits/-/_ |
| `type` | `kinetic` `stat` `list` `compare` `terminal` `three` `image` `cta` `custom` |
| `narration` | spoken text (optional). Scene length follows it automatically. |
| `props` | type-specific, below |
| `transition` | how this scene enters: `cut` `fade` `slide-left` `slide-right` `slide-up` `slide-down` `push` `zoom` `whip` `blur` `iris` `wipe` `wipe-up`, or `{"type":"whip","duration":0.4}` |
| `camera` | `none` `push-in` `pull-out` `pan-left` `pan-right` `pan-up` `drift` `orbit` `tilt` `shake` |
| `duration` | fixed seconds (extended automatically if narration is longer) |
| `min_duration` | lower bound when length is automatic |
| `sfx` | extra cues: `[{"name":"impact","at":0.3,"gain_db":-8}]` (`at` = seconds from scene start) |
| `module` | only for `custom`: project-relative path to the scene JS |

In any text prop, `*word*` renders in the accent color.

### kinetic — headline typography
`lines` (array of strings, one per line), `sub`, `eyebrow`,
`style`: `rise` (masked rise, default) | `pop` (spring) | `blur` | `slam` (with impact sound),
`accent_style`: `color` | `underline` | `box`, `stagger` (s per word, 0.07), `align`: `center`|`left`,
`uppercase` (bool), `size` (max px).

### stat — counting number
`value`, `from` (0), `prefix`, `suffix`, `decimals`, `label`, `sub`, `eyebrow`,
`bar` (0..1, shows a progress bar), `count_duration`, `locale`.

### list — title and items
`title`, `eyebrow`, `items` (2-5 short strings), `icon`: `check`|`number`|`arrow`|`dot`.
Items appear spread across the narration.

### compare — before/after
`title`, `left: {label, items[]}`, `right: {label, items[]}` (right is the "good" side).

### terminal — typed commands
`title`, `lines: [{"cmd": "npm i x"}, {"out": "done", "color": "green|red|yellow|dim|accent|white"}]`,
`cps` (typing speed, auto-raised to fit), `prompt` (`$`), `scale`.

### three — 3D hero object
`shape`: `torusKnot` `icosahedron` `blob` `sphere` `cube` `torus` `rings`,
`material`: `glossy` `metal` `glass` `wire`, `color`, `spin`, `particles` (true),
`title`, `sub`, `eyebrow`, `title_pos`: `top`|`bottom`, `fill` (0.58 = share of frame).

### image — screenshot / photo
`src` (project-relative, e.g. `assets/app.png`), `frame`: `card` | `browser` | `phone` | `none`,
`fit`: `cover`|`contain`, `title`, `caption`, `kenburns` (true), `zoom` (1.12), `pan_x`, `pan_y`.

### cta — end card
`title` (use `\n` for line breaks), `sub`, `eyebrow`, `button`, `url`, `logo` (emoji/text or image path),
`click_at` (seconds; cursor clicks the button, with sound).

### custom
See `scene-api.md`.

## Theme

Presets: `midnight` (violet/cyan, default), `neon` (lime/cyan grid), `sunset` (orange/pink),
`ocean` (blue/green particles), `paper` (light), `mono` (black and white).

Override any key:
```json
"theme": {
  "preset": "midnight",
  "accent": "#ff5a1f", "accent2": "#ffd166",
  "background": "aurora",            // aurora | grid | particles | solid
  "font": "Space Grotesk",
  "fonts": [{"family": "Space Grotesk", "src": "assets/fonts/SpaceGrotesk.woff2"}],
  "grain": 0.06, "bg_intensity": 0.5, "progress_bar": true
}
```
Keys: `bg fg muted accent accent2 accent3 card font mono background grain bg_intensity radius progress_bar vignette dark fonts`.
Fonts must be local files in the project (renders work offline); otherwise the system font stack is used.

## Captions
`true` (default) | `false` | `{ "max_words": 3, "max_chars": 22, "size": 0.068, "bottom": 0.2, "uppercase": true, "highlight": true, "reveal": true, "strip_punct": true }`.
`size` is a fraction of the frame width (vertical) or height (horizontal); `bottom` is a fraction of the height.
