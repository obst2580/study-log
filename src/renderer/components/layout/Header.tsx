import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Tooltip, Popover, List, Typography, Empty } from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { useNotification } from '../../hooks/useNotification';
import { useAuthStore } from '../../stores/authStore';
import GlobalSearch from '../search/GlobalSearch';

const { Text } = Typography;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const user = useAuthStore((s) => s.user);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    contextHolder,
  } = useNotification();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSelectTopic = useCallback((topicId: string) => {
    navigate('/kanban');
    useAppStore.getState().setSearchSelectedTopicId(topicId);
  }, [navigate]);

  const notificationContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>Notifications</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead} icon={<CheckOutlined />} style={{ fontSize: 11 }}>
            Mark all read
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '16px 0' }} />
      ) : (
        <List
          dataSource={notifications.slice(0, 10)}
          style={{ maxHeight: 300, overflow: 'auto' }}
          renderItem={(item) => (
            <List.Item
              style={{ padding: '8px 4px', cursor: 'pointer', opacity: item.read ? 0.6 : 1 }}
              onClick={() => markAsRead(item.id)}
            >
              <div>
                <Text strong={!item.read} style={{ fontSize: 12 }}>{item.title}</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>{item.body}</Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  const initial = (user?.name ?? 'U').charAt(0).toUpperCase();

  return (
    <>
      {contextHolder}
      <header className="app-header" role="banner">
        {/* Left: Search */}
        <Tooltip title="Search (Ctrl+K)">
          <Button
            type="text"
            icon={<SearchOutlined style={{ fontSize: 18 }} />}
            onClick={() => setSearchOpen(true)}
            aria-label="Search (Ctrl+K)"
            style={{ color: 'var(--text-secondary)' }}
          />
        </Tooltip>

        {/* Right: Bell + Theme + Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Popover
            content={notificationContent}
            trigger="click"
            open={notificationOpen}
            onOpenChange={setNotificationOpen}
            placement="bottomRight"
          >
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                aria-label={`Notifications: ${unreadCount} unread`}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Badge>
          </Popover>

          {/* Theme toggle as small text button */}
          <Button
            type="text"
            size="small"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            style={{ fontSize: 16, color: 'var(--text-secondary)', padding: '0 4px' }}
          >
            {theme === 'dark' ? '\u263E' : '\u2600'}
          </Button>

          {/* User avatar circle */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#7C3AED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'default',
            }}
          >
            {initial}
          </div>
        </div>
      </header>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectTopic={handleSearchSelectTopic}
      />
    </>
  );
};

export default Header;
