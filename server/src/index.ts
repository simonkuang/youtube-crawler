import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import searchRoutes from './routes/search';
import authRoutes from './routes/auth';
import settingsRoutes from './routes/settings';
import { db } from './services/database';

// 加载环境变量（从项目根目录）
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API路由
app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 YouTube爆款视频采集工具 - 后端服务');
  console.log('='.repeat(60));
  console.log(`📡 服务器运行在: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 数据库: ${process.env.DATABASE_PATH || './data/youtube-scrawler.db'}`);
  console.log('='.repeat(60));
  console.log('✓ 可用接口:');
  console.log('  - POST /api/search/api        - API搜索');
  console.log('  - POST /api/search/browser    - 浏览器采集');
  console.log('  - POST /api/search/export     - 导出数据');
  console.log('  - GET  /api/auth/status       - 登录状态');
  console.log('  - GET  /api/auth/login        - 发起登录');
  console.log('  - POST /api/auth/logout       - 登出');
  console.log('  - GET  /api/settings          - 获取设置');
  console.log('  - PUT  /api/settings          - 更新设置');
  console.log('='.repeat(60));

  // 清理过期会话
  db.cleanupExpiredSessions();
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  db.close();
  process.exit(0);
});

export default app;
