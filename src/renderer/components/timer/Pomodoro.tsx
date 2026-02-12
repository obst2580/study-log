import React from 'react';
import { Button, Space, Tag, Progress, Typography } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ForwardOutlined,
} from '@ant-design/icons';
import { useTimerStore } from '../../stores/timerStore';
import { useTimerTick, formatTime } from '../../hooks/useTimer';

const { Text } = Typography;

const PHASE_LABELS: Record<string, string> = {
  focus: '집중',
  shortBreak: '짧은 휴식',
  longBreak: '긴 휴식',
};

const PHASE_COLORS: Record<string, string> = {
  focus: '#7C3AED',
  shortBreak: '#10B981',
  longBreak: '#D97706',
};

const PHASE_DESCRIPTIONS: Record<string, string> = {
  focus: '집중하세요!',
  shortBreak: '잠시 쉬세요',
  longBreak: '충분히 쉬세요',
};

const Pomodoro: React.FC = () => {
  useTimerTick();

  const isRunning = useTimerStore((s) => s.isRunning);
  const pomodoroPhase = useTimerStore((s) => s.pomodoroPhase);
  const remainingSeconds = useTimerStore((s) => s.pomodoroRemainingSeconds);
  const cycleCount = useTimerStore((s) => s.pomodoroCycleCount);
  const settings = useTimerStore((s) => s.pomodoroSettings);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const reset = useTimerStore((s) => s.reset);
  const saveSession = useTimerStore((s) => s.saveSession);
  const completePomodoro = useTimerStore((s) => s.completePomodoro);

  const totalSeconds = pomodoroPhase === 'focus'
    ? settings.focusDuration
    : pomodoroPhase === 'shortBreak'
      ? settings.shortBreakDuration
      : settings.longBreakDuration;

  const progressPercent = Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100);

  const handleStop = async () => {
    pause();
    await saveSession();
    reset();
  };

  const handleSkipPhase = () => {
    pause();
    if (pomodoroPhase === 'focus') {
      // Save session before skipping focus phase
      saveSession();
    }
    completePomodoro();
  };

  // Build cycle indicators (dots showing progress through cycles)
  const cycleIndicators: React.ReactNode[] = [];
  for (let i = 0; i < settings.totalCycles; i++) {
    const isCompleted = pomodoroPhase === 'focus'
      ? i < cycleCount
      : i <= cycleCount;
    const isCurrent = i === cycleCount;

    cycleIndicators.push(
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: isCurrent ? 10 : 8,
          height: isCurrent ? 10 : 8,
          borderRadius: '50%',
          backgroundColor: isCompleted
            ? PHASE_COLORS.focus
            : isCurrent
              ? PHASE_COLORS[pomodoroPhase]
              : 'var(--border-color)',
          margin: '0 3px',
          transition: 'all 0.3s ease',
          boxShadow: isCurrent ? `0 0 6px ${PHASE_COLORS[pomodoroPhase]}` : 'none',
        }}
        aria-label={`사이클 ${i + 1}: ${isCompleted ? '완료' : isCurrent ? '진행 중' : '대기'}`}
      />
    );
  }

  return (
    <div
      style={{ textAlign: 'center', padding: '8px 0' }}
      role="timer"
      aria-label={`뽀모도로 타이머: ${PHASE_LABELS[pomodoroPhase]} - ${formatTime(remainingSeconds)} 남음`}
    >
      <Tag
        color={PHASE_COLORS[pomodoroPhase]}
        style={{ marginBottom: 8, fontSize: 13, padding: '2px 12px' }}
      >
        {PHASE_LABELS[pomodoroPhase]}
      </Tag>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Progress
          type="circle"
          percent={progressPercent}
          format={() => formatTime(remainingSeconds)}
          strokeColor={{
            '0%': PHASE_COLORS[pomodoroPhase],
            '100%': pomodoroPhase === 'focus' ? '#5B21B6' : pomodoroPhase === 'shortBreak' ? '#065F46' : '#92400E',
          }}
          size={180}
          strokeWidth={6}
        />
      </div>

      <div style={{ margin: '8px 0' }}>
        {cycleIndicators}
      </div>

      <Text
        type="secondary"
        style={{ display: 'block', marginBottom: 12, fontSize: 12 }}
      >
        {PHASE_DESCRIPTIONS[pomodoroPhase]} (사이클 {cycleCount + 1}/{settings.totalCycles})
      </Text>

      <Space size="middle">
        {!isRunning ? (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={start}
            size="large"
            aria-label="타이머 시작"
          >
            시작
          </Button>
        ) : (
          <Button
            icon={<PauseCircleOutlined />}
            onClick={pause}
            size="large"
            aria-label="타이머 일시정지"
          >
            일시정지
          </Button>
        )}

        <Button
          icon={<ForwardOutlined />}
          onClick={handleSkipPhase}
          size="large"
          disabled={!isRunning && remainingSeconds === totalSeconds}
          aria-label="현재 단계 건너뛰기"
        >
          건너뛰기
        </Button>

        <Button
          icon={<StopOutlined />}
          onClick={handleStop}
          size="large"
          danger
          aria-label="타이머 정지 및 세션 저장"
        >
          정지
        </Button>
      </Space>
    </div>
  );
};

export default Pomodoro;
