"""
Analysis data models shared by Python pipeline and web renderer.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


ANALYSIS_VERSION = "1.0.0"


@dataclass
class AnalysisMeta:
    version: str
    sourceAudio: str
    sampleRate: int
    duration: float
    analysisFps: float
    bands: int
    hopLength: int
    fftSize: int
    generatedAt: str
    configSnapshot: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalysisFrame:
    t: float
    spectrum: List[float]
    rms: float
    onset: float
    beat: float
    centroid: float
    energy: float
    flux: float = 0.0
    rolloff: float = 0.0


@dataclass
class AnalysisSegment:
    start: float
    end: float
    label: str
    intensity: Optional[float] = None


@dataclass
class AnalysisData:
    meta: AnalysisMeta
    frames: List[AnalysisFrame]
    segments: List[AnalysisSegment] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        if not self.segments:
            payload.pop("segments", None)
        return payload
