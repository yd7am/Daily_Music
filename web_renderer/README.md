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
  --controls ./render-controls.json \
  --scene barsNeo \
  --fps 30 \
  --width 1920 \
  --height 1080
```

## 说明

- `--analysis` / `--audio` / `--output` 支持绝对路径
- `--keepFrames` 可保留中间帧图用于调试
- `--controls` 可指定渲染参数文件（未指定时自动尝试 `web_renderer/render-controls.json`）
- 页面会自动持久化滑杆/场景/预设到浏览器本地存储；本地存储为空时会尝试读取 `render-controls.json`
