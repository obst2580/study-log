import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tag, Button, Tooltip, Progress } from 'antd';
import { CheckOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../utils/constants';
import { formatReviewDate } from '../../utils/spaced-repetition';
import type { Topic } from '../../types';

interface KanbanCardProps {
  topic: Topic;
  subjectColor?: string;
  subjectName?: string;
  isDragging?: boolean;
  onClick?: () => void;
  onComplete?: () => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  topic,
  subjectColor,
  subjectName,
  isDragging = false,
  onClick,
  onComplete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: topic.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: subjectColor ? `3px solid ${subjectColor}` : undefined,
  };

  const reviewDateText = formatReviewDate(topic.nextReviewAt);

  // We can't fetch checklist here without IPC, so we show tags and review info instead.
  // The checklist progress will be visible in CardDetail.

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${isDragging || isSortableDragging ? 'dragging' : ''}`}
      aria-label={`카드: ${topic.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {/* Subject name badge (for integrated/all view) */}
        {subjectName && (
          <div style={{ marginBottom: 4 }}>
            <Tag
              style={{
                fontSize: 10,
                lineHeight: '16px',
                padding: '0 4px',
                borderColor: subjectColor,
                color: subjectColor,
                background: subjectColor ? `${subjectColor}10` : undefined,
              }}
            >
              {subjectName}
            </Tag>
          </div>
        )}

        <div className="kanban-card-title">{topic.title}</div>

        <div className="kanban-card-meta">
          <Tag
            color={DIFFICULTY_COLORS[topic.difficulty]}
            style={{ fontSize: 11, lineHeight: '18px', padding: '0 4px' }}
          >
            난이도 {DIFFICULTY_LABELS[topic.difficulty]}
          </Tag>
          <Tag
            color={IMPORTANCE_COLORS[topic.importance]}
            style={{ fontSize: 11, lineHeight: '18px', padding: '0 4px' }}
          >
            중요도 {IMPORTANCE_LABELS[topic.importance]}
          </Tag>
        </div>

        {topic.tags && topic.tags.length > 0 && (
          <div style={{ marginTop: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {topic.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} style={{ fontSize: 10, lineHeight: '16px', padding: '0 3px' }}>
                {tag}
              </Tag>
            ))}
            {topic.tags.length > 3 && (
              <span style={{ fontSize: 10, color: '#999' }}>+{topic.tags.length - 3}</span>
            )}
          </div>
        )}

        {reviewDateText && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#999' }}>
            {reviewDateText}
          </div>
        )}

        {/* Study time indicator */}
        {topic.studyTimeTotal > 0 && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#bbb' }}>
            {topic.studyTimeTotal >= 3600
              ? `${Math.floor(topic.studyTimeTotal / 3600)}h ${Math.floor((topic.studyTimeTotal % 3600) / 60)}m`
              : topic.studyTimeTotal >= 60
                ? `${Math.floor(topic.studyTimeTotal / 60)}m`
                : `${topic.studyTimeTotal}s`}
            {' '}학습
          </div>
        )}
      </div>

      {topic.column !== 'mastered' && (
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="학습 완료 (다음 단계로 이동)">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#52c41a' }}
              aria-label={`${topic.title} 학습 완료`}
              onClick={(e) => {
                e.stopPropagation();
                onComplete?.();
              }}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default KanbanCard;
