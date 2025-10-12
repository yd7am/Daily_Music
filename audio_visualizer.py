"""
音频频谱可视化核心模块（纯原始频谱）
"""

import numpy as np
import librosa
import cv2
from moviepy import AudioFileClip, VideoClip
import random
import config


class Particle:
    """粒子类"""
    def __init__(self, x, y, vx, vy, color, size, lifetime):
        self.x = x
        self.y = y
        self.vx = vx  # x方向速度
        self.vy = vy  # y方向速度
        self.color = color
        self.size = size
        self.lifetime = lifetime
        self.age = 0
    
    def update(self):
        """更新粒子位置和年龄"""
        self.x += self.vx
        self.y += self.vy
        self.age += 1
        return self.age < self.lifetime
    
    def draw(self, frame):
        """绘制粒子"""
        # cv2 使用 BGR 格式，需要转换颜色（RGB → BGR）
        bgr_color = (self.color[2], self.color[1], self.color[0])
        
        if config.PARTICLE_FADE:
            # 计算透明度（生命周期衰减）
            alpha = 1.0 - (self.age / self.lifetime)
            color = tuple(int(c * alpha) for c in bgr_color)
        else:
            color = bgr_color
        
        x, y = int(self.x), int(self.y)
        if 0 <= x < frame.shape[1] and 0 <= y < frame.shape[0]:
            cv2.circle(frame, (x, y), self.size, color, -1)


class ParticleSystem:
    """粒子系统"""
    def __init__(self):
        self.particles = []
    
    def spawn_particles(self, center_x, center_y, energy):
        """根据能量生成粒子"""
        if not config.ENABLE_PARTICLES:
            return 0
        
        # 根据能量决定粒子数量
        num_particles = int(energy * config.PARTICLE_SPAWN_RATE)
        
        for _ in range(num_particles):
            # 随机方向（360度）
            angle = random.uniform(0, 2 * np.pi)
            
            # 速度向量
            speed = config.PARTICLE_SPEED
            vx = speed * np.cos(angle)
            vy = speed * np.sin(angle)
            
            # 创建粒子
            particle = Particle(
                x=float(center_x),
                y=float(center_y),
                vx=vx,
                vy=vy,
                color=config.PARTICLE_COLOR,
                size=config.PARTICLE_SIZE,
                lifetime=config.PARTICLE_LIFETIME
            )
            self.particles.append(particle)
        
        return num_particles  # 返回本次生成的数量
    
    def update(self):
        """更新所有粒子"""
        # 更新粒子并移除死亡的粒子
        self.particles = [p for p in self.particles if p.update()]
    
    def draw(self, frame):
        """绘制所有粒子"""
        for particle in self.particles:
            particle.draw(frame)
    
    def get_count(self):
        """获取当前粒子数量"""
        return len(self.particles)


class AudioVisualizer:
    """音频频谱可视化器"""
    
    def __init__(self, audio_path, output_path, **kwargs):
        """
        初始化音频可视化器
        
        Args:
            audio_path: 输入音频文件路径
            output_path: 输出视频文件路径
            **kwargs: 可选配置参数
        """
        self.audio_path = audio_path
        self.output_path = output_path
        
        # 加载配置
        self.config = self._load_config(kwargs)
        
        # 加载音频
        print(f"正在加载音频文件: {audio_path}")
        self.audio, self.sr = librosa.load(audio_path, sr=config.SAMPLE_RATE)
        self.duration = len(self.audio) / self.sr
        
        # 计算频谱
        print("正在计算音频频谱...")
        self._compute_spectrogram()
        
        # 初始化可视化参数
        self._init_visualization()
        
        # 平滑变化缓存
        self.prev_amplitudes = None
        
        # 初始化粒子系统
        self.particle_system = ParticleSystem()
        
    def _load_config(self, kwargs):
        """加载配置参数"""
        cfg = {
            'width': kwargs.get('width', config.VIDEO_WIDTH),
            'height': kwargs.get('height', config.VIDEO_HEIGHT),
            'fps': kwargs.get('fps', config.VIDEO_FPS),
            'num_bars': kwargs.get('bars', config.NUM_BARS),
            'sample_rate': kwargs.get('sample_rate', config.SAMPLE_RATE),
            'color_scheme': kwargs.get('color', config.COLOR_SCHEME),
            'style': kwargs.get('style', config.DISPLAY_STYLE),
            'bg_color': kwargs.get('bg_color', config.BACKGROUND_COLOR),
            'show_title': kwargs.get('show_title', config.SHOW_TITLE),
            'title_text': kwargs.get('title', config.TITLE_TEXT),
        }
        return cfg
    
    def _compute_spectrogram(self):
        """计算音频频谱图"""
        # 使用短时傅里叶变换计算频谱
        self.stft = np.abs(librosa.stft(
            self.audio,
            n_fft=config.N_FFT,
            hop_length=config.HOP_LENGTH
        ))
        
        # 转换为分贝
        self.db = librosa.amplitude_to_db(self.stft, ref=np.max)
        
        # 计算频率范围
        freqs = librosa.fft_frequencies(sr=self.sr, n_fft=config.N_FFT)
        
        # 选择频率范围内的索引
        freq_mask = (freqs >= config.FREQ_MIN) & (freqs <= config.FREQ_MAX)
        self.freq_indices = np.where(freq_mask)[0]
        self.freqs = freqs[freq_mask]
        
        # 频率分组（根据配置选择）
        if config.USE_LOG_FREQ_SCALE:
            self.freq_bins = self._get_log_freq_bins()  # 对数分组
        else:
            self.freq_bins = self._get_linear_freq_bins()  # 线性分组
    
    def _get_log_freq_bins(self):
        """获取对数频率分组（可调节对数强度）"""
        # 使用可调节的对数-线性混合
        # power = 0: 完全线性
        # power = 0.5: 温和对数（推荐）
        # power = 1.0: 完全对数
        power = config.LOG_FREQ_POWER
        
        # 归一化到 0-1
        linear_space = np.linspace(0, 1, self.config['num_bars'] + 1)
        
        # 应用幂函数（模拟可调节的对数）
        adjusted_space = np.power(linear_space, power)
        
        # 映射到实际频率
        freq_min = max(config.FREQ_MIN, 1)  # 防止 log10(0) 错误，最小值为 1
        freq_max = config.FREQ_MAX
        
        # 检查频率范围是否有效
        if freq_min >= freq_max:
            print(f"警告: FREQ_MIN ({config.FREQ_MIN}) >= FREQ_MAX ({freq_max})，使用线性分组")
            return self._get_linear_freq_bins()
        
        # 对数空间映射
        log_min = np.log10(freq_min)
        log_max = np.log10(freq_max)
        
        log_freqs = log_min + adjusted_space * (log_max - log_min)
        actual_freqs = np.power(10, log_freqs)
        
        bins = []
        for freq in actual_freqs:
            idx = np.argmin(np.abs(self.freqs - freq))
            bins.append(idx)
        return np.array(bins)
    
    def _get_linear_freq_bins(self):
        """获取线性频率分组（视觉上更均匀）"""
        return np.linspace(0, len(self.freq_indices), 
                          self.config['num_bars'] + 1, dtype=int)
    
    def _init_visualization(self):
        """初始化可视化参数"""
        self.width = self.config['width']
        self.height = self.config['height']
        self.num_bars = self.config['num_bars']
        
        # 计算条形宽度
        total_spacing = config.BAR_SPACING * (self.num_bars - 1)
        available_width = self.width - total_spacing
        self.bar_width = int(available_width / self.num_bars * config.BAR_WIDTH_RATIO)
        
        # 颜色设置
        self.colors = self._generate_colors()
    
    def _generate_colors(self):
        """生成颜色方案"""
        colors = []
        scheme = self.config['color_scheme'].lower()
        
        if scheme == 'gradient':
            for i in range(self.num_bars):
                ratio = i / (self.num_bars - 1)
                r = int(config.GRADIENT_START[0] * (1 - ratio) + config.GRADIENT_END[0] * ratio)
                g = int(config.GRADIENT_START[1] * (1 - ratio) + config.GRADIENT_END[1] * ratio)
                b = int(config.GRADIENT_START[2] * (1 - ratio) + config.GRADIENT_END[2] * ratio)
                colors.append((b, g, r))
        
        elif scheme == 'rainbow':
            for i in range(self.num_bars):
                hue = int(180 * i / self.num_bars)
                hsv = np.uint8([[[hue, 255, 255]]])
                bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
                colors.append(tuple(map(int, bgr[0][0])))
        
        elif scheme == 'fire':
            for i in range(self.num_bars):
                ratio = i / (self.num_bars - 1)
                r = 255
                g = int(255 * ratio)
                b = 0
                colors.append((b, g, r))
        
        elif scheme == 'ocean':
            for i in range(self.num_bars):
                ratio = i / (self.num_bars - 1)
                r = 0
                g = int(100 + 155 * ratio)
                b = int(255 - 100 * ratio)
                colors.append((b, g, r))
        
        else:  # 'single'
            color = config.SINGLE_COLOR
            colors = [(color[2], color[1], color[0])] * self.num_bars
        
        return colors
    
    def _get_frame_amplitudes(self, frame_idx):
        """获取指定帧的频谱振幅"""
        if frame_idx >= self.db.shape[1]:
            frame_idx = self.db.shape[1] - 1
        
        # 获取当前帧的频谱数据
        frame_data = self.db[self.freq_indices, frame_idx]
        
        # 按频率分组并取平均值
        amplitudes = []
        for i in range(self.num_bars):
            start_idx = self.freq_bins[i]
            end_idx = self.freq_bins[i + 1]
            
            if start_idx == end_idx:
                end_idx = start_idx + 1
            
            # 取平均值
            amp = np.mean(frame_data[start_idx:end_idx])
            amplitudes.append(amp)
        
        amplitudes = np.array(amplitudes)
        
        # 底噪门限：低于门限的视为静音
        noise_gate = config.NOISE_GATE
        amplitudes = np.where(amplitudes < noise_gate, noise_gate, amplitudes)
        
        # 动态范围映射
        db_min = noise_gate  # 使用噪声门作为最小值
        db_max = 0
        
        # 限制范围
        amplitudes = np.clip(amplitudes, db_min, db_max)
        
        # 归一化到 0-1
        amplitudes = (amplitudes - db_min) / (db_max - db_min)
        
        # 应用幂曲线增强对比度（让强音更强，弱音更弱）
        if config.USE_POWER_CURVE:
            amplitudes = np.power(amplitudes, config.POWER_CURVE_EXP)
        
        # 动态增强（拉大响度差异）
        amplitudes *= config.DYNAMIC_BOOST
        amplitudes = np.clip(amplitudes, 0, 1)
        
        # 应用频率权重（平衡低/中/高频的显示）
        freq_weights = np.ones(self.num_bars)
        for i in range(self.num_bars):
            ratio = i / (self.num_bars - 1)  # 0 到 1
            if ratio < 0.3:  # 低频（前30%）
                freq_weights[i] = config.LOW_FREQ_WEIGHT
            elif ratio < 0.7:  # 中频（30%-70%）
                freq_weights[i] = config.MID_FREQ_WEIGHT
            else:  # 高频（后30%）
                freq_weights[i] = config.HIGH_FREQ_WEIGHT
        
        amplitudes *= freq_weights
        
        # 振幅缩放（限制最大高度）
        amplitudes *= config.MAX_HEIGHT_RATIO
        amplitudes = np.clip(amplitudes, 0, 1)
        
        # 平滑过渡（让变化更缓慢）
        if self.prev_amplitudes is None:
            self.prev_amplitudes = amplitudes
        else:
            # 使用加权平均，让新值慢慢过渡
            smooth_factor = 0.9  # 0.9 表示 90% 保持旧值，只有 10% 使用新值
            amplitudes = smooth_factor * self.prev_amplitudes + (1 - smooth_factor) * amplitudes
            self.prev_amplitudes = amplitudes
        
        return amplitudes
    
    def _draw_bars(self, frame, amplitudes):
        """绘制条形频谱"""
        max_height = self.height - 100
        base_y = self.height - 50
        
        x_offset = (self.width - (self.num_bars * self.bar_width + 
                    (self.num_bars - 1) * config.BAR_SPACING)) // 2
        
        for i, amp in enumerate(amplitudes):
            x = x_offset + i * (self.bar_width + config.BAR_SPACING)
            height = int(amp * max_height)
            y = base_y - height
            
            # 绘制条形
            cv2.rectangle(frame, (x, y), (x + self.bar_width, base_y), 
                         self.colors[i], -1)
            
            # 添加顶部高光
            if height > 5:
                cv2.rectangle(frame, (x, y), (x + self.bar_width, y + 3), 
                             (255, 255, 255), -1)
    
    def _draw_mirror(self, frame, amplitudes):
        """绘制镜像频谱"""
        max_height = (self.height - 100) // 2
        center_y = self.height // 2
        
        x_offset = (self.width - (self.num_bars * self.bar_width + 
                    (self.num_bars - 1) * config.BAR_SPACING)) // 2
        
        for i, amp in enumerate(amplitudes):
            x = x_offset + i * (self.bar_width + config.BAR_SPACING)
            height = int(amp * max_height)
            
            # 上半部分
            cv2.rectangle(frame, (x, center_y - height), 
                         (x + self.bar_width, center_y), self.colors[i], -1)
            
            # 下半部分
            cv2.rectangle(frame, (x, center_y), 
                         (x + self.bar_width, center_y + height), self.colors[i], -1)
    
    def _draw_circle(self, frame, amplitudes):
        """绘制圆形频谱"""
        center_x = self.width // 2
        center_y = self.height // 2
        angles = np.linspace(0, 2 * np.pi, self.num_bars, endpoint=False)
        length = int(amplitudes[0] * 300)
        radius = config.CIRCLE_RADIUS + length
        last_x2 = int(center_x + radius * np.cos(angles[0]))
        last_y2 = int(center_y + radius * np.sin(angles[0]))
        last_x3 = int(center_x + config.CIRCLE_RADIUS * np.cos(angles[0]) - length * np.cos(angles[0]))
        last_y3 = int(center_y + config.CIRCLE_RADIUS * np.sin(angles[0]) - length * np.sin(angles[0]))
        
        for i, (amp, angle) in enumerate(zip(amplitudes, angles)):
            length = int(amp * 300)
            radius = config.CIRCLE_RADIUS + length
            x1 = int(center_x + config.CIRCLE_RADIUS * np.cos(angle))
            y1 = int(center_y + config.CIRCLE_RADIUS * np.sin(angle))
            x2 = int(center_x + radius * np.cos(angle))
            y2 = int(center_y + radius * np.sin(angle))
            x3 = int(x1 - length * np.cos(angle))
            y3 = int(y1 - length * np.sin(angle))
            
            # 在(x2, y2)上绘制圆点，参数控制点的大小
            cv2.circle(frame, (x2, y2), 4, self.colors[i], -1)
            
            cv2.line(frame, (x1, y1), (x2, y2), self.colors[i], 
                    config.CIRCLE_LINE_WIDTH)
            cv2.line(frame, (x1, y1), (x3, y3), self.colors[i], 
                    config.CIRCLE_LINE_WIDTH)

            if (i == 0):
                cv2.line(frame, (int(center_x + radius * np.cos(angles[-1])), int(center_y + radius * np.sin(angles[-1]))), (x2, y2), self.colors[i], 
                        config.CIRCLE_LINE_WIDTH)
                cv2.line(frame, (int(x1 - length * np.cos(angles[-1])), int(y1 - length * np.sin(angles[-1]))), (x3, y3), self.colors[i], 
                        config.CIRCLE_LINE_WIDTH)

            if (i != 0):
                cv2.line(frame, (last_x2, last_y2), (x2, y2), self.colors[i], 
                        config.CIRCLE_LINE_WIDTH)
                cv2.line(frame, (last_x3, last_y3), (x3, y3), self.colors[i], 
                        config.CIRCLE_LINE_WIDTH)
                last_x2 = x2
                last_y2 = y2
                last_x3 = x3
                last_y3 = y3
        
        # 绘制中心圆
        # cv2.circle(frame, (center_x, center_y), config.CIRCLE_RADIUS, 
        #           (100, 100, 100), 2)
    
    def _draw_wave(self, frame, amplitudes):
        """绘制波形频谱"""
        max_height = self.height - 100
        base_y = self.height // 2
        
        points = []
        x_step = self.width / (self.num_bars - 1)
        
        for i, amp in enumerate(amplitudes):
            x = int(i * x_step)
            y = int(base_y - amp * max_height / 2)
            points.append([x, y])
        
        points = np.array(points, dtype=np.int32)
        
        # 绘制填充区域
        fill_points = np.vstack([points, [[self.width, base_y], [0, base_y]]])
        cv2.fillPoly(frame, [fill_points], self.colors[self.num_bars // 2])
        
        # 绘制线条
        cv2.polylines(frame, [points], False, (255, 255, 255), 3, cv2.LINE_AA)
    
    def _add_title(self, frame):
        """添加标题"""
        if not self.config['show_title']:
            return
        
        title = self.config['title_text']
        font = cv2.FONT_HERSHEY_DUPLEX
        font_scale = config.TITLE_FONT_SIZE / 30
        thickness = 3
        
        # 获取文字大小
        (text_width, text_height), baseline = cv2.getTextSize(
            title, font, font_scale, thickness
        )
        
        # 计算位置
        x = (self.width - text_width) // 2
        if config.TITLE_POSITION == 'top':
            y = 60
        else:
            y = self.height - 30
        
        # 添加阴影
        cv2.putText(frame, title, (x + 2, y + 2), font, font_scale, 
                   (0, 0, 0), thickness + 1, cv2.LINE_AA)
        
        # 添加文字
        color = config.TITLE_COLOR
        cv2.putText(frame, title, (x, y), font, font_scale, 
                   (color[2], color[1], color[0]), thickness, cv2.LINE_AA)
    
    def _generate_frame(self, t):
        """生成单帧图像"""
        # 创建背景
        bg_color = self.config['bg_color']
        frame = np.full(
            (self.height, self.width, 3),
            (bg_color[2], bg_color[1], bg_color[0]),
            dtype=np.uint8
        )
        
        # 计算当前帧索引
        frame_idx = int(t * self.sr / config.HOP_LENGTH)
        
        # 获取振幅
        amplitudes = self._get_frame_amplitudes(frame_idx)
        
        # 根据风格绘制
        style = self.config['style'].lower()
        if style == 'bars':
            self._draw_bars(frame, amplitudes)
        elif style == 'mirror':
            self._draw_mirror(frame, amplitudes)
        elif style == 'circle':
            self._draw_circle(frame, amplitudes)
        elif style == 'wave':
            self._draw_wave(frame, amplitudes)
        else:
            self._draw_bars(frame, amplitudes)
        
        # 粒子系统（根据频谱能量生成粒子）
        if config.ENABLE_PARTICLES:
            # 计算预测性同步的帧偏移
            if config.PARTICLE_PREDICTION:
                # 计算粒子到达圆上所需的时间（帧数）
                travel_frames = int(config.CIRCLE_RADIUS / config.PARTICLE_SPEED)
                # 获取未来帧的索引
                future_frame_idx = frame_idx + travel_frames
            else:
                future_frame_idx = frame_idx
            
            # 获取未来帧的振幅（用于粒子生成）
            future_amplitudes = self._get_frame_amplitudes(future_frame_idx)
            
            # 计算未来帧的总能量（使用平均值）
            avg_energy = np.mean(future_amplitudes)
            
            # 在圆心位置生成粒子
            center_x = self.width // 2
            center_y = self.height // 2
            
            # 只有能量大于能量阈值时才生成粒子
            if avg_energy > config.ENERGY_THRESHOLD:
                num_spawned = self.particle_system.spawn_particles(center_x, center_y, avg_energy)
            else:
                num_spawned = 0
            
            # 更新并绘制粒子
            self.particle_system.update()
            self.particle_system.draw(frame)
            
            # 调试：每100帧打印一次（可选，注释掉即可）
            if int(t * self.config['fps']) % 100 == 0:
                total = self.particle_system.get_count()
                if config.PARTICLE_PREDICTION:
                    print(f"新生成: {num_spawned}个, 屏幕总数: {total}个, 能量: {avg_energy:.3f}, 提前: {travel_frames}帧")
                else:
                    print(f"新生成: {num_spawned}个, 屏幕总数: {total}个, 能量: {avg_energy:.3f}")
        
        # 添加标题
        self._add_title(frame)
        
        # 转换为RGB
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        return frame
    
    def generate_video(self):
        """生成视频"""
        print(f"正在生成视频...")
        print(f"分辨率: {self.width}x{self.height}, 帧率: {self.config['fps']}, 时长: {self.duration:.2f}秒")
        
        # 创建视频剪辑
        video_clip = VideoClip(self._generate_frame, duration=self.duration)
        video_clip = video_clip.with_fps(self.config['fps'])
        
        # 加载音频
        audio_clip = AudioFileClip(self.audio_path)
        video_clip = video_clip.with_audio(audio_clip)
        
        # 导出视频
        print(f"正在导出视频到: {self.output_path}")
        video_clip.write_videofile(
            self.output_path,
            codec=config.OUTPUT_CODEC,
            audio_codec=config.AUDIO_CODEC,
            bitrate=config.VIDEO_BITRATE,
            preset=config.PRESET,
            threads=config.THREADS,
            logger='bar'
        )
        
        print(f"✅ 视频生成完成！")
        print(f"输出文件: {self.output_path}")


def create_visualization(audio_path, output_path, **kwargs):
    """
    创建音频可视化视频
    
    Args:
        audio_path: 输入音频文件路径
        output_path: 输出视频文件路径
        **kwargs: 可选配置参数
    """
    visualizer = AudioVisualizer(audio_path, output_path, **kwargs)
    visualizer.generate_video()
