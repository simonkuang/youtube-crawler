// 通用类型定义

// YouTube视频语言/地区代码
export const YOUTUBE_LANGUAGES = [
  { code: 'en-US', name: '英语（美国）', flag: '🇺🇸' },
  { code: 'en-GB', name: '英语（英国）', flag: '🇬🇧' },
  { code: 'ja', name: '日语', flag: '🇯🇵' },
  { code: 'ko', name: '韩语', flag: '🇰🇷' },
  { code: 'de', name: '德语', flag: '🇩🇪' },
  { code: 'fr', name: '法语', flag: '🇫🇷' },
  { code: 'es', name: '西班牙语（西班牙）', flag: '🇪🇸' },
  { code: 'es-MX', name: '西班牙语（拉美）', flag: '🇲🇽' },
  { code: 'pt-BR', name: '葡萄牙语（巴西）', flag: '🇧🇷' },
  { code: 'hi', name: '印地语', flag: '🇮🇳' },
  { code: 'id', name: '印尼语', flag: '🇮🇩' },
  { code: 'th', name: '泰语', flag: '🇹🇭' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁体中文', flag: '🇹🇼' },
] as const;

export type LanguageCode = typeof YOUTUBE_LANGUAGES[number]['code'];

// 搜索参数
export interface SearchParams {
  keyword: string;
  maxResults: number;
  publishedAfter?: string; // 发布时间范围
  language?: LanguageCode; // 新增：语言选择
  minViewCount?: number; // 视频最小播放量
  minViewCountShorts?: number; // Shorts最小播放量
  videoType?: 'all' | 'video' | 'shorts'; // 视频类型
  filterPopular?: boolean; // 筛选爆款视频
}

// YouTube视频信息
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

// 搜索结果
export interface SearchResult {
  videos: VideoInfo[];
  totalResults: number;
  nextPageToken?: string;
}

// 导出格式
export type ExportFormat = 'json' | 'xlsx';

// API响应
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 登录状态
export interface AuthStatus {
  isLoggedIn: boolean;
  email?: string;
  expiresAt?: number;
}

// 设置
export interface AppSettings {
  youtubeApiKey?: string;
  useProxy: boolean;
  proxyList: string[];
  minRequestDelay: number;
  maxRequestDelay: number;
  headless: boolean;
}
