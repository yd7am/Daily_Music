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
NUM_BARS = 60               # 频谱条数量（建议 80-120 获得更好的视觉效果）
FREQ_MIN = 20                # 最低频率 (Hz) ⚠️ 不能为0！对数分组需要 >0
FREQ_MAX = 2200              # 最高频率 (Hz)
N_FFT = 2048                # FFT窗口大小

# 频率分组方式
USE_LOG_FREQ_SCALE = False   # True=对数分组（符合听觉），False=线性分组（视觉均匀）
LOG_FREQ_POWER = 0.7        # 对数强度（0.3=接近线性，0.5=温和，1.0=完全对数）

# 频率权重（用于平衡不同频率的显示）
LOW_FREQ_WEIGHT = 1.0       # 低频权重（0.5 = 减半，1.0 = 原样，2.0 = 翻倍）
MID_FREQ_WEIGHT = 1.0       # 中频权重
HIGH_FREQ_WEIGHT = 1.0      # 高频权重（增强使其更明显）

# 动态范围控制
NOISE_GATE = -63            # 底噪门限（dB），低于此值视为静音（-60 到 -40）
DYNAMIC_BOOST = 1.0         # 动态增强倍数（1.0 = 不增强，2.0 = 翻倍对比度）
USE_POWER_CURVE = True      # 使用幂曲线增强对比度
POWER_CURVE_EXP = 1.5       # 幂曲线指数（1.5-3.0，越大对比越强）

# ==================== 样式配置 ====================
BAR_WIDTH_RATIO = 0.8       # 条形宽度比例 (0-1)
BAR_SPACING = 10             # 条形间距（像素）

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
