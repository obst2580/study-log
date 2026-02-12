import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Spin, Empty, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ChallengeCard from './ChallengeCard';
import { apiService } from '../../api/apiService';
import type { ChallengeWithParticipants, ChallengeType } from '../../../shared/types';

const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: 'study_time', label: '학습 시간 (분)' },
  { value: 'review_count', label: '복습 횟수' },
  { value: 'streak', label: '연속 학습 (일)' },
  { value: 'goal_rate', label: '목표 달성률 (%)' },
];

const ChallengeListView: React.FC = () => {
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const data = await apiService.getChallenges();
      setChallenges(data);
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const startDate = values.dateRange[0].format('YYYY-MM-DD');
      const endDate = values.dateRange[1].format('YYYY-MM-DD');
      await apiService.createChallenge({
        title: values.title,
        challengeType: values.challengeType,
        targetValue: values.targetValue,
        startDate,
        endDate,
      });
      form.resetFields();
      setCreateOpen(false);
      await loadChallenges();
    } catch {
      // validation error
    }
  };

  const activeChallenges = challenges.filter((c) => new Date(c.endDate) >= new Date());
  const completedChallenges = challenges.filter((c) => new Date(c.endDate) < new Date());

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>챌린지</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          챌린지 만들기
        </Button>
      </div>

      {activeChallenges.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>진행 중</h3>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {activeChallenges.map((c) => (
              <Col key={c.id} xs={24} sm={12} lg={8}>
                <ChallengeCard challenge={c} profileNames={{}} />
              </Col>
            ))}
          </Row>
        </>
      )}

      {completedChallenges.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>완료된 챌린지</h3>
          <Row gutter={[16, 16]}>
            {completedChallenges.map((c) => (
              <Col key={c.id} xs={24} sm={12} lg={8}>
                <ChallengeCard challenge={c} profileNames={{}} />
              </Col>
            ))}
          </Row>
        </>
      )}

      {challenges.length === 0 && (
        <Empty description="챌린지가 없습니다. 새로운 챌린지를 만들어 보세요!" />
      )}

      <Modal
        title="챌린지 만들기"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="만들기"
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목을 입력하세요' }]}>
            <Input placeholder="예: 이번 주 학습 300분 달성" />
          </Form.Item>
          <Form.Item name="challengeType" label="유형" rules={[{ required: true, message: '유형을 선택하세요' }]}>
            <Select options={CHALLENGE_TYPES} placeholder="챌린지 유형" />
          </Form.Item>
          <Form.Item name="targetValue" label="목표값" rules={[{ required: true, message: '목표값을 입력하세요' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="목표 수치" />
          </Form.Item>
          <Form.Item name="dateRange" label="기간" rules={[{ required: true, message: '기간을 선택하세요' }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChallengeListView;
