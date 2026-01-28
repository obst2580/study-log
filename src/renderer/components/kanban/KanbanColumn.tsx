import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from 'antd';
import KanbanCard from './KanbanCard';
import { COLUMN_COLORS } from '../../utils/constants';
import type { KanbanColumn as KanbanColumnType, Topic, Subject } from '../../types';

interface KanbanColumnProps {
  column: KanbanColumnType;
  label: string;
  topics: Topic[];
  onCardClick: (topicId: string) => void;
  onComplete: (topicId: string) => void;
  subjects: Subject[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  label,
  topics,
  onCardClick,
  onComplete,
  subjects,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const color = COLUMN_COLORS[column] ?? '#1890ff';

  const getSubjectInfo = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return { color: subject?.color, name: subject?.name };
  };

  return (
    <div
      className={`kanban-column ${isOver ? 'drag-over' : ''}`}
      style={{
        borderTop: `3px solid ${color}`,
      }}
      role="listitem"
      aria-label={`${label} 컬럼, ${topics.length}개 카드`}
    >
      <div className="kanban-column-header">
        <span>{label}</span>
        <Badge
          count={topics.length}
          showZero
          style={{ backgroundColor: color }}
        />
      </div>

      <div
        className="kanban-column-body"
        ref={setNodeRef}
        role="list"
        aria-label={`${label} 카드 목록`}
      >
        <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {topics.map((topic) => {
            const subjectInfo = getSubjectInfo(topic.subjectId);
            return (
              <KanbanCard
                key={topic.id}
                topic={topic}
                subjectColor={subjectInfo.color}
                subjectName={subjectInfo.name}
                onClick={() => onCardClick(topic.id)}
                onComplete={() => onComplete(topic.id)}
              />
            );
          })}
        </SortableContext>

        {topics.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 8px',
              color: '#999',
              fontSize: 13,
            }}
            aria-label="빈 컬럼"
          >
            카드를 드래그하여 이동
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
