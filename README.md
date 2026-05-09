# Streaming Stress

这是一个用于 Moonlight + Sunshine 串流的压力测试网页。页面会在持续生成变化中的高复杂度图案，从而测试在不同帧数、不同码率下的编、解码器延迟。并同时对网络进行压力测试，测试当前网络环境可以支持多高的码率串流。

<img width="1127" height="827" alt="demo" src="https://github.com/user-attachments/assets/919d1a8c-f8d4-4909-bd10-221e1df6bf6e" />

## 项目动机

这个项目的目的，是提供一个稳定、可重复、可调参的视觉负载源，用来观察
串流在不同码率、帧率、显示比例和画面变化规律下的表现。

实际测试里，瓶颈通常不只是“画面复杂不复杂”，还包括编码器负载、显示刷新、
VSync、像素密度和区域大小之间的组合关系。把这些变量集中在一个页面里，才
方便快速找到一组能把码率和帧率推到目标位置的参数。

页面会在 GPU 上持续生成变化中的高复杂度图案，同时尽量降低 CPU 占用。

图案结构借鉴 libcimbar 的 symbol/tile 思路，但不是兼容的编码格式：整张图由
`宽 x 高` 个 symbol 组成，每个 symbol 是 `8 x 8` 个 tile，每个 tile 渲染为
若干像素大小的方块。每个 symbol 由 `k` 位颜色和 `n` 位形状组成，因此：

```text
每 symbol bit 数 = k + n
每帧数据量 = symbol 列数 * symbol 行数 * 每 symbol bit 数
估计码率 = 每帧数据量 * 当前实测 FPS
```

## 运行

直接在现代浏览器中打开 [index.html](./index.html)。

如果你希望更稳定地测试，可以在当前目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## 界面

- 普通模式下，左侧是参数面板，右侧是 WebGL 渲染区域。
- 全屏模式下，整个屏幕都会显示变化画面。
- 页面默认使用中文。

## 参数

- `Target FPS`：目标刷新率，默认 `200`。
- `Symbol columns`：图案宽度，以 symbol 为单位，默认 `64`。滑块范围 `16-128`，输入框可设置范围外的值。
- `Symbol rows`：图案高度，以 symbol 为单位，默认 `64`。默认与列数联动。
- `Shape bits n`：形状数量为 `2^n`，可选 1、2、4、8、16 种形状，默认 `4`；它会显著影响估计码率。
- `Color bits k`：颜色类型数量为 `2^k`，默认 `2`，即 4 种颜色；`0` 表示 1 种颜色。
- `Show HUD`：显示状态信息和估计码率。
- `Respect target FPS`：按目标帧率限速，默认开启。
- `Pause pattern`：暂停图案变化，方便调整和观察。

## 高性能默认值

- `Symbol columns`：`64`
- `Symbol rows`：`64`
- `Color bits k`：`2`，即 4 种颜色
- `Shape bits n`：`4`，即 16 种形状
- `Tile pixels`：`1`
- `Target FPS`：`200`
- `Motion`：`10`
- `Respect target FPS`：开启

## 高级选项

默认隐藏在 `Advanced` 中：

- `Tile pixels`：默认 `1`；`0` 表示按屏幕高度 50% 自动计算。
- `Motion`：变化速度，默认 `10`。
- `Palette shift`：默认 `0`，对性能影响很小。

## 快捷键

- `Space`：暂停或继续图案变化。
- `F10` 或 `F`：切换全屏。
- `Esc` 或 `Q`：退出全屏。

## 说明

浏览器里的 WebGL 最终还是受 `requestAnimationFrame`、显示器刷新率、浏览器合成器和系统 VSync 影响。
如果把 symbol 行列数或 tile 像素大小继续放大，帧率掉下去是正常的。
想在更大面积下尽量保帧，优先降低 symbol 行列数、`Tile pixels` 或 `Shape bits n`。
