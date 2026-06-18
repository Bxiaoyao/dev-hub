# DevHub Windows 安装脚本（PowerShell）
# 用法:
#   irm https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.ps1 | iex
#   或本地: .\scripts\install.ps1 install

param(
  [Parameter(Position = 0)]
  [ValidateSet('install', 'update', 'status', 'stop', 'help')]
  [string]$Command = 'help',

  [string]$InstallDir = $(if ($env:DEVHUB_INSTALL_DIR) { $env:DEVHUB_INSTALL_DIR } else { Join-Path $env:USERPROFILE 'dev-hub' }),
  [string]$Repo = $(if ($env:DEVHUB_REPO) { $env:DEVHUB_REPO } else { 'https://github.com/Bxiaoyao/dev-hub.git' }),
  [string]$Branch = $(if ($env:DEVHUB_BRANCH) { $env:DEVHUB_BRANCH } else { 'main' }),
  [int]$Port = $(if ($env:DEVHUB_PORT) { [int]$env:DEVHUB_PORT } else { 3200 })
)

$ErrorActionPreference = 'Stop'
$LogDir = Join-Path $env:USERPROFILE '.devhub\logs'
$PidFile = Join-Path $env:USERPROFILE '.devhub\devhub.pid'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Require-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw '未检测到 Node.js，请先安装 Node.js >= 18'
  }
  $major = [int](node -p "process.versions.node.split('.')[0]")
  if ($major -lt 18) { throw "Node.js 版本过低（需要 >= 18），当前: $(node -v)" }
}

function Require-Git {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw '未检测到 git，请先安装 Git for Windows'
  }
}

function Clone-Repo {
  Require-Git
  if (Test-Path $InstallDir) {
    throw "目录已存在: $InstallDir，请改用 update 或删除后重试"
  }
  Write-Info "克隆仓库到 $InstallDir ..."
  git clone --branch $Branch --depth 1 $Repo $InstallDir
  Write-Ok '克隆完成'
}

function Pull-Latest {
  Require-Git
  if (-not (Test-Path (Join-Path $InstallDir '.git'))) {
    throw "未找到 Git 仓库: $InstallDir"
  }
  Push-Location $InstallDir
  Write-Info "拉取最新代码 ($Branch) ..."
  git fetch origin $Branch
  git checkout $Branch
  git pull origin $Branch
  Pop-Location
  Write-Ok '代码已更新'
}

function Install-Deps {
  Push-Location $InstallDir
  Write-Info '安装 npm 依赖 ...'
  if (Test-Path 'package-lock.json') { npm ci } else { npm install }
  Pop-Location
  Write-Ok '依赖安装完成'
}

function Build-Project {
  Push-Location $InstallDir
  Write-Info '构建项目 ...'
  npm run build
  Pop-Location
  Write-Ok '构建完成'
}

function Stop-Service {
  if (Test-Path $PidFile) {
    $pid = Get-Content $PidFile | Select-Object -First 1
    if ($pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)) {
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      Write-Ok "已停止进程 $pid"
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    return
  }
  Write-Warn '未找到运行中的 DevHub 进程'
}

function Start-Service {
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  Stop-Service
  Push-Location $InstallDir
  $outLog = Join-Path $LogDir 'out.log'
  $errLog = Join-Path $LogDir 'error.log'
  Write-Info '启动 DevHub 服务 ...'
  $proc = Start-Process -FilePath 'node' `
    -ArgumentList @('dist/index.js', '--no-open', '--port', $Port) `
    -WorkingDirectory $InstallDir `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden `
    -PassThru
  $proc.Id | Out-File -FilePath $PidFile -Encoding ascii
  Pop-Location
  Start-Sleep -Seconds 2
  Write-Ok "DevHub 已运行: http://localhost:$Port"
}

function Show-Status {
  if (Test-Path $PidFile) {
    $pid = Get-Content $PidFile | Select-Object -First 1
    $running = $pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)
    Write-Host "进程 PID: $pid"
    Write-Host "状态: $(if ($running) { 'running' } else { 'stopped' })"
  } else {
    Write-Host '状态: stopped'
  }
  Write-Host "安装目录: $InstallDir"
  Write-Host "访问地址: http://localhost:$Port"
}

switch ($Command) {
  'install' {
    Require-Node
    if (-not (Test-Path (Join-Path $InstallDir '.git'))) { Clone-Repo } else { Write-Warn '仓库已存在，跳过克隆' }
    Install-Deps
    Build-Project
    Start-Service
    Write-Ok "安装完成！访问 http://localhost:$Port"
  }
  'update' {
    Require-Node
    Pull-Latest
    Install-Deps
    Build-Project
    Start-Service
    Write-Ok "更新完成！访问 http://localhost:$Port"
  }
  'status' { Show-Status }
  'stop' { Stop-Service }
  default {
    Write-Host @'
DevHub Windows 安装工具

用法:
  install   首次安装
  update    更新并重启
  status    查看状态
  stop      停止服务

一键安装:
  irm https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.ps1 | iex

带参数:
  & { $env:DEVHUB_PORT='3300'; irm .../install.ps1 | iex }; install.ps1 install
'@
  }
}
