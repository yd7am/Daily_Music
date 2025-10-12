"""
音频频谱可视化配置文件 - 简化版（无优化功能）
"""

# ==================== 视频配置 ====================
VIDEO_WIDTH = 1920          # 视频宽度
VIDEO_HEIGHT = 1080         # 视频高度
VIDEO_FPS = 30              # 视频帧率
VIDEO_BITRATE = "5000k"     # 视频比特率

# ==================== 音频配置 ====================
SAMPLE_RATE = 44100         # 采样率
HOP_LENGTH = 512            # 音频帧跳跃长度

# ==================== 频谱配置 ====================
NUM_BARS = 60               # 频谱条数量
FREQ_MIN = 20               # 最低频率 (Hz)
FREQ_MAX = 20000            # 最高频率 (Hz)
N_FFT = 2048                # FFT窗口大小

# ==================== 样式配置 ====================
BAR_WIDTH_RATIO = 0.8       # 条形宽度比例 (0-1)
BAR_SPACING = 2             # 条形间距（像素）

# ==================== 颜色配置 ====================
# 颜色方案: 'gradient', 'rainbow', 'single', 'fire', 'ocean'
COLOR_SCHEME = 'gradient'

# 渐变色配置 (RGB)
GRADIENT_START = (0, 255, 255)    # 青色
GRADIENT_END = (255, 0, 255)      # 品红色

# 单色配置
SINGLE_COLOR = (0, 255, 0)        # 绿色

# 背景颜色 (RGB)
BACKGROUND_COLOR = (0, 0, 0)      # 黑色

# ==================== 显示风格 ====================
# 风格: 'bars', 'wave', 'circle', 'mirror'
DISPLAY_STYLE = 'bars'

# 圆形频谱配置（当 DISPLAY_STYLE = 'circle' 时）
CIRCLE_RADIUS = 200         # 圆形半径
CIRCLE_LINE_WIDTH = 3       # 线条宽度

# ==================== 文字配置 ====================
SHOW_TITLE = True           # 是否显示标题
TITLE_TEXT = "Audio Spectrum"  # 标题文字
TITLE_FONT_SIZE = 48        # 标题字体大小
TITLE_COLOR = (255, 255, 255)  # 标题颜色
TITLE_POSITION = 'top'      # 标题位置: 'top', 'bottom'

# ==================== 性能配置 ====================
THREADS = 4                 # 线程数

# ==================== 输出配置 ====================
OUTPUT_CODEC = 'libx264'    # 视频编码器
AUDIO_CODEC = 'aac'         # 音频编码器
PRESET = 'medium'           # 编码预设
