import React from 'react';
import { Card, Progress, Tag } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { ChallengeWithParticipants, ChallengeType } from '../../../shared/types';

interface ChallengeCardProps {
  challenge: ChallengeWithParticipants;
  profileNames: Record<string, string>;
}

const TYPE_CONFIG: Record<ChallengeType, { label: string; icon: React.ReactNode; unit: string }> = {
  study_time: { label: '학습 시간', icon: <ClockCircleOutlined />, unit: '분' },
  review_count: { label: '복습 횟수', icon: <CheckCircleOutlined />, unit: '회' },
  streak: { label: '연속 학습', icon: <FireOutlined />, unit: '일' },
  goal_rate: { label: '목표 달성', icon: <TrophyOutlined />, unit: '%' },
};

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, profileNames }) => {
  const config = TYPE_CONFIG[challenge.challengeType];
  const now = new Date();
  const endDate = new Date(challenge.endDate);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isActive = daysLeft > 0;

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {config.icon}
          <span>{challenge.title}</span>
        </div>
      }
      extra={
        isActive ? (
          <Tag color="purple">D-{daysLeft}</Tag>
        ) : (
          <Tag color="default">종료</Tag>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          목표: {challenge.targetValue}{config.unit} | {config.label}
        </div>

        {challenge.participants.map((p) => {
          const percent = Math.min(100, Math.round((p.currentValue / challenge.targetValue) * 100));
          const name = profileNames[p.userId] || p.userId;
          return (
            <div key={p.userId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.currentValue}/{challenge.targetValue}{config.unit}
                </span>
              </div>
              <Progress
                percent={percent}
                size="small"
                status={p.completed ? 'success' : 'active'}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ChallengeCard;
