import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Space, Tooltip, Switch, Popover, List, Typography, Empty } from 'antd';
import {
  SearchOutlined,
  ClockCircleOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { useTimerStore } from '../../stores/timerStore';
import { formatTime } from '../../hooks/useTimer';
import { useNotification } from '../../hooks/useNotification';
import GlobalSearch from '../search/GlobalSearch';

const { Text } = Typography;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const reviewsDueCount = useAppStore((s) => s.reviewsDueCount);

  const isTimerRunning = useTimerStore((s) => s.isRunning);
  const timerType = useTimerStore((s) => s.timerType);
  const elapsedSeconds = useTimerStore((s) => s.elapsedSeconds);
  const pomodoroRemainingSeconds = useTimerStore((s) => s.pomodoroRemainingSeconds);
  const toggleMinimized = useTimerStore((s) => s.toggleMinimized);
  const minimized = useTimerStore((s) => s.minimized);

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

  const timerDisplay = timerType === 'stopwatch'
    ? formatTime(elapsedSeconds)
    : formatTime(pomodoroRemainingSeconds);

  const handleSearchSelectTopic = useCallback((topicId: string) => {
    navigate('/kanban');
    useAppStore.getState().setSearchSelectedTopicId(topicId);
  }, [navigate]);

  const handleTimerClick = () => {
    if (isTimerRunning && !minimized) {
      // If timer is running on the timer page, minimize it
      toggleMinimized();
    }
    navigate('/timer');
  };

  const notificationTypeColors: Record<string, string> = {
    review: '#1890ff',
    streak: '#faad14',
    exam: '#722ed1',
    info: '#52c41a',
  };

  const notificationContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>알림</Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={markAllAsRead}
            icon={<CheckOutlined />}
            style={{ fontSize: 11 }}
          >
            모두 읽음
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Empty
          description="알림이 없습니다"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '16px 0' }}
        />
      ) : (
        <List
          dataSource={notifications.slice(0, 10)}
          style={{ maxHeight: 300, overflow: 'auto' }}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '8px 4px',
                cursor: 'pointer',
                opacity: item.read ? 0.6 : 1,
                borderLeft: `3px solid ${notificationTypeColors[item.type] ?? '#999'}`,
                paddingLeft: 8,
              }}
              onClick={() => markAsRead(item.id)}
            >
              <div>
                <Text strong={!item.read} style={{ fontSize: 12 }}>
                  {item.title}
                </Text>
                <Text
                  type="secondary"
                  style={{ display: 'block', fontSize: 11, marginTop: 2 }}
                >
                  {item.body}
                </Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <>
      {contextHolder}
      <header className="app-header" role="banner">
        <Space style={{ flex: 1 }} align="center">
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
          />
          <span style={{ fontWeight: 700, fontSize: 16 }}>StudyLog</span>
        </Space>

        <Space size="middle" align="center">
          <Tooltip title="검색 (Ctrl+K)">
            <Button
              type="text"
              icon={<SearchOutlined />}
              onClick={() => setSearchOpen(true)}
              aria-label="검색 열기 (Ctrl+K)"
            />
          </Tooltip>

          <Tooltip title={isTimerRunning ? '타이머 진행 중' : '타이머'}>
            <Button
              type="text"
              icon={<ClockCircleOutlined />}
              style={isTimerRunning ? { color: '#1890ff', fontWeight: 600 } : undefined}
              onClick={handleTimerClick}
              aria-label={isTimerRunning ? `타이머: ${timerDisplay}` : '타이머'}
            >
              {isTimerRunning ? timerDisplay : null}
            </Button>
          </Tooltip>

          <Popover
            content={notificationContent}
            trigger="click"
            open={notificationOpen}
            onOpenChange={setNotificationOpen}
            placement="bottomRight"
          >
            <Tooltip title={`알림: ${unreadCount > 0 ? `${unreadCount}개 읽지 않음` : '없음'}`}>
              <Badge count={unreadCount} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  aria-label={`알림: ${unreadCount}개 읽지 않음`}
                />
              </Badge>
            </Tooltip>
          </Popover>

          <Tooltip title={theme === 'dark' ? '라이트 모드' : '다크 모드'}>
            <Switch
              checked={theme === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              size="small"
              aria-label="테마 전환"
            />
          </Tooltip>
        </Space>
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
