import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  FireOutlined,
  TrophyOutlined,
  BookOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import ContributionGraph from './ContributionGraph';
import StreakCard from './StreakCard';
import LevelCard from './LevelCard';
import SubjectRadar from './SubjectRadar';
import { useUserStats, useSubjectMastery } from '../../hooks/useDatabase';
import { useKanbanStore } from '../../stores/kanbanStore';

const Dashboard: React.FC = () => {
  const { stats } = useUserStats();
  const { mastery } = useSubjectMastery();
  const topics = useKanbanStore((s) => s.topics);

  const todayTopics = topics.filter((t) => t.column === 'today').length;
  const doneTopics = topics.filter((t) => t.column === 'done').length;
  const totalTopics = topics.length;

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2 style={{ marginBottom: 16 }}>대시보드</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="오늘 할 것"
              value={todayTopics}
              prefix={<BookOutlined />}
              suffix="개"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="완료된 토픽"
              value={doneTopics}
              prefix={<TrophyOutlined />}
              suffix={`/ ${totalTopics}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StreakCard
            currentStreak={stats?.currentStreak ?? 0}
            longestStreak={stats?.longestStreak ?? 0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <LevelCard totalXp={stats?.totalXp ?? 0} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="학습 기여도" size="small">
            <ContributionGraph />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="과목별 숙련도" size="small">
            <SubjectRadar mastery={mastery} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
