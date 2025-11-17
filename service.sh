#!/bin/bash

# YouTube爆款视频采集工具 - 服务管理脚本
# 用于启动、停止、重启、查看状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/pids"
SERVER_PID_FILE="$PID_DIR/server.pid"
SERVER_LOG="$LOG_DIR/server.log"
SERVER_ERROR_LOG="$LOG_DIR/server-error.log"

# 确保目录存在
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

# 函数：打印成功信息
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印警告信息
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 函数：打印错误信息
error() {
    echo -e "${RED}✗ $1${NC}"
}

# 函数：打印信息
info() {
    echo -e "${BLUE}➜ $1${NC}"
}

# 函数：检查服务是否运行
is_running() {
    if [ -f "$SERVER_PID_FILE" ]; then
        PID=$(cat "$SERVER_PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        else
            rm -f "$SERVER_PID_FILE"
            return 1
        fi
    fi
    return 1
}

# 函数：启动服务
start_service() {
    info "启动服务..."

    if is_running; then
        warning "服务已经在运行中 (PID: $(cat $SERVER_PID_FILE))"
        return 0
    fi

    # 检查构建产物
    if [ ! -f "$SERVER_DIR/dist/index.js" ]; then
        error "后端构建产物不存在，请先运行: npm run build"
        exit 1
    fi

    # 加载环境变量
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
    fi

    # 设置环境变量
    export NODE_ENV="${NODE_ENV:-production}"
    export PORT="${PORT:-3001}"

    # 启动后端服务
    cd "$SERVER_DIR"
    nohup node dist/index.js >> "$SERVER_LOG" 2>> "$SERVER_ERROR_LOG" &
    SERVER_PID=$!

    # 保存 PID
    echo "$SERVER_PID" > "$SERVER_PID_FILE"

    # 等待服务启动
    sleep 3

    # 验证服务是否成功启动
    if is_running; then
        success "服务启动成功 (PID: $SERVER_PID)"
        info "日志文件: $SERVER_LOG"
        info "错误日志: $SERVER_ERROR_LOG"

        # 健康检查
        sleep 2
        if curl -s -f "http://localhost:${PORT}/api/settings" > /dev/null 2>&1; then
            success "健康检查通过"
        else
            warning "健康检查失败，请检查日志"
        fi
    else
        error "服务启动失败，请检查日志: $SERVER_ERROR_LOG"
        exit 1
    fi
}

# 函数：停止服务
stop_service() {
    info "停止服务..."

    if ! is_running; then
        warning "服务未运行"
        return 0
    fi

    PID=$(cat "$SERVER_PID_FILE")

    # 优雅停止（SIGTERM）
    info "发送 SIGTERM 信号到进程 $PID"
    kill "$PID" 2>/dev/null || true

    # 等待进程退出
    TIMEOUT=10
    ELAPSED=0
    while kill -0 "$PID" 2>/dev/null; do
        if [ $ELAPSED -ge $TIMEOUT ]; then
            warning "进程未响应，强制终止..."
            kill -9 "$PID" 2>/dev/null || true
            break
        fi
        sleep 1
        ELAPSED=$((ELAPSED + 1))
    done

    # 清理 PID 文件
    rm -f "$SERVER_PID_FILE"

    # 确保进程已终止
    if kill -0 "$PID" 2>/dev/null; then
        error "无法停止服务 (PID: $PID)"
        exit 1
    else
        success "服务已停止"
    fi
}

# 函数：重启服务
restart_service() {
    info "重启服务..."
    stop_service
    sleep 2
    start_service
}

# 函数：查看服务状态
status_service() {
    echo ""
    echo "========================================="
    echo "   服务状态"
    echo "========================================="
    echo ""

    if is_running; then
        PID=$(cat "$SERVER_PID_FILE")
        success "后端服务: 运行中"
        echo "  PID: $PID"
        echo "  启动时间: $(ps -p $PID -o lstart= 2>/dev/null || echo '未知')"
        echo "  内存使用: $(ps -p $PID -o rss= 2>/dev/null | awk '{printf "%.2f MB", $1/1024}' || echo '未知')"
        echo "  CPU使用: $(ps -p $PID -o %cpu= 2>/dev/null || echo '未知')%"

        # 检查端口
        PORT="${PORT:-3001}"
        if netstat -an 2>/dev/null | grep -q ":$PORT.*LISTEN" || \
           lsof -i ":$PORT" 2>/dev/null | grep -q LISTEN; then
            success "  端口 $PORT: 监听中"
        else
            warning "  端口 $PORT: 未监听"
        fi

        # 健康检查
        if curl -s -f "http://localhost:${PORT}/api/settings" > /dev/null 2>&1; then
            success "  健康检查: 通过"
        else
            warning "  健康检查: 失败"
        fi
    else
        error "后端服务: 未运行"
    fi

    echo ""
    echo "日志文件:"
    echo "  标准输出: $SERVER_LOG"
    echo "  错误输出: $SERVER_ERROR_LOG"
    echo ""
}

# 函数：查看日志
logs_service() {
    local LINES="${1:-50}"
    local FOLLOW="${2:-false}"

    if [ "$FOLLOW" = "true" ]; then
        info "实时查看日志 (Ctrl+C 退出)..."
        tail -f "$SERVER_LOG"
    else
        info "最近 $LINES 行日志:"
        echo ""
        tail -n "$LINES" "$SERVER_LOG"
    fi
}

# 函数：查看错误日志
error_logs_service() {
    local LINES="${1:-50}"

    info "最近 $LINES 行错误日志:"
    echo ""
    if [ -f "$SERVER_ERROR_LOG" ] && [ -s "$SERVER_ERROR_LOG" ]; then
        tail -n "$LINES" "$SERVER_ERROR_LOG"
    else
        success "无错误日志"
    fi
}

# 函数：清理日志
clean_logs() {
    info "清理日志文件..."

    # 备份当前日志
    if [ -f "$SERVER_LOG" ] && [ -s "$SERVER_LOG" ]; then
        BACKUP_NAME="$LOG_DIR/server.log.$(date +%Y%m%d_%H%M%S)"
        mv "$SERVER_LOG" "$BACKUP_NAME"
        success "已备份日志到: $BACKUP_NAME"
    fi

    if [ -f "$SERVER_ERROR_LOG" ] && [ -s "$SERVER_ERROR_LOG" ]; then
        BACKUP_NAME="$LOG_DIR/server-error.log.$(date +%Y%m%d_%H%M%S)"
        mv "$SERVER_ERROR_LOG" "$BACKUP_NAME"
        success "已备份错误日志到: $BACKUP_NAME"
    fi

    # 清理30天前的备份
    find "$LOG_DIR" -name "*.log.*" -mtime +30 -delete 2>/dev/null || true
    success "已清理30天前的日志备份"
}

# 函数：显示帮助
show_help() {
    echo "YouTube爆款视频采集工具 - 服务管理脚本"
    echo ""
    echo "用法: $0 <command> [options]"
    echo ""
    echo "命令:"
    echo "  start           启动服务"
    echo "  stop            停止服务"
    echo "  restart         重启服务"
    echo "  status          查看服务状态"
    echo "  logs [n]        查看最近n行日志（默认50行）"
    echo "  logs-follow     实时查看日志"
    echo "  error-logs [n]  查看最近n行错误日志（默认50行）"
    echo "  clean-logs      清理并备份日志文件"
    echo "  help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs 100"
    echo "  $0 logs-follow"
    echo ""
}

# 主函数
main() {
    local COMMAND="${1:-}"

    case "$COMMAND" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            status_service
            ;;
        logs)
            logs_service "${2:-50}" false
            ;;
        logs-follow)
            logs_service 50 true
            ;;
        error-logs)
            error_logs_service "${2:-50}"
            ;;
        clean-logs)
            clean_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "未知命令: $COMMAND"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
