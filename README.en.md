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

The pattern is inspired by libcimbar's symbol/tile idea, but it is not a
compatible encoding format. The image is a `width x height` grid of symbols.
Each symbol is an `8 x 8` tile pattern, and each tile is rendered as a square
of N pixels. Each symbol combines `k` color bits with `n` shape bits:

```text
bits per symbol = k + n
data per frame = symbol columns * symbol rows * bits per symbol
estimated bitrate = data per frame * measured FPS
```

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

- `Target FPS`: target pacing, default `200`.
- `Symbol columns`: pattern width in symbols, default `64`. Slider range is `16-128`; manual input can exceed it.
- `Symbol rows`: pattern height in symbols, default `64`. Linked to columns by default.
- `Shape bits n`: number of shape types is `2^n`, selectable as 1, 2, 4, 8, or 16 shapes; default `4`; it strongly affects estimated bitrate.
- `Color bits k`: number of color types is `2^k`, default `2` for 4 colors; `0` means one color.
- `Show HUD`: show status text and estimated bitrate.
- `Respect target FPS`: pace to the chosen target, enabled by default.
- `Pause pattern`: pause visual changes for tuning and inspection.

## High-Performance Defaults

- `Symbol columns`: `64`
- `Symbol rows`: `64`
- `Color bits k`: `2`, meaning 4 colors
- `Shape bits n`: `4`, meaning 16 shapes
- `Tile pixels`: `1`
- `Target FPS`: `200`
- `Motion`: `10`
- `Respect target FPS`: enabled

## Advanced Options

Hidden by default under `Advanced`:

- `Tile pixels`: default `1`; `0` auto-calculates from 50% screen height.
- `Motion`: frame-to-frame motion, default `10`.
- `Palette shift`: default `0`; low performance impact.

## Shortcuts

- `Space`: pause or resume pattern changes.
- `F10` or `F`: toggle fullscreen.
- `Esc` or `Q`: exit fullscreen.

## Notes

WebGL in the browser is still bounded by `requestAnimationFrame`, monitor
refresh rate, browser compositing, and system VSync.
If you increase the symbol grid size or tile pixel size without reducing shader cost,
the FPS drop is expected.
To keep FPS higher over a larger area, first reduce the symbol grid size,
`Tile pixels`, or `Shape bits n`.
