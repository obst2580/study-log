import React, { useEffect, useState } from 'react';
import { Tree, Button, Tag, Progress, Space, Spin, Empty, message } from 'antd';
import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../api/apiService';
import type { SubjectWithProgress, Topic } from '../../types';

const CurriculumBrowser: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

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

  const getStatusTag = (column: string) => {
    switch (column) {
      case 'backlog': return <Tag color="default" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>백로그</Tag>;
      case 'today': return <Tag color="orange" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>오늘</Tag>;
      case 'reviewing': return <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>복습중</Tag>;
      case 'mastered': return <Tag color="green" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>마스터</Tag>;
      default: return null;
    }
  };

  const treeData = subjects.map((subject) => ({
    key: `subject-${subject.id}`,
    title: (
      <Space size={4}>
        <BookOutlined style={{ color: subject.color }} />
        <span style={{ fontWeight: 600 }}>{subject.name}</span>
        <Progress
          percent={subject.units.reduce((a, u) => a + u.masteredCount, 0) / Math.max(subject.units.reduce((a, u) => a + u.totalCount, 0), 1) * 100}
          size="small" style={{ width: 80 }} showInfo={false}
        />
        <span style={{ fontSize: 11, color: '#999' }}>
          {subject.masteredCount}/{subject.units.reduce((a, u) => a + u.totalCount, 0)}
        </span>
      </Space>
    ),
    checkable: false,
    children: subject.units.map((unit) => ({
      key: `unit-${unit.id}`,
      title: (
        <Space size={4}>
          <span style={{ fontWeight: 500 }}>{unit.name}</span>
          <Progress
            percent={unit.totalCount > 0 ? (unit.masteredCount / unit.totalCount) * 100 : 0}
            size="small" style={{ width: 60 }} showInfo={false}
          />
          <span style={{ fontSize: 11, color: '#999' }}>
            {unit.masteredCount}/{unit.totalCount}
          </span>
        </Space>
      ),
      checkable: false,
      children: unit.topics.map((topic: Topic) => ({
        key: topic.id,
        title: (
          <Space size={4}>
            <span>{topic.title}</span>
            {getStatusTag(topic.column)}
          </Space>
        ),
        checkable: topic.column === 'backlog',
        disabled: topic.column !== 'backlog',
      })),
    })),
  }));

  const totalStats = subjects.reduce(
    (acc, s) => {
      const total = s.units.reduce((a, u) => a + u.totalCount, 0);
      return {
        backlog: acc.backlog + s.backlogCount,
        active: acc.active + s.reviewingCount,
        mastered: acc.mastered + s.masteredCount,
        total: acc.total + total,
      };
    },
    { backlog: 0, active: 0, mastered: 0, total: 0 }
  );

  const backlogTopicIds = checkedKeys.filter((key) => !key.startsWith('subject-') && !key.startsWith('unit-'));

  const handleAssign = async () => {
    if (backlogTopicIds.length === 0) return;
    setAssigning(true);
    try {
      await apiService.bulkAssignToToday(backlogTopicIds);
      message.success(`${backlogTopicIds.length}개 주제를 오늘 학습에 추가했습니다`);
      setCheckedKeys([]);
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>커리큘럼 관리</h2>
        <Button type="primary" onClick={() => navigate('/kanban')}>
          칸반 보드로 이동
        </Button>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-secondary, #fafafa)', borderRadius: 8, display: 'flex', gap: 16, fontSize: 13 }}>
        <Space>
          <InboxOutlined />
          <span>백로그 <strong>{totalStats.backlog}</strong></span>
        </Space>
        <Space>
          <ClockCircleOutlined />
          <span>학습중 <strong>{totalStats.active}</strong></span>
        </Space>
        <Space>
          <CheckCircleOutlined />
          <span>마스터 <strong>{totalStats.mastered}</strong></span>
        </Space>
      </div>

      {/* Action bar */}
      {backlogTopicIds.length > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f7ff', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>{backlogTopicIds.length}개 주제 선택됨</span>
          <Button type="primary" size="small" loading={assigning} onClick={handleAssign}>
            오늘 학습에 추가
          </Button>
        </div>
      )}

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Tree
          checkable
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys((keys as { checked: string[] }).checked ?? keys as string[])}
          treeData={treeData}
          defaultExpandAll
          checkStrictly
        />
      </div>
    </div>
  );
};

export default CurriculumBrowser;
