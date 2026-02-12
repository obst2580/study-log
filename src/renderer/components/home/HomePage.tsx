import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Progress, Typography, List } from 'antd';
import { RocketOutlined, BookOutlined } from '@ant-design/icons';
import StreakCard from '../dashboard/StreakCard';
import LevelCard from '../dashboard/LevelCard';
import { useAuthStore } from '../../stores/authStore';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useUserStats } from '../../hooks/useDatabase';

const { Title, Text } = Typography;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return '좋은 아침이에요';
  if (hour >= 12 && hour < 18) return '좋은 오후예요';
  if (hour >= 18 && hour < 24) return '좋은 저녁이에요';
  return '아직 안 자고 공부 중이군요!';
}

const MAX_PREVIEW_TOPICS = 5;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { stats } = useUserStats();

  const loadTopics = useKanbanStore((s) => s.loadTopics);
  const loadDailyProgress = useKanbanStore((s) => s.loadDailyProgress);
  const getTopicsByColumn = useKanbanStore((s) => s.getTopicsByColumn);
  const dailyProgress = useKanbanStore((s) => s.dailyProgress);

  useEffect(() => {
    loadTopics();
    loadDailyProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayTopics = getTopicsByColumn('today');
  const greeting = getGreeting();
  const displayName = user?.name ?? '';

  const completed = dailyProgress?.completedToday ?? 0;
  const total = dailyProgress?.totalToday ?? 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const previewTopics = todayTopics.slice(0, MAX_PREVIEW_TOPICS);
  const remaining = todayTopics.length - MAX_PREVIEW_TOPICS;

  return (
    <div className="home-page">
      <div className="home-greeting">
        <Title level={3} style={{ margin: 0, color: 'var(--text-primary)' }}>
          {greeting}, {displayName}님!
        </Title>
        <Text type="secondary">오늘도 화이팅</Text>
      </div>

      <div className="home-stats-row">
        <div className="home-stat-card">
          <StreakCard
            currentStreak={stats?.currentStreak ?? 0}
            longestStreak={stats?.longestStreak ?? 0}
          />
        </div>
        <div className="home-stat-card">
          <LevelCard totalXp={stats?.totalXp ?? 0} />
        </div>
        <div className="home-stat-card">
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>오늘 진행률</Text>
            <div style={{ fontSize: 24, fontWeight: 700, margin: '4px 0' }}>
              {completed}/{total} 완료
            </div>
            <Progress
              percent={progressPercent}
              size="small"
              strokeColor={{
                '0%': 'var(--brand-primary)',
                '100%': 'var(--brand-success)',
              }}
            />
          </Card>
        </div>
      </div>

      <Card
        title={`오늘 할 토픽 (${todayTopics.length}개)`}
        className="home-today-card"
        size="small"
      >
        {todayTopics.length === 0 ? (
          <Text type="secondary">
            오늘 할 토픽이 없어요. 커리큘럼에서 토픽을 추가해 보세요!
          </Text>
        ) : (
          <List
            dataSource={previewTopics}
            renderItem={(topic) => (
              <List.Item style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <BookOutlined style={{ color: 'var(--brand-primary)', marginRight: 8 }} />
                <Text>{topic.title}</Text>
              </List.Item>
            )}
          />
        )}
        {remaining > 0 && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            +{remaining}개 더
          </Text>
        )}
      </Card>

      <Button
        type="primary"
        size="large"
        icon={<RocketOutlined />}
        className="home-start-button"
        onClick={() => navigate('/kanban')}
      >
        학습 시작하기
      </Button>
    </div>
  );
};

export default HomePage;
