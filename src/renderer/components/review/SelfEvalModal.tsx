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
  1: '전혀 모름',
  2: '잘 모름',
  3: '보통',
  4: '이해함',
  5: '완벽',
};

const INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 10,
  5: 30,
};

const SCORE_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#fff2f0', border: '#ffccc7', text: '#cf1322' },
  2: { bg: '#fff7e6', border: '#ffd591', text: '#d46b08' },
  3: { bg: '#e6f7ff', border: '#91d5ff', text: '#096dd9' },
  4: { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d' },
  5: { bg: '#fffbe6', border: '#ffe58f', text: '#d4a017' },
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
  const [score, setScore] = useState(3);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    onSubmit({ understandingScore: score, selfNote: note });
    setScore(3);
    setNote('');
  };

  const handleCancel = () => {
    setScore(3);
    setNote('');
    onCancel();
  };

  const colors = SCORE_COLORS[score];
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
          <Button type="primary" onClick={handleSubmit}>
            확인
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Topic title */}
        <div>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>{topicTitle}</p>
          <p style={{ color: '#666', fontSize: 13 }}>이 토픽에 대한 이해도를 평가하세요.</p>
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
          </div>
        </div>

        {/* Result preview card */}
        <div
          style={{
            padding: '12px 16px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
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
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#389e0d',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                이번이 마스터!
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
                <span style={{ fontSize: 12, color: '#666' }}>
                  마스터까지: {Math.min(nextMasteryCount, MASTERY_THRESHOLD)}/{MASTERY_THRESHOLD}
                </span>
              </div>
              <Progress
                percent={Math.round((Math.min(nextMasteryCount, MASTERY_THRESHOLD) / MASTERY_THRESHOLD) * 100)}
                size="small"
                strokeColor={willMaster ? '#52c41a' : '#faad14'}
                showInfo={false}
              />
            </div>
          )}

          {/* Interval guide */}
          <div style={{ fontSize: 12, color: '#888' }}>
            점수에 따라 다음 복습이 자동 설정됩니다 (1점:1일, 2점:2일, 3점:4일, 4점:10일, 5점:30일)
            <br />
            5점 3회 연속 달성 시 마스터!
          </div>
        </div>

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
