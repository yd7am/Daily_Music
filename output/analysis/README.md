# Analysis 输出目录

该目录用于存放由 `python_pipeline/analyze_track.py` 生成的帧级音频特征文件。

- 文件格式：`*.analysis.json`
- 结构定义：`shared/analysis.schema.json`
- 典型文件：`song_name.analysis.json`

可通过以下命令生成：

```bash
python main.py analyze --input input/xxx.mp3 --output output/analysis/xxx.analysis.json
```
