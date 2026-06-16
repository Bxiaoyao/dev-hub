# DevHub

一站式管理本地开发项目：项目浏览、分支管理、依赖管理、环境导出/导入、一键启动编辑器。

## 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动 Web UI
npm run dev
```

浏览器自动打开 http://localhost:3200

## 文档

- [功能说明文档](docs/FEATURES.md) - 详细功能介绍
- [部署运行文档](docs/DEPLOYMENT.md) - 安装、开发、部署指南

## 主要功能

### Web UI
- 卡片/表格视图切换
- 项目搜索和过滤
- 分支管理
- Git 操作面板
- 依赖管理
- 空间分析
- 批量操作
- 健康检查
- 深色/浅色主题

### CLI
- 所有 Web UI 功能的 CLI 版本
- Shell 补全 (zsh/bash/fish)

## 常用命令

```bash
devhub                      # 启动 Web UI
devhub list                 # 列出项目
devhub info <project>       # 项目详情
devhub open <project>       # 打开编辑器
devhub batch install        # 批量安装依赖
devhub snapshot save -n x   # 保存快照
```

## 技术栈

- TypeScript + Node.js
- Express.js (后端)
- React + Tailwind + Vite (前端)
- SQLite (缓存)
- simple-git
- YAML 配置

## License

MIT