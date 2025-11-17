import { create } from 'zustand';
import type { VideoInfo, AuthStatus, AppSettings } from '@/types';

interface AppStore {
  // 搜索结果
  videos: VideoInfo[];
  setVideos: (videos: VideoInfo[]) => void;
  addVideos: (videos: VideoInfo[]) => void;
  clearVideos: () => void;

  // 加载状态
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // 认证状态
  authStatus: AuthStatus;
  setAuthStatus: (status: AuthStatus) => void;

  // 设置
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;

  // 错误信息
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStore = create<AppStore>((set) => ({
  // 搜索结果
  videos: [],
  setVideos: (videos) => set({ videos }),
  addVideos: (videos) => set((state) => ({ videos: [...state.videos, ...videos] })),
  clearVideos: () => set({ videos: [] }),

  // 加载状态
  loading: false,
  setLoading: (loading) => set({ loading }),

  // 认证状态
  authStatus: { isLoggedIn: false },
  setAuthStatus: (authStatus) => set({ authStatus }),

  // 设置
  settings: {
    useProxy: false,
    proxyList: [],
    minRequestDelay: 1000,
    maxRequestDelay: 3000,
    headless: true,
  },
  setSettings: (settings) => set({ settings }),

  // 错误信息
  error: null,
  setError: (error) => set({ error }),
}));
