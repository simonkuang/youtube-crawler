import express from 'express';
import { YouTubeApiService } from '../services/youtube-api';
import { BrowserScraperService } from '../services/browser-scraper';
import { ExportService } from '../services/export';
import { db } from '../services/database';
import type { SearchParams } from '../types';

const router = express.Router();

// API搜索
router.post('/api', async (req, res) => {
  try {
    const params: SearchParams = req.body;

    // 验证参数
    if (!params.keyword || !params.keyword.trim()) {
      return res.status(400).json({
        success: false,
        error: '关键词不能为空',
      });
    }

    // 获取设置
    const settings = db.getSettings();

    if (!settings.youtubeApiKey) {
      return res.status(400).json({
        success: false,
        error: '请先在设置中配置YouTube API密钥',
      });
    }

    // 创建YouTube API服务
    const proxyList = settings.useProxy ? settings.proxyList : undefined;
    const youtubeApi = new YouTubeApiService(settings.youtubeApiKey, proxyList);

    // 执行搜索
    const result = await youtubeApi.search(params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('API搜索失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '搜索失败',
    });
  }
});

// 浏览器自动化搜索
router.post('/browser', async (req, res) => {
  let scraper: BrowserScraperService | null = null;

  try {
    const params: SearchParams = req.body;

    // 验证参数
    if (!params.keyword || !params.keyword.trim()) {
      return res.status(400).json({
        success: false,
        error: '关键词不能为空',
      });
    }

    // 检查登录状态
    const session = db.getAuthSession();
    if (!session) {
      return res.status(401).json({
        success: false,
        error: '浏览器采集需要先登录YouTube账号',
      });
    }

    // 获取设置
    const settings = db.getSettings();

    // 创建浏览器爬虫服务
    scraper = new BrowserScraperService({
      proxyList: settings.useProxy ? settings.proxyList : undefined,
      minDelay: settings.minRequestDelay,
      maxDelay: settings.maxRequestDelay,
      headless: settings.headless,
    });

    // 执行搜索
    const result = await scraper.search(params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('浏览器采集失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '采集失败',
    });
  } finally {
    if (scraper) {
      await scraper.close();
    }
  }
});

// 导出数据
router.post('/export', async (req, res) => {
  try {
    const { videos, format } = req.body;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有数据可导出',
      });
    }

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'xlsx') {
      buffer = await ExportService.exportToExcel(videos);
      filename = `youtube-videos-${Date.now()}.xlsx`;
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = await ExportService.exportToJson(videos);
      filename = `youtube-videos-${Date.now()}.json`;
      contentType = 'application/json';
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (error: any) {
    console.error('导出失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '导出失败',
    });
  }
});

export default router;
