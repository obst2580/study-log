import React from 'react';
import { Card, Segmented, Select, Button, Space, Typography, Tooltip } from 'antd';
import {
  ShrinkOutlined,
  ArrowsAltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useTimerStore } from '../../stores/timerStore';
import { useKanbanStore } from '../../stores/kanbanStore';
import { formatTime } from '../../hooks/useTimer';
import Pomodoro from './Pomodoro';
import Stopwatch from './Stopwatch';
import type { TimerType } from '../../types';

const { Text } = Typography;

/**
 * StudyTimer is the main timer container.
 * When used as a full page, it renders at normal size.
 * The FloatingTimer component renders a minimized widget overlay.
 */
const StudyTimer: React.FC = () => {
  const timerType = useTimerStore((s) => s.timerType);
  const setTimerType = useTimerStore((s) => s.setTimerType);
  const activeTopicId = useTimerStore((s) => s.activeTopicId);
  const setActiveTopic = useTimerStore((s) => s.setActiveTopic);
  const isRunning = useTimerStore((s) => s.isRunning);
  const minimized = useTimerStore((s) => s.minimized);
  const toggleMinimized = useTimerStore((s) => s.toggleMinimized);

  const topics = useKanbanStore((s) => s.topics);
  const todayTopics = topics.filter((t) => t.column === 'today');

  const activeTopic = activeTopicId
    ? topics.find((t) => t.id === activeTopicId)
    : null;

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span>스터디 타이머</span>
          {activeTopic && (
            <Text
              type="secondary"
              style={{ fontSize: 12, fontWeight: 400 }}
              ellipsis
            >
              - {activeTopic.title}
            </Text>
          )}
        </Space>
      }
      size="small"
      extra={
        <Space>
          <Segmented
            size="small"
            value={timerType}
            onChange={(val) => setTimerType(val as TimerType)}
            options={[
              { label: '뽀모도로', value: 'pomodoro' },
              { label: '스톱워치', value: 'stopwatch' },
            ]}
            disabled={isRunning}
          />
          <Tooltip title={minimized ? '확장' : '최소화'}>
            <Button
              type="text"
              size="small"
              icon={minimized ? <ArrowsAltOutlined /> : <ShrinkOutlined />}
              onClick={toggleMinimized}
              aria-label={minimized ? '타이머 확장' : '타이머 최소화'}
            />
          </Tooltip>
        </Space>
      }
      style={{ maxWidth: 480, margin: '0 auto' }}
      role="region"
      aria-label="스터디 타이머"
    >
      <div style={{ marginBottom: 12 }}>
        <label
          htmlFor="timer-topic-select"
          style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}
        >
          학습할 카드
        </label>
        <Select
          id="timer-topic-select"
          placeholder="학습할 카드 선택 (오늘할것)"
          style={{ width: '100%' }}
          value={activeTopicId}
          onChange={setActiveTopic}
          disabled={isRunning}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={todayTopics.map((t) => ({ label: t.title, value: t.id }))}
          aria-label="학습할 카드 선택"
        />
      </div>

      {timerType === 'pomodoro' ? <Pomodoro /> : <Stopwatch />}
    </Card>
  );
};

export default StudyTimer;

/**
 * FloatingTimer renders a small floating widget in the corner of the app
 * when the timer is running and minimized. It shows the current time
 * and allows expanding back to the full timer view.
 */
export const FloatingTimer: React.FC = () => {
  const isRunning = useTimerStore((s) => s.isRunning);
  const minimized = useTimerStore((s) => s.minimized);
  const timerType = useTimerStore((s) => s.timerType);
  const elapsedSeconds = useTimerStore((s) => s.elapsedSeconds);
  const pomodoroRemainingSeconds = useTimerStore((s) => s.pomodoroRemainingSeconds);
  const pomodoroPhase = useTimerStore((s) => s.pomodoroPhase);
  const toggleMinimized = useTimerStore((s) => s.toggleMinimized);
  const pause = useTimerStore((s) => s.pause);
  const start = useTimerStore((s) => s.start);
  const activeTopicId = useTimerStore((s) => s.activeTopicId);
  const topics = useKanbanStore((s) => s.topics);

  // Only show floating widget when running or paused with time accumulated, and minimized
  const hasActiveSession = isRunning || elapsedSeconds > 0 || pomodoroRemainingSeconds !== useTimerStore.getState().pomodoroSettings.focusDuration;
  if (!minimized || !hasActiveSession) return null;

  const timeDisplay = timerType === 'stopwatch'
    ? formatTime(elapsedSeconds)
    : formatTime(pomodoroRemainingSeconds);

  const phaseColors: Record<string, string> = {
    focus: '#7C3AED',
    shortBreak: '#10B981',
    longBreak: '#D97706',
  };

  const activeTopic = activeTopicId
    ? topics.find((t) => t.id === activeTopicId)
    : null;

  const accentColor = timerType === 'pomodoro'
    ? phaseColors[pomodoroPhase] ?? '#7C3AED'
    : '#7C3AED';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        background: 'var(--component-background, #fff)',
        border: `2px solid ${accentColor}`,
        borderRadius: 12,
        padding: '8px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        minWidth: 180,
        transition: 'border-color 0.3s ease',
      }}
      onClick={toggleMinimized}
      role="status"
      aria-label={`타이머: ${timeDisplay}`}
      title="클릭하여 타이머 확장"
    >
      <ClockCircleOutlined
        style={{
          fontSize: 18,
          color: accentColor,
          animation: isRunning ? 'pulse 1.5s infinite' : 'none',
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
            color: accentColor,
          }}
        >
          {timeDisplay}
        </div>
        {activeTopic && (
          <Text
            type="secondary"
            ellipsis
            style={{ fontSize: 11, display: 'block', maxWidth: 140 }}
          >
            {activeTopic.title}
          </Text>
        )}
      </div>

      <Button
        type="text"
        size="small"
        icon={isRunning
          ? <span style={{ fontSize: 10, color: '#10B981' }}>||</span>
          : <span style={{ fontSize: 10, color: '#D97706' }}>&#9654;</span>
        }
        onClick={(e) => {
          e.stopPropagation();
          if (isRunning) pause();
          else start();
        }}
        aria-label={isRunning ? '일시정지' : '재개'}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
