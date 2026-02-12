import React, { useEffect } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Space,
  Typography,
  Divider,
  Timeline as AntTimeline,
  Button,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import Checklist from './Checklist';
import { useTopicDetail } from '../../hooks/useDatabase';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useAppStore } from '../../stores/appStore';
import {
  DIFFICULTY_LABELS,
  IMPORTANCE_LABELS,
  COLUMN_LABELS,
  COLUMN_COLORS,
  DIFFICULTY_COLORS,
  IMPORTANCE_COLORS,
} from '../../utils/constants';
import { formatDuration } from '../../hooks/useTimer';
import dayjs from 'dayjs';

const { Text } = Typography;

interface CardDetailProps {
  topicId: string | null;
  onClose: () => void;
  onEdit?: (topicId: string) => void;
}

const CardDetail: React.FC<CardDetailProps> = ({ topicId, onClose, onEdit }) => {
  const { topic, loading, refresh } = useTopicDetail(topicId);
  const deleteTopic = useKanbanStore((s) => s.deleteTopic);
  const subjects = useAppStore((s) => s.subjects);

  useEffect(() => {
    if (topicId) refresh();
  }, [topicId, refresh]);

  const handleDelete = async () => {
    if (!topicId) return;
    await deleteTopic(topicId);
    onClose();
  };

  const subjectInfo = topic
    ? subjects.find((s) => s.id === topic.subjectId)
    : undefined;

  const unitInfo = topic?.unit;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{topic?.title ?? '카드 상세'}</span>
          {topic && (
            <Space size={4}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit?.(topic.id)}
                aria-label="카드 수정"
              />
              <Popconfirm
                title="카드를 삭제하시겠습니까?"
                description="이 작업은 되돌릴 수 없습니다."
                onConfirm={handleDelete}
                okText="삭제"
                cancelText="취소"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="카드 삭제"
                />
              </Popconfirm>
            </Space>
          )}
        </div>
      }
      open={topicId !== null}
      onClose={onClose}
      width={520}
      loading={loading}
    >
      {topic && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Subject and Unit info */}
          {subjectInfo && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag
                style={{
                  borderColor: subjectInfo.color,
                  color: subjectInfo.color,
                  background: `${subjectInfo.color}10`,
                }}
              >
                {subjectInfo.name}
              </Tag>
              {unitInfo && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {unitInfo.name}
                </Text>
              )}
            </div>
          )}

          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="상태">
              <Tag color={COLUMN_COLORS[topic.column]}>
                {COLUMN_LABELS[topic.column]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="난이도">
              <Tag color={DIFFICULTY_COLORS[topic.difficulty]} style={{ margin: 0 }}>
                {DIFFICULTY_LABELS[topic.difficulty]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="중요도">
              <Tag color={IMPORTANCE_COLORS[topic.importance]} style={{ margin: 0 }}>
                {IMPORTANCE_LABELS[topic.importance]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="학습 시간">
              {formatDuration(topic.studyTimeTotal)}
            </Descriptions.Item>
            {topic.nextReviewAt && (
              <Descriptions.Item label="다음 복습" span={2}>
                {dayjs(topic.nextReviewAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
          </Descriptions>

          {topic.tags && topic.tags.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>태그</Text>
              <div style={{ marginTop: 4 }}>
                <Space size={4} wrap>
                  {topic.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            </div>
          )}

          {topic.notes && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>노트</Text>
              <div
                className="markdown-content"
                style={{
                  marginTop: 4,
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 14,
                }}
              >
                <ReactMarkdown>{topic.notes}</ReactMarkdown>
              </div>
            </div>
          )}

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>체크리스트</Text>
            <Checklist
              topicId={topic.id}
              items={topic.checklist}
              onUpdate={refresh}
            />
          </div>

          {topic.links && topic.links.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>참고 링크</Text>
              <div style={{ marginTop: 4 }}>
                {topic.links.map((link, i) => (
                  <div key={i}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                      {link.label || link.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Divider style={{ margin: '8px 0' }} />

          {topic.reviewHistory && topic.reviewHistory.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                복습 이력 ({topic.reviewHistory.length}회)
              </Text>
              <AntTimeline
                style={{ marginTop: 8 }}
                items={topic.reviewHistory.slice(0, 10).map((r) => ({
                  color: COLUMN_COLORS[r.toColumn],
                  children: (
                    <span style={{ fontSize: 13 }}>
                      <Tag
                        color={COLUMN_COLORS[r.fromColumn]}
                        style={{ fontSize: 10, lineHeight: '16px', padding: '0 3px' }}
                      >
                        {COLUMN_LABELS[r.fromColumn]}
                      </Tag>
                      {' '}
                      <span style={{ color: 'var(--text-muted)' }}>&#8594;</span>
                      {' '}
                      <Tag
                        color={COLUMN_COLORS[r.toColumn]}
                        style={{ fontSize: 10, lineHeight: '16px', padding: '0 3px' }}
                      >
                        {COLUMN_LABELS[r.toColumn]}
                      </Tag>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
                        {dayjs(r.reviewedAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </span>
                  ),
                }))}
              />
            </div>
          )}

          {topic.studySessions && topic.studySessions.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                학습 세션 ({topic.studySessions.length}회)
              </Text>
              <div style={{ marginTop: 4 }}>
                {topic.studySessions.slice(0, 5).map((s) => (
                  <div key={s.id} style={{ fontSize: 13, padding: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      {formatDuration(s.duration)}
                      <Tag
                        style={{ marginLeft: 4, fontSize: 10, lineHeight: '16px', padding: '0 3px' }}
                      >
                        {s.timerType === 'pomodoro' ? '뽀모도로' : '스톱워치'}
                      </Tag>
                    </span>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(s.startedAt).format('MM-DD HH:mm')}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 8 }}>
            생성: {dayjs(topic.createdAt).format('YYYY-MM-DD')} | 수정: {dayjs(topic.updatedAt).format('YYYY-MM-DD')}
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default CardDetail;
