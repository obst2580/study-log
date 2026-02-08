import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Modal, Input, List, Tag, Empty, Typography, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { COLUMN_LABELS, COLUMN_COLORS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../utils/constants';
import { useAppStore } from '../../stores/appStore';
import { apiService } from '../../api/apiService';
import type { Topic } from '../../types';

const { Text } = Typography;

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  onSelectTopic?: (topicId: string) => void;
}

interface GroupedResults {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  topics: Topic[];
}

const SEARCH_DEBOUNCE_MS = 300;

const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose, onSelectTopic }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const subjects = useAppStore((s) => s.subjects);

  // Build a subject lookup map for grouping results by subject
  const subjectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const s of subjects) {
      map.set(s.id, { name: s.name, color: s.color });
    }
    return map;
  }, [subjects]);

  // Group results by subject
  const groupedResults = useMemo((): GroupedResults[] => {
    const groups = new Map<string, GroupedResults>();

    for (const topic of results) {
      const subjectInfo = subjectMap.get(topic.subjectId);
      const key = topic.subjectId;

      if (!groups.has(key)) {
        groups.set(key, {
          subjectId: key,
          subjectName: subjectInfo?.name ?? '기타',
          subjectColor: subjectInfo?.color ?? '#999',
          topics: [],
        });
      }
      groups.get(key)!.topics.push(topic);
    }

    return Array.from(groups.values());
  }, [results, subjectMap]);

  // Flat list of all topics for keyboard navigation
  const flatResults = useMemo(() => {
    return groupedResults.flatMap((g) => g.topics);
  }, [groupedResults]);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || flatResults.length === 0) return;
    const selectedEl = listRef.current.querySelector('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatResults.length]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const searchResults = await apiService.search(searchQuery);
      setResults(searchResults as Topic[]);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSelect = (topicId: string) => {
    onClose();
    setQuery('');
    setResults([]);
    onSelectTopic?.(topicId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults.length > 0) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex].id);
    }
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setResults([]);
  };

  // Track the running index across groups for keyboard navigation
  let runningIndex = 0;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      closable={false}
      width={600}
      style={{ top: 100 }}
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div
        style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color, #f0f0f0)' }}
        role="search"
        aria-label="전체 카드 검색"
      >
        <Input
          ref={inputRef as React.Ref<any>}
          prefix={<SearchOutlined />}
          suffix={
            <Text type="secondary" style={{ fontSize: 11 }}>
              Ctrl+K
            </Text>
          }
          placeholder="카드 검색... (제목, 노트, 태그)"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="borderless"
          size="large"
          autoFocus
          aria-label="카드 검색 입력"
          aria-expanded={results.length > 0}
          aria-controls="search-results-list"
          role="combobox"
          aria-activedescendant={
            flatResults.length > 0 ? `search-result-${flatResults[selectedIndex]?.id}` : undefined
          }
        />
      </div>

      <div
        ref={listRef}
        id="search-results-list"
        style={{ maxHeight: 440, overflow: 'auto' }}
        role="listbox"
        aria-label="검색 결과"
      >
        {query.trim() === '' ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>
            <SearchOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block', opacity: 0.3 }} />
            검색어를 입력하세요
          </div>
        ) : loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : results.length === 0 ? (
          <Empty
            description="검색 결과 없음"
            style={{ padding: 32 }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          groupedResults.map((group) => {
            const groupItems = group.topics.map((topic) => {
              const currentIndex = runningIndex;
              runningIndex++;
              const isSelected = currentIndex === selectedIndex;

              return (
                <div
                  key={topic.id}
                  id={`search-result-${topic.id}`}
                  style={{
                    padding: '8px 16px 8px 28px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(24, 144, 255, 0.06)' : undefined,
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={() => handleSelect(topic.id)}
                  onMouseEnter={() => setSelectedIndex(currentIndex)}
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? 'true' : 'false'}
                  tabIndex={-1}
                >
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{topic.title}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <Tag
                      color={COLUMN_COLORS[topic.column]}
                      style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}
                    >
                      {COLUMN_LABELS[topic.column]}
                    </Tag>
                    <Tag
                      color={DIFFICULTY_COLORS[topic.difficulty]}
                      style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}
                    >
                      난이도 {DIFFICULTY_LABELS[topic.difficulty]}
                    </Tag>
                    {topic.tags?.slice(0, 3).map((tag) => (
                      <Tag key={tag} style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </div>
              );
            });

            return (
              <div key={group.subjectId}>
                <div
                  style={{
                    padding: '8px 16px 4px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: group.subjectColor,
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-color, #f5f5f5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: group.subjectColor,
                    }}
                  />
                  {group.subjectName}
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 400 }}>
                    ({group.topics.length})
                  </Text>
                </div>
                {groupItems}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border-color, #f0f0f0)',
          fontSize: 11,
          color: '#999',
          display: 'flex',
          gap: 16,
        }}
        aria-hidden="true"
      >
        <span><kbd style={{ padding: '1px 4px', border: '1px solid #d9d9d9', borderRadius: 3, fontSize: 10 }}>Enter</kbd> 선택</span>
        <span><kbd style={{ padding: '1px 4px', border: '1px solid #d9d9d9', borderRadius: 3, fontSize: 10 }}>&#8593;&#8595;</kbd> 이동</span>
        <span><kbd style={{ padding: '1px 4px', border: '1px solid #d9d9d9', borderRadius: 3, fontSize: 10 }}>Esc</kbd> 닫기</span>
        {results.length > 0 && (
          <span style={{ marginLeft: 'auto' }}>
            {results.length}개 결과
          </span>
        )}
      </div>
    </Modal>
  );
};

export default GlobalSearch;
