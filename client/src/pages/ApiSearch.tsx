import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Card,
  Table,
  message,
  Space,
  Tag,
  Tooltip,
  Statistic,
  Row,
  Col,
  Modal,
  Image,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ClearOutlined,
  EyeOutlined,
  LikeOutlined,
  CommentOutlined,
  PlayCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiService } from '@/services/api';
import { useStore } from '@/store/useStore';
import type { SearchParams, VideoInfo } from '@/types';
import { YOUTUBE_LANGUAGES } from '@/types';
import { formatDailyGrowth, formatPerSubscriber } from '@/utils/videoMetrics';

const { Option } = Select;

export const ApiSearch: React.FC = () => {
  const [form] = Form.useForm<SearchParams>();
  const { videos, setVideos, clearVideos, loading, setLoading, setError } = useStore();
  const [selectedRows, setSelectedRows] = useState<VideoInfo[]>([]);

  // 分页配置（从localStorage读取，实现记忆功能）
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('youtube-table-pageSize');
    return saved ? parseInt(saved) : 20;
  });

  // Modal状态
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);

  // 保存分页配置到localStorage
  useEffect(() => {
    localStorage.setItem('youtube-table-pageSize', pageSize.toString());
  }, [pageSize]);

  // 发布时间选项
  const publishTimeOptions = [
    { label: '不限', value: '' },
    { label: '最近1小时', value: new Date(Date.now() - 3600000).toISOString() },
    { label: '今天', value: new Date(Date.now() - 86400000).toISOString() },
    { label: '本周', value: new Date(Date.now() - 604800000).toISOString() },
    { label: '本月', value: new Date(Date.now() - 2592000000).toISOString() },
    { label: '最近1年', value: new Date(Date.now() - 31536000000).toISOString() },
  ];

  // 播放量选项
  const viewCountOptions = [
    { label: '不限', value: 0 },
    { label: '1万+', value: 10000 },
    { label: '10万+', value: 100000 },
    { label: '50万+', value: 500000 },
    { label: '100万+', value: 1000000 },
    { label: '500万+', value: 5000000 },
    { label: '1000万+', value: 10000000 },
  ];

  // 搜索处理
  const handleSearch = async () => {
    try {
      const values = await form.validateFields();

      if (!values.keyword?.trim()) {
        message.warning('请输入搜索关键词');
        return;
      }

      setLoading(true);
      setError(null);
      clearVideos();

      const params: SearchParams = {
        keyword: values.keyword.trim(),
        maxResults: values.maxResults || 50,
        publishedAfter: values.publishedAfter,
        language: values.language,
        minViewCount: values.minViewCount || 0,
        minViewCountShorts: values.minViewCountShorts || 0,
        videoType: values.videoType || 'all',
        filterPopular: values.filterPopular || false,
      };

      const result = await apiService.searchByApi(params);
      setVideos(result.videos);

      message.success(`搜索完成，找到 ${result.videos.length} 个视频`);
    } catch (error: any) {
      const errorMsg = error.message || '搜索失败';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 导出数据
  const handleExport = async (format: 'json' | 'xlsx') => {
    try {
      const dataToExport = selectedRows.length > 0 ? selectedRows : videos;

      if (dataToExport.length === 0) {
        message.warning('没有数据可导出');
        return;
      }

      const blob = await apiService.exportData(dataToExport, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube-videos-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success(`导出成功（${dataToExport.length} 条数据）`);
    } catch (error: any) {
      message.error(error.message || '导出失败');
    }
  };

  // 打开视频详情Modal
  const handleVideoClick = (video: VideoInfo) => {
    setSelectedVideo(video);
    setModalVisible(true);
  };

  // 表格列定义
  const columns: ColumnsType<VideoInfo> = [
    {
      title: '缩略图',
      dataIndex: 'thumbnailUrl',
      key: 'thumbnail',
      width: 120,
      render: (url: string, record: VideoInfo) => (
        <div
          onClick={() => handleVideoClick(record)}
          style={{ cursor: 'pointer', position: 'relative' }}
          title="点击查看详情"
        >
          <img
            src={url}
            alt="thumbnail"
            style={{
              width: 100,
              height: 56,
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
          <PlayCircleOutlined
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 32,
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: VideoInfo) => (
        <Space direction="vertical" size={4}>
          <a href={record.url} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
          {record.isShorts && <Tag color="magenta">Shorts</Tag>}
          {record.language && <Tag color="blue">{record.language}</Tag>}
        </Space>
      ),
    },
    {
      title: '频道',
      dataIndex: 'channelTitle',
      key: 'channelTitle',
      width: 150,
      ellipsis: true,
      render: (text: string, record: VideoInfo) => (
        <a
          href={`https://www.youtube.com/channel/${record.channelId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1890ff' }}
          title="点击访问频道主页"
        >
          <UserOutlined style={{ marginRight: 4 }} />
          {text}
        </a>
      ),
    },
    {
      title: '粉丝数',
      dataIndex: 'channelSubscriberCount',
      key: 'subscriberCount',
      width: 100,
      render: (count: number) => (
        <span>
          {count === 0 ? (
            <Tooltip title="浏览器模式无法获取，请使用API模式">
              <span style={{ color: '#999' }}>-</span>
            </Tooltip>
          ) : (
            <strong>{(count || 0).toLocaleString()}</strong>
          )}
        </span>
      ),
    },
    {
      title: '数据',
      key: 'stats',
      width: 180,
      render: (_, record: VideoInfo) => (
        <Space direction="vertical" size={4}>
          <Tooltip title="观看次数">
            <span>
              <EyeOutlined /> {(record.viewCount || 0).toLocaleString()}
            </span>
          </Tooltip>
          <Tooltip title="点赞数">
            <span>
              <LikeOutlined /> {(record.likeCount || 0).toLocaleString()}
            </span>
          </Tooltip>
          <Tooltip title="评论数">
            <span>
              <CommentOutlined /> {(record.commentCount || 0).toLocaleString()}
            </span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '日均增幅',
      key: 'dailyGrowth',
      width: 150,
      render: (_: any, record: VideoInfo) => (
        <div style={{ whiteSpace: 'pre-line', fontSize: '12px', lineHeight: '1.5' }}>
          {formatDailyGrowth(record)}
        </div>
      ),
    },
    {
      title: '单粉数据',
      key: 'perSubscriber',
      width: 150,
      render: (_: any, record: VideoInfo) => (
        <div style={{ whiteSpace: 'pre-line', fontSize: '12px', lineHeight: '1.5' }}>
          {formatPerSubscriber(record)}
        </div>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 110,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="关键词搜索" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            maxResults: 50,
            videoType: 'all',
            filterPopular: true,
            minViewCount: 100000,
            minViewCountShorts: 1000000,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="搜索关键词"
                name="keyword"
                rules={[{ required: true, message: '请输入关键词' }]}
              >
                <Input placeholder="python tutorial" size="large" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="最大结果数" name="maxResults">
                <Select size="large">
                  <Option value={10}>10条</Option>
                  <Option value={20}>20条</Option>
                  <Option value={50}>50条</Option>
                  <Option value={100}>100条</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="语言/地区" name="language">
                <Select
                  size="large"
                  placeholder="选择语言"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {YOUTUBE_LANGUAGES.map((lang) => (
                    <Option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="发布时间范围" name="publishedAfter">
                <Select size="large" allowClear>
                  {publishTimeOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Shorts最小播放量" name="minViewCountShorts">
                <Select size="large">
                  {viewCountOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="视频最小播放量" name="minViewCount">
                <Select size="large">
                  {viewCountOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="视频类型" name="videoType">
                <Select size="large">
                  <Option value="all">全部</Option>
                  <Option value="video">普通视频</Option>
                  <Option value="shorts">仅Shorts</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="filterPopular" valuePropName="checked">
            <Checkbox>筛选爆款视频</Checkbox>
          </Form.Item>

          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              size="large"
            >
              搜索
            </Button>
            <Button icon={<ClearOutlined />} onClick={() => clearVideos()} size="large">
              清空结果
            </Button>
          </Space>
        </Form>
      </Card>

      {videos.length > 0 && (
        <Card
          title={`搜索结果（${videos.length} 条）`}
          extra={
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('json')}
              >
                导出JSON
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleExport('xlsx')}
              >
                导出Excel
              </Button>
            </Space>
          }
        >
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="总播放量"
                  value={videos.reduce((sum, v) => sum + (v.viewCount || 0), 0)}
                  formatter={(value) => (value as number).toLocaleString()}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="总点赞数"
                  value={videos.reduce((sum, v) => sum + (v.likeCount || 0), 0)}
                  formatter={(value) => (value as number).toLocaleString()}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="总评论数"
                  value={videos.reduce((sum, v) => sum + (v.commentCount || 0), 0)}
                  formatter={(value) => (value as number).toLocaleString()}
                />
              </Card>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={videos}
            rowKey="id"
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `共 ${total} 条`,
              onShowSizeChange: (_, size) => setPageSize(size),
            }}
            rowSelection={{
              onChange: (_, selectedRows) => setSelectedRows(selectedRows),
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      )}

      {/* 视频详情Modal（安全版 - 不嵌入iframe） */}
      <Modal
        title="视频详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="youtube"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              if (selectedVideo) {
                window.open(selectedVideo.url, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            在YouTube观看
          </Button>,
        ]}
        width={800}
      >
        {selectedVideo && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 高清缩略图 */}
            <div style={{ textAlign: 'center' }}>
              <Image
                src={selectedVideo.thumbnailUrl}
                alt={selectedVideo.title}
                style={{ maxWidth: '100%', borderRadius: 8 }}
                preview={false}
              />
            </div>

            {/* 视频信息 */}
            <Descriptions column={1} bordered>
              <Descriptions.Item label="标题">
                <strong>{selectedVideo.title}</strong>
              </Descriptions.Item>

              <Descriptions.Item label="频道">
                <Space>
                  <a
                    href={`https://www.youtube.com/channel/${selectedVideo.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <UserOutlined /> {selectedVideo.channelTitle}
                  </a>
                  {selectedVideo.isShorts && <Tag color="magenta">Shorts</Tag>}
                  {selectedVideo.language && <Tag color="blue">{selectedVideo.language}</Tag>}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="粉丝数">
                {selectedVideo.channelSubscriberCount === 0 ? (
                  <Tooltip title="浏览器模式无法获取，请使用API模式">
                    <span style={{ color: '#999' }}>数据不可用</span>
                  </Tooltip>
                ) : (
                  <strong style={{ fontSize: '16px', color: '#1890ff' }}>
                    {selectedVideo.channelSubscriberCount.toLocaleString()} 订阅者
                  </strong>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="发布时间">
                {new Date(selectedVideo.publishedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>

              <Descriptions.Item label="时长">{selectedVideo.duration}</Descriptions.Item>

              <Descriptions.Item label="互动数据">
                <Space direction="vertical" size="small">
                  <div>
                    <EyeOutlined style={{ marginRight: 8 }} />
                    观看：<strong>{selectedVideo.viewCount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <LikeOutlined style={{ marginRight: 8 }} />
                    点赞：<strong>{selectedVideo.likeCount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <CommentOutlined style={{ marginRight: 8 }} />
                    评论：<strong>{selectedVideo.commentCount.toLocaleString()}</strong>
                  </div>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="日均增幅">
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                  {formatDailyGrowth(selectedVideo)}
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="单粉数据">
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                  {formatPerSubscriber(selectedVideo)}
                </div>
              </Descriptions.Item>

              {selectedVideo.description && (
                <Descriptions.Item label="描述">
                  <div
                    style={{
                      maxHeight: 200,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {selectedVideo.description}
                  </div>
                </Descriptions.Item>
              )}

              {selectedVideo.tags.length > 0 && (
                <Descriptions.Item label="标签">
                  <Space wrap>
                    {selectedVideo.tags.map((tag, index) => (
                      <Tag key={index}>{tag}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Space>
        )}
      </Modal>
    </div>
  );
};
