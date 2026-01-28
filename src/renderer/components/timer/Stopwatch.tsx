import React from 'react';
import { Button, Space, Table, Typography } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { useTimerStore } from '../../stores/timerStore';
import { useTimerTick, formatTime } from '../../hooks/useTimer';
import type { LapEntry } from '../../stores/timerStore';

const { Text } = Typography;

const lapColumns = [
  {
    title: '#',
    dataIndex: 'index',
    key: 'index',
    width: 50,
    render: (val: number) => <Text type="secondary">{val}</Text>,
  },
  {
    title: '구간',
    dataIndex: 'split',
    key: 'split',
    render: (val: number) => formatTime(val),
  },
  {
    title: '누적',
    dataIndex: 'time',
    key: 'time',
    render: (val: number) => formatTime(val),
  },
];

const Stopwatch: React.FC = () => {
  useTimerTick();

  const isRunning = useTimerStore((s) => s.isRunning);
  const elapsedSeconds = useTimerStore((s) => s.elapsedSeconds);
  const laps = useTimerStore((s) => s.laps);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const reset = useTimerStore((s) => s.reset);
  const saveSession = useTimerStore((s) => s.saveSession);
  const addLap = useTimerStore((s) => s.addLap);

  const handleStop = async () => {
    pause();
    await saveSession();
    reset();
  };

  // Find fastest and slowest laps for highlighting
  let fastestIdx = -1;
  let slowestIdx = -1;
  if (laps.length > 1) {
    let minSplit = Infinity;
    let maxSplit = -Infinity;
    for (const lap of laps) {
      if (lap.split < minSplit) {
        minSplit = lap.split;
        fastestIdx = lap.index;
      }
      if (lap.split > maxSplit) {
        maxSplit = lap.split;
        slowestIdx = lap.index;
      }
    }
  }

  return (
    <div
      style={{ textAlign: 'center', padding: '8px 0' }}
      role="timer"
      aria-label={`스톱워치: ${formatTime(elapsedSeconds)}`}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 2,
          margin: '16px 0',
          color: isRunning ? '#1890ff' : undefined,
          transition: 'color 0.3s ease',
        }}
      >
        {formatTime(elapsedSeconds)}
      </div>

      <Space size="middle" style={{ marginBottom: 16 }}>
        {!isRunning ? (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={start}
            size="large"
            aria-label="스톱워치 시작"
          >
            {elapsedSeconds > 0 ? '재개' : '시작'}
          </Button>
        ) : (
          <Button
            icon={<PauseCircleOutlined />}
            onClick={pause}
            size="large"
            aria-label="스톱워치 일시정지"
          >
            일시정지
          </Button>
        )}

        <Button
          icon={<FlagOutlined />}
          onClick={addLap}
          size="large"
          disabled={!isRunning}
          aria-label="랩 기록"
        >
          랩
        </Button>

        <Button
          icon={<StopOutlined />}
          onClick={handleStop}
          size="large"
          danger
          disabled={elapsedSeconds === 0}
          aria-label="스톱워치 정지 및 세션 저장"
        >
          정지
        </Button>
      </Space>

      {laps.length > 0 && (
        <div style={{ maxHeight: 200, overflow: 'auto', textAlign: 'left' }}>
          <Table<LapEntry>
            dataSource={[...laps].reverse()}
            columns={lapColumns}
            size="small"
            pagination={false}
            rowKey="index"
            rowClassName={(record) => {
              if (laps.length <= 1) return '';
              if (record.index === fastestIdx) return 'lap-fastest';
              if (record.index === slowestIdx) return 'lap-slowest';
              return '';
            }}
          />
          <style>{`
            .lap-fastest td { color: #52c41a !important; }
            .lap-slowest td { color: #f5222d !important; }
          `}</style>
        </div>
      )}

      {elapsedSeconds > 0 && !isRunning && laps.length === 0 && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
          경과 시간: {formatTime(elapsedSeconds)}
        </Text>
      )}
    </div>
  );
};

export default Stopwatch;
