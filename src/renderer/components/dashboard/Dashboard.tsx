import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Rate, Tag, Empty } from 'antd';
import {
  TrophyOutlined,
  BookOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import GemWalletDisplay from '../splendor/GemWallet';
import ContributionGraph from './ContributionGraph';
import StreakCard from './StreakCard';
import LevelCard from './LevelCard';
import SubjectRadar from './SubjectRadar';
import WeeklyGoalPanel from '../goals/WeeklyGoalPanel';
import { useUserStats, useSubjectMastery } from '../../hooks/useDatabase';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useSplendorStore } from '../../stores/splendorStore';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../api/apiService';
import type { WeakTopic, AchievementWithStatus, ChallengeWithParticipants } from '../../../shared/types';

const Dashboard: React.FC = () => {
  const { stats } = useUserStats();
  const { mastery } = useSubjectMastery();
  const topics = useKanbanStore((s) => s.topics);
  const user = useAuthStore((s) => s.user);
  const wallet = useSplendorStore((s) => s.wallet);
  const loadWallet = useSplendorStore((s) => s.loadWallet);

  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<AchievementWithStatus[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ChallengeWithParticipants[]>([]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (!user?.id) return;

    apiService.getWeakTopics(user.id)
      .then(setWeakTopics)
      .catch(() => setWeakTopics([]));

    apiService.getAllAchievements()
      .then((all) => {
        const unlocked = all
          .filter((a) => a.unlocked)
          .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
          .slice(0, 5);
        setRecentAchievements(unlocked);
      })
      .catch(() => setRecentAchievements([]));

    apiService.getChallenges()
      .then((all) => {
        const active = all.filter((c) => new Date(c.endDate) >= new Date()).slice(0, 3);
        setActiveChallenges(active);
      })
      .catch(() => setActiveChallenges([]));
  }, [user?.id]);

  const todayTopics = topics.filter((t) => t.column === 'today').length;
  const doneTopics = topics.filter((t) => t.column === 'mastered').length;
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
        <Col xs={24} md={12}>
          <GemWalletDisplay wallet={wallet} compact />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="학습 기여도" size="small">
            <ContributionGraph />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <WeeklyGoalPanel />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="과목별 숙련도" size="small">
            <SubjectRadar mastery={mastery} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<><WarningOutlined style={{ marginRight: 8 }} />취약 토픽</>}
            size="small"
          >
            {weakTopics.length === 0 ? (
              <Empty description="취약 토픽이 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={weakTopics.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item style={{ padding: '6px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.topicTitle}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{item.subjectName}</Tag>
                        <Rate disabled value={Math.round(item.avgUnderstanding)} style={{ fontSize: 10 }} />
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="최근 업적" size="small">
            {recentAchievements.length === 0 ? (
              <Empty description="달성한 업적이 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={recentAchievements}
                renderItem={(item) => (
                  <List.Item style={{ padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{item.description}</div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {activeChallenges.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="진행 중인 챌린지" size="small">
              <List
                dataSource={activeChallenges}
                renderItem={(challenge) => {
                  const daysLeft = Math.max(0, Math.ceil(
                    (new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  ));
                  return (
                    <List.Item style={{ padding: '6px 0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{challenge.title}</span>
                          <Tag color="blue">D-{daysLeft}</Tag>
                        </div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                          참가자 {challenge.participants.length}명 | 목표: {challenge.targetValue}
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;
