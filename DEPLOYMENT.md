# YouTube爆款视频采集工具 - 部署文档

## 📋 目录

- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [服务管理](#服务管理)
- [监控与运维](#监控与运维)
- [故障排查](#故障排查)

---

## 🚀 开发环境部署

### 快速开始

```bash
# 1. 运行安装脚本
./setup.sh

# 2. 启动开发服务器
npm run dev
```

### 手动启动

```bash
# 安装依赖
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 配置环境变量
cp .env.example .env
vim .env  # 编辑配置

# 启动前端和后端
npm run dev
```

---

## 🏭 生产环境部署

### 方案一：使用 supervisord（推荐）

**优点**: 自动重启、日志管理、进程监控

#### 1. 安装 supervisord

```bash
# Ubuntu/Debian
sudo apt-get install supervisor

# CentOS/RHEL
sudo yum install supervisor

# macOS
brew install supervisor
```

#### 2. 首次部署

```bash
# 运行部署脚本（会自动构建和启动）
./deploy.sh

# 部署脚本会自动：
# - 检查依赖
# - 安装 npm 包
# - 构建前后端
# - 启动 supervisord
# - 执行健康检查
```

#### 3. ��量部署（代码更新后）

```bash
# 仅重新构建和重启，不重新安装依赖
./deploy.sh --skip-deps

# 或者跳过构建（仅重启服务）
./deploy.sh --skip-build --skip-deps
```

#### 4. 管理服务

```bash
# 查看状态
supervisorctl -c supervisord.conf status

# 启动/停止/重启
supervisorctl -c supervisord.conf start youtube-scrawler-server
supervisorctl -c supervisord.conf stop youtube-scrawler-server
supervisorctl -c supervisord.conf restart youtube-scrawler-server

# 重新加载配置
supervisorctl -c supervisord.conf reload

# 查看日志
supervisorctl -c supervisord.conf tail -f youtube-scrawler-server
```

---

### 方案二：使用脚本管理（无需 supervisord）

**优点**: 轻量级、无额外依赖

#### 1. 首次部署

```bash
# 运行部署脚本（不使用 supervisord）
./deploy.sh --no-supervisor
```

#### 2. 服务管理

```bash
# 启动服务
./service.sh start

# 停止服务
./service.sh stop

# 重启服务
./service.sh restart

# 查看状态
./service.sh status

# 查看日志（最近50行）
./service.sh logs

# 实时查看日志
./service.sh logs-follow

# 查看错误日志
./service.sh error-logs

# 清理日志（会自动备份）
./service.sh clean-logs
```

#### 3. 快速重启（生产环境）

```bash
# 使用快速启动脚本（不重新构建）
./start-prod.sh
```

---

## 🛠 服务管理

### 端口配置

- **前端**: 3000 (开发) / 80 或 443 (生产，需 Nginx)
- **后端**: 3001

### 环境变量

在 `.env` 文件中配置：

```bash
# YouTube API配置
YOUTUBE_API_KEY=your_api_key_here
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/auth/callback

# 服务器配置
PORT=3001
NODE_ENV=production

# 数据库
DATABASE_PATH=./data/youtube-scrawler.db

# 会话密钥
SESSION_SECRET=your_random_secret_key

# 浏览器自动化
HEADLESS=true
MIN_REQUEST_DELAY=1000
MAX_REQUEST_DELAY=3000
```

### 日志管理

日志文件位置：

```
logs/
├── server.log              # 后端标准输出
├── server-error.log        # 后端错误日志
├── supervisord.log         # supervisord 日志
├── health-check.log        # 健康检查日志
└── *.log.*                 # 备份日志（自动轮转）
```

**日志轮转策略**:
- 单文件最大 50MB
- 保留最近 10 个备份
- 自动删除 30 天前的备份

### 前端部署（Nginx 示例）

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态文件
    root /path/to/youtube-scrawler/client/dist;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 访问日志
    access_log /var/log/nginx/youtube-scrawler-access.log;
    error_log /var/log/nginx/youtube-scrawler-error.log;
}
```

---

## 📊 监控与运维

### 健康检查

#### 手动执行

```bash
# 执行一次健康检查
./scripts/health-check.sh single

# 循环检查（每5分钟）
./scripts/health-check.sh loop
```

#### 自动监控（supervisord）

健康检查已集成到 supervisord，会自动：
- 每 5 分钟检查服务状态
- 连续 3 次失败发送告警
- 监控磁盘空间和日志大小
- 记录内存和 CPU 使用情况

配置告警邮箱：

```bash
# 编辑健康检查脚本
vim scripts/health-check.sh

# 设置告警邮箱
ALERT_EMAIL="your-email@example.com"
```

### 性能监控

```bash
# 查看进程资源使用
./service.sh status

# 实时监控（使用 htop 或 top）
htop -p $(cat pids/server.pid)

# 查看端口占用
lsof -i :3001
netstat -an | grep 3001
```

### 备份策略

#### 1. 数据库备份

```bash
# 手动备份
cp data/youtube-scrawler.db data/youtube-scrawler.db.backup-$(date +%Y%m%d)

# 自动备份（添加到 crontab）
0 2 * * * cd /path/to/youtube-scrawler && cp data/youtube-scrawler.db data/youtube-scrawler.db.backup-$(date +\%Y\%m\%d) && find data -name "*.backup-*" -mtime +7 -delete
```

#### 2. 配置备份

```bash
# 备份配置文件
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env supervisord.conf
```

---

## 🔧 故障排查

### 常见问题

#### 1. 服务启动失败

```bash
# 检查端口占用
lsof -i :3001
# 或
netstat -an | grep 3001

# 杀死占用进程
kill -9 <PID>

# 查看错误日志
tail -f logs/server-error.log
```

#### 2. API 调用失败

```bash
# 检查 API Key 配置
cat .env | grep YOUTUBE_API_KEY

# 测试 API 连接
curl http://localhost:3001/api/settings

# 查看后端日志
./service.sh logs 100
```

#### 3. supervisord 无法启动

```bash
# 检查配置文件语法
supervisord -c supervisord.conf -n

# 查看 supervisord 日志
tail -f logs/supervisord.log

# 手动启动后端
cd server && node dist/index.js
```

#### 4. 内存占用过高

```bash
# 查看内存使用
./service.sh status

# 重启服务释放内存
./service.sh restart

# 如果使用 supervisord
supervisorctl -c supervisord.conf restart youtube-scrawler-server
```

#### 5. 磁盘空间不足

```bash
# 检查磁盘使用
df -h

# 清理日志
./service.sh clean-logs

# 手动清理旧日志
find logs -name "*.log.*" -mtime +7 -delete
```

### 日志分析

```bash
# 查找错误
grep -i error logs/server-error.log

# 统计请求量
grep "POST /api/search" logs/server.log | wc -l

# 查看最近的错误
tail -100 logs/server-error.log | grep -i error
```

### 数据库问题

```bash
# 检查数据库文件
ls -lh data/youtube-scrawler.db

# 数据库完整性检查（需要安装 sqlite3）
sqlite3 data/youtube-scrawler.db "PRAGMA integrity_check;"

# 如果数据库损坏，恢复备份
cp data/youtube-scrawler.db.backup-YYYYMMDD data/youtube-scrawler.db
```

---

## 🔄 更新部署流程

### 代码更新

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 增量部署
./deploy.sh --skip-deps  # 不重新安装依赖

# 或完整部署
./deploy.sh
```

### 零停机部署（使用 supervisord）

```bash
# 1. 构建新版本
npm run build

# 2. 优雅重启
supervisorctl -c supervisord.conf restart youtube-scrawler-server
```

---

## 📞 技术支持

如遇到问题：

1. 检查日志: `./service.sh logs` 或 `./service.sh error-logs`
2. 查看状态: `./service.sh status`
3. 执行健康检查: `./scripts/health-check.sh single`
4. 查看本文档的[故障排查](#故障排查)部分

---

## 📝 许可证

MIT License
