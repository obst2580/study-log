import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card, Input, Button, List, Typography, Avatar, Space, Alert,
  Drawer, Tag, Checkbox, Spin, Divider, Select, message,
} from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined,
  PlusOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';
import { useKanbanStore } from '../../stores/kanbanStore';
import type { Difficulty, Importance, AppSettings } from '../../types';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// ── Types ──

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  generatedCards?: GeneratedCard[];
}

interface GeneratedCard {
  title: string;
  notes: string;
  difficulty: Difficulty;
  importance: Importance;
  checklist: string[];
  tags: string[];
  subjectName?: string;
  unitName?: string;
}

// ── LLM API Integration ──

const SYSTEM_PROMPT = `You are a study assistant for Korean middle and high school students.
When the user asks you to create study cards, respond ONLY with valid JSON (no markdown code blocks, no extra text).
The JSON must be an array of card objects with this structure:
[
  {
    "title": "토픽 제목",
    "notes": "마크다운 형식의 학습 노트",
    "difficulty": "high" | "medium" | "low",
    "importance": "high" | "medium" | "low",
    "checklist": ["학습 항목 1", "학습 항목 2"],
    "tags": ["태그1", "태그2"],
    "subjectName": "과목명",
    "unitName": "단원명"
  }
]

For general questions (not card creation), respond normally in Korean.
Always respond in Korean.`;

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: { message?: string } }).error?.message
      ?? `OpenAI API error: ${response.status}`
    );
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? '';
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: { message?: string } }).error?.message
      ?? `Anthropic API error: ${response.status}`
    );
  }

  const data = await response.json() as {
    content: { type: string; text: string }[];
  };
  const textBlock = data.content.find((c) => c.type === 'text');
  return textBlock?.text ?? '';
}

function tryParseCards(text: string): GeneratedCard[] | null {
  try {
    // Try to extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonStr = text;

    // Strip markdown code blocks if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    jsonStr = jsonStr.trim();

    // Must start with [ for an array
    if (!jsonStr.startsWith('[')) return null;

    const parsed = JSON.parse(jsonStr) as unknown[];

    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Validate and normalize each card
    return parsed.map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        title: String(raw.title ?? ''),
        notes: String(raw.notes ?? ''),
        difficulty: (['high', 'medium', 'low'].includes(raw.difficulty as string)
          ? raw.difficulty as Difficulty : 'medium'),
        importance: (['high', 'medium', 'low'].includes(raw.importance as string)
          ? raw.importance as Importance : 'medium'),
        checklist: Array.isArray(raw.checklist)
          ? (raw.checklist as unknown[]).map(String)
          : [],
        tags: Array.isArray(raw.tags)
          ? (raw.tags as unknown[]).map(String)
          : [],
        subjectName: raw.subjectName ? String(raw.subjectName) : undefined,
        unitName: raw.unitName ? String(raw.unitName) : undefined,
      };
    }).filter((card) => card.title.length > 0);
  } catch {
    return null;
  }
}

// ── Difficulty and Importance Labels ──

const DIFFICULTY_LABELS: Record<string, string> = {
  high: '상', medium: '중', low: '하',
};
const DIFFICULTY_COLORS: Record<string, string> = {
  high: '#f5222d', medium: '#faad14', low: '#52c41a',
};

// ── Card Preview Component ──

interface CardPreviewProps {
  cards: GeneratedCard[];
  onAddCards: (cards: GeneratedCard[], subjectId: string, unitId: string) => Promise<void>;
  adding: boolean;
}

const CardPreview: React.FC<CardPreviewProps> = ({ cards, onAddCards, adding }) => {
  const subjects = useAppStore((s) => s.subjects);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedCardIndices, setSelectedCardIndices] = useState<Set<number>>(
    new Set(cards.map((_, i) => i))
  );

  // Load units when subject changes
  useEffect(() => {
    if (!selectedSubjectId || !window.electronAPI) {
      setUnits([]);
      setSelectedUnitId('');
      return;
    }

    window.electronAPI.getUnits(selectedSubjectId).then((result) => {
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
                <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>
                  {card.checklist.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: '#ccc' }}>&#9744;</span>
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

// ── Main AiChat Component ──

const AiChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [apiKey, setApiKeyState] = useState('');
  const [apiConfigured, setApiConfigured] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const settings = useAppStore((s) => s.settings);
  const createTopic = useKanbanStore((s) => s.createTopic);

  useEffect(() => {
    checkApiConfig();
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkApiConfig = async () => {
    const provider = settings.llmProvider;
    setApiConfigured(!!provider);
  };

  const getApiKey = (): string => {
    // API key stored locally in component state (entered by user in chat)
    // In production, this would use electron-safeStorage via IPC
    return apiKey;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!apiConfigured) {
      message.warning('설정에서 LLM 제공자를 먼저 선택해주세요.');
      return;
    }

    if (!apiKey) {
      setShowApiKeyInput(true);
      message.info('API 키를 입력해주세요.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for context (last 10 messages)
      const conversationHistory = [...messages.slice(-10), userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const provider = settings.llmProvider;
      const model = settings.llmModel ?? '';
      let responseText: string;

      if (provider === 'openai') {
        responseText = await callOpenAI(apiKey, model, conversationHistory);
      } else if (provider === 'anthropic') {
        responseText = await callAnthropic(apiKey, model, conversationHistory);
      } else {
        throw new Error('지원되지 않는 LLM 제공자입니다.');
      }

      // Try to parse cards from the response
      const parsedCards = tryParseCards(responseText);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsedCards
          ? `${parsedCards.length}개의 학습 카드를 생성했습니다. 아래에서 확인하고 보드에 추가할 수 있습니다.`
          : responseText,
        timestamp: new Date().toISOString(),
        generatedCards: parsedCards ?? undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI 요청 중 오류가 발생했습니다.';

      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `오류: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCards = useCallback(async (
    cards: GeneratedCard[],
    subjectId: string,
    unitId: string,
  ) => {
    setAdding(true);
    let addedCount = 0;

    try {
      for (const card of cards) {
        const topic = await createTopic({
          subjectId,
          unitId,
          title: card.title,
          notes: card.notes,
          difficulty: card.difficulty,
          importance: card.importance,
          tags: card.tags,
          column: 'today',
        });

        if (topic && window.electronAPI) {
          // Add checklist items
          for (let i = 0; i < card.checklist.length; i++) {
            try {
              await window.electronAPI.upsertChecklistItem({
                topicId: topic.id,
                text: card.checklist[i],
                checked: false,
                sortOrder: i,
              });
            } catch (err) {
              console.error('Failed to add checklist item:', err);
            }
          }
          addedCount++;
        }
      }

      if (addedCount > 0) {
        message.success(`${addedCount}개의 카드가 보드에 추가되었습니다.`);
      }
    } catch (err) {
      console.error('Failed to add cards:', err);
      message.error('카드 추가 중 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  }, [createTopic]);

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      setShowApiKeyInput(false);
      message.success('API 키가 설정되었습니다. 이제 메시지를 입력해주세요.');
    }
  };

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          <span>AI 학습 도우미</span>
        </Space>
      }
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px' } }}
      extra={
        <Button
          type="text"
          size="small"
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          style={{ fontSize: 11 }}
        >
          API 키
        </Button>
      }
    >
      {!apiConfigured && (
        <Alert
          message="LLM 제공자를 설정해주세요"
          description="설정 > AI 설정에서 OpenAI 또는 Anthropic을 선택하세요."
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {showApiKeyInput && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
            {settings.llmProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API 키
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password
              placeholder="API 키 입력..."
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              onPressEnter={handleApiKeySubmit}
              size="small"
              aria-label="API 키 입력"
            />
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleApiKeySubmit}
              disabled={!apiKey.trim()}
            />
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setShowApiKeyInput(false)}
            />
          </Space.Compact>
          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
            키는 이 세션에서만 사용되며 저장되지 않습니다.
          </Text>
        </div>
      )}

      <div
        style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}
        role="log"
        aria-label="채팅 메시지"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#999' }}>
            <RobotOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              AI 학습 도우미에게 질문하세요
            </Text>
            <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.8 }}>
              <div>예: &quot;수학 이차방정식 단원 카드 만들어줘&quot;</div>
              <div>예: &quot;영어 현재완료 문법 체크리스트 만들어줘&quot;</div>
              <div>예: &quot;과학 광합성 핵심 개념 정리해줘&quot;</div>
            </div>
          </div>
        )}

        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item
              style={{ padding: '6px 0', border: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  width: '100%',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
                <Avatar
                  size="small"
                  icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{
                    backgroundColor: msg.role === 'user' ? '#1890ff' : '#52c41a',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <div style={{ maxWidth: '85%', minWidth: 0 }}>
                  <div
                    style={{
                      background: msg.role === 'user' ? '#e6f4ff' : '#f6ffed',
                      padding: '8px 12px',
                      borderRadius: 8,
                      whiteSpace: 'pre-wrap',
                      fontSize: 13,
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </div>

                  {msg.generatedCards && msg.generatedCards.length > 0 && (
                    <CardPreview
                      cards={msg.generatedCards}
                      onAddCards={handleAddCards}
                      adding={adding}
                    />
                  )}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: ' ' }}
        />

        {loading && (
          <div style={{ padding: '12px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Avatar
              size="small"
              icon={<RobotOutlined />}
              style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
              aria-hidden="true"
            />
            <div
              style={{
                background: '#f6ffed',
                padding: '8px 12px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                생각 중...
              </Text>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <Space.Compact style={{ width: '100%' }}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={apiKey ? '메시지를 입력하세요...' : 'API 키를 먼저 설정해주세요'}
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
          aria-label="메시지 입력"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim() || loading}
          aria-label="메시지 보내기"
        />
      </Space.Compact>

      <Text type="secondary" style={{ fontSize: 10, marginTop: 4, display: 'block' }}>
        Shift+Enter로 줄바꿈 | Enter로 전송
      </Text>
    </Card>
  );
};

export default AiChat;
