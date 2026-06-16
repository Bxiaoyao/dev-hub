# DevHub 部署运行文档

## 目录

1. [环境要求](#环境要求)
2. [快速开始](#快速开始)
3. [安装方式](#安装方式)
4. [本地开发](#本地开发)
5. [生产部署](#生产部署)
6. [配置说明](#配置说明)
7. [常见问题](#常见问题)

---

## 环境要求

### 系统要求
- **操作系统**: macOS 10.15+ / Linux (Ubuntu 20.04+, Debian 11+)
- **Node.js**: 18.0.0 或更高版本
- **npm/pnpm/yarn**: 任一包管理器

### 推荐版本
```bash
# Node.js
node >= 18.0.0

# 包管理器（推荐 pnpm）
pnpm >= 8.0.0
npm >= 9.0.0
yarn >= 3.0.0
```

### 检查环境
```bash
# 检查 Node 版本
node --version

# 检查 npm 版本
npm --version

# 如使用 pnpm
pnpm --version
```

---

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-org/devhub.git
cd devhub
```

### 2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
pnpm install
```

### 3. 构建项目
```bash
# 构建服务端和前端
npm run build

# 或分别构建
npm run build:server  # 仅构建服务端
npm run build:web     # 仅构建前端
```

### 4. 启动服务
```bash
# 启动 Web UI（默认端口 3200）
npm run dev

# 或指定端口
npm run dev -- --port 3300

# 或不自动打开浏览器
npm run dev -- --no-open
```

浏览器将自动打开 `http://localhost:3200`

---

## 安装方式

### 方式一：本地运行（开发模式）

适用于开发调试：

```bash
# 安装依赖
npm install

# 开发模式（同时启动前后端）
npm run dev:all

# 或分别启动
npm run dev:server   # 启动服务端 (localhost:3200)
npm run dev:web      # 启动前端开发服务器 (localhost:5173)
```

**开发模式特性**:
- 服务端使用 `tsx` 实时编译 TypeScript
- 前端使用 Vite 热更新
- API 请求自动代理到服务端

---

### 方式二：生产构建

适用于生产环境：

```bash
# 构建
npm run build

# 启动（使用构建产物）
npm start
```

**构建产物位置**:
- 服务端: `dist/`
- 前端: `dist/web/`

---

### 方式三：全局安装

将 DevHub 安装为全局命令：

```bash
# 在项目目录下
npm link

# 或
npm install -g .

# 之后可在任意目录运行
devhub            # 启动 Web UI
devhub list       # CLI 模式
```

---

### 方式四：npm 发布（未发布）

```bash
# 构建
npm run build

# 发布到 npm
npm publish

# 用户安装
npm install -g devhub
```

---

## 本地开发

### 开发命令

```bash
# 同时启动前后端开发服务器
npm run dev:all

# 仅启动服务端
npm run dev:server

# 仅启动前端
npm run dev:web

# 监听服务端代码变化
npm run dev
```

### 开发端口

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| 服务端 | 3200 | Express API 服务 |
| 前端开发服务器 | 5173 | Vite 开发服务器 |

### 前端开发代理

开发模式下，前端请求自动代理到服务端：

```javascript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3200',
      changeOrigin: true,
    },
  },
}
```

### 开发调试

**调试服务端**:
```bash
# 使用 Node.js 调试模式
node --inspect dist/index.js
```

**调试前端**:
- 浏览器开发者工具
- React DevTools 扩展

---

## 生产部署

### 构建

```bash
# 完整构建
npm run build

# 检查构建产物
ls -la dist/
ls -la dist/web/
```

### 启动服务

```bash
# 直接启动
npm start

# 或使用 node
node dist/index.js

# 指定端口
node dist/index.js --port 3300
```

### 后台运行

**使用 PM2**:
```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start dist/index.js --name devhub

# 查看状态
pm2 status

# 查看日志
pm2 logs devhub

# 停止
pm2 stop devhub

# 重启
pm2 restart devhub
```

**使用 systemd (Linux)**:
```bash
# 创建服务文件
sudo nano /etc/systemd/system/devhub.service
```

```ini
[Unit]
Description=DevHub Project Manager
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/devhub
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 启用服务
sudo systemctl enable devhub

# 启动服务
sudo systemctl start devhub

# 查看状态
sudo systemctl status devhub
```

### 端口配置

**修改默认端口**:
```bash
# 命令行参数
devhub --port 3300

# 或环境变量
PORT=3300 devhub
```

**服务端代码**:
```javascript
// src/server/index.ts
const port = options.port || process.env.PORT || 3200;
```

### 防火墙配置

**开放端口**:
```bash
# Linux (ufw)
sudo ufw allow 3200

# macOS
# 系统偏好设置 > 安全性与隐私 > 防火墙选项
```

---

## 配置说明

### 配置文件位置

```
~/.devhub/
  config.yaml          # 全局配置
  cache/
    devhub.db          # SQLite 缓存
  snapshots/          # 快照存储
  templates/          # 项目模板
```

### 初始化配置

首次运行时自动创建默认配置：

```yaml
workspace:
  roots:
    - ~/Projects
    - ~/Work
  maxDepth: 2
  ignore:
    - node_modules
    - .turbo
    - dist
    - .next
    - build
    - .cache

editor:
  default: cursor
  fallback:
    - code

terminal:
  default: terminal

hooks:
  afterClone:
    - "{packageManager} install"
  afterBranchSwitch:
    - "{packageManager} install"

display:
  dateFormat: relative
  showSize: false
  theme: auto

export:
  defaultFormat: yaml
  includeHooks: true
```

### 自定义配置

**修改扫描目录**:
```yaml
workspace:
  roots:
    - ~/Projects
    - ~/Code
    - ~/Developer
  maxDepth: 3  # 增加扫描深度
```

**修改默认编辑器**:
```yaml
editor:
  default: code  # VS Code
  fallback:
    - cursor
    - webstorm
```

**自定义 hooks**:
```yaml
hooks:
  afterClone:
    - "{packageManager} install"
    - "cp .env.example .env"
  afterBranchSwitch:
    - "{packageManager} install"
```

### 配置验证

```bash
# 查看当前配置
devhub --help

# 或直接查看配置文件
cat ~/.devhub/config.yaml
```

---

## Shell 补全

### 安装补全脚本

**zsh**:
```bash
# 复制补全脚本
mkdir -p ~/.zsh/completions
cp completions/zsh/_devhub ~/.zsh/completions/

# 添加到 .zshrc（如果尚未添加）
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc

# 重新加载
source ~/.zshrc
```

**bash**:
```bash
# 添加到 .bashrc
source completions/bash/devhub

# 重新加载
source ~/.bashrc
```

**fish**:
```bash
# 复制补全脚本
cp completions/fish/devhub.fish ~/.config/fish/completions/

# 重新加载
source ~/.config/fish/config.fish
```

### 使用补全

```bash
# 输入命令后按 Tab
devhub <Tab>          # 显示所有命令
devhub git <Tab>      # 显示 git 子命令
devhub open <Tab>     # 显示项目名（需要先运行 scan）
```

---

## 常见问题

### 1. 端口被占用

**错误信息**:
```
Error: listen EADDRINUSE: address already in use :::3200
```

**解决方案**:
```bash
# 查找占用进程
lsof -i :3200

# 终止进程
kill -9 <PID>

# 或更换端口
devhub --port 3300
```

### 2. Node 版本过低

**错误信息**:
```
Error: Node.js version 16.x is not supported
```

**解决方案**:
```bash
# 升级 Node.js
# 使用 nvm
nvm install 18
nvm use 18

# 或使用 npm
npm install -g n
n 18
```

### 3. 权限问题

**错误信息**:
```
Error: EACCES: permission denied
```

**解决方案**:
```bash
# 修复 npm 权限
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# 或使用 sudo（不推荐）
sudo npm install -g devhub
```

### 4. 缓存问题

**清除缓存**:
```bash
# 删除缓存目录
rm -rf ~/.devhub/cache

# 或通过 CLI（如已实现）
devhub cache clear
```

### 5. Git 命令失败

**检查 Git 安装**:
```bash
# 确保 Git 已安装
git --version

# 配置 Git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 6. 编辑器无法打开

**检查编辑器命令**:
```bash
# macOS
which cursor
which code

# 如未找到，需安装编辑器或配置 PATH
```

**配置自定义编辑器**:
```yaml
editor:
  custom:
    - name: My Editor
      command: /path/to/editor
```

### 7. 前端构建失败

**检查 Tailwind 配置**:
```bash
# 确保 postcss 配置正确
cat postcss.config.js

# 应包含
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
```

### 8. SQLite 错误

**安装 better-sqlite3**:
```bash
# 可能需要重新安装
npm rebuild better-sqlite3

# macOS 可能需要
brew install sqlite
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端端口 | 3200 |
| `DEVHUB_CONFIG` | 配置文件路径 | ~/.devhub/config.yaml |
| `DEVHUB_CACHE_DIR` | 缓存目录 | ~/.devhub/cache |
| `NODE_ENV` | 运行环境 | development |

**使用示例**:
```bash
PORT=3300 NODE_ENV=production devhub
```

---

## 日志

### 查看日志

**PM2 日志**:
```bash
pm2 logs devhub
```

**systemd 日志**:
```bash
journalctl -u devhub -f
```

**手动运行日志**:
```bash
# 输出到文件
devhub > devhub.log 2>&1

# 或使用 tee
devhub 2>&1 | tee devhub.log
```

---

## 停止服务

```bash
# PM2
pm2 stop devhub

# systemd
sudo systemctl stop devhub

# 手动运行
Ctrl + C
```

---

## 更新升级

```bash
# 拉取最新代码
git pull

# 更新依赖
npm install

# 重新构建
npm run build

# 重启服务
npm start
# 或 pm2 restart devhub
```

---

## 目录结构

```
devhub/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── postcss.config.js
├── tailwind.config.ts
├── completions/
│   ├── zsh/_devhub
│   ├── bash/devhub
│   └── fish/devhub.fish
├── docs/
│   ├── FEATURES.md
│   └── DEPLOYMENT.md
├── src/
│   ├── index.ts              # CLI 入口
│   ├── server/
│   │   ├── index.ts          # Express 服务
│   │   ├── router.ts         # API 路由
│   │   └── routes/
│   │       ├── projects.ts
│   │       ├── git.ts
│   │       ├── deps.ts
│   │       ├── batch.ts
│   │       ├── export.ts
│   │       ├── import.ts
│   │       └── config.ts
│   ├── web/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── lib/
│   ├── core/
│   │   ├── scanner.ts
│   │   ├── git.ts
│   │   ├── deps.ts
│   │   ├── size.ts
│   │   ├── export.ts
│   │   ├── import.ts
│   │   ├── snapshot.ts
│   │   ├── hooks.ts
│   │   └── health.ts
│   ├── cli/
│   │   ├── list.ts
│   │   ├── batch.ts
│   │   ├── export.ts
│   │   └── ...
│   ├── utils/
│   │   ├── config.ts
│   │   ├── cache.ts
│   │   └ and format.ts
│   └── types/
│       └ index.ts
├── dist/                      # 构建产物
│   ├── index.js
│   ├── ...                    # 服务端编译产物
│   └── web/
│       ├── index.html
│       └── assets/
└── node_modules/
```

---

## 开发团队

如有问题或建议，请提交 Issue 或 Pull Request。

**项目仓库**: https://github.com/your-org/devhub

**文档更新**: 2026-06-16