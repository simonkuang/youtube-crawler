# YouTube爆款视频采集工具

基于Google API和浏览器自动化的YouTube热门视频采集工具，支持多语言搜索、智能过滤和数据导出。

## ✨ 主要功能

- 🔍 **双模式采集**
  - YouTube Data API搜索（速度快，配额限制）
  - 浏览器自动化采集（突破限制，更稳定）

- 🌍 **多语言支持**
  - 支持14种主流语言/地区
  - 覆盖YouTube商业化变现能力最强的市场

- 🎯 **智能筛选**
  - 按播放量、发布时间、视频类型筛选
  - 区分普通视频和Shorts
  - 自动识别爆款内容

- 🔐 **账号登录**
  - Google OAuth安全认证
  - 加密存储登录状态
  - 自动刷新Token

- 🛡️ **反爬虫对抗**
  - Puppeteer Stealth隐藏自动化特征
  - 真实浏览器指纹伪装
  - 随机请求延迟
  - 代理池支持

- 📊 **数据导出**
  - Excel (XLSX) 格式
  - JSON格式
  - 包含播放量、点赞数、评论数等完整数据

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装依赖

```bash
# 安装所有依赖（根目录、前端、后端）
npm run install:all
```

### 配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置以下内容：

```env
# YouTube API配置
YOUTUBE_API_KEY=your_youtube_api_key_here
YOUTUBE_CLIENT_ID=your_google_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_google_oauth_client_secret

# 其他配置已有默认值，可根据需要修改
```

#### 获取YouTube API密钥

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 **YouTube Data API v3**
4. 创建凭据：
   - API密钥（用于 `YOUTUBE_API_KEY`）
   - OAuth 2.0 客户端ID（用于 `YOUTUBE_CLIENT_ID` 和 `YOUTUBE_CLIENT_SECRET`）
5. 在OAuth设置中添加回调URL：`http://localhost:3001/api/auth/callback`

### 运行

```bash
# 开发模式（同时启动前端和后端）
npm run dev

# 仅启动前端
npm run dev:client

# 仅启动后端
npm run dev:server
```

应用将在以下地址运行：
- 前端：http://localhost:3000
- 后端：http://localhost:3001

### 构建生产版本

```bash
# 构建前端和后端
npm run build

# 启动生产服务器
cd server && npm start
```

## 📖 使用说明

### 1. 配置设置

首次使用前，请前往"设置"页面：

1. **API设置**：填入YouTube API密钥
2. **登录设置**：使用Google账号登录（可选，建议登录以使用浏览器采集）
3. **代理设置**：配置代理服务器（可选，用于规避IP限制）
4. **反爬虫设置**：调整请求延迟等参数

### 2. API搜索模式

适合快速批量搜索：

1. 输入搜索关键词
2. 选择语言/地区
3. 设置筛选条件（播放量、时间范围等）
4. 点击"搜索"
5. 查看结果并导出

**注意事项：**
- 受YouTube API配额限制（默认每天10,000配额）
- 速度快，适合大批量采集
- 需要有效的API密钥

### 3. 浏览器采集模式

适合绕过API限制：

1. 确保已登录YouTube账号
2. 输入搜索关键词
3. 设置筛选条件
4. 点击"开始采集"
5. 等待浏览器自动完成采集

**注意事项：**
- 需要先登录YouTube账号
- 速度较慢，但更稳定
- 自动应用反检测技术

## 🛡️ 反爬虫机制

本工具实现了多层反检测技术：

### API模式
- OAuth 2.0认证
- 请求频率限制
- 自动配额管理

### 浏览器模式
- **Puppeteer Stealth**：隐藏webdriver等自动化特征
- **真实指纹**：模拟真实的User-Agent、WebGL、Canvas
- **行为模拟**：随机延迟、滚动加载
- **代理支持**：支持HTTP/HTTPS代理池
- **Cookie持久化**：保持登录状态

## 📦 项目结构

```
youtube-scrawler/
├── client/                 # 前端（React + TypeScript）
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── store/         # 状态管理
│   │   └── types/         # 类型定义
│   └── package.json
├── server/                 # 后端（Node.js + Express）
│   ├── src/
│   │   ├── routes/        # 路由
│   │   ├── services/      # 业务服务
│   │   │   ├── youtube-api.ts
│   │   │   ├── browser-scraper.ts
│   │   │   ├── auth.ts
│   │   │   └── proxy-manager.ts
│   │   └── types/         # 类型定义
│   └── package.json
├── .env                    # 环境变量（需自行创建）
└── README.md
```

## ⚠️ 注意事项

1. **API配额**：YouTube Data API有每日配额限制，请合理使用
2. **合规使用**：请遵守YouTube服务条款和robots.txt
3. **速率限制**：建议设置合理的请求延迟，避免被封禁
4. **隐私保护**：登录凭证加密存储在本地，请妥善保管
5. **代理使用**：如使用代理，请确保代理服务器可信

## 🐛 常见问题

### 1. API搜索返回空结果
- 检查API密钥是否正确
- 确认API配额未超限
- 尝试放宽筛选条件

### 2. 浏览器采集失败
- 确保已登录YouTube账号
- 检查网络连接
- 尝试关闭无头模式（headless）以调试

### 3. 代理连接失败
- 验证代理地址格式是否正确
- 使用"测试代理"功能检查连接
- 尝试更换其他代理

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

**免责声明**：本工具仅供学习和研究使用，请遵守相关法律法规和平台服务条款。
