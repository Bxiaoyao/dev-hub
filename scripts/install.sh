#!/usr/bin/env bash
# DevHub 安装 / 更新脚本
# 可从 GitHub 拉取执行，也可在克隆后的仓库内运行。
#
# 首次安装（公开仓库）:
#   curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- install
#
# 更新:
#   curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- update
#
# 环境变量（可选）:
#   DEVHUB_INSTALL_DIR  安装目录，默认 ~/dev-hub
#   DEVHUB_REPO         Git 仓库地址
#   DEVHUB_BRANCH       分支，默认 main
#   DEVHUB_PORT         端口，默认 3200

set -eo pipefail

export GIT_TERMINAL_PROMPT=0

REPO_URL="${DEVHUB_REPO:-https://github.com/Bxiaoyao/dev-hub.git}"
INSTALL_DIR="${DEVHUB_INSTALL_DIR:-$HOME/dev-hub}"
BRANCH="${DEVHUB_BRANCH:-main}"
PORT="${DEVHUB_PORT:-3200}"
PM2_APP_NAME="devhub"
IS_WINDOWS=0
if [[ "${OS:-}" == "Windows_NT" ]] || [[ "$(uname -s 2>/dev/null)" == MINGW* ]] || [[ "$(uname -s 2>/dev/null)" == MSYS* ]]; then
  IS_WINDOWS=1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# 若脚本在仓库内，优先使用仓库目录（curl 管道执行时跳过）
if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_from_script="$(cd "$script_dir/.." && pwd)"
  if [[ -d "$repo_from_script/.git" && -f "$repo_from_script/package.json" ]]; then
    INSTALL_DIR="$repo_from_script"
  fi
fi

require_node() {
  if ! command -v node &>/dev/null; then
    log_error "未检测到 Node.js，请先安装 Node.js >= 18"
    exit 1
  fi
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$major" -lt 18 ]]; then
    log_error "Node.js 版本过低（需要 >= 18），当前: $(node -v)"
    exit 1
  fi
}

require_git() {
  if ! command -v git &>/dev/null; then
    log_error "未检测到 git"
    exit 1
  fi
}

# GitHub HTTPS 偶发 HTTP/2 framing 错误，默认 HTTP/1.1（可用 DEVHUB_GIT_HTTP_VERSION 覆盖）
GIT_HTTP_VERSION="${DEVHUB_GIT_HTTP_VERSION:-HTTP/1.1}"

git_remote() {
  git -c "http.version=$GIT_HTTP_VERSION" "$@"
}

git_retry() {
  local desc="$1"
  shift
  local attempt=1 max=3
  while [[ $attempt -le $max ]]; do
    if "$@"; then
      return 0
    fi
    if [[ $attempt -lt $max ]]; then
      log_warn "${desc}失败，${attempt}/${max} 次重试..."
      sleep 2
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

require_pm2() {
  if command -v pm2 &>/dev/null; then
    return 0
  fi
  if [[ "$IS_WINDOWS" -eq 1 ]]; then
    log_warn "未检测到 PM2，Windows 将使用 node 直接启动（建议安装: npm install -g pm2）"
    return 1
  fi
  log_info "正在全局安装 PM2..."
  npm install -g pm2
}

start_node_direct() {
  cd "$INSTALL_DIR"
  log_info "使用 node 启动 DevHub ..."
  if command -v pm2 &>/dev/null; then
    pm2 delete "$PM2_APP_NAME" &>/dev/null || true
  fi
  nohup node dist/index.js --no-open --port "$PORT" > "$HOME/.devhub/logs/out.log" 2> "$HOME/.devhub/logs/error.log" &
  sleep 2
  log_ok "DevHub 已运行: http://localhost:${PORT}"
}

clone_repo() {
  require_git
  if [[ -d "$INSTALL_DIR" ]]; then
    log_error "目录已存在: $INSTALL_DIR"
    log_error "若需更新请运行: $0 update"
    exit 1
  fi
  log_info "克隆仓库到 $INSTALL_DIR ..."
  if ! git_retry "克隆" git_remote clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"; then
    log_error "克隆失败，请检查网络；亦可设置 DEVHUB_REPO 为 SSH 地址后重试"
    exit 1
  fi
  log_ok "克隆完成"
}

pull_latest() {
  require_git
  if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    log_error "未找到 Git 仓库: $INSTALL_DIR"
    log_error "请先运行: $0 install"
    exit 1
  fi
  log_info "拉取最新代码 ($BRANCH) ..."
  cd "$INSTALL_DIR"
  # PM2 本地生成的配置，更新前还原避免 git 状态干扰
  git restore ecosystem.config.json 2>/dev/null || git checkout -- ecosystem.config.json 2>/dev/null || true
  pull_latest_once() {
    log_info "  → fetch origin/$BRANCH ..."
    git_remote fetch origin "$BRANCH" &&
      { log_info "  → checkout $BRANCH ..."; git checkout "$BRANCH"; } &&
      { log_info "  → pull origin/$BRANCH ..."; git_remote pull origin "$BRANCH"; }
  }
  if ! git_retry "拉取" pull_latest_once; then
    log_error "拉取失败，请检查网络连接"
    log_info "可手动尝试: git -c http.version=HTTP/1.1 pull origin $BRANCH"
    exit 1
  fi
  log_ok "代码已更新"
}

install_deps() {
  cd "$INSTALL_DIR"
  log_info "安装 npm 依赖（可能需要 1～3 分钟，请耐心等待）..."
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --fund=false
  else
    npm install --no-audit --fund=false
  fi
  log_ok "依赖安装完成"
}

build_project() {
  cd "$INSTALL_DIR"
  log_info "构建项目（编译前后端）..."
  npm run build
  log_ok "构建完成"
}

clear_projects_cache() {
  rm -f "${HOME}/.devhub/cache/projects.json" 2>/dev/null || true
  rm -rf "${HOME}/.devhub/cache/details" 2>/dev/null || true
  log_ok "已清除项目列表缓存（重启后将重新扫描）"
}

write_pm2_ecosystem() {
  cd "$INSTALL_DIR"
  mkdir -p "$HOME/.devhub/logs" 2>/dev/null || true
  node "$INSTALL_DIR/scripts/write-ecosystem.mjs" "$INSTALL_DIR" "$PORT"
  log_ok "已写入 PM2 配置"
}

load_pm2_startup() {
  local lib="$INSTALL_DIR/scripts/pm2-startup.sh"
  if [[ ! -f "$lib" ]]; then
    lib="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pm2-startup.sh"
  fi
  if [[ ! -f "$lib" ]]; then
    log_error "未找到 pm2-startup.sh"
    return 1
  fi
  # shellcheck source=scripts/pm2-startup.sh
  source "$lib"
}

start_pm2() {
  cd "$INSTALL_DIR"
  mkdir -p "$HOME/.devhub/logs"
  if ! require_pm2; then
    start_node_direct
    log_warn "node 直接启动不会在系统重启后自动恢复，建议安装 PM2 后重新运行 install"
    return
  fi
  load_pm2_startup || return
  write_pm2_ecosystem
  if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
    log_info "重启 PM2 进程 ..."
    pm2 restart "$PM2_APP_NAME"
  else
    log_info "启动 PM2 进程 ..."
    pm2 start ecosystem.config.json
    pm2 save
  fi
  setup_pm2_startup || true
  log_ok "DevHub 已运行: http://localhost:${PORT}"
  pm2 status "$PM2_APP_NAME"
}

cmd_install() {
  require_node
  if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    clone_repo
  else
    log_warn "仓库已存在，跳过克隆"
  fi
  install_deps
  build_project
  start_pm2
  echo ""
  log_ok "安装完成！访问 http://localhost:${PORT}"
  log_info "配置文件: ~/.devhub/config.yaml（可在 Web 设置页编辑）"
  log_info "查看日志: pm2 logs ${PM2_APP_NAME}"
}

cmd_update() {
  require_node
  pull_latest
  install_deps
  build_project
  clear_projects_cache
  start_pm2
  echo ""
  log_ok "更新完成！访问 http://localhost:${PORT}"
}

cmd_status() {
  require_pm2
  pm2 status "$PM2_APP_NAME" || true
  echo ""
  log_info "安装目录: $INSTALL_DIR"
  log_info "访问地址: http://localhost:${PORT}"
}

cmd_logs() {
  require_pm2
  pm2 logs "$PM2_APP_NAME" --lines 50
}

cmd_restart() {
  require_pm2
  cd "$INSTALL_DIR"
  pm2 restart "$PM2_APP_NAME"
  log_ok "已重启"
}

cmd_stop() {
  require_pm2
  pm2 stop "$PM2_APP_NAME" || true
  log_ok "已停止"
}

cmd_startup() {
  require_pm2
  cd "$INSTALL_DIR"
  load_pm2_startup || return
  setup_pm2_startup
}

show_help() {
  cat <<EOF
DevHub 安装 / 更新工具

用法:
  $0 install     首次安装（克隆、构建、PM2 启动）
  $0 update      拉取最新代码并重新构建、重启
  $0 status      查看运行状态
  $0 logs        查看日志
  $0 restart     重启服务
  $0 stop        停止服务
  $0 startup     配置 PM2 开机自启（系统重启后自动恢复）

从 GitHub 一键安装:
  curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- install

从 GitHub 一键更新（三台电脑各执行一次）:
  curl -fsSL https://raw.githubusercontent.com/Bxiaoyao/dev-hub/main/scripts/install.sh | bash -s -- update

环境变量:
  DEVHUB_INSTALL_DIR   安装目录（默认 ~/dev-hub）
  DEVHUB_REPO          仓库地址
  DEVHUB_BRANCH        分支（默认 main）
  DEVHUB_PORT          端口（默认 3200）

私有仓库:
  先用 SSH 克隆仓库，再在目录内执行 ./scripts/install.sh install
EOF
}

main() {
  local cmd="${1:-help}"
  case "$cmd" in
    install)  cmd_install ;;
    update)   cmd_update ;;
    status)   cmd_status ;;
    logs)     cmd_logs ;;
    restart)  cmd_restart ;;
    stop)     cmd_stop ;;
    startup)  cmd_startup ;;
    help|-h|--help) show_help ;;
    *)
      log_error "未知命令: $cmd"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
