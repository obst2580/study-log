import React, { useEffect, useState } from 'react';
import GemIcon from '../splendor/GemIcon';
import type { GemType } from '../../types';

export interface RewardData {
  xp: number;
  gems: { type: string; amount: number }[];
  mastered: boolean;
  topicTitle: string;
}

interface RewardToastProps {
  reward: RewardData | null;
  onDone: () => void;
}

const RewardToast: React.FC<RewardToastProps> = ({ reward, onDone }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!reward) return;
    setVisible(true);
    setExiting(false);

    const exitTimer = setTimeout(() => setExiting(true), 2500);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 3000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [reward, onDone]);

  if (!visible || !reward) return null;

  return (
    <div
      className={`reward-toast ${exiting ? 'reward-toast-exit' : 'reward-toast-enter'}`}
      style={{
        position: 'fixed',
        top: 72,
        right: 24,
        zIndex: 1050,
        background: reward.mastered ? 'var(--brand-success)' : 'var(--brand-primary)',
        color: '#fff',
        borderRadius: 16,
        padding: '16px 24px',
        minWidth: 240,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      }}
    >
      {reward.mastered && (
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          마스터 달성!
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>
        {reward.topicTitle}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 14,
          fontWeight: 700,
        }}>
          XP +{reward.xp}
        </span>
        {reward.gems.map((gem) => (
          <span
            key={gem.type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <GemIcon type={gem.type as GemType} size={14} />
            +{gem.amount}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RewardToast;
