import express from 'express';
import { db } from '../services/database';
import { ProxyManager } from '../services/proxy-manager';
import type { AppSettings } from '../types';

const router = express.Router();

// 获取设置
router.get('/', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取设置失败',
    });
  }
});

// 更新设置
router.put('/', (req, res) => {
  try {
    const settings: Partial<AppSettings> = req.body;

    // 验证代理列表格式
    if (settings.proxyList) {
      const proxies: string[] =
        typeof settings.proxyList === 'string'
          ? (settings.proxyList as string).split('\n').filter((p: string) => p.trim())
          : Array.isArray(settings.proxyList) ? settings.proxyList : [];

      settings.proxyList = proxies.map((p: string) => p.trim());
    }

    // 保存设置
    const currentSettings = db.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    db.saveSettings(newSettings);

    res.json({
      success: true,
      data: newSettings,
    });
  } catch (error: any) {
    console.error('更新设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新设置失败',
    });
  }
});

// 测试代理
router.post('/test-proxy', async (req, res) => {
  try {
    const { proxy } = req.body;

    if (!proxy || typeof proxy !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供代理地址',
      });
    }

    const isValid = await ProxyManager.testProxy(proxy);

    res.json({
      success: true,
      data: { success: isValid },
    });
  } catch (error: any) {
    console.error('测试代理失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '测试代理失败',
    });
  }
});

export default router;
