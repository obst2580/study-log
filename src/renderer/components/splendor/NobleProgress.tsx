import React from 'react';
import { Card, Progress, Tag, Empty } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import type { NobleProgress as NobleProgressType } from '../../../shared/types';

interface NobleProgressProps {
  nobles: NobleProgressType[];
}

const NobleProgressDisplay: React.FC<NobleProgressProps> = ({ nobles }) => {
  if (nobles.length === 0) {
    return <Empty description="단원이 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {nobles.map((noble) => {
        const percent = noble.totalTopics > 0
          ? Math.round((noble.masteredTopics / noble.totalTopics) * 100)
          : 0;

        return (
          <Card
            key={noble.unitId}
            size="small"
            style={{
              borderColor: noble.completed ? '#52c41a' : undefined,
              background: noble.completed ? '#f6ffed' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {noble.completed && <CrownOutlined style={{ color: '#faad14', marginRight: 4 }} />}
                  {noble.unitName}
                </div>
                <Tag
                  color={noble.subjectColor}
                  style={{ fontSize: 10, marginTop: 2 }}
                >
                  {noble.subjectName}
                </Tag>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {noble.masteredTopics}/{noble.totalTopics}
                </div>
                {noble.completed && (
                  <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>+3 prestige</Tag>
                )}
              </div>
            </div>
            <Progress
              percent={percent}
              size="small"
              strokeColor={noble.completed ? '#52c41a' : undefined}
              style={{ marginTop: 4, marginBottom: 0 }}
            />
          </Card>
        );
      })}
    </div>
  );
};

export default NobleProgressDisplay;
