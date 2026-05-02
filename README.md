# Daily_Music

## 项目简介

`Daily_Music` 现已升级为**混合渲染架构**：

- Python 负责音频分析与传统 OpenCV 渲染
- Web (Vite + TypeScript + Canvas + GSAP) 负责高级动效预览与离线导出

核心思路是通过统一的 `analysis.json` 数据协议解耦音频分析和视觉渲染，既保留批处理稳定性，也具备前端动效扩展能力。

## 功能特性

- 支持 MP3/WAV/FLAC/M4A/OGG/AAC 输入
- 兼容旧版 Python 频谱视频渲染流程
- 新增帧级特征导出：`analysis.json`
- 新增 Web 渲染器（实时预览 + 离线导出）
- 内置三套场景模板：`barsNeo` / `circlePulse` / `particleBurst`
- 内置三套音乐预设：`edm` / `pop` / `ambient`

## 技术栈

### Python 分析与传统渲染

- Python 3.8+
- librosa / numpy / moviepy / opencv-python

### Web 动效渲染

- Vite + TypeScript
- Canvas 2D
- GSAP 时间线编排
- Playwright + FFmpeg（离线导出）

## 目录结构

```text
Daily_Music/
├── main.py                          # 统一 CLI 入口（兼容旧命令 + 新子命令）
├── audio_visualizer.py              # 传统 Python 渲染器
├── config.py                        # 参数配置
├── python_pipeline/
│   ├── analyze_track.py             # analysis.json 导出入口
│   ├── feature_extractors.py        # 帧级特征提取
│   └── analysis_schema.py           # Python 数据结构
├── shared/
│   └── analysis.schema.json         # 跨语言数据协议
├── web_renderer/
│   ├── src/core/                    # 渲染循环、时间同步
│   ├── src/scenes/                  # barsNeo/circlePulse/particleBurst
│   ├── src/timeline/                # GSAP 驱动状态
│   ├── src/presets/                 # 音乐预设
│   └── scripts/offline-render.mjs   # 离线导出脚本
└── output/
    └── analysis/                    # analysis.json 输出目录
```

## 环境要求

- Python 3.8+
- Node.js 18+
- FFmpeg

### FFmpeg 安装示例

```bash
# Ubuntu / Debian
sudo apt-get install ffmpeg
```

## 安装步骤

### 1) 安装 Python 依赖

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2) 安装 Web 渲染依赖

```bash
cd web_renderer
npm install
cd ..
```

## 命令行用法（统一入口）

### A. 兼容旧版（传统 Python 渲染）

```bash
python main.py -i input/xxx.mp3 -o output/xxx_spectrum.mp4
```

或显式子命令：

```bash
python main.py visualize -i input/xxx.mp3 -o output/xxx_spectrum.mp4 --style circle
```

### B. 仅导出分析数据

```bash
python main.py analyze \
  -i input/xxx.mp3 \
  -o output/analysis/xxx.analysis.json \
  --analysis-fps 30 \
  --bands 100
```

### C. 分析 + Web 离线导出（一键）

```bash
python main.py pipeline \
  -i input/xxx.mp3 \
  --analysis-output output/analysis/xxx.analysis.json \
  -o output/xxx_web.mp4 \
  --controls web_renderer/render-controls.json \
  --scene barsNeo \
  --fps 30 \
  --width 1920 \
  --height 1080
```

### D. 仅使用 Web 离线导出（已有 analysis.json）

```bash
python main.py render-web \
  --analysis output/analysis/xxx.analysis.json \
  --audio input/xxx.mp3 \
  -o output/xxx_web.mp4 \
  --controls web_renderer/render-controls.json \
  --scene particleBurst \
  --export-mode frame
```

快速检查（仅导出前 20 秒）：

```bash
python main.py render-web \
  --analysis output/analysis/xxx.analysis.json \
  --audio input/xxx.mp3 \
  -o output/xxx_web_quick.mp4 \
  --controls web_renderer/render-controls.json \
  --scene particleBurst \
  --quick-check
```

如需自定义快速检查时长，可追加 `--quick-check-seconds 30`。

如需导出效果尽量贴近页面实时预览，可改为：

```bash
python main.py render-web \
  --analysis output/analysis/xxx.analysis.json \
  --audio input/xxx.mp3 \
  -o output/xxx_web_realtime.mp4 \
  --controls web_renderer/render-controls.json \
  --scene particleBurst \
  --export-mode realtime
```

## Web 实时预览

```bash
cd web_renderer
npm run dev
```

打开浏览器后导入 `analysis.json` 和音频文件，即可切换场景与预设预览效果。

- 滑杆、场景、预设会自动保存到浏览器本地存储，并在下次打开页面时恢复。
- 可在页面中点击「导出参数」生成 `render-controls.json`，离线导出时用 `--controls` 复用同一套参数。
- 若 `web_renderer/render-controls.json` 存在且本地存储为空，页面初始化会自动读取该文件。

## analysis.json 协议

- Schema 文件：`shared/analysis.schema.json`
- 关键字段：
  - `meta`: `sampleRate`, `duration`, `analysisFps`, `bands`, `version`
  - `frames[]`: `t`, `spectrum[]`, `rms`, `onset`, `beat`, `centroid`, `energy`
  - `segments[]`（可选）：用于场景切换与镜头节奏编排

## 预设说明

当前预设来源于现有调参文档经验沉淀：

- `edm`: 更激进的粒子和发光，适合高能电子
- `pop`: 平衡型参数，适合通用流行音乐
- `ambient`: 更柔和平滑，适合氛围和慢节奏

## 常见问题

### 1) 提示找不到 `npm`

请安装 Node.js，并确保 `npm` 在系统 PATH 中可用。

### 2) 提示找不到 `ffmpeg`

请安装 FFmpeg 并加入 PATH。

### 3) Web 离线导出失败

先在 `web_renderer` 下执行 `npm install`，确认 Playwright 依赖安装成功，再重试。

## 许可证

MIT License