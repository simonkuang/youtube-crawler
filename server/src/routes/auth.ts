import express from 'express';
import { authService } from '../services/auth';

const router = express.Router();

// 获取登录状态
router.get('/status', async (req, res) => {
  try {
    const session = await authService.ensureValidSession();

    if (session) {
      res.json({
        success: true,
        data: {
          isLoggedIn: true,
          email: session.email,
          expiresAt: session.expiresAt,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          isLoggedIn: false,
        },
      });
    }
  } catch (error: any) {
    console.error('获取登录状态失败:', error);
    res.json({
      success: true,
      data: {
        isLoggedIn: false,
      },
    });
  }
});

// 发起登录
router.get('/login', (req, res) => {
  try {
    const authUrl = authService.getAuthUrl();
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error: any) {
    console.error('生成登录URL失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '启动登录失败',
    });
  }
});

// OAuth回调
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('缺少授权码');
    }

    await authService.handleCallback(code);

    // 返回成功页面
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>登录成功</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f0f2f5;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 {
            color: #52c41a;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ 登录成功</h1>
          <p>您已成功登录YouTube账号</p>
          <p>您可以关闭此窗口，返回应用继续操作</p>
        </div>
        <script>
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth回调处理失败:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>登录失败</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f0f2f5;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 {
            color: #ff4d4f;
            margin-bottom: 20px;
          }
          p {
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✗ 登录失败</h1>
          <p>${error.message || '未知错误'}</p>
          <p>请关闭窗口并重试</p>
        </div>
      </body>
      </html>
    `);
  }
});

// 登出
router.post('/logout', (req, res) => {
  try {
    authService.logout();
    res.json({
      success: true,
    });
  } catch (error: any) {
    console.error('登出失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '登出失败',
    });
  }
});

export default router;
