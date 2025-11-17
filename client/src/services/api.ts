import axios, { AxiosInstance } from 'axios';
import type { SearchParams, SearchResult, AuthStatus, AppSettings, ExportFormat, ApiResponse } from '@/types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message || '请求失败';
        throw new Error(message);
      }
    );
  }

  // API搜索
  async searchByApi(params: SearchParams): Promise<SearchResult> {
    const response = await this.client.post<ApiResponse<SearchResult>>('/search/api', params);
    if (!response.data.success) {
      throw new Error(response.data.error || '搜索失败');
    }
    return response.data.data!;
  }

  // 浏览器自动化搜索
  async searchByBrowser(params: SearchParams): Promise<SearchResult> {
    const response = await this.client.post<ApiResponse<SearchResult>>('/search/browser', params);
    if (!response.data.success) {
      throw new Error(response.data.error || '搜索失败');
    }
    return response.data.data!;
  }

  // 获取登录状态
  async getAuthStatus(): Promise<AuthStatus> {
    const response = await this.client.get<ApiResponse<AuthStatus>>('/auth/status');
    return response.data.data || { isLoggedIn: false };
  }

  // YouTube OAuth登录
  async initiateLogin(): Promise<{ authUrl: string }> {
    const response = await this.client.get<ApiResponse<{ authUrl: string }>>('/auth/login');
    if (!response.data.success) {
      throw new Error(response.data.error || '启动登录失败');
    }
    return response.data.data!;
  }

  // 登出
  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  // 导出数据
  async exportData(videos: any[], format: ExportFormat): Promise<Blob> {
    const response = await this.client.post(
      '/search/export',
      { videos, format },
      { responseType: 'blob' }
    );
    return response.data;
  }

  // 获取设置
  async getSettings(): Promise<AppSettings> {
    const response = await this.client.get<ApiResponse<AppSettings>>('/settings');
    return response.data.data || {
      useProxy: false,
      proxyList: [],
      minRequestDelay: 1000,
      maxRequestDelay: 3000,
      headless: true,
    };
  }

  // 更新设置
  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const response = await this.client.put<ApiResponse>('/settings', settings);
    if (!response.data.success) {
      throw new Error(response.data.error || '更新设置失败');
    }
  }

  // 测试代理
  async testProxy(proxy: string): Promise<boolean> {
    try {
      const response = await this.client.post<ApiResponse<{ success: boolean }>>('/settings/test-proxy', { proxy });
      return response.data.data?.success || false;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
