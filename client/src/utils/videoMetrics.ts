// 视频洞察指标计算工具函数

import type { VideoInfo } from '@/types';

/**
 * 计算视频发布天数
 */
export const getDaysSincePublish = (publishedAt: string): number => {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const diffMs = now.getTime() - publishDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(days, 1); // 至少返回1天，避免除以0
};

/**
 * 格式化数字（带千分位）
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
};

/**
 * 计算日均增幅指标
 */
export const calculateDailyGrowth = (video: VideoInfo) => {
  const days = getDaysSincePublish(video.publishedAt);

  return {
    dailyViews: video.viewCount / days,
    dailyLikes: video.likeCount / days,
    dailyComments: video.commentCount / days,
  };
};

/**
 * 计算单粉数据指标
 */
export const calculatePerSubscriber = (video: VideoInfo) => {
  const subscribers = video.channelSubscriberCount || 1; // 避免除以0

  return {
    viewsPerSub: video.viewCount / subscribers,
    likesPerSub: video.likeCount / subscribers,
    commentsPerSub: video.commentCount / subscribers,
  };
};

/**
 * 格式化日均增幅显示
 */
export const formatDailyGrowth = (video: VideoInfo): string => {
  const growth = calculateDailyGrowth(video);
  const days = getDaysSincePublish(video.publishedAt);

  return `
浏览: ${formatNumber(growth.dailyViews)}/天
点赞: ${formatNumber(growth.dailyLikes)}/天
评论: ${formatNumber(growth.dailyComments)}/天
(${days}天)
  `.trim();
};

/**
 * 格式化单粉数据显示
 */
export const formatPerSubscriber = (video: VideoInfo): string => {
  if (video.channelSubscriberCount === 0) {
    return '数据不可用\n(需使用API模式)';
  }

  const perSub = calculatePerSubscriber(video);

  return `
浏览: ${formatNumber(perSub.viewsPerSub)}/粉
点赞: ${formatNumber(perSub.likesPerSub)}/粉
评论: ${formatNumber(perSub.commentsPerSub)}/粉
  `.trim();
};
