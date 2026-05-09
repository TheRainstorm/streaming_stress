# Streaming Stress

WebGL visual stress page for testing Moonlight + Sunshine streaming.

The page renders a continuously changing, high-detail QR-like pattern directly
on the GPU. It is designed to fill the encoder with changing pixels while
keeping CPU work low.

## Run

Open [index.html](./index.html) in a modern browser.

For stricter browser behavior, run a static server from this directory:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Modes

- Normal mode: controls are on the left, the WebGL render surface fills the
  remaining area on the right.
- Fullscreen stress mode: the canvas enters browser fullscreen and the whole
  display becomes changing pixels.

## Controls

- `Grid cells`: cell density. Default `137` is the measured high-bitrate preset.
- `Target FPS`: frame pacing target. Browser rendering is still capped by the
  display, browser compositor, GPU, and OS.
- `Motion`: animation speed. Default `20` maximizes frame-to-frame difference.
- `Render width %`: canvas width as a percentage of the available display area.
- `Render height %`: canvas height as a percentage of the available display
  area.
- `Show HUD`: overlays frame/FPS/render-size status.
- `Respect target FPS`: caps rendering to `Target FPS`. Set `Target FPS` high,
  such as `500`, when you want the browser to run at the display limit.

Default high-bitrate preset:

- `Grid cells`: `137`
- `Target FPS`: `165`
- `Motion`: `20`
- `Render width %`: `30`
- `Render height %`: `50`

Advanced options are hidden by default:

- `Complexity`: default `1`; higher values add shader work.
- `Pixel ratio cap`: default `1`; higher values increase rendered pixels and
  can sharply reduce FPS.
- `Internal scale %`: actual WebGL resolution inside the displayed canvas. Lower
  this to make a larger displayed area cheaper, at the cost of detail.
- `Palette shift`: default `0`; color phase offset with little performance
  impact.

For maximum FPS, keep `Respect target FPS` disabled. Browser WebGL rendering is
presented through `requestAnimationFrame`, so it usually cannot exceed the
active display refresh rate even when the shader is fast enough.

Every numeric control has an editable value box. Type a value and press Enter,
or click away from the field, to apply it.

Shortcuts:

- `F10` or `F`: enter or exit fullscreen stress mode.
- `Esc` or `Q`: exit fullscreen stress mode.
