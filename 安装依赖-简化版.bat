@echo off
chcp 65001 >nul
echo =====================================================
echo        音频频谱可视化项目 - 快速安装
echo =====================================================
echo.

REM 使用清华镜像源安装
echo 使用清华大学镜像源安装依赖...
echo.

python -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple

pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

if %errorlevel% equ 0 (
    echo.
    echo =====================================================
    echo    ✓ 安装完成！
    echo =====================================================
    echo.
    echo 下一步:
    echo   1. 将音频文件放入 input 目录
    echo   2. 运行: python main.py -i input/xxx.mp3 -o output/xxx.mp4
    echo.
) else (
    echo.
    echo =====================================================
    echo    ✗ 安装出错
    echo =====================================================
    echo.
)

pause
