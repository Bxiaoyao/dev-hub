# DevHub

一站式管理本地开发项目：项目浏览、分支管理、依赖管理、环境导出/导入、一键启动编辑器。

## 环境要求

- **Node.js** >= 18
- **操作系统**：macOS / Linux（本地开发工具，默认监听 `localhost`）

## 快速开始

```bash
# 安装依赖
npm install

# 构建（首次运行或前端有改动后需要执行）
npm run build

# 启动 Web UI（默认 http://localhost:3200，自动打开浏览器）
npm run dev
```

> 服务端通过 Express 托管 `dist/web/` 静态资源。**未执行 `npm run build` 时 Web 界面无法正常显示。**

## 开发模式

前后端分离开发（Vite 热更新 + API 代理）：

```bash
npm run dev:all
```

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:5173 | Vite 开发服务器，支持热更新 |
| 后端 | http://localhost:3200 | Express API，`/api` 请求由 Vite 代理 |

仅调试后端时可使用 `npm run dev:server`；仅调试前端时可使用 `npm run dev:web`（需后端已在 3200 端口运行）。

## 打包与部署

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

### 多台电脑统一部署（方案 B）

每台电脑本地跑一份 DevHub（负责扫本机目录、执行 Git/编辑器命令），用同一条脚本安装和更新。

**首次安装**（公开仓库，默认安装到 `~/dev-hub`）：

```bash
curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- install
```

**发布新版本后，三台各执行一次更新**：

```bash
curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- update
```

已在仓库目录内时，也可本地执行：

```bash
./scripts/install.sh update
# 或
npm run update
```

常用子命令：`install` / `update` / `status` / `logs` / `restart` / `stop`

可选环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEVHUB_INSTALL_DIR` | `~/dev-hub` | 安装目录 |
| `DEVHUB_PORT` | `3200` | 服务端口 |
| `DEVHUB_BRANCH` | `main` | Git 分支 |

**私有仓库**：无法用 `curl` 拉脚本时，先 `git clone git@github.com:Bxiaoyao/dev-hub.git ~/dev-hub`，再执行 `./scripts/install.sh install`。

每台机器的 `~/.devhub/config.yaml`（扫描目录等）相互独立，互不影响。

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
