import React, { useState, useEffect } from 'react';
import { Select, Checkbox, Button, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';
import { apiService } from '../../api/apiService';
import type { GeneratedCard } from './cardParser';

const { Text, Paragraph } = Typography;

const DIFFICULTY_LABELS: Record<string, string> = {
  high: '상', medium: '중', low: '하',
};
const DIFFICULTY_COLORS: Record<string, string> = {
  high: '#f5222d', medium: '#faad14', low: '#52c41a',
};

interface CardPreviewProps {
  cards: GeneratedCard[];
  onAddCards: (cards: GeneratedCard[], subjectId: string, unitId: string) => Promise<void>;
  adding: boolean;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ cards, onAddCards, adding }) => {
  const subjects = useAppStore((s) => s.subjects);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedCardIndices, setSelectedCardIndices] = useState<Set<number>>(
    new Set(cards.map((_, i) => i))
  );

  // Load units when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setUnits([]);
      setSelectedUnitId('');
      return;
    }

    apiService.getUnits(selectedSubjectId).then((result) => {
      const unitList = result as { id: string; name: string }[];
      setUnits(unitList);
      if (unitList.length > 0) {
        setSelectedUnitId(unitList[0].id);
      }
    }).catch(() => {
      setUnits([]);
    });
  }, [selectedSubjectId]);

  const toggleCard = (index: number) => {
    setSelectedCardIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (!selectedSubjectId || !selectedUnitId) {
      message.warning('과목과 단원을 선택해주세요');
      return;
    }
    const selectedCards = cards.filter((_, i) => selectedCardIndices.has(i));
    if (selectedCards.length === 0) {
      message.warning('추가할 카드를 선택해주세요');
      return;
    }
    onAddCards(selectedCards, selectedSubjectId, selectedUnitId);
  };

  return (
    <div
      style={{
        background: 'var(--component-background, #fafafa)',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
      }}
    >
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select
          placeholder="과목 선택"
          style={{ minWidth: 120, flex: 1 }}
          value={selectedSubjectId || undefined}
          onChange={setSelectedSubjectId}
          options={subjects.map((s) => ({ label: s.name, value: s.id }))}
          size="small"
          aria-label="과목 선택"
        />
        <Select
          placeholder="단원 선택"
          style={{ minWidth: 120, flex: 1 }}
          value={selectedUnitId || undefined}
          onChange={setSelectedUnitId}
          options={units.map((u) => ({ label: u.name, value: u.id }))}
          size="small"
          disabled={units.length === 0}
          aria-label="단원 선택"
        />
      </div>

      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-color, #e8e8e8)',
            marginBottom: 8,
            background: selectedCardIndices.has(index)
              ? 'var(--component-background, #fff)'
              : 'var(--component-background, #f5f5f5)',
            opacity: selectedCardIndices.has(index) ? 1 : 0.6,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Checkbox
              checked={selectedCardIndices.has(index)}
              onChange={() => toggleCard(index)}
              aria-label={`카드 선택: ${card.title}`}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 13 }}>{card.title}</Text>
              {card.notes && (
                <Paragraph
                  type="secondary"
                  style={{ fontSize: 11, margin: '4px 0', whiteSpace: 'pre-wrap' }}
                  ellipsis={{ rows: 2, expandable: true }}
                >
                  {card.notes}
                </Paragraph>
              )}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                <Tag
                  color={DIFFICULTY_COLORS[card.difficulty]}
                  style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}
                >
                  난이도 {DIFFICULTY_LABELS[card.difficulty]}
                </Tag>
                {card.tags.slice(0, 3).map((tag) => (
                  <Tag key={tag} style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                    {tag}
                  </Tag>
                ))}
              </div>
              {card.checklist.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                  {card.checklist.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>&#9744;</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 11, lineHeight: '32px' }}>
          {selectedCardIndices.size}/{cards.length}개 선택됨
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={handleAdd}
          loading={adding}
          disabled={selectedCardIndices.size === 0 || !selectedSubjectId || !selectedUnitId}
        >
          보드에 추가
        </Button>
      </div>
    </div>
  );
};
