import type { ProxyConfig } from '../types';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;

  constructor(proxyList: string[]) {
    this.proxies = proxyList.map((url) => ({
      url: url.trim(),
      failCount: 0,
    }));
  }

  // 获取下一个可用代理
  getNextProxy(): ProxyConfig | null {
    if (this.proxies.length === 0) {
      return null;
    }

    // 轮询选择
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

    proxy.lastUsed = Date.now();
    return proxy;
  }

  // 标记代理失败
  markProxyFailed(proxyUrl: string): void {
    const proxy = this.proxies.find((p) => p.url === proxyUrl);
    if (proxy) {
      proxy.failCount = (proxy.failCount || 0) + 1;

      // 如果失败次数过多，暂时移除
      if (proxy.failCount > 5) {
        this.proxies = this.proxies.filter((p) => p.url !== proxyUrl);
        console.warn(`代理 ${proxyUrl} 失败次数过多，已移除`);
      }
    }
  }

  // 标记代理成功
  markProxySuccess(proxyUrl: string): void {
    const proxy = this.proxies.find((p) => p.url === proxyUrl);
    if (proxy) {
      proxy.failCount = 0;
    }
  }

  // 创建代理Agent
  createProxyAgent(proxyUrl: string): HttpProxyAgent<string> | HttpsProxyAgent<string> {
    if (proxyUrl.startsWith('https://')) {
      return new HttpsProxyAgent<string>(proxyUrl);
    }
    return new HttpProxyAgent<string>(proxyUrl);
  }

  // 测试代理连接
  static async testProxy(proxyUrl: string): Promise<boolean> {
    try {
      const agent = proxyUrl.startsWith('https://')
        ? new HttpsProxyAgent<string>(proxyUrl)
        : new HttpProxyAgent<string>(proxyUrl);

      // @ts-ignore - node-fetch 类型声明缺失
      const { default: fetch } = await import('node-fetch');
      const response: any = await fetch('https://www.google.com', {
        agent: agent as any,
        timeout: 10000,
      });

      return response.ok;
    } catch (error) {
      console.error(`代理 ${proxyUrl} 测试失败:`, error);
      return false;
    }
  }

  // 获取当前可用代理数量
  getAvailableProxyCount(): number {
    return this.proxies.length;
  }
}
