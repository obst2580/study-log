import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card, Input, Button, List, Typography, Avatar, Space, Alert,
  Spin, message,
} from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';
import { useKanbanStore } from '../../stores/kanbanStore';
import { apiService } from '../../api/apiService';
import { callOpenAI, callAnthropic } from './llmClients';
import { tryParseCards } from './cardParser';
import { CardPreview } from './CardPreview';
import type { GeneratedCard } from './cardParser';

const { Text } = Typography;
const { TextArea } = Input;

// ── Types ──

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  generatedCards?: GeneratedCard[];
}

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

        if (topic) {
          // Add checklist items
          for (let i = 0; i < card.checklist.length; i++) {
            try {
              await apiService.upsertChecklistItem({
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
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <RobotOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              AI 학습 도우미에게 질문하세요
            </Text>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
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
                    backgroundColor: msg.role === 'user' ? '#7C3AED' : '#10B981',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <div style={{ maxWidth: '85%', minWidth: 0 }}>
                  <div
                    style={{
                      background: msg.role === 'user' ? '#E8D5F5' : '#C8F7DC',
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
              style={{ backgroundColor: '#10B981', flexShrink: 0 }}
              aria-hidden="true"
            />
            <div
              style={{
                background: '#C8F7DC',
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
