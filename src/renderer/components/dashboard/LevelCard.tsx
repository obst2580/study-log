import React from 'react';
import { Card, Progress, Typography } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { getLevelProgress, formatXp } from '../../utils/xp';

const { Text } = Typography;

interface LevelCardProps {
  totalXp: number;
}

const LevelCard: React.FC<LevelCardProps> = ({ totalXp }) => {
  const { level, progressXp, progressPercent, nextLevelXp, currentLevelXp } = getLevelProgress(totalXp);
  const xpNeeded = nextLevelXp - currentLevelXp;

  return (
    <Card size="small">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <StarOutlined style={{ color: '#faad14', fontSize: 20 }} />
        <span style={{ fontSize: 20, fontWeight: 700 }}>Lv.{level}</span>
      </div>
      <Progress
        percent={progressPercent}
        size="small"
        strokeColor="#faad14"
        format={() => `${formatXp(progressXp)}/${formatXp(xpNeeded)}`}
      />
      <Text type="secondary" style={{ fontSize: 11 }}>
        총 {formatXp(totalXp)} XP
      </Text>
    </Card>
  );
};

export default LevelCard;
