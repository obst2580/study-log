import React from 'react';
import { Card, Statistic, Space, Typography } from 'antd';
import { FireOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

const StreakCard: React.FC<StreakCardProps> = ({ currentStreak, longestStreak }) => {
  const streakColor = currentStreak >= 7 ? '#fa8c16' : currentStreak >= 3 ? '#fadb14' : 'var(--border-color)';

  return (
    <Card size="small" style={{ background: 'var(--pastel-yellow)', borderRadius: 20, border: 'none' }}>
      <Statistic
        title="연속 학습"
        value={currentStreak}
        prefix={<FireOutlined style={{ color: streakColor }} />}
        suffix="일"
        valueStyle={{ fontSize: 32, fontWeight: 800 }}
      />
      <Text type="secondary" style={{ fontSize: 12 }}>
        최대 기록: {longestStreak}일
      </Text>
    </Card>
  );
};

export default StreakCard;
