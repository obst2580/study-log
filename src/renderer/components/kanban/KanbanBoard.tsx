import React, { useEffect, useState } from 'react';
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
import { Button, Select, Space, Spin, Card, Row, Col, Statistic, Collapse, Tag, Tooltip } from 'antd';
import {
  PlusOutlined,
  BookOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import KanbanCard from './KanbanCard';
import CardDetail from '../card/CardDetail';
import CardForm from '../card/CardForm';
import SelfEvalModal from '../review/SelfEvalModal';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useAppStore } from '../../stores/appStore';
import { apiService } from '../../api/apiService';
import type { Topic } from '../../types';
import type { CurriculumProgress } from '../../../shared/types';

// -- Status Overview Card Styles --

const STATUS_CARD_STYLES = {
  backlog: {
    background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
    iconColor: '#8c8c8c',
    borderColor: '#d9d9d9',
  },
  today: {
    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
    iconColor: '#1890ff',
    borderColor: '#91d5ff',
  },
  reviewing: {
    background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
    iconColor: '#722ed1',
    borderColor: '#d3adf7',
  },
  mastered: {
    background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
    iconColor: '#52c41a',
    borderColor: '#b7eb8f',
  },
} as const;

// -- Component --

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

  // Derived counts for status overview
  const backlogCount = curriculumProgress?.backlogCount ?? 0;
  const todayCount = dailyProgress?.totalToday ?? todayTopics.length;
  const reviewingCount = dailyProgress?.reviewingCount ?? 0;
  const masteredCount = curriculumProgress?.masteredCount ?? 0;

  const hasNoTodayContent = todayTopics.length === 0 && completedToday.length === 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} role="region" aria-label="오늘 학습">

      {/* -- Status Overview Cards -- */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card
            hoverable
            size="small"
            style={{
              background: STATUS_CARD_STYLES.backlog.background,
              border: `1px solid ${STATUS_CARD_STYLES.backlog.borderColor}`,
              borderRadius: 10,
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '12px 16px' } }}
            onClick={() => navigate('/curriculum')}
          >
            <Statistic
              title={
                <span style={{ fontSize: 12, color: '#595959' }}>
                  <InboxOutlined style={{ marginRight: 6, color: STATUS_CARD_STYLES.backlog.iconColor }} />
                  백로그
                </span>
              }
              value={backlogCount}
              suffix="장"
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#595959' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: STATUS_CARD_STYLES.today.background,
              border: `1px solid ${STATUS_CARD_STYLES.today.borderColor}`,
              borderRadius: 10,
            }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Statistic
              title={
                <span style={{ fontSize: 12, color: '#096dd9' }}>
                  <BookOutlined style={{ marginRight: 6, color: STATUS_CARD_STYLES.today.iconColor }} />
                  오늘 학습
                </span>
              }
              value={todayCount}
              suffix={
                <span style={{ fontSize: 13, color: '#1890ff' }}>
                  {dailyProgress ? ` (${dailyProgress.completedToday}완료)` : ''}
                </span>
              }
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: STATUS_CARD_STYLES.reviewing.background,
              border: `1px solid ${STATUS_CARD_STYLES.reviewing.borderColor}`,
              borderRadius: 10,
            }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Statistic
              title={
                <span style={{ fontSize: 12, color: '#531dab' }}>
                  <ClockCircleOutlined style={{ marginRight: 6, color: STATUS_CARD_STYLES.reviewing.iconColor }} />
                  복습 대기
                </span>
              }
              value={reviewingCount}
              suffix="장"
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#722ed1' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Tooltip title="학습 완료 후 마스터한 주제 수">
            <Card
              size="small"
              style={{
                background: STATUS_CARD_STYLES.mastered.background,
                border: `1px solid ${STATUS_CARD_STYLES.mastered.borderColor}`,
                borderRadius: 10,
              }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Statistic
                title={
                  <span style={{ fontSize: 12, color: '#389e0d' }}>
                    <CheckCircleOutlined style={{ marginRight: 6, color: STATUS_CARD_STYLES.mastered.iconColor }} />
                    마스터
                  </span>
                }
                value={masteredCount}
                suffix="장"
                valueStyle={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}
              />
            </Card>
          </Tooltip>
        </Col>
      </Row>

      {/* -- Today's Cards Section Header -- */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            오늘 학습
            <span style={{ fontWeight: 400, fontSize: 13, color: '#8c8c8c', marginLeft: 6 }}>
              ({todayTopics.length}장)
            </span>
          </h2>
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
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setFormOpen(true)}>
          카드 추가
        </Button>
      </div>

      {/* -- Board Content -- */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Spin size="large" tip="로딩 중..." />
        </div>
      ) : hasNoTodayContent ? (
        /* -- Empty State -- */
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card
            style={{
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              borderRadius: 12,
              border: '1px dashed #d9d9d9',
            }}
            styles={{ body: { padding: '32px 24px' } }}
          >
            <BookOutlined style={{ fontSize: 40, color: '#bfbfbf', marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#262626' }}>
              오늘 학습할 주제가 없습니다
            </h3>
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
              {[
                { step: '1', text: '커리큘럼에서 공부할 주제를 선택하세요' },
                { step: '2', text: '선택한 주제가 여기에 표시됩니다' },
                { step: '3', text: '학습 완료 후 자기평가를 진행합니다' },
              ].map(({ step, text }) => (
                <div
                  key={step}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: step !== '3' ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#e6f7ff', color: '#1890ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                  }}>
                    {step}
                  </div>
                  <span style={{ fontSize: 13, color: '#595959' }}>{text}</span>
                </div>
              ))}
            </div>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/curriculum')}
              style={{ borderRadius: 8 }}
            >
              커리큘럼에서 추가하기
            </Button>
          </Card>
        </div>
      ) : (
        /* -- Today's Cards + Completed -- */
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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

          {/* -- Completed Today -- */}
          {completedToday.length > 0 && (
            <Collapse
              ghost
              style={{
                marginTop: 16,
                background: '#f6ffed',
                borderRadius: 8,
                border: '1px solid #b7eb8f',
              }}
              items={[{
                key: 'completed',
                label: (
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#389e0d' }}>
                    <CheckCircleOutlined style={{ marginRight: 6 }} />
                    오늘 완료 ({completedToday.length}장)
                  </span>
                ),
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {completedToday.map((topic) => {
                      const subject = subjects.find((s) => s.id === topic.subjectId);
                      const score = (topic as unknown as Record<string, unknown>).understandingScore as number | undefined;
                      return (
                        <div
                          key={topic.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 12px', background: '#ffffff', borderRadius: 6,
                            cursor: 'pointer', border: '1px solid #d9f7be',
                            transition: 'background 0.2s',
                          }}
                          onClick={() => handleCardClick(topic.id)}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f6ffed'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#ffffff'; }}
                        >
                          <CheckCircleOutlined style={{ color: '#52c41a', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13 }}>{topic.title}</span>
                          {subject && (
                            <Tag style={{ margin: 0, fontSize: 11 }} color={subject.color}>
                              {subject.name}
                            </Tag>
                          )}
                          {score != null && (
                            <Tag
                              style={{ margin: 0 }}
                              color={score >= 4 ? 'green' : score >= 3 ? 'blue' : 'orange'}
                            >
                              이해도:{score}
                            </Tag>
                          )}
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

      {/* -- Modals (always rendered) -- */}
      <CardDetail topicId={detailTopicId} onClose={() => setDetailTopicId(null)} onEdit={handleEditCard} />
      <CardForm open={formOpen} onClose={handleFormClose} subjectId={selectedSubjectId} editTopicId={editTopicId} />
      <SelfEvalModal open={selfEval.open} topicTitle={selfEval.topicTitle} masteryCount={selfEval.masteryCount} onSubmit={submitSelfEval} onCancel={closeSelfEval} />
    </div>
  );
};

export default KanbanBoard;
