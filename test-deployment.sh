#!/bin/bash

# 部署脚本测试工具
# 用于验证部署环境和脚本是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 测试计数
PASSED=0
FAILED=0

# 函数：打印测试标题
test_title() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}TEST: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 函数：测试通过
test_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    PASSED=$((PASSED + 1))
}

# 函数：测试失败
test_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    FAILED=$((FAILED + 1))
}

# 函数：测试警告
test_warn() {
    echo -e "${YELLOW}⚠ WARN: $1${NC}"
}

# 1. 检查依赖
test_dependencies() {
    test_title "检查系统依赖"

    # Node.js
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        test_pass "Node.js 已安装: $NODE_VER"
    else
        test_fail "Node.js 未安装"
    fi

    # npm
    if command -v npm &> /dev/null; then
        NPM_VER=$(npm -v)
        test_pass "npm 已安装: $NPM_VER"
    else
        test_fail "npm 未安装"
    fi

    # supervisord (可选)
    if command -v supervisord &> /dev/null; then
        SUPERVISOR_VER=$(supervisord -v 2>&1 | head -1)
        test_pass "supervisord 已安装: $SUPERVISOR_VER"
    else
        test_warn "supervisord 未安装（可选）"
    fi

    # curl
    if command -v curl &> /dev/null; then
        test_pass "curl 已安装"
    else
        test_fail "curl 未安装"
    fi
}

# 2. 检查文件结构
test_file_structure() {
    test_title "检查文件结构"

    local required_files=(
        "setup.sh"
        "deploy.sh"
        "service.sh"
        "start-prod.sh"
        "supervisord.conf"
        "scripts/health-check.sh"
        "package.json"
        "client/package.json"
        "server/package.json"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            test_pass "$file 存在"
        else
            test_fail "$file 不存在"
        fi
    done

    # 检查脚本执行权限
    local executable_files=(
        "setup.sh"
        "deploy.sh"
        "service.sh"
        "start-prod.sh"
        "scripts/health-check.sh"
    )

    for file in "${executable_files[@]}"; do
        if [ -x "$PROJECT_ROOT/$file" ]; then
            test_pass "$file 有执行权限"
        else
            test_fail "$file 没有执行权限"
        fi
    done
}

# 3. 检查环境配置
test_environment() {
    test_title "检查环境配置"

    # .env 文件
    if [ -f "$PROJECT_ROOT/.env" ]; then
        test_pass ".env 文件存在"

        # 检查必要的环境变量
        source "$PROJECT_ROOT/.env" 2>/dev/null || true

        if [ -n "$YOUTUBE_API_KEY" ]; then
            test_pass "YOUTUBE_API_KEY 已配置"
        else
            test_warn "YOUTUBE_API_KEY 未配置"
        fi

        if [ -n "$SESSION_SECRET" ]; then
            test_pass "SESSION_SECRET 已配置"
        else
            test_warn "SESSION_SECRET 未配置（将使用默认值）"
        fi
    else
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            test_warn ".env 文件不存在，但 .env.example 存在"
        else
            test_fail ".env 和 .env.example 都不存在"
        fi
    fi
}

# 4. 检查依赖安装
test_npm_packages() {
    test_title "检查 npm 依赖"

    # 根目录
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        test_pass "根目录依赖已安装"
    else
        test_warn "根目录依赖未安装"
    fi

    # 前端
    if [ -d "$PROJECT_ROOT/client/node_modules" ]; then
        test_pass "前端依赖已安装"
    else
        test_warn "前端依赖未安装"
    fi

    # 后端
    if [ -d "$PROJECT_ROOT/server/node_modules" ]; then
        test_pass "后端依赖已安装"
    else
        test_warn "后端依赖未安装"
    fi
}

# 5. 检查构建产物
test_build_artifacts() {
    test_title "检查构建产物"

    # 前端构建
    if [ -d "$PROJECT_ROOT/client/dist" ]; then
        test_pass "前端已构建"
    else
        test_warn "前端未构建"
    fi

    # 后端构建
    if [ -d "$PROJECT_ROOT/server/dist" ]; then
        if [ -f "$PROJECT_ROOT/server/dist/index.js" ]; then
            test_pass "后端已构建"
        else
            test_warn "后端构建不完整"
        fi
    else
        test_warn "后端未构��"
    fi
}

# 6. 检查服务状态
test_service_status() {
    test_title "检查服务状态"

    # 检查端口占用
    if lsof -i :3001 &> /dev/null || netstat -an 2>/dev/null | grep -q ":3001.*LISTEN"; then
        test_warn "端口 3001 已被占用（可能服务正在运行）"

        # 尝试健康检查
        if curl -s -f "http://localhost:3001/api/settings" > /dev/null 2>&1; then
            test_pass "后端服务健康检查通过"
        else
            test_warn "端口被占用但健康检查失败"
        fi
    else
        test_warn "端口 3001 空闲（服务未运行）"
    fi

    # 检查 PID 文件
    if [ -f "$PROJECT_ROOT/pids/server.pid" ]; then
        PID=$(cat "$PROJECT_ROOT/pids/server.pid")
        if kill -0 "$PID" 2>/dev/null; then
            test_pass "服务进程运行中 (PID: $PID)"
        else
            test_warn "PID 文件存在但进程不存在"
        fi
    else
        test_warn "PID 文件不存在"
    fi
}

# 7. 测试脚本功能
test_script_functions() {
    test_title "��试脚本功能"

    # 测试 service.sh help
    if "$PROJECT_ROOT/service.sh" help &> /dev/null; then
        test_pass "service.sh help 命令正常"
    else
        test_fail "service.sh help 命令失败"
    fi

    # 测试健康检查脚本
    if "$PROJECT_ROOT/scripts/health-check.sh" single &> /dev/null; then
        test_pass "health-check.sh 执行正常"
    else
        test_warn "health-check.sh 执行失败（可能服务未运行）"
    fi
}

# 8. 检查日志
test_logs() {
    test_title "检查日志配置"

    # 日志目录
    if [ -d "$PROJECT_ROOT/logs" ]; then
        test_pass "日志目录存在"

        # 检查日志文件权限
        if [ -w "$PROJECT_ROOT/logs" ]; then
            test_pass "日志目录可写"
        else
            test_fail "日志目录不可写"
        fi
    else
        test_warn "日志目录不存在（首次运行时会创建）"
    fi

    # PID 目录
    if [ -d "$PROJECT_ROOT/pids" ]; then
        test_pass "PID 目录存在"
    else
        test_warn "PID 目录不存在（首次运行时会创建）"
    fi

    # 数据目录
    if [ -d "$PROJECT_ROOT/data" ]; then
        test_pass "数据目录存在"
    else
        test_warn "数据目录不存在（首次运行时会创建）"
    fi
}

# 生成报告
generate_report() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}测试报告${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    TOTAL=$((PASSED + FAILED))
    echo -e "总测试数: $TOTAL"
    echo -e "${GREEN}通过: $PASSED${NC}"
    echo -e "${RED}失败: $FAILED${NC}"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✓ 所有测试通过！部署环境正常${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "下一步:"
        echo "  开发环境: ./setup.sh"
        echo "  生产环境: ./deploy.sh"
        echo ""
        return 0
    else
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}✗ 部分测试失败，请检查上述错误${NC}"
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "建议:"
        echo "  1. 检查系统依赖是否安装"
        echo "  2. 运行 ./setup.sh 安装项目依赖"
        echo "  3. 查看 DEPLOYMENT.md 了解详细信息"
        echo ""
        return 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}YouTube爆款视频采集工具 - 部署测试${NC}"
    echo -e "${BLUE}========================================${NC}"

    test_dependencies
    test_file_structure
    test_environment
    test_npm_packages
    test_build_artifacts
    test_service_status
    test_script_functions
    test_logs

    generate_report
}

# 运行主函数
main "$@"
