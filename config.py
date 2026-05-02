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
# 越小频率分辨率越高，计算量越大
HOP_LENGTH = 128            # 音频帧跳跃长度

# ==================== 频谱配置 ====================
NUM_BARS = 100               # 频谱条数量（建议 80-120 获得更好的视觉效果）
FREQ_MIN = 20                # 最低频率 (Hz) ⚠️ 不能为0！对数分组需要 >0
FREQ_MAX = 1500              # 最高频率 (Hz)
# 频域乘积，时域卷积，窗口越大窗函数越尖锐，频域分辨率越高，时域分辨率越低
N_FFT = 4096                # FFT窗口大小

# 频率分组方式
USE_LOG_FREQ_SCALE = False   # True=对数分组（符合听觉），False=线性分组（视觉均匀）
LOG_FREQ_POWER = 0.7        # 对数强度（0.3=接近线性，0.5=温和，1.0=完全对数）

# 频率权重（用于平衡不同频率的显示）
LOW_FREQ_WEIGHT = 1.0       # 低频权重（0.5 = 减半，1.0 = 原样，2.0 = 翻倍）
MID_FREQ_WEIGHT = 1.0       # 中频权重
HIGH_FREQ_WEIGHT = 1.0      # 高频权重（增强使其更明显）

# 动态范围控制
NOISE_GATE = -40            # 底噪门限（dB），低于此值视为静音（-60 到 -40）
DYNAMIC_BOOST = 1.0        # 动态增强倍数（1.0 = 不增强，2.0 = 翻倍对比度）
USE_POWER_CURVE = True      # 使用幂曲线增强对比度
POWER_CURVE_EXP = 1.5       # 幂曲线指数（1.5-3.0，越大对比越强）
MAX_HEIGHT_RATIO = 0.5      # 最大高度比例（0.5=一半，0.7=70%，1.0=全高）

# ==================== 样式配置 ====================
BAR_WIDTH_RATIO = 0.8       # 条形宽度比例 (0-1)
BAR_SPACING = 10             # 条形间距（像素）

# ==================== 颜色配置 ====================
# 颜色方案: 'gradient', 'rainbow', 'single', 'fire', 'ocean'
COLOR_SCHEME = 'single'

# 渐变色配置 (RGB)
GRADIENT_START = (0, 255, 255)    # 青色
GRADIENT_END = (255, 0, 255)      # 品红色

# 单色配置
SINGLE_COLOR = (255, 255, 255)        # 白色

# 背景颜色 (RGB)
BACKGROUND_COLOR = (0, 0, 0)      # 黑色

# ==================== 显示风格 ====================
# 风格: 'bars', 'wave', 'circle', 'mirror'
DISPLAY_STYLE = 'circle'

# 圆形频谱配置（当 DISPLAY_STYLE = 'circle' 时）
CIRCLE_RADIUS = 250         # 圆形半径
CIRCLE_LINE_WIDTH = 2       # 线条宽度

# 粒子系统配置
ENABLE_PARTICLES = True     # 是否启用粒子效果
PARTICLE_SPAWN_RATE = 55.0  # 粒子生成倍率（能量 × 倍率 = 粒子数）
PARTICLE_SPEED = 6.0        # 粒子速度（像素/帧）
PARTICLE_SIZE = 5           # 粒子大小（像素）
PARTICLE_LIFETIME = 300     # 粒子生命周期（帧数）缩短以便更动态
PARTICLE_FADE = True        # 粒子是否淡出
PARTICLE_COLOR = (255, 255, 0)  # 粒子颜色 (RGB) 黄色
PARTICLE_PREDICTION = True  # 是否启用预测性同步（粒子提前生成）

# 自适应能量阈值配置
USE_ADAPTIVE_THRESHOLD = True   # 是否使用自适应阈值（推荐开启以自动适应音乐）
ENERGY_THRESHOLD = 0.02     # 固定能量阈值（仅在 USE_ADAPTIVE_THRESHOLD=False 时使用）
ADAPTIVE_HISTORY_SIZE = 90  # 能量历史窗口大小（帧数，建议60-120，约2-4秒）
PEAK_DETECTION_RATIO = 1.5  # 峰值检测倍数（当前能量需要是均值的多少倍，建议1.3-2.0）
ADAPTIVE_MIN_THRESHOLD = 0.01   # 自适应阈值最小值
ADAPTIVE_MAX_THRESHOLD = 0.2    # 自适应阈值最大值

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
