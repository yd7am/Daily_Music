# web_renderer

前端渲染模块，负责：

- 实时预览（Canvas + GSAP）
- 离线导出（Playwright 截帧 + FFmpeg 合成）

## 开发

```bash
npm install
npm run dev
```

## 离线导出脚本

```bash
npm run render:offline -- \
  --analysis ../output/analysis/xxx.analysis.json \
  --audio ../input/xxx.mp3 \
  --output ../output/xxx_web.mp4 \
  --scene barsNeo \
  --fps 30 \
  --width 1920 \
  --height 1080
```

## 说明

- `--analysis` / `--audio` / `--output` 支持绝对路径
- `--keepFrames` 可保留中间帧图用于调试
