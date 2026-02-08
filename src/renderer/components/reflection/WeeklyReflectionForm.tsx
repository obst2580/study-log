import React, { useEffect, useState } from 'react';
import { Card, Input, Rate, Statistic, Row, Col, Button, Timeline, Empty, Spin, message } from 'antd';
import { SaveOutlined, HistoryOutlined, EditOutlined } from '@ant-design/icons';
import { apiService } from '../../api/apiService';
import type { WeeklyReflection } from '../../../shared/types';

const MOOD_LABELS: Record<number, string> = {
  1: '매우 힘들었다',
  2: '힘들었다',
  3: '보통',
  4: '좋았다',
  5: '최고였다',
};

function isReflectionPeriod(): boolean {
  const day = new Date().getDay();
  return day === 5 || day === 6 || day === 0; // Fri, Sat, Sun
}

const WeeklyReflectionForm: React.FC = () => {
  const [current, setCurrent] = useState<WeeklyReflection | null>(null);
  const [history, setHistory] = useState<WeeklyReflection[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [nextWeekFocus, setNextWeekFocus] = useState('');
  const [mood, setMood] = useState(3);

  useEffect(() => {
    loadCurrent();
  }, []);

  const loadCurrent = async () => {
    setLoading(true);
    try {
      const data = await apiService.getCurrentReflection();
      setCurrent(data);
      if (data) {
        setWhatWentWell(data.whatWentWell || '');
        setWhatToImprove(data.whatToImprove || '');
        setNextWeekFocus(data.nextWeekFocus || '');
        setMood(data.mood || 3);
      }
    } catch {
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await apiService.getReflectionHistory(10);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.upsertReflection({
        whatWentWell,
        whatToImprove,
        nextWeekFocus,
        mood,
      });
      message.success('성찰이 저장되었습니다');
      await loadCurrent();
    } catch {
      message.error('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHistory = async () => {
    if (!showHistory) {
      await loadHistory();
    }
    setShowHistory((prev) => !prev);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  }

  const showPrompt = isReflectionPeriod() && !current;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>주간 성찰</h2>
        <Button
          type="text"
          icon={showHistory ? <EditOutlined /> : <HistoryOutlined />}
          onClick={handleToggleHistory}
        >
          {showHistory ? '작성하기' : '이전 성찰'}
        </Button>
      </div>

      {showPrompt && (
        <Card size="small" style={{ marginBottom: 16, background: '#fff7e6', borderColor: '#ffd591' }}>
          <p style={{ margin: 0 }}>이번 주를 돌아보고 성찰을 작성해 보세요.</p>
        </Card>
      )}

      {!showHistory ? (
        <>
          {current && (
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="이번 주 학습 시간" value={current.studyTimeTotal} suffix="분" />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="복습 횟수" value={current.reviewCount} suffix="회" />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="목표 달성률" value={Math.round(current.goalRate * 100)} suffix="%" />
                </Card>
              </Col>
            </Row>
          )}

          <Card size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>기분</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Rate value={mood} onChange={setMood} tooltips={Object.values(MOOD_LABELS)} />
                  <span style={{ color: '#666', fontSize: 13 }}>{MOOD_LABELS[mood]}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>잘한 점</label>
                <Input.TextArea
                  value={whatWentWell}
                  onChange={(e) => setWhatWentWell(e.target.value)}
                  placeholder="이번 주에 잘한 것은 무엇인가요?"
                  rows={3}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>개선할 점</label>
                <Input.TextArea
                  value={whatToImprove}
                  onChange={(e) => setWhatToImprove(e.target.value)}
                  placeholder="다음 주에 개선하고 싶은 것은 무엇인가요?"
                  rows={3}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>다음 주 집중할 것</label>
                <Input.TextArea
                  value={nextWeekFocus}
                  onChange={(e) => setNextWeekFocus(e.target.value)}
                  placeholder="다음 주에 집중하고 싶은 것은 무엇인가요?"
                  rows={3}
                />
              </div>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
              >
                저장
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card size="small">
          {history.length === 0 ? (
            <Empty description="이전 성찰이 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Timeline
              items={history.map((r) => ({
                children: (
                  <div key={r.id}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {r.weekStart} <Rate disabled value={r.mood} style={{ fontSize: 12, marginLeft: 8 }} />
                    </div>
                    {r.whatWentWell && <p style={{ margin: '4px 0', color: '#52c41a' }}>잘한 점: {r.whatWentWell}</p>}
                    {r.whatToImprove && <p style={{ margin: '4px 0', color: '#faad14' }}>개선할 점: {r.whatToImprove}</p>}
                    {r.nextWeekFocus && <p style={{ margin: '4px 0', color: '#1677ff' }}>집중할 것: {r.nextWeekFocus}</p>}
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default WeeklyReflectionForm;
