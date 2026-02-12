import React from 'react';
import type { GemType } from '../../../shared/types';

const GEM_COLORS: Record<GemType, string> = {
  emerald: '#6DD4A0',
  sapphire: '#6B9AE8',
  ruby: '#E86B8A',
  diamond: '#C8E8FF',
};

const GEM_LABELS: Record<GemType, string> = {
  emerald: '에메랄드',
  sapphire: '사파이어',
  ruby: '루비',
  diamond: '다이아몬드',
};

interface GemIconProps {
  type: GemType;
  size?: number;
  count?: number;
  showLabel?: boolean;
}

const GemIcon: React.FC<GemIconProps> = ({ type, size = 16, count, showLabel = false }) => {
  const color = GEM_COLORS[type];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: size * 0.2,
          background: `linear-gradient(135deg, ${color}, ${color}88)`,
          border: `1px solid ${color}`,
          boxShadow: `0 0 4px ${color}44`,
        }}
        title={GEM_LABELS[type]}
      />
      {count !== undefined && (
        <span style={{ fontSize: size * 0.75, fontWeight: 600, color }}>
          {count}
        </span>
      )}
      {showLabel && (
        <span style={{ fontSize: size * 0.75, color: '#666' }}>
          {GEM_LABELS[type]}
        </span>
      )}
    </span>
  );
};

export default GemIcon;
export { GEM_COLORS, GEM_LABELS };
