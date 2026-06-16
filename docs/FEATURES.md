# DevHub 功能说明文档

## 概述

DevHub 是一个一站式本地开发项目管理工具，提供 Web UI 和 CLI 两种使用模式，帮助开发者高效管理本地项目、Git 仓库、依赖和环境配置。

---

## 功能模块

### 1. 项目管理

#### 1.1 项目扫描
- **自动发现**: 递归扫描指定目录下的所有 Git 仓库和 Node.js 项目
- **智能识别**: 自动检测项目类型、包管理器（pnpm/yarn/npm/bun）
- **状态监控**: 实时显示 Git 状态（clean/dirty）、分支同步状态（ahead/behind）

#### 1.2 项目列表（Web UI）

**卡片视图**
```
┌─────────────────────┐
│ my-nextjs-app       │
│ 🟢 main             │
│ ✓ clean             │
│ pnpm · 2h ago       │
│ [Open] [⋯]          │
└─────────────────────┘
```

**表格视图**
| Name | Branch | Status | Package | Modified |
|------|--------|--------|---------|----------|
| my-nextjs-app | main | ✓ clean | pnpm | 2h ago |

**视图切换**: 右上角切换按钮，自动记忆用户偏好

#### 1.3 搜索与过滤
- **搜索**: 按项目名模糊搜索
- **过滤器**:
  - `All` - 显示所有项目
  - `Git` - 仅显示 Git 仓库
  - `Recent` - 最近 7 天活跃的项目
  - `Dirty` - 有未提交更改的项目
- **排序**: 按最近活跃、名称、分支排序

---

### 2. 项目详情

点击项目卡片进入详情页，展示：

#### 2.1 概览面板
- 项目路径
- 当前分支（含 ahead/behind 状态）
- 远程仓库地址
- 包管理器
- 最后修改时间

#### 2.2 分支管理
- 列出所有本地和远程分支
- 当前分支高亮显示
- 点击分支名快速切换（自动检测未提交更改）
- 分支切换确认弹窗（支持 stash 选项）

#### 2.3 Git 操作
| 操作 | 说明 |
|------|------|
| Pull | 从远程拉取最新代码 |
| Fetch | 获取所有远程更新并清理过期引用 |
| Stash | 暂存当前更改 |
| Stash Pop | 恢复暂存的更改 |
| Create PR | 自动检测远程平台，打开 PR 创建页面 |

#### 2.4 Git Log
展示最近 20 条提交记录：
```
abc1234 fix: auth flow (2h ago)
def5678 feat: add dashboard (1d ago)
ghi9012 chore: update deps (3d ago)
```

---

### 3. 依赖管理

#### 3.1 安装依赖
- 自动检测包管理器
- 一键执行 `pnpm install` / `yarn` / `npm install` / `bun install`

#### 3.2 查看过时包
表格展示可升级的依赖：
| Package | Current | Latest | Action |
|---------|---------|--------|--------|
| react | 18.2.0 | 19.0.0 | [Upgrade] |
| next | 14.2.3 | 15.0.0 | [Upgrade] |

#### 3.3 升级包
- 单包升级: 选择要升级的包，点击升级
- 批量升级: 勾选多个包，一键升级

#### 3.4 安全审计
执行 `npm audit` / `pnpm audit`，显示安全漏洞数量

#### 3.5 依赖树
弹窗展示项目依赖层级结构，支持展开/折叠

---

### 4. 磁盘空间分析

#### 4.1 空间占用图
```
node_modules   ████████████████████  856 MB   [Clean]
.next          ████                  180 MB   [Clean]
dist           █                     45 MB    [Clean]
.git           █                     32 MB    [Keep]
src            ▏                     12 MB    [Keep]
─────────────────────────────────────────────────────
Total: 1.2 GB
```

#### 4.2 清理功能
- 单项清理: 点击 `[Clean]` 按钮清理指定目录
- 批量清理: 勾选多个目录，一键清理
- 可清理目录: `node_modules`, `dist`, `.next`, `build`, `.turbo`

---

### 5. 批量操作

#### 5.1 项目选择
- 空格键选择/取消选择
- 全选/取消全选
- 底部显示已选数量

#### 5.2 批量操作栏
```
☑ 3 projects selected
[📦 Install] [🔄 Pull] [🧹 Clean] [✕ Clear]
```

#### 5.3 执行进度
弹窗显示实时进度：
```
Batch Install

my-nextjs-app     ✅ Done (12s)
express-api       ✅ Done (8s)
react-lib         🔄 Running...
old-project       ⏳ Waiting

Progress: ████████░░░░  2/4     [Cancel]
```

#### 5.4 取消操作
- 随时点击 `Cancel` 取消批量操作
- 已完成的操作保留，未执行的跳过

---

### 6. 环境导出/导入

#### 6.1 导出 (Export)
生成 YAML 配置文件：
```yaml
version: 1
generated: 2026-06-16T12:00:00+08:00
projects:
  - name: my-nextjs-app
    git: git@github.com:user/my-nextjs-app.git
    branch: main
    packageManager: pnpm
    hooks:
      afterClone: pnpm install
```

**导出选项**:
- 仅导出 Git 项目
- 包含/排除分支信息
- 包含/排除 hooks

#### 6.2 导入 (Import)
从 YAML 文件批量克隆项目：
```bash
devhub import -f projects.yaml -d ~/Projects
```

**导入流程**:
1. 克隆仓库
2. 切换到指定分支
3. 执行 hooks (如 `pnpm install`)

**导入选项**:
- `--skip-hooks`: 跳过 hooks 执行
- `--parallel N`: 并行克隆数量（默认 3）
- `--force`: 覆盖已存在的目录
- `--dry-run`: 预览模式

---

### 7. 环境快照

#### 7.1 创建快照
```bash
devhub snapshot save -n "mac-mini-setup"
```

快照包含：
- 项目列表（名称、Git 地址、分支）
- 全局安装的 npm/pnpm 包列表
- Node 版本
- 编辑器配置

#### 7.2 恢复快照
```bash
devhub snapshot restore -n "mac-mini-setup"
```

#### 7.3 管理快照
```bash
devhub snapshot list      # 列出所有快照
devhub snapshot delete -n "name"  # 删除快照
```

---

### 8. 健康检查

#### 8.1 检查项目
扫描所有项目，检测问题：
- Git 未提交的更改
- 落后远程 N 个 commit
- `node_modules` 不存在
- 缺少 `package-lock.json`
- 安全漏洞
- `.env.example` 存在但 `.env` 不存在

#### 8.2 健康报告
```
Project Health Report:

  my-nextjs-app    ⚠ 2 issues
    - 12 commits behind origin/main
    - 3 security vulnerabilities

  express-api      ✅ healthy

  old-project      ✗ 3 issues
    - No remote configured
    - node_modules missing
    - .env missing (have .env.example)
```

#### 8.3 自动修复
部分问题支持一键修复：
- `Pull` 修复落后远程
- `Install` 修复缺少依赖

---

### 9. 编辑器集成

#### 9.1 支持的编辑器
- Cursor
- VS Code
- WebStorm
- 自定义编辑器（配置文件指定）

#### 9.2 智能检测
1. 读取配置文件中的默认编辑器
2. 检测系统 PATH 中可用的编辑器
3. 多个可用时让用户选择

#### 9.3 快速打开
- 详情页按 `O` 键打开
- 批量选中后批量打开（多窗口）

---

### 10. 终端快捷入口

支持打开系统终端并自动 cd 到项目目录：
- macOS Terminal
- iTerm2
- Warp
- 自定义终端

---

### 11. Hook 系统

#### 11.1 内置 Hook 事件
| 事件 | 触发时机 |
|------|----------|
| `afterClone` | 克隆完成后 |
| `afterBranchSwitch` | 切换分支后 |
| `beforeClean` | 清理前 |
| `afterImport` | 单个项目导入完成后 |

#### 11.2 Hook 配置

**全局 hooks** (`~/.devhub/config.yaml`):
```yaml
hooks:
  afterClone:
    - "{packageManager} install"
  afterBranchSwitch:
    - "{packageManager} install"
```

**项目级 hooks** (项目根目录 `.devhub.yaml`):
```yaml
hooks:
  afterClone:
    - cp .env.example .env
    - pnpm install
    - pnpm db:migrate
```

#### 11.3 占位符变量
| 变量 | 说明 |
|------|------|
| `{packageManager}` | 自动检测的包管理器 |
| `{projectDir}` | 项目目录路径 |
| `{branch}` | 当前分支名 |

---

### 12. SQLite 缓存

#### 12.1 缓存内容
- 项目索引（加速启动）
- 操作历史记录

#### 12.2 缓存位置
```
~/.devhub/cache/devhub.db
```

#### 12.3 缓存策略
- 默认缓存有效期：5 分钟
- 项目变更后自动更新缓存
- 支持手动清除缓存

---

## Web UI 功能

### 主题切换
- 浅色模式 ☀️
- 深色模式 🌙
- 跟随系统 💻

### 视图切换
- 卡片视图 ▤
- 表格视图 ≡
- 自动记忆偏好

### 快捷键
| 按键 | 功能 |
|------|------|
| `↑` `↓` | 导航 |
| `Enter` | 进入详情 |
| `Space` | 选择/取消选择 |
| `Esc` | 返回 |

---

## CLI 命令

### 基础命令
```bash
devhub                    # 启动 Web UI
devhub --port 3300        # 指定端口
devhub --no-open          # 不自动打开浏览器
devhub list               # 列出项目
devhub list --json        # JSON 输出
devhub info <project>     # 项目详情
devhub open <project>     # 打开编辑器
```

### Git 操作
```bash
devhub git <project> pull
devhub git <project> fetch
devhub git <project> status
devhub git <project> checkout <branch>
```

### 依赖管理
```bash
devhub deps <project> install
devhub deps <project> update <package>
devhub deps <project> audit
```

### 批量操作
```bash
devhub batch install      # 批量安装
devhub batch pull         # 批量拉取
devhub batch clean        # 批量清理
devhub batch check        # 批量检查
```

### 导入导出
```bash
devhub export -o projects.yaml
devhub import -f projects.yaml -d ~/Projects
```

### 快照
```bash
devhub snapshot save -n "name"
devhub snapshot restore -n "name"
devhub snapshot list
devhub snapshot delete -n "name"
```

---

## 配置文件

### 配置路径
`~/.devhub/config.yaml`

### 完整配置示例
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
  custom:
    - name: VS Code Insiders
      command: code-insiders

terminal:
  default: terminal  # terminal | iterm2 | warp
  custom: null

hooks:
  afterClone:
    - "{packageManager} install"
  afterBranchSwitch:
    - "{packageManager} install"

display:
  dateFormat: relative  # relative | absolute
  showSize: false
  theme: auto  # auto | dark | light

export:
  defaultFormat: yaml  # yaml | json
  includeHooks: true
```

---

## 数据存储

```
~/.devhub/
  config.yaml          # 全局配置
  templates/           # 项目模板
    nextjs-app-router/
    vite-react/
    ...
  snapshots/           # 环境快照
    mac-mini-setup.yaml
  cache/
    devhub.db          # SQLite 缓存
```
