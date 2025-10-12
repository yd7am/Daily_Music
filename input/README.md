# 输入音频文件目录

## 说明

请将您的音频文件（xxx.mp3）放置在此目录中。

## 支持的音频格式

- `.mp3` - MP3 音频文件（推荐）
- `.wav` - WAV 音频文件
- `.flac` - FLAC 无损音频文件
- `.m4a` - M4A/AAC 音频文件
- `.ogg` - OGG Vorbis 音频文件
- `.aac` - AAC 音频文件

## 使用示例

1. 将音频文件复制到此目录：
   ```
   Daily_Music/input/my_song.mp3
   ```

2. 运行程序生成视频：
   ```bash
   python main.py --input input/my_song.mp3 --output output/my_song_spectrum.mp4
   ```

## 注意事项

- 音频文件建议大小不超过 100MB，以免处理时间过长
- 音频采样率会自动转换为 44.1kHz
- 支持单声道和立体声音频
- 文件名建议使用英文，避免中文路径可能导致的兼容性问题

## 测试音频

如果您没有测试音频，可以：
1. 从您的音乐库中选择一首歌曲
2. 从免费音乐网站下载测试音频（如 YouTube Audio Library, Free Music Archive）
3. 使用在线工具生成测试音频
