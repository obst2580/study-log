import React, { useState, useEffect } from 'react';
import { Timeline, Card, Tag, Select, Empty, Typography } from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppStore } from '../../stores/appStore';
import { useExams } from '../../hooks/useDatabase';
import { apiService } from '../../api/apiService';
import type { StudySession } from '../../types';

const { Text } = Typography;

interface TimelineEvent {
  id: string;
  type: 'review' | 'session' | 'exam';
  timestamp: string;
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

const TimelineView: React.FC = () => {
  const subjects = useAppStore((s) => s.subjects);
  const [filterSubjectId, setFilterSubjectId] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const { exams } = useExams();

  useEffect(() => {
    loadTimelineEvents();
  }, [filterSubjectId]);

  const loadTimelineEvents = async () => {
    const allEvents: TimelineEvent[] = [];

    // Get topic IDs for filtering if subject selected
    let allowedTopicIds: Set<string> | null = null;
    if (filterSubjectId) {
      try {
        const topics = await apiService.getTopicsBySubject(filterSubjectId) as { id: string }[];
        allowedTopicIds = new Set(topics.map((t) => t.id));
      } catch {
        // If topics fetch fails, don't filter
      }
    }

    // Fetch recent study sessions
    try {
      const sessions = await apiService.getStudySessions() as StudySession[];
      for (const s of sessions) {
        if (allowedTopicIds && !allowedTopicIds.has(s.topicId)) continue;
        allEvents.push({
          id: `session-${s.id}`,
          type: 'session',
          timestamp: s.startedAt,
          title: '학습 세션',
          description: `${Math.round(s.duration / 60)}분 학습 (${s.timerType === 'pomodoro' ? '뽀모도로' : '스톱워치'})`,
          color: '#7C3AED',
          icon: <ClockCircleOutlined />,
        });
      }
    } catch {
      // Sessions may not be loaded
    }

    // Add exam events (filter by subjectIds)
    for (const exam of exams) {
      if (filterSubjectId && !exam.subjectIds?.includes(filterSubjectId)) continue;
      const daysUntil = dayjs(exam.date).diff(dayjs(), 'day');
      allEvents.push({
        id: `exam-${exam.id}`,
        type: 'exam',
        timestamp: exam.date,
        title: exam.name,
        description: daysUntil >= 0 ? `D-${daysUntil}` : `${Math.abs(daysUntil)}일 전`,
        color: '#DC2626',
        icon: <CalendarOutlined />,
      });
    }

    // Sort by timestamp descending
    allEvents.sort((a, b) => dayjs(b.timestamp).unix() - dayjs(a.timestamp).unix());
    setEvents(allEvents.slice(0, 100));
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>타임라인</h2>
        <Select
          allowClear
          placeholder="과목 필터"
          style={{ width: 160 }}
          value={filterSubjectId}
          onChange={setFilterSubjectId}
          options={subjects.map((s) => ({ label: s.name, value: s.id }))}
        />
      </div>

      {events.length === 0 ? (
        <Empty description="타임라인 이벤트가 없습니다" />
      ) : (
        <Timeline
          items={events.map((event) => ({
            color: event.color,
            dot: event.icon,
            children: (
              <Card size="small" style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{event.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{event.description}</div>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                    {dayjs(event.timestamp).format('MM-DD HH:mm')}
                  </Text>
                </div>
              </Card>
            ),
          }))}
        />
      )}
    </div>
  );
};

export default TimelineView;
