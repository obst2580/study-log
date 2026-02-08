import React, { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Select, Space, Spin, Empty, Progress, Collapse, Tag } from 'antd';
import { PlusOutlined, BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import KanbanCard from './KanbanCard';
import CardDetail from '../card/CardDetail';
import CardForm from '../card/CardForm';
import SelfEvalModal from '../review/SelfEvalModal';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useAppStore } from '../../stores/appStore';
import { apiService } from '../../api/apiService';
import type { KanbanColumn as KanbanColumnType, Topic, CurriculumProgress } from '../../types';

const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const selectedSubjectId = useAppStore((s) => s.selectedSubjectId);
  const subjects = useAppStore((s) => s.subjects);
  const {
    topics, completedToday, dailyProgress, loading,
    loadTopics, loadCompletedToday, loadDailyProgress,
    moveTopic, completeTopic, selfEval, closeSelfEval, submitSelfEval,
  } = useKanbanStore();

  const [activeCard, setActiveCard] = useState<Topic | null>(null);
  const [detailTopicId, setDetailTopicId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTopicId, setEditTopicId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterImportance, setFilterImportance] = useState<string | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string | null>(null);
  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress | null>(null);

  const searchSelectedTopicId = useAppStore((s) => s.searchSelectedTopicId);
  const setSearchSelectedTopicId = useAppStore((s) => s.setSearchSelectedTopicId);

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
    loadCompletedToday();
    loadDailyProgress();
    apiService.getCurriculumProgress().then(setCurriculumProgress).catch(() => {});
  }, [selectedSubjectId, loadTopics, loadCompletedToday, loadDailyProgress]);

  const todayTopics = topics
    .filter((t) => t.column === 'today')
    .filter((t) => {
      if (filterDifficulty && t.difficulty !== filterDifficulty) return false;
      if (filterImportance && t.importance !== filterImportance) return false;
      if (filterSubjectId && t.subjectId !== filterSubjectId) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragStart = (event: DragStartEvent) => {
    const topic = todayTopics.find((t) => t.id === event.active.id);
    setActiveCard(topic ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = todayTopics.findIndex((t) => t.id === active.id);
    const overIndex = todayTopics.findIndex((t) => t.id === over.id);
    if (activeIndex >= 0 && overIndex >= 0) {
      moveTopic(active.id as string, 'today', overIndex);
    }
  };

  const handleComplete = (topicId: string) => {
    completeTopic(topicId, 'today');
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

  const showSubjectFilter = !selectedSubjectId && subjects.length > 0;
  const progressPercent = curriculumProgress?.progressPercent ?? 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} role="region" aria-label="오늘 학습">
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>오늘 학습</h2>
          <Space size={4} wrap>
            {showSubjectFilter && (
              <Select
                allowClear placeholder="과목" style={{ width: 120 }}
                value={filterSubjectId} onChange={setFilterSubjectId}
                options={subjects.map((s) => ({ label: s.name, value: s.id }))}
                size="small"
              />
            )}
            <Select
              allowClear placeholder="난이도" style={{ width: 100 }}
              value={filterDifficulty} onChange={setFilterDifficulty}
              options={[{ label: '상', value: 'high' }, { label: '중', value: 'medium' }, { label: '하', value: 'low' }]}
              size="small"
            />
            <Select
              allowClear placeholder="중요도" style={{ width: 100 }}
              value={filterImportance} onChange={setFilterImportance}
              options={[{ label: '상', value: 'high' }, { label: '중', value: 'medium' }, { label: '하', value: 'low' }]}
              size="small"
            />
          </Space>
        </div>
        <Space>
          <Button icon={<BookOutlined />} onClick={() => navigate('/curriculum')}>
            커리큘럼 관리
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            카드 추가
          </Button>
        </Space>
      </div>

      {/* Progress Summary */}
      <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-secondary, #fafafa)', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <span>
          완료 <strong>{dailyProgress?.completedToday ?? 0}</strong>/{dailyProgress?.totalToday ?? todayTopics.length}
        </span>
        <span>
          복습대기 <strong>{dailyProgress?.reviewingCount ?? 0}</strong>장
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          전체 진도
          <Progress percent={progressPercent} size="small" style={{ width: 100, margin: 0 }} />
        </span>
      </div>

      {/* Board */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Spin size="large" tip="로딩 중..." />
        </div>
      ) : todayTopics.length === 0 && completedToday.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <Empty description="오늘 학습할 주제가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <Button type="primary" icon={<BookOutlined />} onClick={() => navigate('/curriculum')}>
            커리큘럼에서 오늘 학습할 주제를 추가하세요
          </Button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#666' }}>
              오늘 학습 ({todayTopics.length}장)
            </div>
            <SortableContext items={todayTopics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {todayTopics.map((topic) => {
                const subject = subjects.find((s) => s.id === topic.subjectId);
                return (
                  <KanbanCard
                    key={topic.id}
                    topic={topic}
                    subjectColor={subject?.color}
                    subjectName={subject?.name}
                    onClick={() => handleCardClick(topic.id)}
                    onComplete={() => handleComplete(topic.id)}
                  />
                );
              })}
            </SortableContext>

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

          {/* Completed Today */}
          {completedToday.length > 0 && (
            <Collapse
              ghost
              style={{ marginTop: 16 }}
              items={[{
                key: 'completed',
                label: (
                  <span style={{ fontWeight: 500, fontSize: 14, color: '#52c41a' }}>
                    <CheckCircleOutlined style={{ marginRight: 6 }} />
                    오늘 완료 ({completedToday.length}장)
                  </span>
                ),
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {completedToday.map((topic) => {
                      const subject = subjects.find((s) => s.id === topic.subjectId);
                      const score = (topic as Record<string, unknown>).understandingScore as number | undefined;
                      return (
                        <div
                          key={topic.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 12px', background: '#f6ffed', borderRadius: 6, cursor: 'pointer',
                          }}
                          onClick={() => handleCardClick(topic.id)}
                        >
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <span style={{ flex: 1, fontSize: 13 }}>{topic.title}</span>
                          {subject && <Tag style={{ margin: 0, fontSize: 11 }} color={subject.color}>{subject.name}</Tag>}
                          {score && <Tag style={{ margin: 0 }} color={score >= 4 ? 'green' : score >= 3 ? 'blue' : 'orange'}>이해도:{score}</Tag>}
                        </div>
                      );
                    })}
                  </div>
                ),
              }]}
            />
          )}
        </div>
      )}

      <CardDetail topicId={detailTopicId} onClose={() => setDetailTopicId(null)} onEdit={handleEditCard} />
      <CardForm open={formOpen} onClose={handleFormClose} subjectId={selectedSubjectId} editTopicId={editTopicId} />
      <SelfEvalModal open={selfEval.open} topicTitle={selfEval.topicTitle} onSubmit={submitSelfEval} onCancel={closeSelfEval} />
    </div>
  );
};

export default KanbanBoard;
