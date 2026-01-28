import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Select,
  Button,
  Card,
  Checkbox,
  Spin,
  Progress,
  Typography,
  Space,
  Tag,
  Collapse,
  message,
  Alert,
} from 'antd';
import {
  BookOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface GeneratedTopic {
  title: string;
  difficulty: 'high' | 'medium' | 'low';
  importance: 'high' | 'medium' | 'low';
  checklist: string[];
  selected: boolean;
}

interface GeneratedUnit {
  name: string;
  topics: GeneratedTopic[];
  selected: boolean;
}

interface GeneratedSubject {
  name: string;
  color: string;
  units: GeneratedUnit[];
  selected: boolean;
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
  const [generating, setGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedSubject[]>([]);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');

  const loadSubjects = useAppStore((s) => s.loadSubjects);

  const generateCurriculum = async () => {
    if (!apiKey) {
      message.error('API 키를 입력해주세요');
      return;
    }
    const key = apiKey;

    setGenerating(true);

    const gradeLabel = GRADES.find(g => g.value === selectedGrade)?.label || selectedGrade;

    const systemPrompt = `당신은 한국 교육과정 전문가입니다. 사용자가 요청한 학년의 전체 교과과정을 JSON 형식으로 생성해주세요.

응답은 반드시 다음 JSON 형식만 출력하세요 (다른 텍스트 없이):
{
  "subjects": [
    {
      "name": "과목명",
      "units": [
        {
          "name": "단원명",
          "topics": [
            {
              "title": "세부 토픽/개념",
              "difficulty": "high|medium|low",
              "importance": "high|medium|low",
              "checklist": ["학습해야 할 세부 항목1", "항목2", "항목3"]
            }
          ]
        }
      ]
    }
  ]
}

규칙:
1. 해당 학년의 주요 과목 모두 포함 (국어, 수학, 영어, 사회/역사, 과학 등)
2. 각 과목당 실제 교과서 기준 단원 구성
3. 각 단원당 5-10개의 핵심 토픽
4. 토픽별 3-5개의 체크리스트 항목
5. 난이도와 중요도는 실제 시험 출제 빈도 기반
6. 총 토픽 수는 과목당 30-50개 정도`;

    const userPrompt = `${gradeLabel} 전체 교과과정을 생성해주세요. 2024년 개정 교육과정 기준으로 해주세요.`;

    try {
      let responseText = '';

      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 16000,
          }),
        });

        if (!res.ok) {
          throw new Error(`API 오류: ${res.status}`);
        }

        const data = await res.json();
        responseText = data.choices[0]?.message?.content || '';
      } else {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (!res.ok) {
          throw new Error(`API 오류: ${res.status}`);
        }

        const data = await res.json();
        responseText = data.content[0]?.text || '';
      }

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON 응답을 찾을 수 없습니다');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Transform and add colors
      const subjects: GeneratedSubject[] = parsed.subjects.map((subject: any, idx: number) => ({
        name: subject.name,
        color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
        selected: true,
        units: subject.units.map((unit: any) => ({
          name: unit.name,
          selected: true,
          topics: unit.topics.map((topic: any) => ({
            title: topic.title,
            difficulty: topic.difficulty || 'medium',
            importance: topic.importance || 'medium',
            checklist: topic.checklist || [],
            selected: true,
          })),
        })),
      }));

      setGeneratedData(subjects);
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Generation error:', error);
      message.error(`생성 실패: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

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

  const createAllCards = async () => {
    setCreating(true);
    setCreateProgress(0);

    const counts = getTotalCounts();
    let created = 0;

    try {
      for (const subject of generatedData) {
        if (!subject.selected) continue;

        // Create subject
        const createdSubject = await window.electronAPI.createSubject({
          name: subject.name,
          color: subject.color,
          icon: 'book',
        });

        for (const unit of subject.units) {
          if (!unit.selected) continue;

          // Create unit
          const createdUnit = await window.electronAPI.createUnit({
            subjectId: createdSubject.id,
            name: unit.name,
          });

          for (const topic of unit.topics) {
            if (!topic.selected) continue;

            // Create topic
            const createdTopic = await window.electronAPI.createTopic({
              subjectId: createdSubject.id,
              unitId: createdUnit.id,
              title: topic.title,
              notes: '',
              difficulty: topic.difficulty,
              importance: topic.importance,
              tags: [],
              column: 'today',
            });

            // Create checklist items
            for (const item of topic.checklist) {
              await window.electronAPI.upsertChecklistItem({
                topicId: createdTopic.id,
                text: item,
                checked: false,
              });
            }

            created++;
            setCreateProgress(Math.round((created / counts.topics) * 100));
          }
        }
      }

      message.success(`${counts.topics}개의 학습 카드가 생성되었습니다!`);
      await loadSubjects();
      onComplete();
    } catch (error: any) {
      console.error('Create error:', error);
      message.error(`생성 중 오류: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const counts = getTotalCounts();

  const steps = [
    {
      title: '학년 선택',
      icon: <BookOutlined />,
    },
    {
      title: 'AI 생성',
      icon: generating ? <LoadingOutlined /> : <RocketOutlined />,
    },
    {
      title: '확인 및 생성',
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
            선택한 학년의 전체 교과과정을 AI가 분석하여 학습 카드를 생성합니다.
          </Paragraph>

          <Select
            size="large"
            placeholder="학년 선택"
            style={{ width: 300, marginBottom: 24 }}
            value={selectedGrade || undefined}
            onChange={setSelectedGrade}
            options={GRADES}
          />

          <div style={{ marginTop: 24 }}>
            <Space direction="vertical" style={{ width: '100%', maxWidth: 400 }}>
              <Select
                placeholder="AI 제공자"
                style={{ width: '100%' }}
                value={provider}
                onChange={setProvider}
                options={[
                  { value: 'openai', label: 'OpenAI (GPT-4o)' },
                  { value: 'anthropic', label: 'Anthropic (Claude)' },
                ]}
              />
              <input
                type="password"
                placeholder="API 키 (설정에 저장된 키 사용 시 비워두세요)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                }}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </Space>
          </div>

          <div style={{ marginTop: 32 }}>
            <Button
              type="primary"
              size="large"
              disabled={!selectedGrade}
              onClick={() => {
                setCurrentStep(1);
                generateCurriculum();
              }}
            >
              교과과정 생성하기
            </Button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <Title level={4} style={{ marginTop: 24 }}>AI가 교과과정을 분석하고 있습니다...</Title>
          <Paragraph type="secondary">
            {GRADES.find(g => g.value === selectedGrade)?.label}의 전체 과목과 단원을 생성 중입니다.
            <br />
            약 30초~1분 정도 소요됩니다.
          </Paragraph>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <Alert
            message={`${counts.subjects}개 과목, ${counts.units}개 단원, ${counts.topics}개 토픽이 생성되었습니다`}
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

          {creating && (
            <Progress
              percent={createProgress}
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
              loading={creating}
              onClick={createAllCards}
            >
              {counts.topics}개 카드 생성하기
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GradeSetup;
