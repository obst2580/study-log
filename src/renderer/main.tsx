import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import koKR from 'antd/locale/ko_KR';
import App from './App';
import { useAppStore } from './stores/appStore';
import './styles/global.css';

function Root() {
  const themeSetting = useAppStore((s) => s.theme);

  return (
    <ConfigProvider
      locale={koKR}
      theme={{
        algorithm: themeSetting === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
