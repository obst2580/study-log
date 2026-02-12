import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Badge, Card, List, Tag, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useExams } from '../../hooks/useDatabase';
import { COLUMN_LABELS, COLUMN_COLORS } from '../../utils/constants';
import type { Topic, Exam } from '../../types';

const { Text } = Typography;

const CalendarView: React.FC = () => {
  const topics = useKanbanStore((s) => s.topics);
  const { exams } = useExams();
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  // Map review dates to topics
  const reviewDateMap = useMemo(() => {
    const map = new Map<string, Topic[]>();
    for (const topic of topics) {
      if (topic.nextReviewAt) {
        const date = dayjs(topic.nextReviewAt).format('YYYY-MM-DD');
        const existing = map.get(date) ?? [];
        existing.push(topic);
        map.set(date, existing);
      }
    }
    return map;
  }, [topics]);

  // Map exam dates
  const examDateMap = useMemo(() => {
    const map = new Map<string, Exam[]>();
    for (const exam of exams) {
      const date = dayjs(exam.date).format('YYYY-MM-DD');
      const existing = map.get(date) ?? [];
      existing.push(exam);
      map.set(date, existing);
    }
    return map;
  }, [exams]);

  const dateCellRender = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const dayTopics = reviewDateMap.get(dateStr) ?? [];
    const dayExams = examDateMap.get(dateStr) ?? [];

    return (
      <div>
        {dayExams.map((exam) => (
          <Badge
            key={exam.id}
            status="error"
            text={<span style={{ fontSize: 11 }}>{exam.name}</span>}
          />
        ))}
        {dayTopics.length > 0 && (
          <Badge
            status="processing"
            text={<span style={{ fontSize: 11 }}>복습 {dayTopics.length}개</span>}
          />
        )}
      </div>
    );
  };

  const selectedTopics = reviewDateMap.get(selectedDate) ?? [];
  const selectedExams = examDateMap.get(selectedDate) ?? [];

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={{ flex: 1 }}>
        <Calendar
          cellRender={(date, info) => {
            if (info.type === 'date') return dateCellRender(date);
            return info.originNode;
          }}
          onSelect={(date) => setSelectedDate(date.format('YYYY-MM-DD'))}
        />
      </div>

      <Card
        title={`${selectedDate} 일정`}
        style={{ width: 300, flexShrink: 0, overflow: 'auto', borderRadius: 16 }}
      >
        {selectedExams.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>시험</Text>
            {selectedExams.map((exam) => (
              <div key={exam.id} style={{ padding: '4px 0' }}>
                <Badge status="error" text={exam.name} />
              </div>
            ))}
          </div>
        )}

        {selectedTopics.length > 0 ? (
          <List
            size="small"
            dataSource={selectedTopics}
            renderItem={(topic) => (
              <List.Item>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{topic.title}</div>
                  <Tag
                    color={COLUMN_COLORS[topic.column]}
                    style={{ fontSize: 10, marginTop: 2 }}
                  >
                    {COLUMN_LABELS[topic.column]}
                  </Tag>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">복습 예정 카드 없음</Text>
        )}
      </Card>
    </div>
  );
};

export default CalendarView;
