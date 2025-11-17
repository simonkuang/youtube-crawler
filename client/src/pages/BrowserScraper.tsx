import { useState } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Card,
  Alert,
  Progress,
  Space,
  message,
  Row,
  Col,
} from 'antd';
import {
  RocketOutlined,
  StopOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { apiService } from '@/services/api';
import { useStore } from '@/store/useStore';
import type { SearchParams } from '@/types';
import { YOUTUBE_LANGUAGES } from '@/types';

const { Option } = Select;

export const BrowserScraper: React.FC = () => {
  const [form] = Form.useForm<SearchParams>();
  const { videos, setVideos, clearVideos, loading, setLoading, authStatus } = useStore();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const handleStart = async () => {
    try {
      const values = await form.validateFields();

      if (!values.keyword?.trim()) {
        message.warning('请输入搜索关键词');
        return;
      }

      if (!authStatus.isLoggedIn) {
        message.warning('浏览器自动化模式需要先登录YouTube账号，请前往设置页面登录');
        return;
      }

      setLoading(true);
      clearVideos();
      setProgress(0);
      setStatusText('正在启动浏览器...');

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

      // 模拟进度更新（实际应该通过WebSocket接收后端进度）
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      try {
        setStatusText('正在采集数据...');
        const result = await apiService.searchByBrowser(params);
        clearInterval(progressInterval);
        setProgress(100);
        setStatusText('采集完成！');
        setVideos(result.videos);
        message.success(`采集完成，找到 ${result.videos.length} 个视频`);
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error: any) {
      const errorMsg = error.message || '采集失败';
      message.error(errorMsg);
      setStatusText('采集失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    setLoading(false);
    setProgress(0);
    setStatusText('已停止');
    message.info('采集已停止');
  };

  return (
    <div style={{ padding: 24 }}>
      <Alert
        message="浏览器自动化采集说明"
        description={
          <Space direction="vertical">
            <div>
              <InfoCircleOutlined /> 此模式使用真实浏览器模拟人类操作，可以绕过部分API限制
            </div>
            <div>⚠️ 采集速度较慢，但更稳定</div>
            <div>🔐 需要先在设置页面登录YouTube账号</div>
            <div>🎭 自动应用反检测技术，降低被封禁风险</div>
          </Space>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="浏览器采集配置" style={{ marginBottom: 24 }}>
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

          <Form.Item name="filterPopular" valuePropName="checked">
            <Checkbox>仅采集爆款视频</Checkbox>
          </Form.Item>

          <Space>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={handleStart}
              loading={loading}
              disabled={!authStatus.isLoggedIn}
              size="large"
            >
              开始采集
            </Button>
            {loading && (
              <Button icon={<StopOutlined />} onClick={handleStop} danger size="large">
                停止
              </Button>
            )}
          </Space>
        </Form>
      </Card>

      {loading && (
        <Card title="采集进度">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Progress percent={Math.floor(progress)} status="active" />
            <div>{statusText}</div>
          </Space>
        </Card>
      )}

      {videos.length > 0 && (
        <Card title={`采集结果（${videos.length} 条）`}>
          <Alert
            message={`成功采集 ${videos.length} 个视频，可前往"API搜索"标签页查看详情并导出`}
            type="success"
            showIcon
          />
        </Card>
      )}
    </div>
  );
};
