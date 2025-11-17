import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Switch,
  Space,
  message,
  Divider,
  Tag,
  Alert,
  InputNumber,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { apiService } from '@/services/api';
import { useStore } from '@/store/useStore';
import type { AppSettings } from '@/types';

export const Settings: React.FC = () => {
  const [form] = Form.useForm<AppSettings>();
  const { settings, setSettings, authStatus, setAuthStatus } = useStore();
  const [loading, setLoading] = useState(false);
  const [testingProxy, setTestingProxy] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadAuthStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiService.getSettings();
      setSettings(data);
      form.setFieldsValue(data);
    } catch (error: any) {
      message.error('加载设置失败：' + error.message);
    }
  };

  const loadAuthStatus = async () => {
    try {
      const status = await apiService.getAuthStatus();
      setAuthStatus(status);
    } catch (error: any) {
      console.error('获取登录状态失败：', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      await apiService.updateSettings(values);
      setSettings(values);
      message.success('设置已保存');
    } catch (error: any) {
      message.error('保存失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestProxy = async (proxy: string) => {
    if (!proxy.trim()) {
      message.warning('请输入代理地址');
      return;
    }

    try {
      setTestingProxy(proxy);
      const success = await apiService.testProxy(proxy);
      if (success) {
        message.success('代理连接成功');
      } else {
        message.error('代理连接失败');
      }
    } catch (error: any) {
      message.error('测试失败：' + error.message);
    } finally {
      setTestingProxy(null);
    }
  };

  const handleLogin = async () => {
    try {
      const { authUrl } = await apiService.initiateLogin();
      window.open(authUrl, '_blank');
      message.info('请在新窗口中完成登录');

      // 轮询检查登录状态
      const checkInterval = setInterval(async () => {
        const status = await apiService.getAuthStatus();
        if (status.isLoggedIn) {
          setAuthStatus(status);
          message.success('登录成功');
          clearInterval(checkInterval);
        }
      }, 2000);

      // 60秒后停止轮询
      setTimeout(() => clearInterval(checkInterval), 60000);
    } catch (error: any) {
      message.error('启动登录失败：' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setAuthStatus({ isLoggedIn: false });
      message.success('已退出登录');
    } catch (error: any) {
      message.error('退出失败：' + error.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="YouTube登录设置" style={{ marginBottom: 24 }}>
        <Alert
          message="为什么需要登录？"
          description="登录YouTube账号可以提高API配额限制，并且可以使用浏览器自动化采集功能访问需要登录才能看到的数据。登录信息会被加密存储在本地。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Space direction="vertical" style={{ width: '100%' }}>
          {authStatus.isLoggedIn ? (
            <>
              <Space>
                <Tag icon={<CheckCircleOutlined />} color="success">
                  已登录
                </Tag>
                {authStatus.email && <span>{authStatus.email}</span>}
              </Space>
              <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                退出登录
              </Button>
            </>
          ) : (
            <>
              <Space>
                <Tag icon={<CloseCircleOutlined />} color="default">
                  未登录
                </Tag>
              </Space>
              <Button type="primary" icon={<LoginOutlined />} onClick={handleLogin}>
                使用Google账号登录
              </Button>
            </>
          )}
        </Space>
      </Card>

      <Card title="API设置" style={{ marginBottom: 24 }}>
        <Alert
          message="如何获取YouTube API密钥？"
          description={
            <>
              1. 访问{' '}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Cloud Console
              </a>
              <br />
              2. 创建项目并启用YouTube Data API v3
              <br />
              3. 创建凭据（API密钥）
              <br />
              4. 将API密钥填写到下面
            </>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            label="YouTube API密钥"
            name="youtubeApiKey"
            rules={[{ required: true, message: '请输入API密钥' }]}
          >
            <Input.Password placeholder="AIza..." />
          </Form.Item>
        </Form>
      </Card>

      <Card title="代理设置" style={{ marginBottom: 24 }}>
        <Alert
          message="使用代理可以避免IP被限制，提高爬取成功率"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical">
          <Form.Item label="启用代理" name="useProxy" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            label="代理列表"
            name="proxyList"
            tooltip="每行一个代理，格式：http://host:port 或 http://username:password@host:port"
          >
            <Input.TextArea
              rows={4}
              placeholder={`http://proxy1.example.com:8080\nhttp://user:pass@proxy2.example.com:8080`}
            />
          </Form.Item>

          <Space>
            <Button
              onClick={() => {
                const proxyList = form.getFieldValue('proxyList');
                const proxies = proxyList?.split('\n').filter((p: string) => p.trim());
                if (proxies && proxies.length > 0) {
                  handleTestProxy(proxies[0]);
                }
              }}
              loading={testingProxy !== null}
            >
              测试第一个代理
            </Button>
          </Space>
        </Form>
      </Card>

      <Card title="反爬虫设置" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="最小请求延迟（毫秒）"
            name="minRequestDelay"
            rules={[{ required: true, type: 'number', min: 500 }]}
          >
            <InputNumber min={500} max={10000} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item
            label="最大请求延迟（毫秒）"
            name="maxRequestDelay"
            rules={[{ required: true, type: 'number', min: 1000 }]}
          >
            <InputNumber min={1000} max={30000} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item
            label="无头模式"
            name="headless"
            valuePropName="checked"
            tooltip="开启后浏览器会在后台运行，关闭后可以看到浏览器界面（用于调试）"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Card>

      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleSave}
        loading={loading}
        size="large"
      >
        保存设置
      </Button>
    </div>
  );
};
