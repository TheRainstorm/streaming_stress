# Streaming Stress

This is a stress test webpage for Moonlight + Sunshine streaming. The page continuously generates changing, high-complexity patterns to test encoder and decoder latency at different frame rates and bitrates. It also simultaneously performs a network stress test to determine the maximum bitrate the current network environment can support for streaming.

<img width="1127" height="827" alt="demo" src="https://github.com/user-attachments/assets/919d1a8c-f8d4-4909-bd10-221e1df6bf6e" />

## Motivation

The goal of this project is to provide a stable, repeatable, and adjustable
visual load source for streaming tests.

In practice, the bottleneck is often not just “how complex the image looks,”
but the interaction between encoder load, display refresh, VSync, pixel
density, and render area size. Keeping those variables in one page makes it
easier to find a configuration that drives bitrate and frame rate where you
want them.

The page continuously generates changing, high-complexity visuals on the GPU
while keeping CPU usage low.

## Run

Open [index.html](./index.html) in a modern browser.

For more stable testing, serve the directory with a static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Layout

- In normal mode, controls are on the left and the WebGL render area fills the
  right side.
- In fullscreen mode, the whole screen shows changing pixels.
- The page defaults to Chinese.

## Controls

- `Grid cells`: cell density, default `137`.
- `Target FPS`: target pacing, default `165`.
- `Motion`: frame-to-frame motion, default `20`.
- `Render width %`: render area width as a percentage of the available area,
  default `30`.
- `Render height %`: render area height as a percentage of the available area,
  default `50`.
- `Show HUD`: show status text.
- `Respect target FPS`: pace to the chosen target. Disable it for maximum
  throughput.

## High-Performance Defaults

- `Grid cells`: `137`
- `Target FPS`: `165`
- `Motion`: `20`
- `Render width %`: `30`
- `Render height %`: `50`

## Advanced Options

Hidden by default under `Advanced`:

- `Complexity`: default `1`; higher values add shader work.
- `Pixel ratio cap`: default `1`; higher values increase rendered pixels and
  can sharply reduce FPS.
- `Internal scale %`: actual render resolution inside the displayed canvas.
  Lower values preserve frame rate at the cost of detail.
- `Palette shift`: default `0`; low performance impact.

## Shortcuts

- `F10` or `F`: toggle fullscreen.
- `Esc` or `Q`: exit fullscreen.

## Notes

WebGL in the browser is still bounded by `requestAnimationFrame`, monitor
refresh rate, browser compositing, and system VSync.
If you enlarge the visible area without reducing shader cost or pixel count,
the FPS drop is expected.
To keep FPS higher over a larger area, first reduce `Internal scale %` and
`Pixel ratio cap`.
