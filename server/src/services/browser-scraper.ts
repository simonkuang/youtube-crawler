import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import type { SearchParams, VideoInfo, SearchResult, AuthSession } from '../types';
import { ProxyManager } from './proxy-manager';
import { db } from './database';

// 应用Stealth插件（反检测）
puppeteer.use(StealthPlugin());

export class BrowserScraperService {
  private browser: Browser | null = null;
  private proxyManager: ProxyManager | null = null;
  private minDelay: number;
  private maxDelay: number;
  private headless: boolean;

  constructor(options: {
    proxyList?: string[];
    minDelay?: number;
    maxDelay?: number;
    headless?: boolean;
  }) {
    if (options.proxyList && options.proxyList.length > 0) {
      this.proxyManager = new ProxyManager(options.proxyList);
    }

    this.minDelay = options.minDelay || 1000;
    this.maxDelay = options.maxDelay || 3000;
    this.headless = options.headless !== false;
  }

  // 启动浏览器
  private async launchBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    const launchOptions: any = {
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
      ],
    };

    // 配置代理
    if (this.proxyManager) {
      const proxy = this.proxyManager.getNextProxy();
      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy.url}`);
      }
    }

    this.browser = await puppeteer.launch(launchOptions);
    return this.browser;
  }

  // 随机延迟（模拟人类行为）
  private async randomDelay(): Promise<void> {
    const delay = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // 创建隐身页面（应用反检测技术）
  private async createStealthPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();

    // 设置视口
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // 设置真实的User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 设置额外的Headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    // 覆盖navigator属性（反检测）
    await page.evaluateOnNewDocument(() => {
      // 覆盖webdriver属性
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // 覆盖plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // 覆盖languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // 覆盖chrome属性
      (window as any).chrome = {
        runtime: {},
      };

      // 覆盖permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    return page;
  }

  // 登录YouTube（使用保存的会话）
  private async loginWithSession(page: Page, session: AuthSession): Promise<void> {
    try {
      // 如果有保存的cookies，直接设置
      if (session.cookies && session.cookies.length > 0) {
        await page.setCookie(...session.cookies);
        return;
      }

      // 否则，访问YouTube并等待登录状态
      await page.goto('https://www.youtube.com', { waitUntil: 'networkidle0' });
      await this.randomDelay();
    } catch (error) {
      console.error('登录YouTube失败:', error);
      throw new Error('无法登录YouTube，请重新登录');
    }
  }

  // 搜索视频
  async search(params: SearchParams): Promise<SearchResult> {
    let page: Page | null = null;

    try {
      const browser = await this.launchBrowser();
      page = await this.createStealthPage(browser);

      // 检查并使用登录会话
      const session = db.getAuthSession();
      if (session) {
        await this.loginWithSession(page, session);
      }

      // 构建搜索URL
      const searchUrl = this.buildSearchUrl(params);
      console.log('搜索URL:', searchUrl);

      // 访问搜索页面
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.randomDelay();

      // 滚动加载更多视频
      await this.scrollToLoadMore(page, params.maxResults);

      // 提取视频信息
      const videos = await this.extractVideos(page, params);

      // 保存cookies（用于下次登录）
      if (session) {
        const cookies = await page.cookies();
        session.cookies = cookies;
        db.saveAuthSession(session);
      }

      return {
        videos,
        totalResults: videos.length,
      };
    } catch (error: any) {
      console.error('浏览器采集失败:', error);
      throw new Error(`浏览器采集失败: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  // 构建搜索URL
  private buildSearchUrl(params: SearchParams): string {
    const baseUrl = 'https://www.youtube.com/results';
    const searchParams = new URLSearchParams();

    searchParams.set('search_query', params.keyword);

    // 添加过滤器
    const filters: string[] = [];

    if (params.publishedAfter) {
      const date = new Date(params.publishedAfter);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) filters.push('EgQIARAB'); // Today
      else if (diffDays <= 7) filters.push('EgQIAxAB'); // This week
      else if (diffDays <= 30) filters.push('EgQIAhAB'); // This month
      else if (diffDays <= 365) filters.push('EgQIBRAB'); // This year
    }

    if (params.videoType === 'shorts') {
      searchParams.set('sp', 'EgIYAQ%3D%3D');
    }

    if (params.language) {
      searchParams.set('lr', params.language);
    }

    return `${baseUrl}?${searchParams.toString()}`;
  }

  // 滚动加载更多视频
  private async scrollToLoadMore(page: Page, targetCount: number): Promise<void> {
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = Math.ceil(targetCount / 20); // 每次滚动约加载20个视频

    while (scrollAttempts < maxScrollAttempts) {
      // 滚动到页面底部
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });

      await this.randomDelay();

      // 检查页面高度是否变化
      const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);

      if (currentHeight === previousHeight) {
        // 页面没有变化，可能已经加载完所有内容
        break;
      }

      previousHeight = currentHeight;
      scrollAttempts++;
    }
  }

  // 提取视频信息
  private async extractVideos(page: Page, params: SearchParams): Promise<VideoInfo[]> {
    const videos = await page.evaluate((maxResults) => {
      // 解析播放量文本（内联函数，因为在浏览器上下文中无法访问类方法）
      const parseViewCount = (text: string): number => {
        const match = text.match(/([\d.]+)\s*([KMB]?)/i);
        if (!match) return 0;

        const num = parseFloat(match[1]);
        const unit = match[2].toUpperCase();

        switch (unit) {
          case 'K':
            return Math.floor(num * 1000);
          case 'M':
            return Math.floor(num * 1000000);
          case 'B':
            return Math.floor(num * 1000000000);
          default:
            return Math.floor(num);
        }
      };

      const videoElements = document.querySelectorAll('ytd-video-renderer, ytd-reel-item-renderer');
      const results: any[] = [];

      videoElements.forEach((element, index) => {
        if (index >= maxResults) return;

        try {
          // 提取视频ID
          const linkElement = element.querySelector('a#video-title, a.reel-item-endpoint');
          const href = linkElement?.getAttribute('href') || '';
          const videoIdMatch = href.match(/[?&]v=([^&]+)/);
          const videoId = videoIdMatch ? videoIdMatch[1] : '';

          if (!videoId) return;

          // 提取标题
          const title =
            linkElement?.getAttribute('title') || linkElement?.textContent?.trim() || '';

          // 提取频道信息
          const channelElement = element.querySelector('ytd-channel-name a, #channel-name a');
          const channelTitle = channelElement?.textContent?.trim() || '';
          const channelHref = channelElement?.getAttribute('href') || '';
          const channelId = channelHref.replace(/\/@|\/channel\/|\/c\/|\/user\//g, '');

          // 提取缩略图
          const thumbnailElement = element.querySelector('img');
          const thumbnailUrl = thumbnailElement?.getAttribute('src') || '';

          // 提取播放量
          const viewCountElement = element.querySelector(
            '#metadata-line span:first-child, .reel-item-metadata span'
          );
          const viewCountText = viewCountElement?.textContent?.trim() || '0';
          const viewCount = parseViewCount(viewCountText);

          // 提取发布时间
          const publishedElement = element.querySelector('#metadata-line span:last-child');
          const publishedText = publishedElement?.textContent?.trim() || '';

          // 提取时长
          const durationElement = element.querySelector('span.ytd-thumbnail-overlay-time-status-renderer, span#text.reel-item-duration');
          const duration = durationElement?.textContent?.trim() || '';

          // 判断是否为Shorts
          const isShorts = element.tagName.toLowerCase() === 'ytd-reel-item-renderer';

          results.push({
            id: videoId,
            title,
            description: '',
            channelId,
            channelTitle,
            channelSubscriberCount: 0, // 浏览器模式无法获取，使用API模式可获得准确数据
            publishedAt: publishedText,
            thumbnailUrl,
            viewCount,
            likeCount: 0,
            commentCount: 0,
            duration,
            tags: [],
            isShorts,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          });
        } catch (error) {
          console.error('提取视频信息失败:', error);
        }
      });

      return results;
    }, params.maxResults);

    // 应用过滤条件
    let filteredVideos = videos;

    if (params.minViewCount && params.minViewCount > 0) {
      filteredVideos = filteredVideos.filter((v: VideoInfo) => {
        const minCount = v.isShorts
          ? params.minViewCountShorts || params.minViewCount!
          : params.minViewCount!;
        return v.viewCount >= minCount;
      });
    }

    if (params.videoType === 'shorts') {
      filteredVideos = filteredVideos.filter((v: VideoInfo) => v.isShorts);
    } else if (params.videoType === 'video') {
      filteredVideos = filteredVideos.filter((v: VideoInfo) => !v.isShorts);
    }

    return filteredVideos;
  }

  // 关闭浏览器
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
