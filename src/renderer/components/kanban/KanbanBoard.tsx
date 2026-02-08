import React, { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button, Select, Space, Spin, Empty } from 'antd';
import { PlusOutlined, FilterOutlined } from '@ant-design/icons';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import CardDetail from '../card/CardDetail';
import CardForm from '../card/CardForm';
import SelfEvalModal from '../review/SelfEvalModal';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useAppStore } from '../../stores/appStore';
import { KANBAN_COLUMNS, type KanbanColumn as KanbanColumnType, type Topic } from '../../types';

const KanbanBoard: React.FC = () => {
  const selectedSubjectId = useAppStore((s) => s.selectedSubjectId);
  const subjects = useAppStore((s) => s.subjects);
  const { topics, loading, loadTopics, moveTopic, completeTopic, selfEval, closeSelfEval, submitSelfEval } = useKanbanStore();

  const [activeCard, setActiveCard] = useState<Topic | null>(null);
  const [detailTopicId, setDetailTopicId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTopicId, setEditTopicId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterImportance, setFilterImportance] = useState<string | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string | null>(null);

  const searchSelectedTopicId = useAppStore((s) => s.searchSelectedTopicId);
  const setSearchSelectedTopicId = useAppStore((s) => s.setSearchSelectedTopicId);

  // Open card detail when navigated from search
  useEffect(() => {
    if (searchSelectedTopicId) {
      setDetailTopicId(searchSelectedTopicId);
      setSearchSelectedTopicId(null);
    }
  }, [searchSelectedTopicId, setSearchSelectedTopicId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadTopics(selectedSubjectId);
  }, [selectedSubjectId, loadTopics]);

  const filteredTopics = topics.filter((t) => {
    if (filterDifficulty && t.difficulty !== filterDifficulty) return false;
    if (filterImportance && t.importance !== filterImportance) return false;
    if (filterSubjectId && t.subjectId !== filterSubjectId) return false;
    return true;
  });

  const getTopicsByColumn = useCallback(
    (column: KanbanColumnType) =>
      filteredTopics
        .filter((t) => t.column === column)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [filteredTopics]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const topic = topics.find((t) => t.id === event.active.id);
    setActiveCard(topic ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const topicId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumn: KanbanColumnType | null = null;

    // Check if dropped on a column directly
    const columnMatch = KANBAN_COLUMNS.find((c) => c.key === overId);
    if (columnMatch) {
      targetColumn = columnMatch.key;
    } else {
      // Dropped on another card - find which column that card is in
      const overTopic = topics.find((t) => t.id === overId);
      if (overTopic) {
        targetColumn = overTopic.column;
      }
    }

    if (targetColumn) {
      const topic = topics.find((t) => t.id === topicId);
      if (topic && topic.column === targetColumn && topic.id === overId) {
        // Dropped on itself, no-op
        return;
      }
      const columnTopics = getTopicsByColumn(targetColumn);
      const overIndex = columnTopics.findIndex((t) => t.id === overId);
      const newSortOrder = overIndex >= 0 ? overIndex : columnTopics.length;
      moveTopic(topicId, targetColumn, newSortOrder);
    }
  };

  const handleComplete = (topicId: string, fromColumn: KanbanColumnType) => {
    completeTopic(topicId, fromColumn);
  };

  const handleCardClick = (topicId: string) => {
    setDetailTopicId(topicId);
  };

  const handleEditCard = (topicId: string) => {
    setEditTopicId(topicId);
    setDetailTopicId(null);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditTopicId(null);
  };

  const boardTitle = selectedSubjectId
    ? subjects.find((s) => s.id === selectedSubjectId)?.name ?? '칸반 보드'
    : '전체 보드';

  const showSubjectFilter = !selectedSubjectId && subjects.length > 0;

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      role="region"
      aria-label="칸반 보드"
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{boardTitle}</h2>

          <Space size={4} wrap>
            {showSubjectFilter && (
              <Select
                allowClear
                placeholder="과목"
                style={{ width: 120 }}
                value={filterSubjectId}
                onChange={setFilterSubjectId}
                options={subjects.map((s) => ({ label: s.name, value: s.id }))}
                size="small"
              />
            )}
            <Select
              allowClear
              placeholder="난이도"
              style={{ width: 100 }}
              value={filterDifficulty}
              onChange={setFilterDifficulty}
              options={[
                { label: '상', value: 'high' },
                { label: '중', value: 'medium' },
                { label: '하', value: 'low' },
              ]}
              size="small"
            />
            <Select
              allowClear
              placeholder="중요도"
              style={{ width: 100 }}
              value={filterImportance}
              onChange={setFilterImportance}
              options={[
                { label: '상', value: 'high' },
                { label: '중', value: 'medium' },
                { label: '하', value: 'low' },
              ]}
              size="small"
            />
          </Space>

          <span style={{ fontSize: 13, color: '#999' }}>
            {filteredTopics.length}개 카드
          </span>
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          카드 추가
        </Button>
      </div>

      {/* Board */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Spin size="large" tip="로딩 중..." />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-board" role="list" aria-label="칸반 컬럼 목록">
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                column={col.key}
                label={col.label}
                topics={getTopicsByColumn(col.key)}
                onCardClick={handleCardClick}
                onComplete={(id) => handleComplete(id, col.key)}
                subjects={subjects}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <KanbanCard
                topic={activeCard}
                subjectColor={subjects.find((s) => s.id === activeCard.subjectId)?.color}
                subjectName={subjects.find((s) => s.id === activeCard.subjectId)?.name}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Card Detail Drawer */}
      <CardDetail
        topicId={detailTopicId}
        onClose={() => setDetailTopicId(null)}
        onEdit={handleEditCard}
      />

      {/* Card Create/Edit Form */}
      <CardForm
        open={formOpen}
        onClose={handleFormClose}
        subjectId={selectedSubjectId}
        editTopicId={editTopicId}
      />

      {/* Self Evaluation Modal */}
      <SelfEvalModal
        open={selfEval.open}
        topicTitle={selfEval.topicTitle}
        onSubmit={submitSelfEval}
        onCancel={closeSelfEval}
      />
    </div>
  );
};

export default KanbanBoard;
