import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Steps,
  Select,
  Button,
  Card,
  Checkbox,
  Progress,
  Typography,
  Space,
  Tag,
  Collapse,
  message,
  Alert,
  Spin,
} from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';
import { apiService } from '../../api/apiService';
import type { CurriculumTemplateDetail, CurriculumGenerationProgress } from '../../../shared/types';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface GeneratedSubject {
  name: string;
  color: string;
  selected: boolean;
  units: {
    name: string;
    selected: boolean;
    topics: {
      title: string;
      difficulty: 'high' | 'medium' | 'low';
      importance: 'high' | 'medium' | 'low';
      checklist: string[];
      selected: boolean;
    }[];
  }[];
}

interface GradeSetupProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const GRADES = [
  { value: 'middle-1', label: '중학교 1학년' },
  { value: 'middle-2', label: '중학교 2학년' },
  { value: 'middle-3', label: '중학교 3학년' },
  { value: 'high-1', label: '고등학교 1학년' },
  { value: 'high-2', label: '고등학교 2학년 (문과)' },
  { value: 'high-2-science', label: '고등학교 2학년 (이과)' },
  { value: 'high-3', label: '고등학교 3학년 (문과)' },
  { value: 'high-3-science', label: '고등학교 3학년 (이과)' },
];

const SUBJECT_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
];

export const GradeSetup: React.FC<GradeSetupProps> = ({ open, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [waiting, setWaiting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<CurriculumGenerationProgress | undefined>();
  const [generatedData, setGeneratedData] = useState<GeneratedSubject[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);

  const loadSubjects = useAppStore((s) => s.loadSubjects);

  const transformTemplateToDisplay = useCallback((template: CurriculumTemplateDetail): GeneratedSubject[] => {
    return template.subjects.map((subject, idx) => ({
      name: subject.name,
      color: subject.color || SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
      selected: true,
      units: subject.units.map((unit) => ({
        name: unit.name,
        selected: true,
        topics: unit.topics.map((topic) => ({
          title: topic.title,
          difficulty: topic.difficulty || 'medium',
          importance: topic.importance || 'medium',
          checklist: topic.checklistItems.map((item) => item.text),
          selected: true,
        })),
      })),
    }));
  }, []);

  const handleGradeSelect = useCallback(async () => {
    setWaiting(true);
    setCurrentStep(1);

    try {
      const gradeStatus = await apiService.getGradeStatus(selectedGrade);

      if (gradeStatus.status === 'active') {
        // 이미 준비됨 -> 바로 프리뷰
        const template = await apiService.getCurriculumTemplate(selectedGrade);
        setGeneratedData(transformTemplateToDisplay(template));
        setCurrentStep(2);
        setWaiting(false);
        return;
      }

      if (gradeStatus.progress) {
        setGenerationProgress(gradeStatus.progress);
      }

      // 생성 중 -> 폴링
      const poll = setInterval(async () => {
        try {
          const status = await apiService.getGradeStatus(selectedGrade);
          if (status.progress) {
            setGenerationProgress(status.progress);
          }
          if (status.status === 'active') {
            clearInterval(poll);
            const template = await apiService.getCurriculumTemplate(selectedGrade);
            setGeneratedData(transformTemplateToDisplay(template));
            setCurrentStep(2);
            setWaiting(false);
            setGenerationProgress(undefined);
          } else if (status.status === 'archived') {
            clearInterval(poll);
            message.error('커리큘럼 생성에 실패했습니다');
            setWaiting(false);
            setGenerationProgress(undefined);
            setCurrentStep(0);
          }
        } catch {
          clearInterval(poll);
          setWaiting(false);
          setGenerationProgress(undefined);
          setCurrentStep(0);
        }
      }, 2000);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      message.error(`상태 확인 실패: ${errMsg}`);
      setWaiting(false);
      setCurrentStep(0);
    }
  }, [selectedGrade, transformTemplateToDisplay]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedGrade('');
      setWaiting(false);
      setGenerationProgress(undefined);
      setGeneratedData([]);
      setApplying(false);
      setApplyProgress(0);
    }
  }, [open]);

  const toggleSubject = (subjectIdx: number) => {
    setGeneratedData(prev => prev.map((s, i) =>
      i === subjectIdx
        ? { ...s, selected: !s.selected, units: s.units.map(u => ({ ...u, selected: !s.selected, topics: u.topics.map(t => ({ ...t, selected: !s.selected })) })) }
        : s
    ));
  };

  const toggleUnit = (subjectIdx: number, unitIdx: number) => {
    setGeneratedData(prev => prev.map((s, si) =>
      si === subjectIdx
        ? {
            ...s,
            units: s.units.map((u, ui) =>
              ui === unitIdx
                ? { ...u, selected: !u.selected, topics: u.topics.map(t => ({ ...t, selected: !u.selected })) }
                : u
            )
          }
        : s
    ));
  };

  const getTotalCounts = () => {
    let subjects = 0, units = 0, topics = 0;
    generatedData.forEach(s => {
      if (s.selected) {
        subjects++;
        s.units.forEach(u => {
          if (u.selected) {
            units++;
            topics += u.topics.filter(t => t.selected).length;
          }
        });
      }
    });
    return { subjects, units, topics };
  };

  const applyToKanban = async () => {
    setApplying(true);
    setApplyProgress(0);

    const counts = getTotalCounts();
    let created = 0;

    try {
      for (const subject of generatedData) {
        if (!subject.selected) continue;

        const createdSubject = await apiService.createSubject({
          name: subject.name,
          color: subject.color,
          icon: 'book',
        });

        for (const unit of subject.units) {
          if (!unit.selected) continue;

          const createdUnit = await apiService.createUnit({
            subjectId: createdSubject.id,
            name: unit.name,
          });

          for (const topic of unit.topics) {
            if (!topic.selected) continue;

            const createdTopic = await apiService.createTopic({
              subjectId: createdSubject.id,
              unitId: createdUnit.id,
              title: topic.title,
              notes: '',
              difficulty: topic.difficulty,
              importance: topic.importance,
              tags: [],
              column: 'backlog',
            });

            for (const item of topic.checklist) {
              await apiService.upsertChecklistItem({
                topicId: createdTopic.id,
                text: item,
                checked: false,
              });
            }

            created++;
            setApplyProgress(Math.round((created / counts.topics) * 100));
          }
        }
      }

      message.success(`${counts.topics}개의 학습 카드가 생성되었습니다!`);
      await loadSubjects();
      onComplete();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      message.error(`생성 중 오류: ${errMsg}`);
    } finally {
      setApplying(false);
    }
  };

  const counts = getTotalCounts();

  const steps = [
    {
      title: '학년 선택',
      icon: <BookOutlined />,
    },
    {
      title: '준비 확인',
      icon: waiting ? <LoadingOutlined /> : <CheckCircleOutlined />,
    },
    {
      title: '확인 및 적용',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <Modal
      title="학습 카드 일괄 생성"
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      {currentStep === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Title level={4}>학년을 선택하세요</Title>
          <Paragraph type="secondary">
            선택한 학년의 교과과정이 자동으로 적용됩니다.
          </Paragraph>

          <Select
            size="large"
            placeholder="학년 선택"
            style={{ width: 300, marginBottom: 24 }}
            value={selectedGrade || undefined}
            onChange={setSelectedGrade}
            options={GRADES}
          />

          <div style={{ marginTop: 32 }}>
            <Button
              type="primary"
              size="large"
              disabled={!selectedGrade}
              onClick={handleGradeSelect}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          {(!generationProgress || generationProgress.phase === 1) ? (
            <>
              <Spin size="large" />
              <Title level={4} style={{ marginTop: 24 }}>교과과정을 준비하고 있습니다...</Title>
              <Paragraph type="secondary">
                과목과 단원 목록을 수집 중입니다.
              </Paragraph>
            </>
          ) : (
            <>
              <Title level={4}>세부 토픽을 수집하고 있습니다</Title>
              <Progress
                percent={generationProgress.totalUnits > 0
                  ? Math.round((generationProgress.completedUnits / generationProgress.totalUnits) * 100)
                  : 0}
                status="active"
                style={{ maxWidth: 400, margin: '16px auto' }}
              />
              {generationProgress.currentSubject && generationProgress.currentUnit && (
                <Paragraph type="secondary">
                  {generationProgress.currentSubject} &gt; {generationProgress.currentUnit} 세부 토픽 수집 중...
                </Paragraph>
              )}
              <Text type="secondary">
                ({generationProgress.completedUnits} / {generationProgress.totalUnits} 단원 완료)
              </Text>
            </>
          )}
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <Alert
            message={`${counts.subjects}개 과목, ${counts.units}개 단원, ${counts.topics}개 토픽이 준비되었습니다`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
            <Collapse>
              {generatedData.map((subject, si) => (
                <Panel
                  key={si}
                  header={
                    <Space>
                      <Checkbox
                        checked={subject.selected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSubject(si)}
                      />
                      <Tag color={subject.color}>{subject.name}</Tag>
                      <Text type="secondary">
                        {subject.units.length}개 단원, {subject.units.reduce((acc, u) => acc + u.topics.length, 0)}개 토픽
                      </Text>
                    </Space>
                  }
                >
                  {subject.units.map((unit, ui) => (
                    <Card
                      key={ui}
                      size="small"
                      style={{ marginBottom: 8 }}
                      title={
                        <Space>
                          <Checkbox
                            checked={unit.selected}
                            onChange={() => toggleUnit(si, ui)}
                          />
                          <Text strong>{unit.name}</Text>
                          <Text type="secondary">({unit.topics.length}개 토픽)</Text>
                        </Space>
                      }
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {unit.topics.map((topic, ti) => (
                          <Tag key={ti} style={{ margin: 2 }}>
                            {topic.title}
                          </Tag>
                        ))}
                      </div>
                    </Card>
                  ))}
                </Panel>
              ))}
            </Collapse>
          </div>

          {applying && (
            <Progress
              percent={applyProgress}
              status="active"
              style={{ marginBottom: 16 }}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>
              다시 선택
            </Button>
            <Button
              type="primary"
              size="large"
              loading={applying}
              onClick={applyToKanban}
            >
              {counts.topics}개 카드 적용하기
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GradeSetup;
