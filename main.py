"""
音频频谱可视化 - 主程序入口
"""

import os
import sys
import argparse
from pathlib import Path
import colorama
from colorama import Fore, Style

from audio_visualizer import create_visualization
import config

# 初始化 colorama
colorama.init(autoreset=True)


def print_banner():
    """打印程序横幅"""
    banner = f"""
{Fore.CYAN}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🎵  音频频谱可视化工具  🎵                       ║
║                                                           ║
║              Audio Spectrum Visualizer                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝{Style.RESET_ALL}
"""
    print(banner)


def validate_input(audio_path):
    """验证输入文件"""
    if not os.path.exists(audio_path):
        print(f"{Fore.RED}❌ 错误: 找不到音频文件 '{audio_path}'{Style.RESET_ALL}")
        return False
    
    valid_extensions = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac']
    ext = Path(audio_path).suffix.lower()
    if ext not in valid_extensions:
        print(f"{Fore.YELLOW}⚠️  警告: 文件格式 '{ext}' 可能不被支持{Style.RESET_ALL}")
        print(f"   支持的格式: {', '.join(valid_extensions)}")
    
    file_size = os.path.getsize(audio_path) / (1024 * 1024)
    print(f"{Fore.GREEN}✓ 音频文件: {audio_path}{Style.RESET_ALL}")
    print(f"  文件大小: {file_size:.2f} MB")
    
    return True


def ensure_output_dir(output_path):
    """确保输出目录存在"""
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        print(f"{Fore.GREEN}✓ 创建输出目录: {output_dir}{Style.RESET_ALL}")


def parse_resolution(resolution_str):
    """解析分辨率字符串"""
    try:
        width, height = map(int, resolution_str.lower().split('x'))
        return width, height
    except:
        print(f"{Fore.RED}❌ 错误: 无效的分辨率格式 '{resolution_str}'{Style.RESET_ALL}")
        print(f"   正确格式示例: 1920x1080")
        sys.exit(1)


def parse_bg_color(color_str):
    """解析背景颜色"""
    if color_str.startswith('#'):
        try:
            color_str = color_str.lstrip('#')
            r = int(color_str[0:2], 16)
            g = int(color_str[2:4], 16)
            b = int(color_str[4:6], 16)
            return (r, g, b)
        except:
            print(f"{Fore.RED}❌ 错误: 无效的颜色格式{Style.RESET_ALL}")
            sys.exit(1)
    else:
        try:
            r, g, b = map(int, color_str.split(','))
            return (r, g, b)
        except:
            print(f"{Fore.RED}❌ 错误: 无效的颜色格式{Style.RESET_ALL}")
            sys.exit(1)


def print_config(args):
    """打印配置信息"""
    print(f"\n{Fore.CYAN}⚙️  配置信息:{Style.RESET_ALL}")
    print(f"  输入文件: {args.input}")
    print(f"  输出文件: {args.output}")
    print(f"  视频尺寸: {args.resolution}")
    print(f"  帧率: {args.fps} fps")
    print(f"  频谱条数: {args.bars}")
    print(f"  颜色方案: {args.color}")
    print(f"  显示风格: {args.style}")
    if args.title:
        print(f"  标题文字: {args.title}")
    print()


def main():
    """主函数"""
    print_banner()
    
    parser = argparse.ArgumentParser(
        description='将音频文件转换为带频谱特效的视频',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python main.py -i input/song.mp3 -o output/song.mp4
  python main.py -i input/song.mp3 -o output/song.mp4 --style mirror --color rainbow
        """
    )
    
    # 必需参数
    parser.add_argument('-i', '--input', required=True, help='输入音频文件路径')
    parser.add_argument('-o', '--output', required=True, help='输出视频文件路径')
    
    # 可选参数
    parser.add_argument('--fps', type=int, default=config.VIDEO_FPS, 
                       help=f'视频帧率 (默认: {config.VIDEO_FPS})')
    parser.add_argument('--resolution', default=f"{config.VIDEO_WIDTH}x{config.VIDEO_HEIGHT}",
                       help=f'视频分辨率 (默认: {config.VIDEO_WIDTH}x{config.VIDEO_HEIGHT})')
    parser.add_argument('--bars', type=int, default=config.NUM_BARS,
                       help=f'频谱条数量 (默认: {config.NUM_BARS})')
    parser.add_argument('--color', choices=['gradient', 'rainbow', 'single', 'fire', 'ocean'],
                       default=config.COLOR_SCHEME, help=f'颜色方案 (默认: {config.COLOR_SCHEME})')
    parser.add_argument('--style', choices=['bars', 'wave', 'circle', 'mirror'],
                       default=config.DISPLAY_STYLE, help=f'显示风格 (默认: {config.DISPLAY_STYLE})')
    parser.add_argument('--bg-color', default=None, help='背景颜色 (格式: #RRGGBB 或 R,G,B)')
    parser.add_argument('--title', default=None, help='视频标题文字')
    parser.add_argument('--no-title', action='store_true', help='不显示标题')
    
    args = parser.parse_args()
    
    # 验证输入
    if not validate_input(args.input):
        sys.exit(1)
    
    ensure_output_dir(args.output)
    
    # 解析参数
    width, height = parse_resolution(args.resolution)
    bg_color = config.BACKGROUND_COLOR
    if args.bg_color:
        bg_color = parse_bg_color(args.bg_color)
    
    print_config(args)
    
    # 准备参数
    kwargs = {
        'width': width,
        'height': height,
        'fps': args.fps,
        'bars': args.bars,
        'color': args.color,
        'style': args.style,
        'bg_color': bg_color,
        'show_title': not args.no_title,
    }
    
    if args.title:
        kwargs['title'] = args.title
    
    # 开始处理
    try:
        print(f"{Fore.GREEN}🚀 开始生成视频...{Style.RESET_ALL}\n")
        
        create_visualization(args.input, args.output, **kwargs)
        
        print(f"\n{Fore.GREEN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}✅ 完成！视频已生成: {args.output}{Style.RESET_ALL}")
        print(f"{Fore.GREEN}{'='*60}{Style.RESET_ALL}\n")
        
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}⚠️  用户中断操作{Style.RESET_ALL}")
        sys.exit(0)
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ 错误: {str(e)}{Style.RESET_ALL}")
        print(f"{Fore.RED}请检查错误信息并重试{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
