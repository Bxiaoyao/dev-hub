#!/bin/bash
# DevHub 一键启动脚本
# 支持后台运行，不会被终端关闭

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR)"
PM2_CONFIG="$PROJECT_DIR/ecosystem.config.json"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo "${BLUE}[INFO]${NC} $1"; }
log_success() { echo "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo "${RED}[ERROR]${NC} $1"; }

# 检查依赖
check_dependencies() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi

    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "正在安装 PM2..."
        npm install -g pm2
    fi
}

# 构建
build_project() {
    log_info "正在构建项目..."
    cd "$PROJECT_DIR"
    npm run build
    log_success "构建完成"
}

# 启动服务
start_server() {
    cd "$PROJECT_DIR"

    # 创建日志目录
    mkdir -p ~/.devhub/logs

    log_info "正在启动 DevHub 服务..."

    # 使用 PM2 启动
    pm2 start "$PM2_CONFIG"

    # 保存 PM2 进程列表
    pm2 save

    log_success "DevHub 服务已启动"
    log_info "访问地址: http://localhost:3200"

    # 显示状态
    pm2 status
}

# 停止服务
stop_server() {
    log_info "正在停止 DevHub 服务..."
    pm2 stop devhub
    log_success "DevHub 服务已停止"
}

# 重启服务
restart_server() {
    log_info "正在重启 DevHub 服务..."
    pm2 restart devhub
    log_success "DevHub 服务已重启"
}

# 查看状态
show_status() {
    pm2 status
    echo ""
    log_info "日志文件: ~/.devhub/logs/"
    log_info "访问地址: http://localhost:3200"
}

# 查看日志
show_logs() {
    pm2 logs devhub --lines 50
}

# 设置开机自启动
setup_startup() {
    log_info "正在配置开机自启动..."
    pm2 startup
    pm2 save
    log_success "开机自启动已配置"
}

# 取消开机自启动
disable_startup() {
    log_info "正在取消开机自启动..."
    pm2 unstartup
    log_success "开机自启动已取消"
}

# 帮助信息
show_help() {
    echo "DevHub 一键启动工具"
    echo ""
    echo "用法: devhub-start [命令]"
    echo ""
    echo "命令:"
    echo "  start       启动服务 (后台运行)"
    echo "  stop        停止服务"
    echo "  restart     重启服务"
    echo "  status      查看服务状态"
    echo "  logs        查看日志"
    echo "  startup     配置开机自启动"
    echo "  unstartup   取消开机自启动"
    echo "  build       构建项目"
    echo "  help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./devhub-start start     # 启动服务"
    echo "  ./devhub-start stop      # 停止服务"
    echo "  ./devhub-start logs      # 查看实时日志"
}

# 主入口
main() {
    local command=${1:-"help"}

    case "$command" in
        start)
            check_dependencies
            build_project
            start_server
            ;;
        stop)
            stop_server
            ;;
        restart)
            restart_server
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        startup)
            check_dependencies
            setup_startup
            ;;
        unstartup)
            disable_startup
            ;;
        build)
            check_dependencies
            build_project
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"