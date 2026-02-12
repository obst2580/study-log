import React from 'react';
import { Tooltip, Progress } from 'antd';
import type { AchievementWithStatus } from '../../../shared/types';

interface AchievementBadgeProps {
  achievement: AchievementWithStatus;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ achievement }) => {
  const { title, description, icon, unlocked, unlockedAt, progress, target } = achievement;
  const progressPercent = target > 0 ? Math.round((progress / target) * 100) : 0;

  const tooltipContent = (
    <div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12 }}>{description}</div>
      {unlocked && unlockedAt && (
        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
          {new Date(unlockedAt).toLocaleDateString('ko-KR')} 달성
        </div>
      )}
      {!unlocked && target > 0 && (
        <div style={{ fontSize: 11, marginTop: 4 }}>
          진행: {progress}/{target}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title={tooltipContent}>
      <div style={{
        width: 100,
        textAlign: 'center',
        padding: 12,
        borderRadius: 16,
        border: '1px solid',
        borderColor: unlocked ? 'var(--border-strong)' : 'var(--border-color)',
        background: unlocked ? 'var(--pastel-lavender)' : 'var(--bg-secondary)',
        opacity: unlocked ? 1 : 0.6,
        cursor: 'default',
        transition: 'all 0.2s',
      }}>
        <div style={{
          fontSize: 32,
          marginBottom: 4,
          filter: unlocked ? 'none' : 'grayscale(100%)',
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: unlocked ? 'var(--text-primary)' : 'var(--text-muted)',
          marginBottom: 4,
          lineHeight: 1.3,
        }}>
          {title}
        </div>
        {!unlocked && target > 0 && (
          <Progress
            percent={progressPercent}
            size="small"
            showInfo={false}
            strokeColor="var(--brand-primary-light)"
          />
        )}
      </div>
    </Tooltip>
  );
};

export default AchievementBadge;
