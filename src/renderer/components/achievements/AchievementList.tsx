import React, { useEffect, useState } from 'react';
import { Card, Tag, Space, Empty, Spin } from 'antd';
import AchievementBadge from './AchievementBadge';
import { apiService } from '../../api/apiService';
import type { AchievementWithStatus } from '../../../shared/types';

type FilterType = 'all' | 'unlocked' | 'locked';

const AchievementList: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiService.getAllAchievements();
        setAchievements(data);
      } catch {
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
          업적 <span style={{ fontSize: 14, color: '#999', fontWeight: 400 }}>({unlockedCount}/{achievements.length})</span>
        </h2>
        <Space>
          {(['all', 'unlocked', 'locked'] as FilterType[]).map((f) => (
            <Tag
              key={f}
              color={filter === f ? 'blue' : undefined}
              onClick={() => setFilter(f)}
              style={{ cursor: 'pointer' }}
            >
              {f === 'all' ? '전체' : f === 'unlocked' ? '달성' : '미달성'}
            </Tag>
          ))}
        </Space>
      </div>

      <Card size="small">
        {filtered.length === 0 ? (
          <Empty description="업적이 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' }}>
            {filtered.map((a) => (
              <AchievementBadge key={a.achievementKey} achievement={a} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AchievementList;
