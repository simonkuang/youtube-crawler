import { google, youtube_v3 } from 'googleapis';
import type { SearchParams, VideoInfo, SearchResult } from '../types';
import { ProxyManager } from './proxy-manager';

export class YouTubeApiService {
  private youtube: youtube_v3.Youtube;
  private apiKey: string;
  private proxyManager: ProxyManager | null = null;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly MAX_REQUESTS_PER_SECOND = 5;
  private readonly MIN_REQUEST_DELAY = 200; // 毫秒

  constructor(apiKey: string, proxyList?: string[]) {
    this.apiKey = apiKey;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });

    if (proxyList && proxyList.length > 0) {
      this.proxyManager = new ProxyManager(proxyList);
    }
  }

  // 请求频率限制
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_DELAY) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_REQUEST_DELAY - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  // 搜索视频
  async search(params: SearchParams): Promise<SearchResult> {
    await this.rateLimitDelay();

    try {
      // 构建搜索参数
      const searchParams: any = {
        part: ['snippet'],
        q: params.keyword,
        maxResults: Math.min(params.maxResults, 50),
        type: ['video'],
        order: 'relevance',
        relevanceLanguage: params.language,
      };

      if (params.publishedAfter) {
        searchParams.publishedAfter = params.publishedAfter;
      }

      // 执行搜索
      const searchResponse = await this.youtube.search.list(searchParams);

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return { videos: [], totalResults: 0 };
      }

      // 获取视频详细信息
      const videoIds = searchResponse.data.items
        .map((item) => item.id?.videoId)
        .filter(Boolean) as string[];

      const videos = await this.getVideoDetails(videoIds);

      // 应用过滤条件
      let filteredVideos = videos;

      if (params.minViewCount && params.minViewCount > 0) {
        filteredVideos = filteredVideos.filter((v) => {
          if (v.isShorts) {
            return v.viewCount >= (params.minViewCountShorts || params.minViewCount!);
          }
          return v.viewCount >= params.minViewCount!;
        });
      }

      if (params.videoType === 'shorts') {
        filteredVideos = filteredVideos.filter((v) => v.isShorts);
      } else if (params.videoType === 'video') {
        filteredVideos = filteredVideos.filter((v) => !v.isShorts);
      }

      // 爆款过滤（基于互动率）
      if (params.filterPopular) {
        filteredVideos = filteredVideos.filter((v) => {
          const engagementRate = (v.likeCount + v.commentCount) / Math.max(v.viewCount, 1);
          return engagementRate > 0.01; // 1%以上的互动率
        });
      }

      return {
        videos: filteredVideos,
        totalResults: filteredVideos.length,
        nextPageToken: searchResponse.data.nextPageToken || undefined,
      };
    } catch (error: any) {
      console.error('YouTube API搜索失败:', error);
      throw new Error(`YouTube API错误: ${error.message}`);
    }
  }

  // 获取视频详细信息
  private async getVideoDetails(videoIds: string[]): Promise<VideoInfo[]> {
    await this.rateLimitDelay();

    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds,
      });

      if (!response.data.items) {
        return [];
      }

      // 获取所有唯一的频道ID
      const channelIds = Array.from(
        new Set(response.data.items.map((item) => item.snippet?.channelId).filter(Boolean))
      ) as string[];

      // 批量获取频道信息（订阅者数量）
      const channelMap = await this.getChannelSubscribers(channelIds);

      // 解析视频信息并添加频道订阅者数量
      return response.data.items.map((item) => {
        const channelId = item.snippet?.channelId || '';
        const subscriberCount = channelMap.get(channelId) || 0;
        return this.parseVideoInfo(item, subscriberCount);
      });
    } catch (error: any) {
      console.error('获取视频详情失败:', error);
      throw new Error(`获取视频详情失败: ${error.message}`);
    }
  }

  // 批量获取频道订阅者数量
  private async getChannelSubscribers(channelIds: string[]): Promise<Map<string, number>> {
    if (channelIds.length === 0) {
      return new Map();
    }

    await this.rateLimitDelay();

    try {
      const response = await this.youtube.channels.list({
        part: ['statistics'],
        id: channelIds,
      });

      const channelMap = new Map<string, number>();

      response.data.items?.forEach((channel) => {
        const channelId = channel.id!;
        const subscriberCount = parseInt(channel.statistics?.subscriberCount || '0');
        channelMap.set(channelId, subscriberCount);
      });

      return channelMap;
    } catch (error: any) {
      console.error('获取频道信息失败:', error);
      // 如果获取频道信息失败，返回空Map，不影响主流程
      return new Map();
    }
  }

  // 解析视频信息
  private parseVideoInfo(item: youtube_v3.Schema$Video, channelSubscriberCount: number): VideoInfo {
    const snippet = item.snippet!;
    const statistics = item.statistics || {};
    const contentDetails = item.contentDetails!;

    // 判断是否为Shorts（时长小于60秒）
    const duration = this.parseDuration(contentDetails.duration || 'PT0S');
    const isShorts = duration <= 60;

    return {
      id: item.id!,
      title: snippet.title || '',
      description: snippet.description || '',
      channelId: snippet.channelId || '',
      channelTitle: snippet.channelTitle || '',
      channelSubscriberCount,
      publishedAt: snippet.publishedAt || '',
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      viewCount: parseInt(statistics.viewCount || '0'),
      likeCount: parseInt(statistics.likeCount || '0'),
      commentCount: parseInt(statistics.commentCount || '0'),
      duration: this.formatDuration(duration),
      tags: snippet.tags || [],
      isShorts,
      language: snippet.defaultLanguage || snippet.defaultAudioLanguage,
      url: `https://www.youtube.com/watch?v=${item.id}`,
    };
  }

  // 解析ISO 8601时长格式
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  // 格式化时长
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // 获取API配额使用情况
  getQuotaUsage(): number {
    // 粗略估算：每次search消耗100配额，每次videos.list消耗1配额
    return this.requestCount * 100;
  }
}
