# DevHub

一站式管理本地开发项目：项目浏览、分支管理、依赖管理、环境导出/导入、一键启动编辑器。

## 环境要求

- **Node.js** >= 18
- **Git**
- **操作系统**：macOS / Linux / Windows（本地工具，默认监听 `localhost`）

> Windows 推荐使用 PowerShell 执行 `install.ps1`；macOS / Linux 使用 `install.sh`。Git Bash 也可运行 `install.sh`。

## 推荐工作流（开发 vs 运行）

| | 开发调试（本地克隆仓库） | 日常使用（方案 A 安装实例） |
|--|--|--|
| **目录** | 任意路径，如 `~/project/.../项目管理` | 固定 `~/dev-hub` |
| **用途** | 改代码、调试功能 | 扫本机项目、日常管理 |
| **访问地址** | http://localhost:5173（`dev:all`） | http://localhost:3200 |
| **更新方式** | `git pull` / 自行 merge | `curl ... \| bash -s -- update` |

**要点：**

- `curl ... install` / `update` 只作用于 **`~/dev-hub`**，不会自动找到你的开发仓库。
- 开发时**不要用 3200 端口**，避免与 `~/dev-hub` 冲突；本地开发默认使用 **3300**（API）+ **5173**（前端）。
- 发布流程：开发仓库 `git push` → 各机器对 `~/dev-hub` 执行一键 `update`。

## 快速开始（开发仓库）

```bash
# 安装依赖
npm install

# 构建（首次运行或前端有改动后需要执行）
npm run build

# 启动 Web UI（开发端口 3300，避免与 ~/dev-hub 的 3200 冲突）
npm run dev
```

> 服务端通过 Express 托管 `dist/web/` 静态资源。**未执行 `npm run build` 时 Web 界面无法正常显示。**  
> 若已用方案 A 安装 `~/dev-hub`，日常请访问 http://localhost:3200，无需在开发仓库再启一份。

## 开发模式

前后端分离开发（Vite 热更新 + API 代理）：

```bash
npm run dev:all
```

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:5173 | Vite 开发服务器，支持热更新 |
| 后端 | http://localhost:3300 | Express API（开发端口），`/api` 由 Vite 代理 |

仅调试后端时可使用 `npm run dev:server`；仅调试前端时可使用 `npm run dev:web`（需后端已在 3300 端口运行）。

自定义开发 API 端口：`DEVHUB_DEV_PORT=3400 npm run dev:all`

## 打包与部署

### GitHub 一键部署（推荐）

从 GitHub 拉取安装脚本，自动完成：克隆仓库 → 安装依赖 → 构建 → 启动服务。  
默认安装目录为 `~/dev-hub`（Windows：`%USERPROFILE%\dev-hub`），**运行实例固定使用端口 `3200`**。

> 与上文「开发仓库」分离：开发调试用 3300/5173，日常管理用本节的 `~/dev-hub` + 3200。

#### macOS / Linux

```bash
# 一键安装
curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- install

# 一键更新（发布新版本后，更新 ~/dev-hub 运行实例）
curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- update
```

> 若尚未执行过 `install`，`update` 会报错「未找到 Git 仓库: ~/dev-hub」，请先运行 `install`。

已在安装目录内时，可本地执行：

```bash
cd ~/dev-hub
./scripts/install.sh install    # 首次安装
./scripts/install.sh update     # 更新
./scripts/install.sh status     # 查看状态
./scripts/install.sh logs       # 查看日志
./scripts/install.sh restart    # 重启
./scripts/install.sh stop       # 停止
```

| 子命令 | 说明 |
|--------|------|
| `install` | 首次安装（克隆、构建、PM2 启动） |
| `update` | 拉取最新代码并重新构建、重启 |
| `status` | 查看运行状态 |
| `logs` | 查看日志 |
| `restart` | 重启服务 |
| `stop` | 停止服务 |

#### Windows（PowerShell）

```powershell
# 一键安装（下载脚本后执行 install）
iwr -useb https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.ps1 -OutFile $env:TEMP\devhub-install.ps1
& $env:TEMP\devhub-install.ps1 install

# 一键更新
& $env:USERPROFILE\dev-hub\scripts\install.ps1 update
```

已在安装目录内时：

```powershell
cd $env:USERPROFILE\dev-hub
.\scripts\install.ps1 install
.\scripts\install.ps1 update
.\scripts\install.ps1 status
.\scripts\install.ps1 stop
```

| 子命令 | 说明 |
|--------|------|
| `install` | 首次安装（克隆、构建、后台启动） |
| `update` | 拉取最新代码并重新构建、重启 |
| `status` | 查看运行状态 |
| `stop` | 停止服务 |

#### 可选环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEVHUB_INSTALL_DIR` | `~/dev-hub` | 安装目录 |
| `DEVHUB_PORT` | `3200` | 服务端口 |
| `DEVHUB_BRANCH` | `main` | Git 分支 |
| `DEVHUB_REPO` | `https://github.com/Bxiaoyao/dev-hub.git` | 仓库地址 |

示例（指定端口 3300）：

```bash
# macOS / Linux
DEVHUB_PORT=3300 curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- install
```

```powershell
# Windows
$env:DEVHUB_PORT = '3300'
& $env:TEMP\devhub-install.ps1 install
```

**私有仓库**：无法通过 `curl` / `irm` 拉脚本时，先 `git clone` 到安装目录，再执行本地 `install` 子命令。

每台机器的 `~/.devhub/config.yaml`（扫描目录等）相互独立，互不影响。

### 卸载 / 清理

#### macOS / Linux

```bash
# 1. 停止服务
curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- stop
# 或本地：~/dev-hub/scripts/install.sh stop

# 2. 移除 PM2 进程（若使用 PM2 安装）
pm2 delete devhub 2>/dev/null; pm2 save 2>/dev/null

# 3. 删除安装目录
rm -rf ~/dev-hub

# 4.（可选）删除用户配置与缓存
rm -rf ~/.devhub
```

#### Windows（PowerShell）

```powershell
# 1. 停止服务
& $env:USERPROFILE\dev-hub\scripts\install.ps1 stop

# 2. 删除安装目录（安装失败时可单独执行此步后重装）
Remove-Item -Recurse -Force $env:USERPROFILE\dev-hub

# 3.（可选）删除用户配置与缓存
Remove-Item -Recurse -Force $env:USERPROFILE\.devhub
```

安装失败需重装时，先删除安装目录（Windows 步骤 2 / macOS·Linux 步骤 3），再重新运行一键安装命令。

### 本地生产运行

```bash
npm run build   # 编译服务端 → dist/，打包前端 → dist/web/
node dist/index.js   # 推荐：直接运行编译产物
# 或
npm start       # 通过 bin/devhub.mjs 启动（依赖 tsx，适合本地使用）
```

指定端口：

```bash
npm run dev -- --port 3300    # 开发模式
node dist/index.js --port 3300  # 生产模式（需先 build）
```

### 后台守护进程（PM2）

```bash
npm run build
npm run start:daemon    # 构建并后台启动
npm run stop:daemon     # 停止服务
```

也可使用 `./scripts/devhub-start.sh`（支持 `start` / `stop` / `restart` / `logs` / `status` 等命令）。详见 [部署运行文档](docs/DEPLOYMENT.md)。

### 全局安装 CLI

```bash
npm run build
npm link              # 或 npm install -g .

devhub                # 启动 Web UI
devhub list           # 列出项目
```

## 配置

配置文件位于 `~/.devhub/config.yaml`，可在 Web UI **设置** 页面中编辑，包括：

- 默认编辑器 / 终端
- 工作区扫描目录
- Git 凭据（SSH / HTTPS）

详见 [Git 凭据配置](docs/git-credentials.md)。

## 文档

- [功能说明](docs/FEATURES.md)
- [部署运行](docs/DEPLOYMENT.md) — 安装、开发、生产部署、PM2/systemd
- [Git 凭据配置](docs/git-credentials.md)
- [Git 凭据配置示例](docs/git-credentials-example.md)

## 主要功能

### Web UI

- 卡片 / 表格视图切换
- 项目搜索、过滤与目录扫描
- 分支管理与 Git 操作
- 依赖管理与空间分析
- 批量操作（Pull、安装、升级、提交、推送等）
- 健康检查
- 全局设置（编辑器、终端、Git 凭据、扫描目录）
- 深色 / 浅色主题

### CLI

- 项目列表、详情、打开编辑器
- Git / 依赖 / 批量操作
- 环境导出 / 导入、快照
- 健康检查
- Shell 补全（zsh / bash / fish，见 `completions/`）

## 常用命令

```bash
devhub                          # 启动 Web UI
devhub list                     # 列出项目
devhub info <project>           # 项目详情
devhub open <project>           # 打开编辑器
devhub git <project> pull       # Git 拉取
devhub deps <project> install   # 安装依赖
devhub batch install            # 批量安装依赖
devhub check                    # 健康检查
devhub check --fix              # 健康检查并自动修复
devhub snapshot save -n <name>  # 保存环境快照
devhub export -o projects.yaml  # 导出项目配置
```

## 技术栈

- TypeScript + Node.js
- Express.js（后端 API）
- React + Tailwind CSS v4 + Vite（前端）
- SQLite（项目缓存）
- simple-git、YAML 配置

## License

MIT
