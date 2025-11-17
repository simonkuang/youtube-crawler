#!/bin/bash

# YouTube爆款视频采集工具 - 生产环境启动脚本
# 快速启动生产服务（不重新构建）

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "YouTube爆款视频采集工具 - 生产启动"
echo -e "========================================${NC}"
echo ""

# 检查是否已构建
if [ ! -f "$PROJECT_ROOT/server/dist/index.js" ]; then
    echo -e "${RED}错误: 后端未构建，请先运行 ./deploy.sh${NC}"
    exit 1
fi

# 使用服务管理脚本启动
if [ -f "$PROJECT_ROOT/service.sh" ]; then
    "$PROJECT_ROOT/service.sh" start
else
    echo -e "${RED}错误: service.sh 不存在${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================"
echo "服务已启动"
echo -e "========================================${NC}"
echo ""
echo "管理命令:"
echo "  查看状态: ./service.sh status"
echo "  查看日志: ./service.sh logs"
echo "  停止服务: ./service.sh stop"
echo ""
