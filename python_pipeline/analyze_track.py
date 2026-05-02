"""
CLI entry for exporting analysis.json files.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict

import colorama
from colorama import Fore, Style

import config
from python_pipeline.feature_extractors import AudioFeatureExtractor


colorama.init(autoreset=True)


def _ensure_output_dir(output_path: str) -> None:
    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)


def export_analysis(
    input_path: str,
    output_path: str,
    analysis_fps: float = config.VIDEO_FPS,
    bands: int = config.NUM_BARS,
    include_segments: bool = True,
    sample_rate: int | None = None,
    hop_length: int | None = None,
    fft_size: int | None = None,
    low_memory: bool = True,
) -> Dict[str, Any]:
    if low_memory:
        resolved_sample_rate = sample_rate or min(config.SAMPLE_RATE, 22050)
        resolved_hop_length = hop_length or max(config.HOP_LENGTH, 512)
        resolved_fft_size = fft_size or min(config.N_FFT, 2048)
    else:
        resolved_sample_rate = sample_rate or config.SAMPLE_RATE
        resolved_hop_length = hop_length or config.HOP_LENGTH
        resolved_fft_size = fft_size or config.N_FFT

    extractor = AudioFeatureExtractor(
        audio_path=input_path,
        analysis_fps=analysis_fps,
        bands=bands,
        sample_rate=resolved_sample_rate,
        hop_length=resolved_hop_length,
        fft_size=resolved_fft_size,
    )
    analysis = extractor.build_analysis(include_segments=include_segments)
    payload = analysis.to_dict()

    _ensure_output_dir(output_path)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="导出音频分析数据 (analysis.json)")
    parser.add_argument("-i", "--input", required=True, help="输入音频文件路径")
    parser.add_argument("-o", "--output", required=True, help="输出 analysis.json 文件路径")
    parser.add_argument("--analysis-fps", type=float, default=config.VIDEO_FPS, help="分析采样帧率")
    parser.add_argument("--bands", type=int, default=config.NUM_BARS, help="频谱分组数量")
    parser.add_argument("--sample-rate", type=int, default=None, help="分析采样率（默认低内存模式自动选择）")
    parser.add_argument("--hop-length", type=int, default=None, help="STFT hop_length（默认低内存模式自动选择）")
    parser.add_argument("--n-fft", type=int, default=None, help="STFT N_FFT（默认低内存模式自动选择）")
    parser.add_argument("--no-low-memory", action="store_true", help="关闭低内存模式，使用原始默认参数")
    parser.add_argument("--no-segments", action="store_true", help="禁用自动分段")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = str(Path(args.input))
    output_path = str(Path(args.output))

    print(f"{Fore.CYAN}正在分析音频: {input_path}{Style.RESET_ALL}")
    payload = export_analysis(
        input_path=input_path,
        output_path=output_path,
        analysis_fps=args.analysis_fps,
        bands=args.bands,
        include_segments=not args.no_segments,
        sample_rate=args.sample_rate,
        hop_length=args.hop_length,
        fft_size=args.n_fft,
        low_memory=not args.no_low_memory,
    )

    frame_count = len(payload.get("frames", []))
    segment_count = len(payload.get("segments", []))
    meta = payload.get("meta", {})
    print(f"{Fore.GREEN}分析完成: {output_path}{Style.RESET_ALL}")
    print(f"  时长: {meta.get('duration', 0):.2f}s")
    print(f"  帧数: {frame_count}")
    print(f"  分段: {segment_count}")


if __name__ == "__main__":
    main()
