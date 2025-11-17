import ExcelJS from 'exceljs';
import type { VideoInfo } from '../types';

export class ExportService {
  // 导出为JSON
  static async exportToJson(videos: VideoInfo[]): Promise<Buffer> {
    const json = JSON.stringify(videos, null, 2);
    return Buffer.from(json, 'utf-8');
  }

  // 导出为Excel
  static async exportToExcel(videos: VideoInfo[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('YouTube视频数据');

    // 定义列
    worksheet.columns = [
      { header: '视频ID', key: 'id', width: 15 },
      { header: '标题', key: 'title', width: 50 },
      { header: '频道', key: 'channelTitle', width: 20 },
      { header: '频道ID', key: 'channelId', width: 25 },
      { header: '播放量', key: 'viewCount', width: 15 },
      { header: '点赞数', key: 'likeCount', width: 12 },
      { header: '评论数', key: 'commentCount', width: 12 },
      { header: '发布时间', key: 'publishedAt', width: 20 },
      { header: '时长', key: 'duration', width: 10 },
      { header: '类型', key: 'type', width: 10 },
      { header: '语言', key: 'language', width: 10 },
      { header: '链接', key: 'url', width: 40 },
      { header: '标签', key: 'tags', width: 30 },
    ];

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 添加数据
    videos.forEach((video) => {
      worksheet.addRow({
        id: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        channelId: video.channelId,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        publishedAt: new Date(video.publishedAt).toLocaleString('zh-CN'),
        duration: video.duration,
        type: video.isShorts ? 'Shorts' : '视频',
        language: video.language || '',
        url: video.url,
        tags: video.tags.join(', '),
      });
    });

    // 自动调整列宽
    worksheet.columns.forEach((column) => {
      if (column.header === '标题' || column.header === '链接') {
        return; // 这些列保持固定宽度
      }
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // 添加筛选
    worksheet.autoFilter = {
      from: 'A1',
      to: `M${videos.length + 1}`,
    };

    // 冻结首行
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 生成Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
