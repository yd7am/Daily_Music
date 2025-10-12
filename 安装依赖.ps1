# 音频频谱可视化项目 - 依赖安装脚本
# 使用国内镜像源加速下载

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "       音频频谱可视化项目 - 依赖安装" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# 检查虚拟环境
if ($env:VIRTUAL_ENV) {
    Write-Host "✓ 虚拟环境已激活: $env:VIRTUAL_ENV" -ForegroundColor Green
} else {
    Write-Host "⚠️  警告: 虚拟环境未激活" -ForegroundColor Yellow
    Write-Host "   建议先运行: .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "是否继续安装到全局环境? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "安装已取消" -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "选择镜像源:" -ForegroundColor Cyan
Write-Host "  1. 清华大学 (推荐)" -ForegroundColor White
Write-Host "  2. 阿里云" -ForegroundColor White
Write-Host "  3. 腾讯云" -ForegroundColor White
Write-Host "  4. 中科大" -ForegroundColor White
Write-Host "  5. 豆瓣" -ForegroundColor White
Write-Host "  6. 官方源 (较慢)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "请选择 (1-6, 默认: 1)"
if ([string]::IsNullOrWhiteSpace($choice)) {
    $choice = "1"
}

switch ($choice) {
    "1" {
        $mirror = "https://pypi.tuna.tsinghua.edu.cn/simple"
        $name = "清华大学"
    }
    "2" {
        $mirror = "https://mirrors.aliyun.com/pypi/simple"
        $name = "阿里云"
    }
    "3" {
        $mirror = "https://mirrors.cloud.tencent.com/pypi/simple"
        $name = "腾讯云"
    }
    "4" {
        $mirror = "https://pypi.mirrors.ustc.edu.cn/simple"
        $name = "中科大"
    }
    "5" {
        $mirror = "https://pypi.douban.com/simple"
        $name = "豆瓣"
    }
    "6" {
        $mirror = "https://pypi.org/simple"
        $name = "官方源"
    }
    default {
        $mirror = "https://pypi.tuna.tsinghua.edu.cn/simple"
        $name = "清华大学"
    }
}

Write-Host ""
Write-Host "使用镜像源: $name" -ForegroundColor Green
Write-Host "地址: $mirror" -ForegroundColor Gray
Write-Host ""

# 升级 pip
Write-Host "正在升级 pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip -i $mirror

Write-Host ""
Write-Host "正在安装依赖包..." -ForegroundColor Cyan
Write-Host "这可能需要几分钟，请耐心等待..." -ForegroundColor Yellow
Write-Host ""

# 安装依赖
pip install -r requirements.txt -i $mirror

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "   ✓ 依赖安装完成！" -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Cyan
    Write-Host "  1. 将音频文件放入 input 目录" -ForegroundColor White
    Write-Host "  2. 运行: python main.py -i input/xxx.mp3 -o output/xxx.mp4" -ForegroundColor White
    Write-Host ""
    Write-Host "查看更多信息: 快速开始.md" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host "   ✗ 安装过程中出现错误" -ForegroundColor Red
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "建议尝试:" -ForegroundColor Yellow
    Write-Host "  1. 检查网络连接" -ForegroundColor White
    Write-Host "  2. 尝试其他镜像源" -ForegroundColor White
    Write-Host "  3. 查看上方的错误信息" -ForegroundColor White
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
