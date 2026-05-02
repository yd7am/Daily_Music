"""
音频可视化工具统一入口：
1) 兼容旧命令行：python main.py -i ... -o ...
2) 新增子命令：visualize / analyze / render-web / pipeline
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Sequence, Tuple

import colorama
from colorama import Fore, Style

import config


colorama.init(autoreset=True)
ROOT_DIR = Path(__file__).resolve().parent
WEB_RENDERER_DIR = ROOT_DIR / "web_renderer"


def print_banner() -> None:
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


def validate_input(audio_path: str) -> bool:
    if not os.path.exists(audio_path):
        print(f"{Fore.RED}❌ 错误: 找不到音频文件 '{audio_path}'{Style.RESET_ALL}")
        return False

    valid_extensions = [".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"]
    ext = Path(audio_path).suffix.lower()
    if ext not in valid_extensions:
        print(f"{Fore.YELLOW}⚠️  警告: 文件格式 '{ext}' 可能不被支持{Style.RESET_ALL}")
        print(f"   支持的格式: {', '.join(valid_extensions)}")

    file_size = os.path.getsize(audio_path) / (1024 * 1024)
    print(f"{Fore.GREEN}✓ 音频文件: {audio_path}{Style.RESET_ALL}")
    print(f"  文件大小: {file_size:.2f} MB")
    return True


def ensure_output_dir(output_path: str) -> None:
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        print(f"{Fore.GREEN}✓ 创建输出目录: {output_dir}{Style.RESET_ALL}")


def parse_resolution(resolution_str: str) -> Tuple[int, int]:
    try:
        width, height = map(int, resolution_str.lower().split("x"))
        return width, height
    except ValueError:
        print(f"{Fore.RED}❌ 错误: 无效的分辨率格式 '{resolution_str}'{Style.RESET_ALL}")
        print("   正确格式示例: 1920x1080")
        raise SystemExit(1)


def parse_bg_color(color_str: str) -> Tuple[int, int, int]:
    if color_str.startswith("#"):
        try:
            value = color_str.lstrip("#")
            return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)
        except ValueError:
            print(f"{Fore.RED}❌ 错误: 无效的颜色格式{Style.RESET_ALL}")
            raise SystemExit(1)
    try:
        r, g, b = map(int, color_str.split(","))
        return r, g, b
    except ValueError:
        print(f"{Fore.RED}❌ 错误: 无效的颜色格式{Style.RESET_ALL}")
        raise SystemExit(1)


def add_visualize_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("-i", "--input", required=True, help="输入音频文件路径")
    parser.add_argument("-o", "--output", required=True, help="输出视频文件路径")
    parser.add_argument("--fps", type=int, default=config.VIDEO_FPS, help=f"视频帧率 (默认: {config.VIDEO_FPS})")
    parser.add_argument(
        "--resolution",
        default=f"{config.VIDEO_WIDTH}x{config.VIDEO_HEIGHT}",
        help=f"视频分辨率 (默认: {config.VIDEO_WIDTH}x{config.VIDEO_HEIGHT})",
    )
    parser.add_argument("--bars", type=int, default=config.NUM_BARS, help=f"频谱条数量 (默认: {config.NUM_BARS})")
    parser.add_argument(
        "--color",
        choices=["gradient", "rainbow", "single", "fire", "ocean"],
        default=config.COLOR_SCHEME,
        help=f"颜色方案 (默认: {config.COLOR_SCHEME})",
    )
    parser.add_argument(
        "--style",
        choices=["bars", "wave", "circle", "mirror"],
        default=config.DISPLAY_STYLE,
        help=f"显示风格 (默认: {config.DISPLAY_STYLE})",
    )
    parser.add_argument("--bg-color", default=None, help="背景颜色 (格式: #RRGGBB 或 R,G,B)")
    parser.add_argument("--title", default=None, help="视频标题文字")
    parser.add_argument("--no-title", action="store_true", help="不显示标题")


def run_visualize(args: argparse.Namespace) -> None:
    from audio_visualizer import create_visualization

    if not validate_input(args.input):
        raise SystemExit(1)

    ensure_output_dir(args.output)
    width, height = parse_resolution(args.resolution)
    bg_color = parse_bg_color(args.bg_color) if args.bg_color else config.BACKGROUND_COLOR

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

    kwargs = {
        "width": width,
        "height": height,
        "fps": args.fps,
        "bars": args.bars,
        "color": args.color,
        "style": args.style,
        "bg_color": bg_color,
        "show_title": not args.no_title,
    }
    if args.title:
        kwargs["title"] = args.title

    print(f"{Fore.GREEN}🚀 开始生成视频...{Style.RESET_ALL}\n")
    create_visualization(args.input, args.output, **kwargs)
    print(f"\n{Fore.GREEN}{'=' * 60}{Style.RESET_ALL}")
    print(f"{Fore.GREEN}✅ 完成！视频已生成: {args.output}{Style.RESET_ALL}")
    print(f"{Fore.GREEN}{'=' * 60}{Style.RESET_ALL}\n")


def run_analyze(args: argparse.Namespace) -> None:
    from python_pipeline.analyze_track import export_analysis

    if not validate_input(args.input):
        raise SystemExit(1)
    ensure_output_dir(args.output)
    print(f"{Fore.GREEN}🧠 开始导出分析数据...{Style.RESET_ALL}")
    payload = export_analysis(
        input_path=args.input,
        output_path=args.output,
        analysis_fps=args.analysis_fps,
        bands=args.bands,
        include_segments=not args.no_segments,
        sample_rate=args.sample_rate,
        hop_length=args.hop_length,
        fft_size=args.n_fft,
        low_memory=not args.no_low_memory,
    )
    print(f"{Fore.GREEN}✅ 分析完成: {args.output}{Style.RESET_ALL}")
    print(f"  帧数: {len(payload.get('frames', []))}")
    print(f"  分段: {len(payload.get('segments', []))}")


def run_web_renderer(
    analysis_path: str,
    audio_path: str,
    output_path: str,
    scene: str | None,
    controls_path: str | None,
    export_mode: str,
    fps: int,
    width: int,
    height: int,
    port: int,
    keep_frames: bool,
    quick_check: bool,
    quick_check_seconds: float,
) -> None:
    if not WEB_RENDERER_DIR.exists():
        raise RuntimeError("未找到 web_renderer 目录，请先初始化前端渲染模块。")
    if quick_check and quick_check_seconds <= 0:
        raise RuntimeError("--quick-check-seconds 必须大于 0")

    cmd = [
        "npm",
        "run",
        "render:offline",
        "--",
        "--analysis",
        str(Path(analysis_path).resolve()),
        "--audio",
        str(Path(audio_path).resolve()),
        "--output",
        str(Path(output_path).resolve()),
        "--fps",
        str(fps),
        "--width",
        str(width),
        "--height",
        str(height),
        "--port",
        str(port),
        "--export-mode",
        export_mode,
    ]
    if scene:
        cmd.extend(["--scene", scene])
    if controls_path:
        cmd.extend(["--controls", str(Path(controls_path).resolve())])
    if keep_frames:
        cmd.append("--keepFrames")
    if quick_check:
        cmd.extend(["--max-seconds", str(quick_check_seconds)])
        print(
            f"{Fore.YELLOW}⚡ Quick Check 模式：仅导出前 {quick_check_seconds:.1f} 秒，用于快速预览。{Style.RESET_ALL}"
        )

    print(f"{Fore.CYAN}🎬 正在调用 Web 渲染离线导出...{Style.RESET_ALL}")
    try:
        subprocess.run(cmd, cwd=WEB_RENDERER_DIR, check=True)
    except FileNotFoundError as exc:
        raise RuntimeError("未找到 npm 命令，请安装 Node.js 并确保 npm 在 PATH 中。") from exc


def run_render_web(args: argparse.Namespace) -> None:
    if not os.path.exists(args.analysis):
        raise RuntimeError(f"analysis 文件不存在: {args.analysis}")
    if not validate_input(args.audio):
        raise SystemExit(1)
    if args.controls and not os.path.exists(args.controls):
        raise RuntimeError(f"渲染参数文件不存在: {args.controls}")

    ensure_output_dir(args.output)
    run_web_renderer(
        analysis_path=args.analysis,
        audio_path=args.audio,
        output_path=args.output,
        scene=args.scene,
        controls_path=args.controls,
        export_mode=args.export_mode,
        fps=args.fps,
        width=args.width,
        height=args.height,
        port=args.port,
        keep_frames=args.keep_frames,
        quick_check=args.quick_check,
        quick_check_seconds=args.quick_check_seconds,
    )
    print(f"{Fore.GREEN}✅ Web 渲染导出完成: {args.output}{Style.RESET_ALL}")


def run_pipeline(args: argparse.Namespace) -> None:
    from python_pipeline.analyze_track import export_analysis

    if not validate_input(args.input):
        raise SystemExit(1)
    ensure_output_dir(args.analysis_output)
    ensure_output_dir(args.output)

    print(f"{Fore.CYAN}1/2 分析音频中...{Style.RESET_ALL}")
    export_analysis(
        input_path=args.input,
        output_path=args.analysis_output,
        analysis_fps=args.analysis_fps,
        bands=args.bands,
        include_segments=not args.no_segments,
        sample_rate=args.sample_rate,
        hop_length=args.hop_length,
        fft_size=args.n_fft,
        low_memory=not args.no_low_memory,
    )

    print(f"{Fore.CYAN}2/2 离线渲染中...{Style.RESET_ALL}")
    run_web_renderer(
        analysis_path=args.analysis_output,
        audio_path=args.input,
        output_path=args.output,
        scene=args.scene,
        controls_path=args.controls,
        export_mode=args.export_mode,
        fps=args.fps,
        width=args.width,
        height=args.height,
        port=args.port,
        keep_frames=args.keep_frames,
        quick_check=args.quick_check,
        quick_check_seconds=args.quick_check_seconds,
    )
    print(f"{Fore.GREEN}✅ 全流程完成: {args.output}{Style.RESET_ALL}")


def build_subcommand_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Daily_Music 混合渲染 CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    visualize_parser = subparsers.add_parser("visualize", help="使用 Python/OpenCV 传统渲染")
    add_visualize_arguments(visualize_parser)

    analyze_parser = subparsers.add_parser("analyze", help="导出 analysis.json 帧级特征数据")
    analyze_parser.add_argument("-i", "--input", required=True, help="输入音频文件路径")
    analyze_parser.add_argument("-o", "--output", required=True, help="输出 analysis.json 文件")
    analyze_parser.add_argument("--analysis-fps", type=float, default=config.VIDEO_FPS, help="分析帧率")
    analyze_parser.add_argument("--bands", type=int, default=config.NUM_BARS, help="频谱分组数量")
    analyze_parser.add_argument("--sample-rate", type=int, default=None, help="分析采样率（默认低内存模式自动选择）")
    analyze_parser.add_argument("--hop-length", type=int, default=None, help="STFT hop_length（默认低内存模式自动选择）")
    analyze_parser.add_argument("--n-fft", type=int, default=None, help="STFT N_FFT（默认低内存模式自动选择）")
    analyze_parser.add_argument("--no-low-memory", action="store_true", help="关闭低内存模式，使用原始默认参数")
    analyze_parser.add_argument("--no-segments", action="store_true", help="禁用自动分段")

    render_parser = subparsers.add_parser("render-web", help="使用 Web 渲染器离线导出 MP4")
    render_parser.add_argument("--analysis", required=True, help="analysis.json 文件路径")
    render_parser.add_argument("--audio", required=True, help="原始音频文件路径")
    render_parser.add_argument("-o", "--output", required=True, help="输出 MP4 文件路径")
    render_parser.add_argument("--scene", default=None, help="场景 ID（不传时优先使用参数文件中的 sceneId）")
    render_parser.add_argument(
        "--controls",
        default=None,
        help="渲染参数 JSON 路径（默认自动读取 web_renderer/render-controls.json）",
    )
    render_parser.add_argument("--fps", type=int, default=config.VIDEO_FPS, help="输出帧率")
    render_parser.add_argument("--width", type=int, default=config.VIDEO_WIDTH, help="输出宽度")
    render_parser.add_argument("--height", type=int, default=config.VIDEO_HEIGHT, help="输出高度")
    render_parser.add_argument("--port", type=int, default=4173, help="离线渲染临时端口")
    render_parser.add_argument("--keep-frames", action="store_true", help="保留中间帧图像")
    render_parser.add_argument(
        "--export-mode",
        choices=["frame", "realtime"],
        default="frame",
        help="导出模式：frame=逐帧截图（默认），realtime=实时录制（更接近前端预览）",
    )
    render_parser.add_argument("--quick-check", action="store_true", help="快速检查模式（仅导出前几秒）")
    render_parser.add_argument(
        "--quick-check-seconds",
        type=float,
        default=20.0,
        help="快速检查导出时长（秒，默认: 20）",
    )

    pipeline_parser = subparsers.add_parser("pipeline", help="一键执行分析 + Web 离线渲染")
    pipeline_parser.add_argument("-i", "--input", required=True, help="输入音频文件路径")
    pipeline_parser.add_argument("--analysis-output", required=True, help="analysis.json 输出路径")
    pipeline_parser.add_argument("-o", "--output", required=True, help="输出 MP4 文件路径")
    pipeline_parser.add_argument("--analysis-fps", type=float, default=config.VIDEO_FPS, help="分析帧率")
    pipeline_parser.add_argument("--bands", type=int, default=config.NUM_BARS, help="频谱分组数量")
    pipeline_parser.add_argument("--sample-rate", type=int, default=None, help="分析采样率（默认低内存模式自动选择）")
    pipeline_parser.add_argument("--hop-length", type=int, default=None, help="STFT hop_length（默认低内存模式自动选择）")
    pipeline_parser.add_argument("--n-fft", type=int, default=None, help="STFT N_FFT（默认低内存模式自动选择）")
    pipeline_parser.add_argument("--no-low-memory", action="store_true", help="关闭低内存模式，使用原始默认参数")
    pipeline_parser.add_argument("--no-segments", action="store_true", help="禁用自动分段")
    pipeline_parser.add_argument("--scene", default=None, help="场景 ID（不传时优先使用参数文件中的 sceneId）")
    pipeline_parser.add_argument(
        "--controls",
        default=None,
        help="渲染参数 JSON 路径（默认自动读取 web_renderer/render-controls.json）",
    )
    pipeline_parser.add_argument("--fps", type=int, default=config.VIDEO_FPS, help="输出帧率")
    pipeline_parser.add_argument("--width", type=int, default=config.VIDEO_WIDTH, help="输出宽度")
    pipeline_parser.add_argument("--height", type=int, default=config.VIDEO_HEIGHT, help="输出高度")
    pipeline_parser.add_argument("--port", type=int, default=4173, help="离线渲染临时端口")
    pipeline_parser.add_argument("--keep-frames", action="store_true", help="保留中间帧图像")
    pipeline_parser.add_argument(
        "--export-mode",
        choices=["frame", "realtime"],
        default="frame",
        help="导出模式：frame=逐帧截图（默认），realtime=实时录制（更接近前端预览）",
    )
    pipeline_parser.add_argument("--quick-check", action="store_true", help="快速检查模式（仅导出前几秒）")
    pipeline_parser.add_argument(
        "--quick-check-seconds",
        type=float,
        default=20.0,
        help="快速检查导出时长（秒，默认: 20）",
    )

    return parser


def run_legacy_mode(argv: Sequence[str]) -> None:
    parser = argparse.ArgumentParser(
        description="将音频文件转换为带频谱特效的视频",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python main.py -i input/song.mp3 -o output/song.mp4
  python main.py -i input/song.mp3 -o output/song.mp4 --style mirror --color rainbow
        """,
    )
    add_visualize_arguments(parser)
    args = parser.parse_args(list(argv))
    run_visualize(args)


def main(argv: Sequence[str] | None = None) -> None:
    print_banner()
    args_list = list(argv if argv is not None else sys.argv[1:])

    if not args_list or args_list[0] in {"-h", "--help"}:
        parser = build_subcommand_parser()
        parser.print_help()
        print("\n兼容旧命令示例: python main.py -i input/song.mp3 -o output/song.mp4")
        return

    if args_list and args_list[0].startswith("-"):
        run_legacy_mode(args_list)
        return

    parser = build_subcommand_parser()
    args = parser.parse_args(args_list)

    if args.command == "visualize":
        run_visualize(args)
    elif args.command == "analyze":
        run_analyze(args)
    elif args.command == "render-web":
        run_render_web(args)
    elif args.command == "pipeline":
        run_pipeline(args)
    else:
        parser.print_help()
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}⚠️  用户中断操作{Style.RESET_ALL}")
        raise SystemExit(0)
    except Exception as exc:
        print(f"\n{Fore.RED}❌ 错误: {exc}{Style.RESET_ALL}")
        print(f"{Fore.RED}请检查错误信息并重试{Style.RESET_ALL}")
        raise SystemExit(1)
