# 资源文件目录

## 说明

此目录用于存放可视化所需的资源文件。

## 支持的资源类型

### 背景图片
- 格式：`.jpg`, `.png`, `.bmp`
- 用途：作为视频背景（未来功能）
- 建议尺寸：1920x1080 或更高

### 字体文件
- 格式：`.ttf`, `.otf`
- 用途：自定义标题字体（未来功能）
- 示例：思源黑体、微软雅黑等

### Logo/水印
- 格式：`.png`（支持透明度）
- 用途：添加品牌标识（未来功能）
- 建议尺寸：200x200 以下

## 未来扩展功能

当前版本使用纯代码生成可视化效果，未来计划支持：

1. **自定义背景**
   - 使用图片作为静态背景
   - 使用视频作为动态背景
   - 背景模糊效果

2. **自定义字体**
   - 导入 TTF/OTF 字体文件
   - 自定义标题样式
   - 多语言支持

3. **Logo 水印**
   - 添加频道 Logo
   - 自定义位置和大小
   - 透明度调整

4. **特效素材**
   - 粒子效果
   - 光晕效果
   - 叠加纹理

## 使用示例（未来功能）

```bash
# 使用自定义背景
python main.py -i input/song.mp3 -o output/song.mp4 --background assets/bg.jpg

# 使用自定义字体
python main.py -i input/song.mp3 -o output/song.mp4 --font assets/font.ttf

# 添加水印
python main.py -i input/song.mp3 -o output/song.mp4 --logo assets/logo.png
```

## 注意事项

- 资源文件会增加视频处理时间
- 确保资源文件大小合理（建议单个文件不超过 10MB）
- 使用高分辨率资源以确保视频质量
