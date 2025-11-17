# 部署脚本快速参考

## 📂 部署相关文件

```
youtube-scrawler/
├── setup.sh                    # 开发环境安装脚本
├── deploy.sh                   # 生产环境部署脚本
├── service.sh                  # 服务管理脚本（不使用 supervisord 时）
├── start-prod.sh               # 快速启动生产服务
├── supervisord.conf            # Supervisord 配置文件
├── scripts/
│   └── health-check.sh        # 健康检查脚本
├── logs/                       # 日志目录（自动创建）
├── pids/                       # PID 文件目录（自动创建）
├── data/                       # 数据库目录（自动创建）
└── DEPLOYMENT.md              # 详细部署文档
```

---

## 🚀 快速开始

### 开发环境

```bash
# 一键安装并启动
./setup.sh

# 或手动启动
npm run dev
```

### 生产环境

```bash
# 方案1: 使用 supervisord（推荐）
./deploy.sh

# 方案2: 使用脚本管理
./deploy.sh --no-supervisor
./service.sh start
```

---

## 📋 常用命令

### 使用 supervisord

```bash
# 查看状态
supervisorctl -c supervisord.conf status

# 重启服务
supervisorctl -c supervisord.conf restart youtube-scrawler-server

# 查看日志
supervisorctl -c supervisord.conf tail -f youtube-scrawler-server

# 停止服务
supervisorctl -c supervisord.conf stop all
supervisorctl -c supervisord.conf shutdown
```

### 使用 service.sh

```bash
./service.sh start          # 启动服务
./service.sh stop           # 停止服务
./service.sh restart        # 重启服务
./service.sh status         # 查看状态
./service.sh logs           # 查看日志
./service.sh logs-follow    # 实时日志
./service.sh error-logs     # 错误日志
./service.sh clean-logs     # 清理日志
```

### 健康检查

```bash
# 执行一次健康检查
./scripts/health-check.sh single

# 循环监控
./scripts/health-check.sh loop
```

---

## 🔄 更新部署

```bash
# 代码更新后
git pull

# 增量部署（推荐）
./deploy.sh --skip-deps

# 完整部署
./deploy.sh
```

---

## 🐛 故障排查

```bash
# 1. 查看服务状态
./service.sh status

# 2. 查看错误日志
./service.sh error-logs 100

# 3. 检查端口占用
lsof -i :3001

# 4. 手动测试后端
curl http://localhost:3001/api/settings

# 5. 查看进程
ps aux | grep node

# 6. 强制停止
pkill -9 -f "node.*server/dist"
```

---

## 📊 日志位置

```
logs/
├── server.log              # 后端标准输出
├── server-error.log        # 后端错误日志
├── supervisord.log         # supervisord 日志
└── health-check.log        # 健康检查日志
```

---

## ⚙️ 部署选项

### deploy.sh 参数

```bash
./deploy.sh                 # 完整��署
./deploy.sh --skip-deps     # 跳过依赖安装（推荐增量部署）
./deploy.sh --skip-build    # 跳过构建
./deploy.sh --no-supervisor # 不使用 supervisord
```

---

## 🔐 安全建议

1. **修改默认端口**: 编辑 `.env` 中的 `PORT`
2. **设置强密钥**: 修改 `SESSION_SECRET`
3. **配置防火墙**: 只开放必要端口
4. **使用 HTTPS**: 配置 Nginx SSL 证书
5. **限制文件权限**:
   ```bash
   chmod 600 .env
   chmod 700 data/
   ```

---

## 📞 更多帮助

详细文档请参考: [DEPLOYMENT.md](./DEPLOYMENT.md)
