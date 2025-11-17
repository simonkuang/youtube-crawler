import { useState, useEffect } from 'react';
import { Layout, Tabs, Typography } from 'antd';
import {
  ApiOutlined,
  ChromeOutlined,
  SettingOutlined,
  YoutubeOutlined,
} from '@ant-design/icons';
import { ApiSearch } from './pages/ApiSearch';
import { BrowserScraper } from './pages/BrowserScraper';
import { Settings } from './pages/Settings';
import { apiService } from './services/api';
import { useStore } from './store/useStore';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const [activeTab, setActiveTab] = useState('api');
  const { setAuthStatus, setSettings } = useStore();

  useEffect(() => {
    // 初始化：加载设置和认证状态
    const init = async () => {
      try {
        const [authStatus, settings] = await Promise.all([
          apiService.getAuthStatus(),
          apiService.getSettings(),
        ]);
        setAuthStatus(authStatus);
        setSettings(settings);
      } catch (error) {
        console.error('初始化失败：', error);
      }
    };
    init();
  }, [setAuthStatus, setSettings]);

  const tabs = [
    {
      key: 'api',
      label: (
        <span>
          <ApiOutlined />
          API搜索
        </span>
      ),
      children: <ApiSearch />,
    },
    {
      key: 'browser',
      label: (
        <span>
          <ChromeOutlined />
          浏览器采集
        </span>
      ),
      children: <BrowserScraper />,
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          设置
        </span>
      ),
      children: <Settings />,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
        }}
      >
        <YoutubeOutlined style={{ fontSize: 32, color: '#ff0000', marginRight: 16 }} />
        <Title level={3} style={{ margin: 0, color: '#ff0000' }}>
          YouTube爆款视频采集
        </Title>
        <div style={{ marginLeft: 16, color: '#666', fontSize: 14 }}>
          基于Google API和浏览器自动化的YouTube热门视频采集工具
        </div>
      </Header>
      <Content style={{ background: '#f0f2f5' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
          size="large"
          style={{ padding: '0 24px', background: '#fff' }}
        />
      </Content>
    </Layout>
  );
}

export default App;
