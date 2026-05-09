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

- `Grid cells`: QR-like cell density. Higher values create more spatial detail.
- `Target FPS`: frame pacing target. Browser rendering is still capped by the
  display, browser compositor, GPU, and OS.
- `Complexity`: number of shader noise layers. Higher values increase GPU work
  and visual entropy.
- `Motion`: animation speed. Higher values make adjacent frames differ more.
- `Pixel ratio cap`: maximum device pixel ratio used for the canvas. Higher
  values increase real rendered pixels.
- `Render width %`: canvas width as a percentage of the available display area.
- `Render height %`: canvas height as a percentage of the available display
  area.
- `Palette shift`: color phase offset for the generated pattern.
- `Show HUD`: overlays frame/FPS/render-size status.
- `Respect target FPS`: caps rendering to `Target FPS`. Set `Target FPS` high,
  such as `500`, when you want the browser to run at the display limit.

For maximum FPS, keep `Respect target FPS` disabled. Browser WebGL rendering is
presented through `requestAnimationFrame`, so it usually cannot exceed the
active display refresh rate even when the shader is fast enough.

Every numeric control has an editable value box. Type a value and press Enter,
or click away from the field, to apply it.
