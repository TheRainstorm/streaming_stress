# Streaming Stress

Python windowed visual stress source for testing Moonlight + Sunshine streaming.

It continuously refreshes a high-complexity QR-like image at a configurable
target FPS. Use Sunshine/Moonlight bitrate and frame-rate settings externally,
then use this app to generate repeatable visual complexity inside the streamed
desktop.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

If Windows does not resolve `python`, use `py` instead:

```bash
py -m venv .venv
.venv\Scripts\activate
py -m pip install -r requirements.txt
```

On Linux/macOS shells, activate with:

```bash
source .venv/bin/activate
```

## Run

```bash
python streaming_stress.py
```

Or on Windows with the launcher:

```bash
py streaming_stress.py
```

Controls:

- `Mode`: standard QR or complex fake QR.
- `Image size`: rendered image size in pixels.
- `Grid cells`: number of cells per side for the fake QR. More cells increase
  spatial detail and encoder workload.
- `Target FPS`: requested refresh rate.
- `Frame pool`: number of pre-rendered frames to cycle through. Larger pools
  reduce obvious repetition but use more memory.
- `Pause`: freeze or resume frame updates.
- `Fullscreen`: use the whole display for capture tests.
- `Fast overlay`: updates the text overlay every 10 frames instead of every
  frame. Keep this enabled when testing very high refresh rates.

The default stress preset is:

- `Image size`: `711`
- `Grid cells`: `144`
- `Target FPS`: `165`
- `Frame pool`: `5`

This matches the measured high-bitrate combination that reached about 640 Mbps.
Each slider has an editable number box on its right; type a value and press
Enter, or click away from the field, to apply it.

The app pre-renders the selected frame pool when image parameters change, then
the hot path only switches cached Tk images. This is much faster than drawing a
new QR image every frame and is the intended mode for 165 Hz / 365 Hz testing.
The overlay shows frame number, timestamp, target FPS, actual FPS, and cache
size.
