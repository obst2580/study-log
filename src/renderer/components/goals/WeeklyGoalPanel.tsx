import React, { useEffect, useState } from 'react';
import { Card, Input, Button, Checkbox, Progress, List, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { apiService } from '../../api/apiService';
import type { WeeklyGoal, GoalItem } from '../../../shared/types';

const WeeklyGoalPanel: React.FC = () => {
  const [currentGoal, setCurrentGoal] = useState<WeeklyGoal | null>(null);
  const [history, setHistory] = useState<WeeklyGoal[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCurrentGoals = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCurrentGoals();
      setCurrentGoal(data);
    } catch {
      setCurrentGoal(null);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await apiService.getGoalHistory(8);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadCurrentGoals();
  }, []);

  const handleAddGoal = async () => {
    if (!newGoalText.trim()) return;
    const goals: GoalItem[] = [
      ...(currentGoal?.goals ?? []),
      { id: crypto.randomUUID(), text: newGoalText.trim(), completed: false },
    ];
    await apiService.upsertGoals({ goals });
    setNewGoalText('');
    await loadCurrentGoals();
  };

  const handleToggleGoal = async (goalId: string) => {
    if (!currentGoal) return;
    const goals = currentGoal.goals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    await apiService.upsertGoals({ goals });
    await loadCurrentGoals();
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!currentGoal) return;
    const goals = currentGoal.goals.filter((g) => g.id !== goalId);
    await apiService.upsertGoals({ goals });
    await loadCurrentGoals();
  };

  const handleShowHistory = async () => {
    if (!showHistory) {
      await loadHistory();
    }
    setShowHistory((prev) => !prev);
  };

  const goals = currentGoal?.goals ?? [];
  const completedCount = goals.filter((g) => g.completed).length;
  const progressPercent = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  const getHistoryProgress = (weekGoal: WeeklyGoal) => {
    const total = weekGoal.goals.length;
    if (total === 0) return 0;
    const done = weekGoal.goals.filter((g) => g.completed).length;
    return Math.round((done / total) * 100);
  };

  return (
    <Card
      title="이번 주 목표"
      size="small"
      loading={loading}
      extra={
        <Button
          type="text"
          icon={<HistoryOutlined />}
          size="small"
          onClick={handleShowHistory}
        >
          {showHistory ? '현재' : '이력'}
        </Button>
      }
    >
      {!showHistory ? (
        <>
          <Progress
            percent={progressPercent}
            format={() => `${completedCount}/${goals.length}`}
            style={{ marginBottom: 12 }}
          />

          {goals.length === 0 && <Empty description="목표를 추가하세요" image={Empty.PRESENTED_IMAGE_SIMPLE} />}

          <List
            dataSource={goals}
            renderItem={(item) => (
              <List.Item
                style={{ padding: '4px 0' }}
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => handleDeleteGoal(item.id)}
                  />,
                ]}
              >
                <Checkbox
                  checked={item.completed}
                  onChange={() => handleToggleGoal(item.id)}
                  style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'inherit' }}
                >
                  {item.text}
                </Checkbox>
              </List.Item>
            )}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Input
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              placeholder="새 목표 입력"
              onPressEnter={handleAddGoal}
              size="small"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={handleAddGoal}
              disabled={!newGoalText.trim()}
            >
              추가
            </Button>
          </div>
        </>
      ) : (
        <List
          dataSource={history}
          locale={{ emptyText: '이력이 없습니다' }}
          renderItem={(week) => (
            <List.Item style={{ padding: '8px 0' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{week.weekStart}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {week.goals.filter((g) => g.completed).length}/{week.goals.length}
                  </span>
                </div>
                <Progress percent={getHistoryProgress(week)} size="small" />
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default WeeklyGoalPanel;
