#!/bin/bash

# YouTube爆款视频采集工具 - 问题诊断脚本
# 用于快速诊断部署问题

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}YouTube爆款视频采集工具 - 问题诊断${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查后端服务
echo -e "${BLUE}━━━ 1. 后端服务检查 ━━━${NC}"

if lsof -i :3001 &> /dev/null; then
    echo -e "${GREEN}✓ 端口 3001 有进程监听${NC}"
    PID=$(lsof -ti:3001)
    echo "  PID: $PID"
    echo "  进程: $(ps -p $PID -o comm= 2>/dev/null)"
else
    echo -e "${RED}✗ 端口 3001 没有进程监听${NC}"
    echo -e "${YELLOW}  建议：运行 ./service.sh start 启动后端服务${NC}"
fi

# 测试 API
if curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端 API 响应正常${NC}"
    curl -s http://localhost:3001/api/health | head -3
else
    echo -e "${RED}✗ 后端 API 无响应${NC}"
fi

echo ""

# 2. 检查前端构建
echo -e "${BLUE}━━━ 2. 前端构建检查 ━━━${NC}"

if [ -d "$PROJECT_ROOT/client/dist" ]; then
    echo -e "${GREEN}✓ 前端构建目录存在${NC}"
    if [ -f "$PROJECT_ROOT/client/dist/index.html" ]; then
        echo -e "${GREEN}✓ index.html 文件存在${NC}"
        echo "  路径: $PROJECT_ROOT/client/dist"
    else
        echo -e "${RED}✗ index.html 文件不存在${NC}"
        echo -e "${YELLOW}  建议：运行 npm run build:client${NC}"
    fi
else
    echo -e "${RED}✗ 前端构建目录不存在${NC}"
    echo -e "${YELLOW}  建议：运行 npm run build:client${NC}"
fi

echo ""

# 3. 检查 Nginx
echo -e "${BLUE}━━━ 3. Nginx 检查 ━━━${NC}"

if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✓ Nginx 已安装${NC}"
    echo "  版本: $(nginx -v 2>&1 | cut -d/ -f2)"

    # 检查 Nginx 是否运行
    if pgrep nginx > /dev/null; then
        echo -e "${GREEN}✓ Nginx 正在运行${NC}"
    else
        echo -e "${YELLOW}⚠ Nginx 未运行${NC}"
        echo -e "${YELLOW}  建议：sudo systemctl start nginx${NC}"
    fi

    # 检查配置文件
    if [ -f "/etc/nginx/sites-available/youtube-scrawler" ]; then
        echo -e "${GREEN}✓ Nginx 配置文件存在${NC}"

        if [ -L "/etc/nginx/sites-enabled/youtube-scrawler" ]; then
            echo -e "${GREEN}✓ 配置已启用${NC}"
        else
            echo -e "${YELLOW}⚠ 配置未启用${NC}"
            echo -e "${YELLOW}  建议：sudo ln -s /etc/nginx/sites-available/youtube-scrawler /etc/nginx/sites-enabled/${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Nginx 配置文件不存在${NC}"
        echo -e "${YELLOW}  建议：查看 NGINX_DEPLOYMENT.md 进行配置${NC}"
    fi
else
    echo -e "${RED}✗ Nginx 未安装${NC}"
    echo -e "${YELLOW}  这是前后端分离应用，需要 Nginx 部署前端${NC}"
    echo -e "${YELLOW}  安装：sudo apt-get install nginx (Ubuntu/Debian)${NC}"
    echo -e "${YELLOW}        sudo yum install nginx (CentOS/RHEL)${NC}"
fi

echo ""

# 4. 检查端口占用
echo -e "${BLUE}━━━ 4. 端口占用检查 ━━━${NC}"

if lsof -i :80 &> /dev/null; then
    echo -e "${GREEN}✓ 端口 80 有进程监听（Nginx 或其他 Web 服务器）${NC}"
else
    echo -e "${YELLOW}⚠ 端口 80 未监听${NC}"
    echo -e "${YELLOW}  前端应通过 Nginx 在端口 80 提供服务${NC}"
fi

echo ""

# 5. 问题诊断
echo -e "${BLUE}━━━ 5. 常见问题诊断 ━━━${NC}"

# 检查是否直接访问后端
echo -e "${YELLOW}如果浏览器显示：${NC}"
echo -e '  {"success":false,"error":"接口不存在"}'
echo ""
echo -e "${YELLOW}原因分析：${NC}"
echo "  你访问的是后端 API 服务（端口 3001），而不是前端页面"
echo ""
echo -e "${YELLOW}解决方案：${NC}"
echo "  1. 确保 Nginx 已安装并运行"
echo "  2. 配置 Nginx（参考 NGINX_DEPLOYMENT.md）"
echo "  3. 通过 Nginx（端口 80）访问，而不是直接访问后端（端口 3001）"
echo ""
echo -e "${YELLOW}正确的访问方式：${NC}"
echo -e "  ❌ 错误：http://your-domain.com:3001"
echo -e "  ✓ 正确：http://your-domain.com (端口 80，由 Nginx 处理)"

echo ""

# 6. 快速修复建议
echo -e "${BLUE}━━━ 6. 快速修复步骤 ━━━${NC}"

# 判断主要问题
NGINX_OK=false
BACKEND_OK=false
FRONTEND_OK=false

command -v nginx &> /dev/null && NGINX_OK=true
lsof -i :3001 &> /dev/null && BACKEND_OK=true
[ -f "$PROJECT_ROOT/client/dist/index.html" ] && FRONTEND_OK=true

if [ "$NGINX_OK" = false ]; then
    echo -e "${RED}主要问题：Nginx 未安装${NC}"
    echo ""
    echo "解决步骤："
    echo "  1. 安装 Nginx："
    echo "     sudo apt-get install nginx  (Ubuntu/Debian)"
    echo "  2. 配置 Nginx："
    echo "     查看 NGINX_DEPLOYMENT.md"
    echo ""
elif [ "$FRONTEND_OK" = false ]; then
    echo -e "${RED}主要问题：前端未构建${NC}"
    echo ""
    echo "解决步骤："
    echo "  1. 构建前端："
    echo "     npm run build:client"
    echo ""
elif [ "$BACKEND_OK" = false ]; then
    echo -e "${RED}主要问题：后端服务未运行${NC}"
    echo ""
    echo "解决步骤："
    echo "  1. 启动后端："
    echo "     ./service.sh start"
    echo ""
else
    echo -e "${GREEN}✓ 所有服务正常运行${NC}"
    echo ""
    echo "如果仍然无法访问，请检查："
    echo "  1. Nginx 配置是否正确（NGINX_DEPLOYMENT.md）"
    echo "  2. 防火墙是否开放 80 端口"
    echo "  3. 域名 DNS 是否正确解析"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}更多帮助：${NC}"
echo "  - 查看 NGINX_DEPLOYMENT.md"
echo "  - 查看 DEPLOYMENT.md"
echo "  - 运行 ./service.sh status"
echo -e "${BLUE}========================================${NC}"
