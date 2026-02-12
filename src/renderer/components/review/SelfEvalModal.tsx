import React, { useState, useMemo } from 'react';
import { Modal, Rate, Input, Button, Progress } from 'antd';

interface SelfEvalModalProps {
  open: boolean;
  topicTitle: string;
  masteryCount?: number;
  onSubmit: (data: { understandingScore: number; selfNote: string }) => void;
  onCancel: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  1: '처음 만남',
  2: '조금 익숙해짐',
  3: '감 잡는 중',
  4: '거의 다 왔어!',
  5: '완벽 마스터',
};

const INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 10,
  5: 30,
};

const SCORE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA' },
  2: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  3: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  4: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  5: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
};

const MASTERY_THRESHOLD = 3;

function getMasteryAfterReview(score: number, currentMasteryCount: number): number {
  if (score === 5) {
    return currentMasteryCount + 1;
  }
  return 0;
}

const SelfEvalModal: React.FC<SelfEvalModalProps> = ({
  open,
  topicTitle,
  masteryCount = 0,
  onSubmit,
  onCancel,
}) => {
  const [score, setScore] = useState(0);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (score === 0) return;
    onSubmit({ understandingScore: score, selfNote: note });
    setScore(0);
    setNote('');
  };

  const handleCancel = () => {
    setScore(0);
    setNote('');
    onCancel();
  };

  const colors = SCORE_COLORS[score] ?? SCORE_COLORS[3];
  const nextMasteryCount = useMemo(
    () => getMasteryAfterReview(score, masteryCount),
    [score, masteryCount],
  );
  const willMaster = score === 5 && masteryCount + 1 >= MASTERY_THRESHOLD;
  const showMasteryProgress = score === 5;

  return (
    <Modal
      title="자기 평가"
      open={open}
      onCancel={handleCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleCancel}>취소</Button>
          <Button type="primary" onClick={handleSubmit} disabled={score === 0}>
            확인
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Topic title */}
        <div>
          <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{topicTitle}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>이 토픽에 대한 이해도를 평가하세요.</p>
        </div>

        {/* Score selector with bigger stars */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>이해도</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Rate
              value={score}
              onChange={(val) => setScore(val)}
              tooltips={Object.values(SCORE_LABELS)}
              style={{ fontSize: 28 }}
            />
            {score > 0 && (
              <span
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '2px 10px',
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                }}
              >
                {SCORE_LABELS[score]}
              </span>
            )}
          </div>
        </div>

        {/* Result preview card */}
        {score > 0 && <div
          style={{
            padding: '12px 16px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
              {willMaster ? '마스터 달성!' : `다음 복습: ${INTERVAL_DAYS[score]}일 후`}
            </span>
            {score === 5 && willMaster && (
              <span
                className="animate-celebrate"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--brand-success)',
                  background: 'var(--brand-success-bg)',
                  border: '1px solid var(--status-mastered-border)',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                마스터 달성!
              </span>
            )}
          </div>

          {/* Mastery progress bar -- only for score=5 */}
          {showMasteryProgress && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  마스터까지: {Math.min(nextMasteryCount, MASTERY_THRESHOLD)}/{MASTERY_THRESHOLD}
                </span>
              </div>
              <Progress
                percent={Math.round((Math.min(nextMasteryCount, MASTERY_THRESHOLD) / MASTERY_THRESHOLD) * 100)}
                size="small"
                strokeColor={willMaster ? '#10B981' : '#F59E0B'}
                showInfo={false}
              />
            </div>
          )}

          {/* Interval guide */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            점수에 따라 다음 복습이 자동 설정됩니다 (1점:1일, 2점:2일, 3점:4일, 4점:10일, 5점:30일)
            <br />
            5점 3회 연속 달성 시 마스터!
          </div>
        </div>}

        {/* Note field */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>메모 (선택)</label>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="이해가 안 되는 부분, 다시 봐야할 내용 등"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SelfEvalModal;
