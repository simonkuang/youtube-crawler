#!/bin/bash

# YouTube爆款视频采集工具 - 生产环境部署脚本
# 支持首次部署和增量部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/pids"
DATA_DIR="$PROJECT_ROOT/data"

# 环境变量
NODE_ENV="${NODE_ENV:-production}"
ENABLE_SUPERVISOR="${ENABLE_SUPERVISOR:-true}"

echo -e "${BLUE}========================================"
echo "YouTube爆款视频采集工具 - 生产部署"
echo -e "========================================${NC}"
echo ""

# 函数：打印成功信息
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印警告信息
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 函数：打印错误信息并退出
error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# 函数：打印信息
info() {
    echo -e "${BLUE}➜ $1${NC}"
}

# 检查依赖
check_dependencies() {
    info "检查系统依赖..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        error "未安装 Node.js，请先安装 Node.js >= 16.0.0"
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        error "Node.js 版本过低（当前：$(node -v)），需要 >= 16.0.0"
    fi
    success "Node.js 版本检查通过：$(node -v)"

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        error "未安装 npm"
    fi
    success "npm 版本：$(npm -v)"

    # 检查 supervisord（如果启用）
    if [ "$ENABLE_SUPERVISOR" = "true" ]; then
        if ! command -v supervisord &> /dev/null; then
            warning "未安装 supervisord，将使用 PM2 或直接启动"
            ENABLE_SUPERVISOR="false"
        else
            success "supervisord 已安装：$(supervisord -v)"
        fi
    fi

    echo ""
}

# 创建必要目录
create_directories() {
    info "创建必要目录..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$PID_DIR"
    mkdir -p "$DATA_DIR"
    success "目录创建完成"
    echo ""
}

# 检查环境变量
check_environment() {
    info "检查环境变量配置..."

    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        warning ".env 文件不存在，从模板创建..."
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            warning "请编辑 .env 文件配置 YOUTUBE_API_KEY"
        else
            error ".env.example 文件不存在"
        fi
    fi

    # 检查必需的环境变量
    source "$PROJECT_ROOT/.env" 2>/dev/null || true

    if [ -z "$YOUTUBE_API_KEY" ]; then
        warning "YOUTUBE_API_KEY 未配置，API 搜索功能将不可用"
    else
        success "YOUTUBE_API_KEY 已配置"
    fi

    echo ""
}

# 安装依赖
install_dependencies() {
    info "安装/更新项目依赖..."

    # 根目录
    npm install --production=false

    # 前端
    cd "$PROJECT_ROOT/client"
    npm install --production=false

    # 后端
    cd "$PROJECT_ROOT/server"
    npm install --production=false

    cd "$PROJECT_ROOT"
    success "依赖安装完成"
    echo ""
}

# 构建项目
build_project() {
    info "构建项目..."

    # 构建前端
    info "  构建前端..."
    cd "$PROJECT_ROOT/client"
    npm run build
    success "  前端构建完成"

    # 构建后端
    info "  构���后端..."
    cd "$PROJECT_ROOT/server"
    npm run build
    success "  后端构建完成"

    cd "$PROJECT_ROOT"
    echo ""
}

# 停止旧服务
stop_old_service() {
    info "停止旧服务..."

    if [ "$ENABLE_SUPERVISOR" = "true" ]; then
        # 使用 supervisord
        if [ -f "$PID_DIR/supervisord.pid" ]; then
            # 先停止所有程序
            supervisorctl -c "$PROJECT_ROOT/supervisord.conf" stop all || true
            sleep 2

            # 关闭 supervisord 守护进程
            supervisorctl -c "$PROJECT_ROOT/supervisord.conf" shutdown || true
            sleep 2

            # 确保端口已释放
            RETRY_COUNT=0
            MAX_RETRIES=10
            while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
                PIDS=$(lsof -ti:3001 2>/dev/null || true)
                if [ -z "$PIDS" ]; then
                    success "端口 3001 已释放"
                    break
                fi

                warning "等待端口 3001 释放... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"

                # 如果等待超过5次，强制清理
                if [ $RETRY_COUNT -ge 5 ]; then
                    warning "强制清理占用端口 3001 的进程..."
                    echo "$PIDS" | xargs kill -15 2>/dev/null || true
                    sleep 2
                    PIDS=$(lsof -ti:3001 2>/dev/null || true)
                    if [ -n "$PIDS" ]; then
                        echo "$PIDS" | xargs kill -9 2>/dev/null || true
                    fi
                fi

                RETRY_COUNT=$((RETRY_COUNT + 1))
                sleep 2
            done

            # 最终检查
            PIDS=$(lsof -ti:3001 2>/dev/null || true)
            if [ -n "$PIDS" ]; then
                error "无法释放端口 3001，仍有进程占用: $PIDS"
            fi

            success "已停止 supervisord"
        fi
    else
        # 使用脚本管理
        if [ -f "$PROJECT_ROOT/service.sh" ]; then
            "$PROJECT_ROOT/service.sh" stop || true
        fi

        # 强制清理可能残留的进程（更彻底）
        # 查找所有可能的后端进程
        PIDS=$(lsof -ti:3001 2>/dev/null || true)
        if [ -n "$PIDS" ]; then
            warning "发现残留进程占用端口 3001，正在清理..."
            echo "$PIDS" | xargs kill -15 2>/dev/null || true
            sleep 3
            # 如果还在运行，强制杀死
            PIDS=$(lsof -ti:3001 2>/dev/null || true)
            if [ -n "$PIDS" ]; then
                echo "$PIDS" | xargs kill -9 2>/dev/null || true
            fi
        fi

        # 也尝试通过进程名查找
        pkill -f "node.*server/dist/index.js" || true

        # 清理 PID 文件
        rm -f "$PID_DIR/server.pid"

        success "已停止旧服务"
    fi

    sleep 2
    echo ""
}

# 启动服务
start_service() {
    info "启动服务..."

    if [ "$ENABLE_SUPERVISOR" = "true" ]; then
        # 使用 supervisord
        supervisord -c "$PROJECT_ROOT/supervisord.conf"
        sleep 3
        supervisorctl -c "$PROJECT_ROOT/supervisord.conf" status
        success "服务已通过 supervisord 启动"
    else
        # 使用脚本管理
        if [ -f "$PROJECT_ROOT/service.sh" ]; then
            "$PROJECT_ROOT/service.sh" start
        else
            error "service.sh 脚本不存在，请先创建服务管理脚本"
        fi
    fi

    echo ""
}

# 健康检查
health_check() {
    info "执行健康检查..."

    # 等待服务启动
    sleep 5

    # 检查后端健康
    BACKEND_URL="http://localhost:3001"
    MAX_RETRIES=10
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s -f "$BACKEND_URL/api/settings" > /dev/null 2>&1; then
            success "后端服务健康检查通过"
            echo ""
            return 0
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        warning "等待后端服务启动... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    error "后端服务健康检查失败，请检查日志"
}

# 显示部署信息
show_deployment_info() {
    echo -e "${GREEN}========================================"
    echo "🎉 部署完成！"
    echo -e "========================================${NC}"
    echo ""
    echo "服务地址："
    echo "  后端 API: http://localhost:3001"
    echo ""
    echo "日志位置："
    echo "  后端日志: $LOG_DIR/server.log"
    echo "  错误日志: $LOG_DIR/server-error.log"
    echo ""

    if [ "$ENABLE_SUPERVISOR" = "true" ]; then
        echo "服务管理（supervisord）："
        echo "  查看状态: supervisorctl -c supervisord.conf status"
        echo "  重启服务: supervisorctl -c supervisord.conf restart all"
        echo "  停止服务: supervisorctl -c supervisord.conf stop all"
        echo "  查看日志: tail -f logs/server.log"
    else
        echo "服务管理："
        echo "  查看状态: ./service.sh status"
        echo "  重启服务: ./service.sh restart"
        echo "  停止服务: ./service.sh stop"
        echo "  查看日志: tail -f logs/server.log"
    fi

    echo ""
    echo "前端部署："
    echo "  前端构建产物在 client/dist 目录"
    echo "  请使用 Nginx 或其他 Web 服务器部署"
    echo ""
}

# 主流程
main() {
    # 解析参数
    SKIP_BUILD=false
    SKIP_DEPS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --no-supervisor)
                ENABLE_SUPERVISOR=false
                shift
                ;;
            *)
                echo "未知参数: $1"
                echo "用法: $0 [--skip-build] [--skip-deps] [--no-supervisor]"
                exit 1
                ;;
        esac
    done

    # 执行部署流程
    check_dependencies
    create_directories
    check_environment

    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    else
        warning "跳过依赖安装"
        echo ""
    fi

    if [ "$SKIP_BUILD" = false ]; then
        build_project
    else
        warning "跳过构建步骤"
        echo ""
    fi

    stop_old_service
    start_service
    health_check
    show_deployment_info
}

# 运行主流程
main "$@"
