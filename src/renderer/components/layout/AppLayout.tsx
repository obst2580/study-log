import React from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import { FloatingTimer } from '../timer/StudyTimer';
import { useAppStore } from '../../stores/appStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <Layout className="app-layout">
      <a className="skip-link" href="#main-content">
        메인 콘텐츠로 이동
      </a>
      <Header />
      <div className="app-body">
        <aside
          className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
          aria-label="사이드바"
        >
          <Sidebar />
        </aside>
        <main
          id="main-content"
          className="app-content"
          role="main"
          aria-label="메인 콘텐츠"
        >
          {children}
        </main>
      </div>
      <FloatingTimer />
    </Layout>
  );
};

export default AppLayout;
