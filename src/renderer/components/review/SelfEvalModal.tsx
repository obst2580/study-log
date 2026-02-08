import React, { useState } from 'react';
import { Modal, Rate, Input, Button, Space } from 'antd';
import { RollbackOutlined } from '@ant-design/icons';

interface SelfEvalModalProps {
  open: boolean;
  topicTitle: string;
  onSubmit: (data: { understandingScore: number; selfNote: string; moveBack: boolean }) => void;
  onCancel: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  1: '전혀 모름',
  2: '잘 모름',
  3: '보통',
  4: '이해함',
  5: '완벽',
};

const SelfEvalModal: React.FC<SelfEvalModalProps> = ({ open, topicTitle, onSubmit, onCancel }) => {
  const [score, setScore] = useState(3);
  const [note, setNote] = useState('');

  const handleSubmit = (moveBack: boolean) => {
    onSubmit({ understandingScore: score, selfNote: note, moveBack });
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
        <Space>
          <Button
            icon={<RollbackOutlined />}
            onClick={() => handleSubmit(true)}
          >
            이해 못함 (다시 학습)
          </Button>
          <Button type="primary" onClick={() => handleSubmit(false)}>
            확인
          </Button>
        </Space>
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
