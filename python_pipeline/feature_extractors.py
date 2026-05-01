"""
Feature extraction utilities for analysis.json export.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Sequence

import librosa
import numpy as np

import config
from python_pipeline.analysis_schema import (
    ANALYSIS_VERSION,
    AnalysisData,
    AnalysisFrame,
    AnalysisMeta,
    AnalysisSegment,
)


def _safe_normalize(values: np.ndarray) -> np.ndarray:
    values = np.asarray(values, dtype=float)
    max_val = float(np.max(values)) if values.size else 0.0
    if max_val <= 0:
        return np.zeros_like(values, dtype=float)
    return values / max_val


def _moving_average(values: Sequence[float], window: int) -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    if arr.size == 0 or window <= 1:
        return arr
    kernel = np.ones(window, dtype=float) / float(window)
    return np.convolve(arr, kernel, mode="same")


class AudioFeatureExtractor:
    """Extract frame-level features consumed by the web renderer."""

    def __init__(
        self,
        audio_path: str,
        analysis_fps: float,
        bands: int,
        sample_rate: int = config.SAMPLE_RATE,
        hop_length: int = config.HOP_LENGTH,
        fft_size: int = config.N_FFT,
    ) -> None:
        self.audio_path = audio_path
        self.analysis_fps = analysis_fps
        self.bands = bands
        self.sample_rate = sample_rate
        self.hop_length = hop_length
        self.fft_size = fft_size

        self.audio, self.sr = librosa.load(audio_path, sr=sample_rate)
        self.duration = len(self.audio) / float(self.sr)

        self.stft = np.abs(
            librosa.stft(
                self.audio,
                n_fft=self.fft_size,
                hop_length=self.hop_length,
            )
        )
        self.db = librosa.amplitude_to_db(self.stft, ref=np.max)
        self.frame_count = self.db.shape[1]

        freqs = librosa.fft_frequencies(sr=self.sr, n_fft=self.fft_size)
        freq_mask = (freqs >= config.FREQ_MIN) & (freqs <= config.FREQ_MAX)
        self.freqs = freqs[freq_mask]
        self.freq_indices = np.where(freq_mask)[0]
        self.freq_bins = self._build_frequency_bins()
        self.freq_weights = self._compute_freq_weights()

    def _build_frequency_bins(self) -> np.ndarray:
        if config.USE_LOG_FREQ_SCALE:
            return self._get_log_bins()
        return self._get_linear_bins()

    def _get_linear_bins(self) -> np.ndarray:
        return np.linspace(0, len(self.freq_indices), self.bands + 1, dtype=int)

    def _get_log_bins(self) -> np.ndarray:
        power = config.LOG_FREQ_POWER
        linear_space = np.linspace(0, 1, self.bands + 1)
        adjusted = np.power(linear_space, power)

        freq_min = max(config.FREQ_MIN, 1)
        freq_max = config.FREQ_MAX
        if freq_min >= freq_max:
            return self._get_linear_bins()

        log_min = np.log10(freq_min)
        log_max = np.log10(freq_max)
        log_freqs = log_min + adjusted * (log_max - log_min)
        actual_freqs = np.power(10, log_freqs)

        bins: List[int] = []
        for freq in actual_freqs:
            idx = int(np.argmin(np.abs(self.freqs - freq)))
            bins.append(idx)
        return np.array(bins)

    def _compute_freq_weights(self) -> np.ndarray:
        weights = np.ones(self.bands, dtype=float)
        for i in range(self.bands):
            ratio = i / max(1, self.bands - 1)
            if ratio < 0.3:
                weights[i] = config.LOW_FREQ_WEIGHT
            elif ratio < 0.7:
                weights[i] = config.MID_FREQ_WEIGHT
            else:
                weights[i] = config.HIGH_FREQ_WEIGHT
        return weights

    def _extract_band_spectrum(self, frame_idx: int) -> np.ndarray:
        frame_idx = min(frame_idx, self.frame_count - 1)
        frame_data = self.db[self.freq_indices, frame_idx]

        amplitudes: List[float] = []
        for i in range(self.bands):
            start_idx = int(self.freq_bins[i])
            end_idx = int(self.freq_bins[i + 1])
            if start_idx == end_idx:
                end_idx = min(start_idx + 1, frame_data.shape[0])
            chunk = frame_data[start_idx:end_idx]
            amp = float(np.mean(chunk)) if chunk.size else float(config.NOISE_GATE)
            amplitudes.append(amp)

        spectrum = np.array(amplitudes, dtype=float)
        spectrum = np.where(spectrum < config.NOISE_GATE, config.NOISE_GATE, spectrum)
        spectrum = np.clip(spectrum, config.NOISE_GATE, 0)
        spectrum = (spectrum - config.NOISE_GATE) / (0 - config.NOISE_GATE)

        if config.USE_POWER_CURVE:
            spectrum = np.power(spectrum, config.POWER_CURVE_EXP)

        spectrum *= config.DYNAMIC_BOOST
        spectrum *= self.freq_weights
        spectrum *= config.MAX_HEIGHT_RATIO
        return np.clip(spectrum, 0, 1)

    def _extract_scalar_tracks(self) -> Dict[str, np.ndarray]:
        rms = librosa.feature.rms(y=self.audio, frame_length=self.fft_size, hop_length=self.hop_length)[0]
        onset = librosa.onset.onset_strength(y=self.audio, sr=self.sr, hop_length=self.hop_length)
        centroid = librosa.feature.spectral_centroid(
            y=self.audio, sr=self.sr, n_fft=self.fft_size, hop_length=self.hop_length
        )[0]
        rolloff = librosa.feature.spectral_rolloff(
            y=self.audio, sr=self.sr, n_fft=self.fft_size, hop_length=self.hop_length
        )[0]

        flux = np.sqrt(np.sum(np.diff(self.stft, axis=1, prepend=self.stft[:, :1]) ** 2, axis=0))
        flux = _safe_normalize(flux)

        _, beat_frames = librosa.beat.beat_track(y=self.audio, sr=self.sr, hop_length=self.hop_length)
        beat_track = np.zeros(self.frame_count, dtype=float)
        beat_indices = np.asarray(beat_frames, dtype=int)
        beat_indices = beat_indices[(beat_indices >= 0) & (beat_indices < self.frame_count)]
        beat_track[beat_indices] = 1.0

        return {
            "rms": _safe_normalize(rms),
            "onset": _safe_normalize(onset),
            "centroid": _safe_normalize(centroid),
            "rolloff": _safe_normalize(rolloff),
            "flux": flux,
            "beat": beat_track,
        }

    def _sample_track(self, track: np.ndarray, source_idx: int) -> float:
        if track.size == 0:
            return 0.0
        idx = min(source_idx, track.shape[0] - 1)
        return float(track[idx])

    def build_frames(self) -> List[AnalysisFrame]:
        scalar_tracks = self._extract_scalar_tracks()
        total_frames = max(1, int(np.ceil(self.duration * self.analysis_fps)))

        frames: List[AnalysisFrame] = []
        for i in range(total_frames):
            t = i / self.analysis_fps
            stft_idx = min(int(t * self.sr / self.hop_length), self.frame_count - 1)

            spectrum = self._extract_band_spectrum(stft_idx)
            energy = float(np.mean(spectrum))

            frame = AnalysisFrame(
                t=round(t, 6),
                spectrum=[round(float(x), 6) for x in spectrum.tolist()],
                rms=round(self._sample_track(scalar_tracks["rms"], stft_idx), 6),
                onset=round(self._sample_track(scalar_tracks["onset"], stft_idx), 6),
                beat=round(self._sample_track(scalar_tracks["beat"], stft_idx), 6),
                centroid=round(self._sample_track(scalar_tracks["centroid"], stft_idx), 6),
                energy=round(energy, 6),
                flux=round(self._sample_track(scalar_tracks["flux"], stft_idx), 6),
                rolloff=round(self._sample_track(scalar_tracks["rolloff"], stft_idx), 6),
            )
            frames.append(frame)
        return frames

    def infer_segments(self, frames: Sequence[AnalysisFrame]) -> List[AnalysisSegment]:
        if not frames:
            return []

        duration = float(frames[-1].t)
        if duration <= 0:
            return []

        energies = np.array([frame.energy for frame in frames], dtype=float)
        smooth_energy = _moving_average(energies, window=max(5, int(self.analysis_fps)))

        peak_index = int(np.argmax(smooth_energy))
        peak_time = frames[peak_index].t

        drop_window = min(12.0, max(6.0, duration * 0.2))
        drop_start = max(0.0, peak_time - drop_window / 2)
        drop_end = min(duration, peak_time + drop_window / 2)
        intro_end = min(drop_start, max(2.0, duration * 0.12))
        outro_start = max(drop_end, duration * 0.85)

        segments: List[AnalysisSegment] = []
        if intro_end > 0.1:
            segments.append(AnalysisSegment(start=0.0, end=round(intro_end, 3), label="intro", intensity=0.3))
        if drop_start - intro_end > 0.2:
            segments.append(
                AnalysisSegment(
                    start=round(intro_end, 3),
                    end=round(drop_start, 3),
                    label="build",
                    intensity=0.6,
                )
            )
        if drop_end - drop_start > 0.2:
            drop_intensity = float(np.clip(np.max(smooth_energy), 0, 1))
            segments.append(
                AnalysisSegment(
                    start=round(drop_start, 3),
                    end=round(drop_end, 3),
                    label="drop",
                    intensity=round(drop_intensity, 3),
                )
            )
        if duration - outro_start > 0.2:
            segments.append(
                AnalysisSegment(
                    start=round(outro_start, 3),
                    end=round(duration, 3),
                    label="outro",
                    intensity=0.25,
                )
            )

        if not segments:
            segments.append(AnalysisSegment(start=0.0, end=round(duration, 3), label="custom", intensity=0.5))
        return segments

    def build_analysis(self, include_segments: bool = True) -> AnalysisData:
        frames = self.build_frames()
        segments = self.infer_segments(frames) if include_segments else []

        meta = AnalysisMeta(
            version=ANALYSIS_VERSION,
            sourceAudio=self.audio_path,
            sampleRate=self.sr,
            duration=round(self.duration, 6),
            analysisFps=self.analysis_fps,
            bands=self.bands,
            hopLength=self.hop_length,
            fftSize=self.fft_size,
            generatedAt=datetime.now(timezone.utc).isoformat(),
            configSnapshot={
                "freqMin": config.FREQ_MIN,
                "freqMax": config.FREQ_MAX,
                "useLogFreqScale": config.USE_LOG_FREQ_SCALE,
                "logFreqPower": config.LOG_FREQ_POWER,
                "noiseGate": config.NOISE_GATE,
                "dynamicBoost": config.DYNAMIC_BOOST,
                "powerCurveExp": config.POWER_CURVE_EXP,
                "maxHeightRatio": config.MAX_HEIGHT_RATIO,
            },
        )
        return AnalysisData(meta=meta, frames=frames, segments=segments)
