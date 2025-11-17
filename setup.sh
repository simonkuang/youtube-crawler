#!/bin/bash

# YouTube爆款视频采集工具 - 快速启动脚本

set -e

echo "========================================"
echo "YouTube爆款视频采集工具 - 安装向导"
echo "========================================"
echo ""

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到Node.js，请先安装Node.js (>= 16.0.0)"
    echo "   下载地址：https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js版本过低（当前：$(node -v)），请升级到16.0.0或更高版本"
    exit 1
fi

echo "✓ Node.js版本检查通过：$(node -v)"
echo ""

# 安装依赖
echo "📦 正在安装依赖..."
echo ""

# 根目录
echo "1/3 安装根目录依赖..."
npm install --silent

# 前端
echo "2/3 安装前端依赖..."
cd client && npm install --silent && cd ..

# 后端
echo "3/3 安装后端依赖..."
cd server && npm install --silent && cd ..

echo ""
echo "✓ 依赖安装完成"
echo ""

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "✓ 已创建 .env 文件"
    echo ""
    echo "⚠️  重要提示："
    echo "   请编辑 .env 文件，配置以下内容："
    echo "   - YOUTUBE_API_KEY（必需）"
    echo "   - YOUTUBE_CLIENT_ID（可选，用于登录）"
    echo "   - YOUTUBE_CLIENT_SECRET（可选，用于登录）"
    echo ""
    echo "   获取API密钥："
    echo "   1. 访问 https://console.cloud.google.com/"
    echo "   2. 创建项目并启用 YouTube Data API v3"
    echo "   3. 创建凭据（API密钥和OAuth 2.0客户端ID）"
    echo ""
    read -p "配置完成后按回车继续..." dummy
else
    echo "✓ 环境变量文件已存在"
fi

echo ""
echo "========================================"
echo "🎉 安装完成！"
echo "========================================"
echo ""
echo "启动方式："
echo "  开发模式： npm run dev"
echo "  生产部署： ./deploy.sh"
echo ""
echo "应用地址："
echo "  前端：http://localhost:3000"
echo "  后端：http://localhost:3001"
echo ""

# 询问是否立即启动
read -p "是否立即启动开发服务器？(y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 正在启动开发服务器..."
    echo ""
    echo "提示：使用 Ctrl+C 停止服务"
    echo ""
    npm run dev
else
    echo ""
    echo "稍后可以运行以下命令启动："
    echo "  npm run dev"
    echo ""
fi

echo "更多信息请查看 README.md"
echo ""
