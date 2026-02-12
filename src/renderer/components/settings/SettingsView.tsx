import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, InputNumber, Switch, Button, Space, Divider, message, Typography } from 'antd';
import {
  SaveOutlined,
  SunOutlined,
  MoonOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  BookOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { apiService } from '../../api/apiService';

const { Text } = Typography;

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

const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const loadSubjects = useAppStore((s) => s.loadSubjects);
  const [saving, setSaving] = useState(false);

  const [currGrade, setCurrGrade] = useState<string>('');
  const [gradeStatus, setGradeStatus] = useState<string>('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        pomodoroFocus: (settings.pomodoroFocus ?? 1500) / 60,
        pomodoroShortBreak: (settings.pomodoroShortBreak ?? 300) / 60,
        pomodoroLongBreak: (settings.pomodoroLongBreak ?? 900) / 60,
        pomodoroCycles: settings.pomodoroCycles ?? 4,
        dailyGoal: settings.dailyGoal ?? 5,
      });
    }
  }, [settings, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await updateSettings({
        pomodoroFocus: values.pomodoroFocus * 60,
        pomodoroShortBreak: values.pomodoroShortBreak * 60,
        pomodoroLongBreak: values.pomodoroLongBreak * 60,
        pomodoroCycles: values.pomodoroCycles,
        dailyGoal: values.dailyGoal,
      });
      message.success('설정이 저장되었습니다');
    } catch {
      // validation failed
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await apiService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studylog-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('데이터가 내보내기되었습니다');
    } catch {
      message.error('내보내기 실패');
    }
  };

  const handleCheckGradeStatus = async (grade: string) => {
    setCurrGrade(grade);
    try {
      const status = await apiService.getGradeStatus(grade);
      setGradeStatus(status.status);
    } catch {
      setGradeStatus('');
    }
  };

  const handleApplyGrade = async () => {
    if (!currGrade) return;
    setApplying(true);
    try {
      await apiService.applyGrade(currGrade);
      message.success('커리큘럼이 백로그에 추가되었습니다');
      loadSubjects();
      navigate('/curriculum');
    } catch {
      message.error('적용 실패');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ marginBottom: 16 }}>설정</h2>

      <Form form={form} layout="vertical" size="middle">
        <Card
          title={
            <Space>
              {theme === 'dark' ? <MoonOutlined /> : <SunOutlined />}
              <span>테마</span>
            </Space>
          }
          style={{ marginBottom: 16, borderRadius: 16 }}
        >
          <Form.Item label="테마 모드">
            <Switch
              checked={theme === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {theme === 'dark' ? '다크 모드' : '라이트 모드'}
            </Text>
          </Form.Item>
        </Card>

        <Card
          title={
            <Space>
              <ClockCircleOutlined />
              <span>타이머 설정</span>
            </Space>
          }
          style={{ marginBottom: 16, borderRadius: 16 }}
        >
          <Space size="large" wrap>
            <Form.Item name="pomodoroFocus" label="집중 시간 (분)">
              <InputNumber min={1} max={120} />
            </Form.Item>
            <Form.Item name="pomodoroShortBreak" label="짧은 휴식 (분)">
              <InputNumber min={1} max={30} />
            </Form.Item>
            <Form.Item name="pomodoroLongBreak" label="긴 휴식 (분)">
              <InputNumber min={1} max={60} />
            </Form.Item>
            <Form.Item name="pomodoroCycles" label="사이클 수">
              <InputNumber min={1} max={10} />
            </Form.Item>
          </Space>

          <Divider style={{ margin: '8px 0 16px' }} />

          <Form.Item name="dailyGoal" label="일일 학습 목표 (카드 수)">
            <InputNumber min={1} max={50} style={{ width: 120 }} />
          </Form.Item>
        </Card>

        <Card
          title={<Space><BookOutlined /><span>커리큘럼 관리</span></Space>}
          style={{ marginBottom: 16, borderRadius: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              placeholder="학년 선택"
              style={{ width: '100%' }}
              value={currGrade || undefined}
              onChange={handleCheckGradeStatus}
              options={GRADES}
            />
            {gradeStatus === 'generating' && (
              <Text type="secondary">해당 학년의 커리큘럼이 준비 중입니다. 잠시 후 다시 시도해주세요.</Text>
            )}
            {gradeStatus === 'archived' && (
              <Text type="warning">커리큘럼 생성에 실패했습니다. 관리자에게 문의하세요.</Text>
            )}
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={applying}
              disabled={!currGrade || gradeStatus !== 'active'}
              onClick={handleApplyGrade}
              block
            >
              칸반 보드에 적용
            </Button>
          </Space>
        </Card>

        <Card
          title={
            <Space>
              <DatabaseOutlined />
              <span>데이터 관리</span>
            </Space>
          }
          style={{ marginBottom: 16, borderRadius: 16 }}
        >
          <Space>
            <Button onClick={handleExport}>JSON 내보내기</Button>
          </Space>
        </Card>

        <div style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            size="large"
          >
            저장
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SettingsView;
