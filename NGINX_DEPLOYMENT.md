# Nginx 部署指南

## 问题说明

如果通过浏览器访问服务器时看到：
```json
{"success":false,"error":"接口不存在"}
```

这说明你访问的是**后端 API 服务**（端口 3001），而不是**前端页面**。

这是一个前后端分离的应用：
- **后端**：Express API 服务（端口 3001），只提供 `/api/*` 接口
- **前端**：React SPA 静态页面，需要通过 Nginx 部署

---

## 🚀 快速部署步骤

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. 配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/youtube-scrawler

# 修改配置文件中的路径
sudo vim /etc/nginx/sites-available/youtube-scrawler

# 需要修改：
# 1. server_name: 你的域名或 IP
# 2. root: 前端静态文件路径（client/dist 的绝对路径）

# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/youtube-scrawler /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 3. 修改配置中的路径

打开 `/etc/nginx/sites-available/youtube-scrawler`，修改以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改为你的域名或 IP

    # 修改为实际的前端构建路径
    root /data/workspace/youtube-crawler/client/dist;

    # ... 其他配置保持不变
}
```

### 4. 确保前端已构建

```bash
cd /data/workspace/youtube-crawler
npm run build:client

# 或者运行完整构建
npm run build
```

### 5. 检查文件权限

```bash
# 确保 Nginx 用户（通常是 www-data 或 nginx）可以读取文件
sudo chmod -R 755 /data/workspace/youtube-crawler/client/dist
sudo chown -R www-data:www-data /data/workspace/youtube-crawler/client/dist

# CentOS/RHEL 使用
sudo chown -R nginx:nginx /data/workspace/youtube-crawler/client/dist
```

---

## 🔍 验证部署

### 1. 检查后端服务

```bash
curl http://localhost:3001/api/health
# 应该返回：{"status":"ok",...}
```

### 2. 检查 Nginx 配置

```bash
sudo nginx -t
```

### 3. 检查 Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/youtube-scrawler-access.log

# 错误日志
sudo tail -f /var/log/nginx/youtube-scrawler-error.log
```

### 4. 通过浏览器访问

访问 `http://your-domain.com` 或 `http://your-ip`，应该能看到前端页面。

---

## 🐛 常见问题

### 问题 1: 404 Not Found

**原因**：前端文件路径配置错误

**解决**：
```bash
# 检查前端文件是否存在
ls -la /data/workspace/youtube-crawler/client/dist/

# 应该能看到 index.html
```

### 问题 2: 403 Forbidden

**原因**：文件权限问题

**解决**：
```bash
sudo chmod -R 755 /data/workspace/youtube-crawler/client/dist
sudo chown -R www-data:www-data /data/workspace/youtube-crawler/client/dist
```

### 问题 3: API 请求失败

**原因**：后端服务未运行或代理配置错误

**解决**：
```bash
# 1. 检查后端服务
./service.sh status

# 2. 检查端口监听
sudo netstat -tlnp | grep 3001

# 3. 测试 API
curl http://localhost:3001/api/settings
```

### 问题 4: 仍然显示 JSON 错误

**原因**：直接访问了后端端口（3001）

**解决**：
- ❌ 错误：`http://your-domain.com:3001`
- ✓ 正确：`http://your-domain.com`（端口 80，由 Nginx 处理）

---

## 📝 配置说明

### Nginx 配置结构

```nginx
server {
    listen 80;                    # 监听 80 端口
    root /path/to/client/dist;   # 前端静态文件路径

    location / {
        # 前端 SPA 路由
        try_files $uri $uri/ /index.html;
    }

    location /api {
        # 反向代理到后端
        proxy_pass http://localhost:3001;
    }
}
```

### 访问流程

```
用户浏览器
    ↓
访问 http://your-domain.com
    ↓
Nginx (端口 80)
    ├─ /           → 返回前端静态文件（React SPA）
    └─ /api/*      → 反向代理到后端（端口 3001）
```

---

## 🔐 HTTPS 配置（推荐）

### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书并自动配置 Nginx
sudo certbot --nginx -d your-domain.com

# Certbot 会自动修改 Nginx 配置，添加 SSL
```

### 手动配置 HTTPS

如果已有证书，取消 nginx.conf 中 HTTPS 部分的注释，并配置证书路径。

---

## 📊 性能优化

### 1. 启用 Gzip 压缩（已配置）

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. 静态资源缓存（已配置）

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 开启 HTTP/2

```nginx
listen 443 ssl http2;  # 在 SSL 配置中添加 http2
```

---

## 📞 需要帮助？

1. 查看 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`
2. 查看后端日志：`./service.sh logs`
3. 测试 API：`curl http://localhost:3001/api/health`
4. 检查前端构建：`ls -la client/dist/`

---

## ✅ 部署检查清单

- [ ] Nginx 已安装并运行
- [ ] 前端已构建（client/dist 存在）
- [ ] Nginx 配置文件已修改（域名、路径）
- [ ] 文件权限正确（755）
- [ ] 后端服务运行中（./service.sh status）
- [ ] 可以通过浏览器访问前端页面
- [ ] API 请求正常工作
- [ ] （可选）HTTPS 已配置
