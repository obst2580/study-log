import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp, ConfigProvider, theme as antTheme } from 'antd';
import koKR from 'antd/locale/ko_KR';
import AppRouter from './App';
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
          colorPrimary: '#7C3AED',
          colorSuccess: '#2D8B5F',
          colorWarning: '#D97706',
          colorError: '#DC2626',
          borderRadius: 16,
          fontSize: 15,
          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
