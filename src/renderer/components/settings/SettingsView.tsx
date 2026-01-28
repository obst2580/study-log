import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, InputNumber, Switch, Button, Space, Divider, message, Typography } from 'antd';
import {
  SaveOutlined,
  SunOutlined,
  MoonOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';

const { Text } = Typography;

const SettingsView: React.FC = () => {
  const [form] = Form.useForm();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        pomodoroFocus: (settings.pomodoroFocus ?? 1500) / 60,
        pomodoroShortBreak: (settings.pomodoroShortBreak ?? 300) / 60,
        pomodoroLongBreak: (settings.pomodoroLongBreak ?? 900) / 60,
        pomodoroCycles: settings.pomodoroCycles ?? 4,
        dailyGoal: settings.dailyGoal ?? 5,
        llmProvider: settings.llmProvider ?? null,
        llmModel: settings.llmModel ?? '',
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
        llmProvider: values.llmProvider,
        llmModel: values.llmModel,
      });
      message.success('설정이 저장되었습니다');
    } catch {
      // validation failed
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.exportData();
      message.success('데이터가 내보내기되었습니다');
    } catch {
      message.error('내보내기 실패');
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
          size="small"
          style={{ marginBottom: 16 }}
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
          size="small"
          style={{ marginBottom: 16 }}
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
          title={
            <Space>
              <RobotOutlined />
              <span>AI 설정</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="llmProvider" label="LLM 제공자">
            <Select
              allowClear
              placeholder="선택 안 함"
              options={[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Anthropic', value: 'anthropic' },
              ]}
            />
          </Form.Item>
          <Form.Item name="llmModel" label="모델명">
            <Input placeholder="예: gpt-4o-mini, claude-3.5-sonnet" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            API 키는 로컬에 안전하게 저장됩니다.
          </Text>
        </Card>

        <Card
          title={
            <Space>
              <DatabaseOutlined />
              <span>데이터 관리</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
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
