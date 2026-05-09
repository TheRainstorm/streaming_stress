from __future__ import annotations

import math
import random
import sys
import time
from dataclasses import dataclass

try:
    import tkinter as tk
    from tkinter import ttk

    import qrcode
    from PIL import Image, ImageDraw, ImageTk
except ModuleNotFoundError as exc:
    missing = exc.name or "unknown dependency"
    print(
        f"Missing dependency: {missing}\n"
        "Install Python dependencies with: python -m pip install -r requirements.txt\n"
        "If tkinter is missing, install a Python build that includes Tk/Tcl support.",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc


WINDOW_TITLE = "Streaming Stress"
DEFAULT_SIZE = 720
DEFAULT_CELLS = 96
DEFAULT_FPS = 165
DEFAULT_POOL = 120
MAX_TARGET_FPS = 500
MEMORY_BUDGET_MB = 512
PALETTE = (
    (5, 5, 5),
    (255, 255, 255),
    (225, 29, 72),
    (37, 99, 235),
    (22, 163, 74),
    (245, 158, 11),
    (124, 58, 237),
    (6, 182, 212),
    (249, 115, 22),
    (132, 204, 22),
    (219, 39, 119),
)


@dataclass
class RenderStats:
    frame: int = 0
    actual_fps: float = 0.0
    last_tick: float = time.perf_counter()
    rebuild_ms: float = 0.0


class StreamingStressApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title(WINDOW_TITLE)
        self.root.minsize(900, 650)
        self._enable_high_resolution_timer()

        self.mode = tk.StringVar(value="Complex fake QR")
        self.size = tk.DoubleVar(value=DEFAULT_SIZE)
        self.cells = tk.DoubleVar(value=DEFAULT_CELLS)
        self.target_fps = tk.DoubleVar(value=DEFAULT_FPS)
        self.frame_pool = tk.DoubleVar(value=DEFAULT_POOL)
        self.paused = tk.BooleanVar(value=False)
        self.fullscreen = tk.BooleanVar(value=False)
        self.fast_overlay = tk.BooleanVar(value=True)

        self.stats = RenderStats()
        self.photos: list[ImageTk.PhotoImage] = []
        self._after_id: str | None = None
        self._dirty_after_id: str | None = None
        self._next_frame_time = time.perf_counter()

        self._build_ui()
        self._bind_events()
        self._mark_dirty()
        self._schedule_next_frame(0)

    def _build_ui(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(1, weight=1)

        controls = ttk.Frame(self.root, padding=(10, 8))
        controls.grid(row=0, column=0, sticky="ew")
        for column in (3, 6, 9, 12):
            controls.columnconfigure(column, weight=1)

        ttk.Label(controls, text="Mode").grid(row=0, column=0, padx=(0, 6))
        mode_menu = ttk.Combobox(
            controls,
            textvariable=self.mode,
            values=("Standard QR", "Complex fake QR"),
            state="readonly",
            width=17,
        )
        mode_menu.grid(row=0, column=1, padx=(0, 14), sticky="w")

        self._add_slider(controls, "Image size", self.size, 256, 1600, 2, row=0, rebuild=True)
        self._add_slider(controls, "Grid cells", self.cells, 32, 240, 5, row=0, rebuild=True)
        self._add_slider(controls, "Target FPS", self.target_fps, 1, MAX_TARGET_FPS, 8, row=0, rebuild=False)
        self._add_slider(controls, "Frame pool", self.frame_pool, 2, 240, 11, row=0, rebuild=True)

        ttk.Checkbutton(controls, text="Pause", variable=self.paused).grid(
            row=1, column=0, padx=(0, 12), pady=(8, 0), sticky="w"
        )
        ttk.Checkbutton(
            controls,
            text="Fullscreen",
            variable=self.fullscreen,
            command=self._apply_fullscreen,
        ).grid(row=1, column=1, padx=(0, 12), pady=(8, 0), sticky="w")
        ttk.Checkbutton(controls, text="Fast overlay", variable=self.fast_overlay).grid(
            row=1, column=2, padx=(0, 12), pady=(8, 0), sticky="w"
        )

        self.rebuild_button = ttk.Button(controls, text="Rebuild frames", command=self._mark_dirty)
        self.rebuild_button.grid(row=1, column=3, pady=(8, 0), sticky="w")

        self.status = ttk.Label(controls, text="", anchor="e")
        self.status.grid(row=1, column=4, columnspan=10, sticky="ew", pady=(8, 0))

        canvas_frame = ttk.Frame(self.root, padding=(10, 0, 10, 10))
        canvas_frame.grid(row=1, column=0, sticky="nsew")
        canvas_frame.columnconfigure(0, weight=1)
        canvas_frame.rowconfigure(0, weight=1)

        self.canvas = tk.Canvas(canvas_frame, background="#111111", highlightthickness=0)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.image_item = self.canvas.create_image(0, 0, anchor="center")
        self.overlay_bg = self.canvas.create_rectangle(0, 0, 1, 1, fill="#000000", outline="")
        self.overlay_text = self.canvas.create_text(
            12,
            12,
            anchor="nw",
            fill="#ffffff",
            font=("Consolas", 13),
            text="",
        )

    def _add_slider(
        self,
        parent: ttk.Frame,
        label: str,
        variable: tk.DoubleVar,
        min_value: int,
        max_value: int,
        column: int,
        row: int,
        rebuild: bool,
    ) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=column, padx=(0, 6), sticky="w")
        slider = ttk.Scale(
            parent,
            from_=min_value,
            to=max_value,
            variable=variable,
            orient="horizontal",
            length=140,
            command=lambda _value: self._mark_dirty() if rebuild else None,
        )
        slider.grid(row=row, column=column + 1, sticky="ew", padx=(0, 6))
        value = ttk.Label(parent, width=5, anchor="e")
        value.grid(row=row, column=column + 1, sticky="e", padx=(0, 8))

        def sync_label(*_: object) -> None:
            value.configure(text=str(round(variable.get())))

        variable.trace_add("write", sync_label)
        sync_label()

    def _bind_events(self) -> None:
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self.root.bind("<Escape>", lambda _event: self._exit_fullscreen())
        self.canvas.bind("<Configure>", lambda _event: self._center_items())
        self.mode.trace_add("write", lambda *_args: self._mark_dirty())

    def _enable_high_resolution_timer(self) -> None:
        if sys.platform != "win32":
            return
        try:
            import ctypes

            ctypes.windll.winmm.timeBeginPeriod(1)
        except Exception:
            pass

    def _disable_high_resolution_timer(self) -> None:
        if sys.platform != "win32":
            return
        try:
            import ctypes

            ctypes.windll.winmm.timeEndPeriod(1)
        except Exception:
            pass

    def _apply_fullscreen(self) -> None:
        self.root.attributes("-fullscreen", self.fullscreen.get())

    def _exit_fullscreen(self) -> None:
        if self.fullscreen.get():
            self.fullscreen.set(False)
            self._apply_fullscreen()

    def _mark_dirty(self) -> None:
        if self._dirty_after_id is not None:
            self.root.after_cancel(self._dirty_after_id)
        self.status.configure(text="rebuilding frame cache...")
        self._dirty_after_id = self.root.after(120, self._rebuild_frame_cache)

    def _rebuild_frame_cache(self) -> None:
        self._dirty_after_id = None
        start = time.perf_counter()
        size = self._clamp(self.size.get(), 64, 3000)
        cells = self._clamp(self.cells.get(), 8, 500)
        requested_pool = self._clamp(self.frame_pool.get(), 2, 500)
        pool = self._bounded_pool_size(size, requested_pool)

        self.photos = [
            ImageTk.PhotoImage(self._render_frame_template(self.mode.get(), size=size, cells=cells, index=index))
            for index in range(pool)
        ]
        self.stats.rebuild_ms = (time.perf_counter() - start) * 1000
        self.stats.frame = 0
        self.stats.actual_fps = 0.0
        self.stats.last_tick = time.perf_counter()
        self._next_frame_time = self.stats.last_tick
        self._show_photo(0)
        self._center_items()
        self._update_status()

    def _bounded_pool_size(self, size: int, requested_pool: int) -> int:
        bytes_per_frame = size * size * 4
        max_by_budget = max(2, (MEMORY_BUDGET_MB * 1024 * 1024) // max(1, bytes_per_frame))
        return min(requested_pool, max_by_budget)

    def _schedule_next_frame(self, delay_ms: int) -> None:
        if self._after_id is not None:
            self.root.after_cancel(self._after_id)
        self._after_id = self.root.after(max(0, delay_ms), self._render_tick)

    def _render_tick(self) -> None:
        now = time.perf_counter()
        if not self.paused.get() and self.photos:
            self.stats.frame += 1
            self._show_photo(self.stats.frame % len(self.photos))
            elapsed = now - self.stats.last_tick
            if elapsed > 0:
                instant_fps = 1.0 / elapsed
                self.stats.actual_fps = (
                    instant_fps
                    if self.stats.actual_fps == 0.0
                    else self.stats.actual_fps * 0.92 + instant_fps * 0.08
                )
            self.stats.last_tick = now

        if self._should_update_overlay():
            self._update_status()

        interval = 1.0 / max(1, round(self.target_fps.get()))
        self._next_frame_time += interval
        if self._next_frame_time < now:
            missed = math.floor((now - self._next_frame_time) / interval) + 1
            self._next_frame_time += missed * interval
        delay_ms = int(max(0.0, self._next_frame_time - time.perf_counter()) * 1000)
        self._schedule_next_frame(delay_ms)

    def _show_photo(self, index: int) -> None:
        self.canvas.itemconfigure(self.image_item, image=self.photos[index])

    def _should_update_overlay(self) -> bool:
        if not self.fast_overlay.get() or self.paused.get() or not self.photos:
            return True
        return self.stats.frame % 10 == 0

    def _render_frame_template(self, mode: str, size: int, cells: int, index: int) -> Image.Image:
        if mode == "Standard QR":
            return self._render_standard_qr(size, index)
        return self._render_complex_fake_qr(size, cells, index)

    def _render_standard_qr(self, size: int, index: int) -> Image.Image:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(f"streaming-stress cached-frame={index} seed={index * 1_000_003}")
        qr.make(fit=True)
        image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        return image.resize((size, size), Image.Resampling.NEAREST)

    def _render_complex_fake_qr(self, size: int, cells: int, index: int) -> Image.Image:
        image = Image.new("RGB", (cells, cells), PALETTE[1])
        pixels = image.load()
        rng = random.Random(index * 1_000_003 + cells * 97 + size)

        for y in range(cells):
            for x in range(cells):
                value = self._cell_value(x, y, index, rng)
                pixels[x, y] = PALETTE[value % len(PALETTE)]

        draw = ImageDraw.Draw(image)
        self._draw_finder_pattern(draw, 0, 0, scale=1)
        self._draw_finder_pattern(draw, cells - 9, 0, scale=1)
        self._draw_finder_pattern(draw, 0, cells - 9, scale=1)
        self._draw_micro_shapes(draw, cells, index)
        return image.resize((size, size), Image.Resampling.NEAREST)

    def _cell_value(self, x: int, y: int, frame: int, rng: random.Random) -> int:
        wave = int((math.sin((x + frame) * 0.37) + math.cos((y - frame) * 0.41)) * 1000)
        hashed = (x * 73_856_093) ^ (y * 19_349_663) ^ (frame * 83_492_791)
        return (hashed + wave + rng.randrange(0, 2048)) & 0xFFFF

    def _draw_finder_pattern(self, draw: ImageDraw.ImageDraw, grid_x: int, grid_y: int, scale: int) -> None:
        x = grid_x * scale
        y = grid_y * scale
        w = 9 * scale
        draw.rectangle((x, y, x + w, y + w), fill=PALETTE[0])
        draw.rectangle((x + 2 * scale, y + 2 * scale, x + w - 2 * scale, y + w - 2 * scale), fill=PALETTE[1])
        draw.rectangle((x + 4 * scale, y + 4 * scale, x + w - 4 * scale, y + w - 4 * scale), fill=PALETTE[0])

    def _draw_micro_shapes(self, draw: ImageDraw.ImageDraw, cells: int, index: int) -> None:
        step = max(2, cells // 48)
        for y in range(10, cells - 2, step):
            for x in range(10, cells - 2, step):
                selector = (x * 17 + y * 31 + index) % 5
                color = PALETTE[(selector + x + y + index) % len(PALETTE)]
                if selector == 0:
                    draw.point((x, y), fill=color)
                elif selector == 1:
                    draw.line((x - 1, y, x + 1, y), fill=color)
                elif selector == 2:
                    draw.line((x, y - 1, x, y + 1), fill=color)
                elif selector == 3:
                    draw.rectangle((x - 1, y - 1, x + 1, y + 1), outline=color)
                else:
                    draw.point((x, y), fill=PALETTE[0])

    def _update_status(self) -> None:
        pool = len(self.photos)
        state = "paused" if self.paused.get() else "running"
        timestamp = time.strftime("%H:%M:%S")
        text = (
            f"frame {self.stats.frame}  {timestamp}  target {round(self.target_fps.get())} fps  "
            f"actual {self.stats.actual_fps:06.1f} fps  cache {pool} frames"
        )
        self.canvas.itemconfigure(self.overlay_text, text=text)
        bbox = self.canvas.bbox(self.overlay_text)
        if bbox:
            self.canvas.coords(self.overlay_bg, bbox[0] - 8, bbox[1] - 6, bbox[2] + 8, bbox[3] + 6)
            self.canvas.tag_raise(self.overlay_bg)
            self.canvas.tag_raise(self.overlay_text)
        self.status.configure(
            text=(
                f"{state} | frame {self.stats.frame} | target {round(self.target_fps.get())} fps | "
                f"actual {self.stats.actual_fps:0.1f} fps | cache {pool} | "
                f"rebuild {self.stats.rebuild_ms:0.0f} ms"
            )
        )

    def _center_items(self) -> None:
        self.canvas.coords(
            self.image_item,
            self.canvas.winfo_width() // 2,
            self.canvas.winfo_height() // 2,
        )
        self.canvas.coords(self.overlay_text, 14, max(14, self.canvas.winfo_height() - 34))

    def _on_close(self) -> None:
        if self._after_id is not None:
            self.root.after_cancel(self._after_id)
        if self._dirty_after_id is not None:
            self.root.after_cancel(self._dirty_after_id)
        self._disable_high_resolution_timer()
        self.root.destroy()

    @staticmethod
    def _clamp(value: float, low: int, high: int) -> int:
        return max(low, min(high, round(value)))


def main() -> None:
    root = tk.Tk()
    StreamingStressApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
