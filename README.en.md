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
theoretical pattern data rate = data per frame * measured render FPS
```

This data rate is a pattern-load indicator, not encoded video bitrate or network
throughput. It becomes zero when pattern changes are paused, while the latency
marker continues changing. The page affects encoding demand through visual
complexity; verify actual bitrate using streaming-side statistics.

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

- In normal mode, controls are on the left. The test area defaults to a combined
  layout with the latency matrix on the left and the WebGL load pattern on the right.
- Disable `Latency + load` to return to the standalone load view.
- Fullscreen hides the controls and preserves the selected test layout for photography.
- The page defaults to Chinese.

## Controls

The main panel keeps frame rate and grid size prominent. Other pattern controls
are grouped under Advanced.

- `Target FPS`: target pacing, default `200`.
- `Symbol grid size`: default `64 × 64`; adjusts both columns and rows while linked. Slider range is `16–128`; manual input can exceed it.
- `Latency + load`: enabled by default; show a 30×10 matrix, millisecond timestamp, cumulative frame number, cycle number, and render timing.
- `Pause pattern`: pause the load pattern; the latency marker, timestamp, and measurement counter keep advancing.

## High-Performance Defaults

- `Symbol grid size`: `64 × 64`, with rows and columns linked
- `Color bits k`: `2`, meaning 4 colors
- `Shape bits n`: `4`, meaning 16 shapes
- `Tile pixels`: `1`
- `Target FPS`: `200`
- `Motion`: `10`
- `Respect target FPS`: enabled
- `Latency + load`: enabled

## Advanced Options

Hidden by default under `Advanced`:

- `Link rows/columns`: enabled by default; unlink to set rows independently and make the main grid-size control adjust columns only.
- `Symbol rows`: pattern height in symbols, default `64`.
- `Shape bits n`: `2^n` shape types, selectable as 1, 2, 4, 8, or 16; default `n=4`; affects pattern data rate and encoding load.
- `Color bits k`: `2^k` color types, default `k=2` for 4 colors; `0` means one color.
- `Show HUD`: show status text and theoretical pattern data rate.
- `Respect target FPS`: pace to the chosen target, enabled by default.
- `Tile pixels`: default `1`; `0` auto-calculates from 50% screen height.
- `Motion`: frame-to-frame motion, default `10`.
- `Palette shift`: default `0`; low performance impact.

## Shortcuts

- `Space`: pause or resume pattern changes.
- `F10` or `F`: toggle fullscreen.
- `Esc` or `Q`: exit fullscreen.

## Latency testing

In combined mode, a white marker advances one cell per rendered update along a
serpentine path in a 30-column × 10-row matrix. Positions range from `0–299`;
the cumulative frame ID starts at `0`, and the cycle number is `floor(frame / 300)`.
Local time uses `HH:MM:SS.mmm`; the counter no longer resets every ten seconds.
The matrix and WebGL pattern update in one render callback, although browser
compositing and physical display scanout can still affect presentation.

1. Open the page on the host and stream that same image through Moonlight. Do not
   run independent clocks on both devices.
2. Place the host and client screens side by side, align the matrices vertically,
   and photograph both screens in a single shot.
3. Read each marker position. If the host is ahead and the delay is less than one
   cycle, `frame difference = (host position - client position + 300) % 300`.
4. Enter the **measured source render FPS at the time of the photograph** into the
   position calculator: `estimated delay ms = frame difference * 1000 / FPS`.
   This is neither the target FPS nor the camera FPS. Adjust the default `60` to
   match your measurement.
5. If cumulative frame IDs are readable, use full-frame mode. When both IDs belong
   to the same session and remain in the retained log, the calculator subtracts
   their recorded timestamps. Otherwise it falls back to an FPS-based estimate.

At a stable 60 FPS, host position `4` and client position `298` are six cells
apart, approximately `100 ms`. A 300-cell cycle spans about 5 seconds at 60 FPS
or 2.5 seconds at 120 FPS. Cycle numbers and cumulative IDs resolve whole-cycle
ambiguity. The interface shows windowed mean render FPS, mean frame interval,
and pacing stability; prefer logged timestamps when timing is uneven.

The most recent 20,000 frame timestamps can be exported as CSV. Hiding combined
mode does not stop counting or clear the log. `New session` creates a new measurement
session, clears retained records, and starts frame IDs at zero. Export before
resetting or reloading, and never combine identical IDs from different sessions.

Use a short exposure and disable HDR/night-mode frame merging. In manual mode,
`1/1000 s` is a useful starting point; adjust for brightness. If several neighboring
cells are visible, read the minimum and maximum full frame IDs on each display.
The frame-difference interval is `[host min - client max, host max - client min]`;
convert using logged times or stable FPS. Resolve cycle boundaries first, and do
not treat the brightest cell alone as an exact reading.

This measures **client display delay relative to the host's physical display**,
including differences between the display paths. It is not full input-to-display
latency. Camera rolling shutter, display scan phase, and pixel response affect the
result. Take multiple samples and report a range or median. Implementation details
and limitations are in [the latency handoff](./LATENCY_HUD_HANDOFF.md).

## Combining latency and bitrate tests

The right-hand pattern preserves the existing symbol/tile generator; it is not a
standard scannable QR code. Fix the stream resolution, frame rate, codec, and target
bitrate, then adjust symbol dimensions, shape/color bits, and motion while checking
actual streaming bitrate. Compare latency at those observed loads.

Splitting the layout changes the pattern's visible area and scaling. Recalibrate
after switching layouts instead of assuming the same settings produce the same
bitrate. The page does not set or read the encoder's bitrate. [Sunshine's configuration
documentation](https://docs.lizardbyte.dev/projects/sunshine/latest/md_docs_2configuration.html#max_bitrate)
describes the client request and host cap; verify actual traffic on the streaming side.

## Notes

WebGL in the browser is still bounded by `requestAnimationFrame`, monitor
refresh rate, browser compositing, and system VSync.
If you increase the symbol grid size or tile pixel size without reducing shader cost,
the FPS drop is expected.
To keep FPS higher over a larger area, first reduce the symbol grid size,
`Tile pixels`, or `Shape bits n`.
