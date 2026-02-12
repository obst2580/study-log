import React, { useEffect, useMemo, useState } from 'react';
import {
  Collapse,
  Input,
  Checkbox,
  Tag,
  Progress,
  Button,
  Space,
  Spin,
  Empty,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  SearchOutlined,
  ClearOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../api/apiService';
import type { SubjectWithProgress, UnitWithProgress, Topic } from '../../types';

const { Panel } = Collapse;

const STATUS_TAG_CONFIG: Record<string, { label: string; color: string }> = {
  backlog: { label: '백로그', color: 'default' },
  today: { label: '오늘', color: 'orange' },
  reviewing: { label: '복습중', color: 'blue' },
  mastered: { label: '마스터', color: 'green' },
};

const getStatusTag = (column: string) => {
  const config = STATUS_TAG_CONFIG[column];
  if (!config) return null;
  return (
    <Tag color={config.color} style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}>
      {config.label}
    </Tag>
  );
};

const computeTotalStats = (subjects: readonly SubjectWithProgress[]) =>
  subjects.reduce(
    (acc, s) => {
      const total = s.units.reduce((a: number, u: UnitWithProgress) => a + u.totalCount, 0);
      return {
        backlog: acc.backlog + s.backlogCount,
        active: acc.active + s.reviewingCount,
        mastered: acc.mastered + s.masteredCount,
        total: acc.total + total,
      };
    },
    { backlog: 0, active: 0, mastered: 0, total: 0 },
  );

const CurriculumBrowser: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCurriculumTree();
      setSubjects(data);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizedSearch = searchText.trim().toLowerCase();

  // Filter subjects/units/topics by search text and compute which panels to auto-expand
  const { filteredSubjects, matchingPanelKeys } = useMemo(() => {
    if (!normalizedSearch) {
      return { filteredSubjects: subjects, matchingPanelKeys: [] as string[] };
    }

    const panelKeys: string[] = [];

    const filtered = subjects
      .map((subject) => {
        const matchedUnits = subject.units
          .map((unit: UnitWithProgress) => {
            const matchedTopics = unit.topics.filter((topic: Topic) =>
              topic.title.toLowerCase().includes(normalizedSearch),
            );
            if (matchedTopics.length === 0) return null;
            return { ...unit, topics: matchedTopics };
          })
          .filter(Boolean) as typeof subject.units;

        if (matchedUnits.length === 0) return null;

        panelKeys.push(subject.id);
        return { ...subject, units: matchedUnits };
      })
      .filter(Boolean) as SubjectWithProgress[];

    return { filteredSubjects: filtered, matchingPanelKeys: panelKeys };
  }, [subjects, normalizedSearch]);

  // When search changes, auto-expand matching panels
  useEffect(() => {
    if (normalizedSearch) {
      setActiveKeys(matchingPanelKeys);
    } else {
      setActiveKeys([]);
    }
  }, [normalizedSearch, matchingPanelKeys]);

  const totalStats = useMemo(() => computeTotalStats(subjects), [subjects]);

  const handleCheckToggle = (topicId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(topicId);
      } else {
        next.delete(topicId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setCheckedIds(new Set());
  };

  const handleAssign = async () => {
    const ids = Array.from(checkedIds);
    if (ids.length === 0) return;
    setAssigning(true);
    try {
      await apiService.bulkAssignToToday(ids);
      message.success(`${ids.length}개 주제를 오늘 학습에 추가했습니다`);
      setCheckedIds(new Set());
      await loadTree();
    } catch {
      message.error('추가 실패');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="커리큘럼 로딩 중..." />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 12 }}>
        <Empty description="커리큘럼이 없습니다" />
        <Button type="primary" onClick={() => navigate('/settings')}>
          설정에서 커리큘럼 생성하기
        </Button>
      </div>
    );
  }

  const selectedCount = checkedIds.size;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>커리큘럼 관리</h2>
        <Button type="primary" onClick={() => navigate('/kanban')}>
          칸반 보드로 이동
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="주제 검색..."
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {/* Summary stats */}
      <div
        style={{
          marginBottom: 12,
          padding: '10px 16px',
          background: 'var(--bg-secondary, #fafafa)',
          borderRadius: 8,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Tag
          icon={<InboxOutlined />}
          style={{ fontSize: 13, padding: '4px 10px', margin: 0 }}
        >
          백로그 <strong>{totalStats.backlog}</strong>
        </Tag>
        <Tag
          icon={<ClockCircleOutlined />}
          color="blue"
          style={{ fontSize: 13, padding: '4px 10px', margin: 0 }}
        >
          학습중 <strong>{totalStats.active}</strong>
        </Tag>
        <Tag
          icon={<CheckCircleOutlined />}
          color="green"
          style={{ fontSize: 13, padding: '4px 10px', margin: 0 }}
        >
          마스터 <strong>{totalStats.mastered}</strong>
        </Tag>
        <span style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center' }}>
          전체 {totalStats.total}개
        </span>
      </div>

      {/* Subject accordion */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: selectedCount > 0 ? 64 : 0 }}>
        {filteredSubjects.length === 0 ? (
          <Empty description="검색 결과가 없습니다" style={{ marginTop: 40 }} />
        ) : (
          <Collapse
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys as string[])}
            style={{ background: 'transparent', border: 'none' }}
          >
            {filteredSubjects.map((subject) => {
              const subjectTotal = subject.units.reduce((a: number, u: UnitWithProgress) => a + u.totalCount, 0);
              const masteredPercent = subjectTotal > 0
                ? Math.round((subject.masteredCount / subjectTotal) * 100)
                : 0;

              return (
                <Panel
                  key={subject.id}
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: subject.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                        {subject.name}
                      </span>
                      <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                        마스터 {subject.masteredCount}/{subjectTotal}
                      </span>
                      <Progress
                        percent={masteredPercent}
                        size="small"
                        style={{ width: 80, margin: 0 }}
                        showInfo={false}
                        strokeColor={subject.color}
                      />
                    </div>
                  }
                  style={{
                    marginBottom: 8,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  {subject.units.map((unit: UnitWithProgress) => (
                    <div key={unit.id} style={{ marginBottom: 16 }}>
                      {/* Unit header */}
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: '#555',
                          borderBottom: '1px solid #f0f0f0',
                          paddingBottom: 6,
                          marginBottom: 8,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{unit.name}</span>
                        <span style={{ fontWeight: 400, fontSize: 11, color: '#999' }}>
                          {unit.masteredCount}/{unit.totalCount}
                        </span>
                      </div>

                      {/* Topic list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {unit.topics.map((topic: Topic) => {
                          const isBacklog = topic.column === 'backlog';
                          const isChecked = checkedIds.has(topic.id);

                          return (
                            <div
                              key={topic.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '4px 8px',
                                borderRadius: 4,
                                background: isChecked ? '#E8D5F5' : 'transparent',
                                transition: 'background 0.15s',
                              }}
                            >
                              <Checkbox
                                checked={isChecked}
                                disabled={!isBacklog}
                                onChange={(e) => handleCheckToggle(topic.id, e.target.checked)}
                              />
                              <span
                                style={{
                                  flex: 1,
                                  fontSize: 13,
                                  color: isBacklog ? '#262626' : '#8c8c8c',
                                }}
                              >
                                {topic.title}
                              </span>
                              {getStatusTag(topic.column)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Panel>
              );
            })}
          </Collapse>
        )}
      </div>

      {/* Floating action bar */}
      {selectedCount > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '10px 16px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {selectedCount}개 선택됨
          </span>
          <Space>
            <Button
              icon={<ClearOutlined />}
              size="small"
              onClick={handleClearSelection}
            >
              전체 해제
            </Button>
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              size="small"
              loading={assigning}
              onClick={handleAssign}
            >
              오늘 학습에 추가
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default CurriculumBrowser;
