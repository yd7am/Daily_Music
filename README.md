# 音频频谱可视化项目

## 项目简介

这是一个将音频文件（mp3格式）转换为带有频谱特效的视频（mp4格式）的Python项目。通过分析音频的频率信息，生成动态的频谱可视化效果。

## 功能特性

- ✅ 支持 MP3 等多种音频文件输入
- ✅ 生成动态频谱可视化效果
- ✅ 输出高质量 MP4 视频
- ✅ 4种显示风格（条形、镜像、圆形、波形）
- ✅ 5种颜色方案（渐变、彩虹、火焰、海洋、单色）
- ✅ 纯原始频谱，无复杂处理

## 技术栈

- **Python**: 3.8+
- **音频处理**: librosa
- **视频生成**: moviepy, opencv-python
- **数据处理**: numpy
- **可视化**: matplotlib

## 环境要求

### 系统依赖

- Python 3.8 或更高版本
- FFmpeg（用于音视频处理）

### FFmpeg 安装

**Windows:**
```bash
# 使用 Chocolatey
choco install ffmpeg

# 或从官网下载: https://ffmpeg.org/download.html
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

## 项目安装

### 1. 克隆或创建项目目录

```bash
cd D:\MyProject\Daily_Music
```

### 2. 创建虚拟环境

```bash
# 使用 venv
python -m venv venv

# 激活虚拟环境
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows CMD
.\venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate
```

### 3. 安装依赖包

```bash
pip install -r requirements.txt
```

## 项目结构

```
Daily_Music/
│
├── README.md                 # 项目说明文档
├── requirements.txt          # Python依赖包列表
├── main.py                   # 主程序入口
├── audio_visualizer.py       # 音频可视化核心模块
├── config.py                 # 配置文件
│
├── input/                    # 输入音频文件目录
│   └── xxx.mp3
│
├── output/                   # 输出视频文件目录
│   └── xxx_spectrum.mp4
│
└── assets/                   # 资源文件（可选背景图等）
```

## 使用方法

### 基础使用

1. 将音频文件放入 `input` 目录

2. 运行主程序：
```bash
python main.py --input input/xxx.mp3 --output output/xxx_spectrum.mp4
```

### 高级配置

```bash
python main.py \
  --input input/xxx.mp3 \
  --output output/xxx_spectrum.mp4 \
  --fps 30 \
  --resolution 1920x1080 \
  --bars 60 \
  --color gradient \
  --style bars
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--input` / `-i` | 输入音频文件路径 | 必填 |
| `--output` / `-o` | 输出视频文件路径 | 必填 |
| `--fps` | 视频帧率 | 30 |
| `--resolution` | 视频分辨率 | 1920x1080 |
| `--bars` | 频谱条数量 | 60 |
| `--color` | 颜色方案 (gradient/rainbow/fire/ocean/single) | gradient |
| `--style` | 显示风格 (bars/mirror/circle/wave) | bars |
| `--bg-color` | 背景颜色 (RGB hex) | #000000 |
| `--title` | 标题文字 | Audio Spectrum |
| `--no-title` | 不显示标题 | - |

## 配置文件

可以通过 `config.py` 修改默认配置：

```python
# 视频配置
VIDEO_WIDTH = 1920
VIDEO_HEIGHT = 1080
VIDEO_FPS = 30

# 频谱配置
NUM_BARS = 60
FREQ_MIN = 20
FREQ_MAX = 20000
N_FFT = 2048

# 样式配置
BAR_WIDTH_RATIO = 0.8
BAR_SPACING = 2
COLOR_SCHEME = 'gradient'
DISPLAY_STYLE = 'bars'
```

## 输出示例

运行成功后，会在 `output` 目录生成带有频谱特效的视频文件。

## 常见问题

### Q1: 提示找不到 FFmpeg
**A:** 请确保已安装 FFmpeg 并将其添加到系统环境变量 PATH 中。

### Q2: 生成视频时内存不足
**A:** 可以降低视频分辨率或减少频谱条数量。

### Q3: 音频和视频不同步
**A:** 检查音频文件是否损坏，或尝试调整 FPS 参数。

## 特点说明

本项目提供**纯原始频谱可视化**：

- ✅ 最简单的频谱处理逻辑
- ✅ 展示真实的音频频率分布
- ✅ 代码简洁易懂
- ✅ 适合学习音频处理原理

**注意**：由于是原始频谱，您会看到：
- 低频（贝斯、鼓）通常会很高
- 高频（镲片、高音）可能较弱
- 这是音频的真实物理特性

## 依赖包版本

详见 `requirements.txt` 文件

## 许可证

MIT License

## 作者

Your Name

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 首次运行可能需要较长时间来处理音频和渲染视频，请耐心等待。
