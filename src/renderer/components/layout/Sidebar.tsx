import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  AppstoreOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: '/', icon: <HomeOutlined />, label: 'Home' },
  { key: '/kanban', icon: <AppstoreOutlined />, label: 'Kanban' },
  { key: '/curriculum', icon: <BookOutlined />, label: 'Courses' },
  { key: '/timer', icon: <ClockCircleOutlined />, label: 'Timer' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Stats' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  const isActive = (key: string) => location.pathname === key;

  const renderItem = (item: NavItem) => {
    const active = isActive(item.key);
    return (
      <button
        key={item.key}
        onClick={() => navigate(item.key)}
        aria-label={item.label}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '10px 0',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: active ? '#F43F5E' : 'var(--text-muted)',
          transition: 'color 0.15s ease',
          width: '100%',
        }}
      >
        <span style={{ fontSize: 22 }}>{item.icon}</span>
        <span style={{
          fontSize: 10,
          fontWeight: active ? 700 : 500,
          letterSpacing: '0.02em',
        }}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <div
      role="navigation"
      aria-label="Main navigation"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        paddingTop: 16,
        paddingBottom: 12,
      }}
    >
      {/* Logo */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: '#F43F5E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 800,
        marginBottom: 24,
        flexShrink: 0,
      }}>
        S
      </div>

      {/* Main nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
        {NAV_ITEMS.map(renderItem)}
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom items */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
        {BOTTOM_ITEMS.map(renderItem)}
        <button
          onClick={logout}
          aria-label="Logout"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '10px 0',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'color 0.15s ease',
            width: '100%',
          }}
        >
          <span style={{ fontSize: 22 }}><LogoutOutlined /></span>
          <span style={{ fontSize: 10, fontWeight: 500 }}>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
