import React, { useState } from 'react';
import { Checkbox, Input, Button, Space, List, Progress } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ChecklistItem } from '../../types';

interface ChecklistProps {
  topicId: string;
  items: ChecklistItem[];
  onUpdate: () => void;
}

const Checklist: React.FC<ChecklistProps> = ({ topicId, items, onUpdate }) => {
  const [newItemText, setNewItemText] = useState('');

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const handleAddItem = async () => {
    if (!newItemText.trim() || !window.electronAPI) return;
    await window.electronAPI.upsertChecklistItem({
      topicId,
      text: newItemText.trim(),
      checked: false,
      sortOrder: items.length,
    });
    setNewItemText('');
    onUpdate();
  };

  const handleToggle = async (item: ChecklistItem) => {
    if (!window.electronAPI) return;
    await window.electronAPI.upsertChecklistItem({
      id: item.id,
      topicId,
      text: item.text,
      checked: !item.checked,
      sortOrder: item.sortOrder,
    });
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.deleteChecklistItem(id);
    onUpdate();
  };

  return (
    <div style={{ marginTop: 8 }} role="group" aria-label="체크리스트">
      {totalCount > 0 && (
        <Progress
          percent={progressPercent}
          size="small"
          style={{ marginBottom: 8 }}
          format={() => `${checkedCount}/${totalCount}`}
          aria-label={`체크리스트 진행률: ${checkedCount}/${totalCount} 완료`}
        />
      )}

      <List
        size="small"
        dataSource={items}
        locale={{ emptyText: '체크리스트 항목이 없습니다' }}
        renderItem={(item) => (
          <List.Item
            style={{ padding: '4px 0' }}
            actions={[
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(item.id)}
                aria-label={`"${item.text}" 삭제`}
              />,
            ]}
          >
            <Checkbox
              checked={item.checked}
              onChange={() => handleToggle(item)}
              style={{
                textDecoration: item.checked ? 'line-through' : 'none',
                color: item.checked ? '#999' : undefined,
              }}
              aria-label={`${item.text} ${item.checked ? '완료됨' : '미완료'}`}
            >
              {item.text}
            </Checkbox>
          </List.Item>
        )}
      />

      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
        <Input
          size="small"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="새 항목 추가"
          onPressEnter={handleAddItem}
          aria-label="새 체크리스트 항목"
        />
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAddItem}
          aria-label="체크리스트 항목 추가"
        />
      </Space.Compact>
    </div>
  );
};

export default Checklist;
