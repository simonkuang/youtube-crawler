// 后端类型定义

export interface SearchParams {
  keyword: string;
  maxResults: number;
  publishedAfter?: string;
  language?: string;
  minViewCount?: number;
  minViewCountShorts?: number;
  videoType?: 'all' | 'video' | 'shorts';
  filterPopular?: boolean;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  channelSubscriberCount: number; // 频道订阅者数量（粉丝数）
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  tags: string[];
  isShorts: boolean;
  language?: string;
  url: string;
}

export interface SearchResult {
  videos: VideoInfo[];
  totalResults: number;
  nextPageToken?: string;
}

export interface AppSettings {
  youtubeApiKey?: string;
  useProxy: boolean;
  proxyList: string[];
  minRequestDelay: number;
  maxRequestDelay: number;
  headless: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
  cookies?: any[];
}

export interface ProxyConfig {
  url: string;
  username?: string;
  password?: string;
  lastUsed?: number;
  failCount?: number;
}
