import React, { useState } from 'react';
import { Modal, Rate, Input, Button } from 'antd';

interface SelfEvalModalProps {
  open: boolean;
  topicTitle: string;
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

const INTERVAL_LABELS: Record<number, string> = {
  1: '1일 후 복습',
  2: '2일 후 복습',
  3: '4일 후 복습',
  4: '10일 후 복습',
  5: '30일 후 복습',
};

const SelfEvalModal: React.FC<SelfEvalModalProps> = ({ open, topicTitle, onSubmit, onCancel }) => {
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

  return (
    <Modal
      title="자기 평가"
      open={open}
      onCancel={handleCancel}
      footer={
        <Button type="primary" onClick={handleSubmit}>
          확인
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>{topicTitle}</p>
          <p style={{ color: '#666', fontSize: 13 }}>이 토픽에 대한 이해도를 평가하세요.</p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>이해도</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Rate
              value={score}
              onChange={(val) => setScore(val)}
              tooltips={Object.values(SCORE_LABELS)}
            />
            <span style={{ color: '#666', fontSize: 13 }}>
              {SCORE_LABELS[score]}
            </span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#1890ff' }}>
            {INTERVAL_LABELS[score]}
          </div>
        </div>

        <div style={{ padding: '8px 12px', background: '#f6f6f6', borderRadius: 6, fontSize: 12, color: '#666' }}>
          점수에 따라 다음 복습이 자동 설정됩니다 (1점:1일, 2점:2일, 3점:4일, 4점:10일, 5점:30일)
          <br />
          5점 3회 연속 달성 시 마스터!
        </div>

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
