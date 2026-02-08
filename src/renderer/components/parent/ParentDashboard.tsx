import React, { useEffect, useState } from 'react';
import { Card, Tabs, Statistic, Row, Col, Spin, Empty } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import { apiService } from '../../api/apiService';
import type { ChildSummary, WeeklyActivity } from '../../../shared/types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const ACTIVITY_COLORS = ['#f0f0f0', '#d6e4ff', '#85a5ff', '#2f54eb', '#10239e'];

function getActivityColor(minutes: number): string {
  if (minutes === 0) return ACTIVITY_COLORS[0];
  if (minutes < 30) return ACTIVITY_COLORS[1];
  if (minutes < 60) return ACTIVITY_COLORS[2];
  if (minutes < 120) return ACTIVITY_COLORS[3];
  return ACTIVITY_COLORS[4];
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

interface ChildTabProps {
  userId: string;
}

const ChildTab: React.FC<ChildTabProps> = ({ userId }) => {
  const [summary, setSummary] = useState<ChildSummary | null>(null);
  const [activity, setActivity] = useState<WeeklyActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [s, a] = await Promise.all([
          apiService.getChildSummary(userId),
          apiService.getWeeklyActivity(userId),
        ]);
        setSummary(s);
        setActivity(a);
      } catch (err) {
        console.error('Failed to load child data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  }

  if (!summary) {
    return <Empty description="데이터를 불러올 수 없습니다" />;
  }

  const chartData = summary.subjectProgress.map((sp) => ({
    name: sp.subjectName,
    completed: sp.completedTopics,
    total: sp.totalTopics,
    ratio: Math.round(sp.ratio * 100),
  }));

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="이번 주 학습 시간"
              value={formatMinutes(summary.studyTimeThisWeek)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="복습 횟수"
              value={summary.reviewCount}
              prefix={<CheckCircleOutlined />}
              suffix="회"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="연속 학습"
              value={summary.currentStreak}
              prefix={<FireOutlined />}
              suffix="일"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="목표 달성률"
              value={Math.round(summary.goalAchievementRate * 100)}
              prefix={<TrophyOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="과목별 진행률" size="small">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="ratio" fill="#1677ff" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.ratio >= 80 ? '#52c41a' : entry.ratio >= 50 ? '#faad14' : '#1677ff'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="과목 데이터가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="7일 활동" size="small">
            {activity && activity.days.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {activity.days.map((day) => {
                  const dayOfWeek = WEEKDAYS[new Date(day.date).getDay()];
                  return (
                    <div key={day.date} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{dayOfWeek}</div>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          background: getActivityColor(day.studyMinutes),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 500,
                          color: day.studyMinutes >= 60 ? '#fff' : '#333',
                        }}
                        title={`${day.date}: ${formatMinutes(day.studyMinutes)}`}
                      >
                        {day.studyMinutes > 0 ? `${day.studyMinutes}m` : '-'}
                      </div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                        {day.reviewCount > 0 ? `${day.reviewCount}R` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty description="활동 데이터가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, fontSize: 11 }}>
              <span>적음</span>
              {ACTIVITY_COLORS.map((color, i) => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: color }} />
              ))}
              <span>많음</span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const ParentDashboard: React.FC = () => {
  const [children, setChildren] = useState<{ id: string; name: string; avatar: string; grade: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChildren = async () => {
      try {
        const data = await apiService.getChildren();
        setChildren(data);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };
    loadChildren();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, padding: 24 }}>
        <h2 style={{ marginBottom: 16 }}>보호자 대시보드</h2>
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div style={{ maxWidth: 1200, padding: 24 }}>
        <h2 style={{ marginBottom: 16 }}>보호자 대시보드</h2>
        <Empty description="학생 프로필이 없습니다" />
      </div>
    );
  }

  const tabItems = children.map((child) => ({
    key: child.id,
    label: `${child.avatar || ''} ${child.name}`.trim(),
    children: <ChildTab userId={child.id} />,
  }));

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2 style={{ marginBottom: 16 }}>보호자 대시보드</h2>
      <Tabs items={tabItems} />
    </div>
  );
};

export default ParentDashboard;
