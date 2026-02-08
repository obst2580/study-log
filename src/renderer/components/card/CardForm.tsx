import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Space, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useUnits, useTopicDetail } from '../../hooks/useDatabase';
import { apiService } from '../../api/apiService';
import type { Difficulty, Importance } from '../../types';

interface CardFormProps {
  open: boolean;
  onClose: () => void;
  subjectId?: string | null;
  editTopicId?: string | null;
}

const CardForm: React.FC<CardFormProps> = ({ open, onClose, subjectId, editTopicId }) => {
  const [form] = Form.useForm();
  const subjects = useAppStore((s) => s.subjects);
  const createTopic = useKanbanStore((s) => s.createTopic);
  const updateTopic = useKanbanStore((s) => s.updateTopic);
  const loadTopics = useKanbanStore((s) => s.loadTopics);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjectId ?? null);
  const { units, refresh: refreshUnits } = useUnits(selectedSubjectId);
  const { topic: editTopic } = useTopicDetail(editTopicId ?? null);

  const [newUnitName, setNewUnitName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const isEditMode = !!editTopicId;

  // Pre-fill form when editing
  useEffect(() => {
    if (editTopic && open) {
      setSelectedSubjectId(editTopic.subjectId);
      setTags(editTopic.tags ?? []);
      form.setFieldsValue({
        subjectId: editTopic.subjectId,
        unitId: editTopic.unitId,
        title: editTopic.title,
        notes: editTopic.notes,
        difficulty: editTopic.difficulty,
        importance: editTopic.importance,
        links: editTopic.links?.join('\n') ?? '',
      });
    }
  }, [editTopic, open, form]);

  // Set default subject from prop
  useEffect(() => {
    if (subjectId && !editTopicId) {
      setSelectedSubjectId(subjectId);
      form.setFieldValue('subjectId', subjectId);
    }
  }, [subjectId, editTopicId, form]);

  const handleSubjectChange = (value: string) => {
    setSelectedSubjectId(value);
    form.setFieldValue('unitId', undefined);
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !selectedSubjectId) return;
    await apiService.createUnit({ subjectId: selectedSubjectId, name: newUnitName.trim() });
    setNewUnitName('');
    await refreshUnits();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const topicData = {
        subjectId: values.subjectId,
        unitId: values.unitId,
        title: values.title,
        notes: values.notes ?? '',
        difficulty: values.difficulty ?? 'medium',
        importance: values.importance ?? 'medium',
        tags,
        links: values.links ? values.links.split('\n').filter(Boolean) : [],
      };

      if (isEditMode && editTopicId) {
        await updateTopic(editTopicId, topicData);
      } else {
        await createTopic(topicData);
      }

      handleClose();
    } catch {
      // Validation failed
    }
  };

  const handleClose = () => {
    form.resetFields();
    setTags([]);
    setTagInput('');
    setNewUnitName('');
    onClose();
  };

  return (
    <Modal
      title={isEditMode ? '카드 수정' : '카드 추가'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleClose}
      okText={isEditMode ? '수정' : '추가'}
      cancelText="취소"
      width={540}
      destroyOnClose
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="subjectId" label="과목" rules={[{ required: true, message: '과목을 선택하세요' }]}>
          <Select
            placeholder="과목 선택"
            onChange={handleSubjectChange}
            options={subjects.map((s) => ({ label: s.name, value: s.id }))}
          />
        </Form.Item>

        <Form.Item name="unitId" label="단원" rules={[{ required: true, message: '단원을 선택하세요' }]}>
          <Select
            placeholder="단원 선택"
            options={units.map((u) => ({ label: u.name, value: u.id }))}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div style={{ padding: 8, display: 'flex', gap: 4 }}>
                  <Input
                    size="small"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="새 단원"
                    onPressEnter={handleAddUnit}
                    aria-label="새 단원 이름"
                  />
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddUnit}
                    aria-label="단원 추가"
                  />
                </div>
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="title" label="토픽명" rules={[{ required: true, message: '토픽명을 입력하세요' }]}>
          <Input placeholder="예: 이차방정식의 근의 공식" />
        </Form.Item>

        <Space style={{ width: '100%' }} size="middle">
          <Form.Item name="difficulty" label="난이도" initialValue="medium" style={{ flex: 1 }}>
            <Select
              options={[
                { label: '상', value: 'high' },
                { label: '중', value: 'medium' },
                { label: '하', value: 'low' },
              ]}
            />
          </Form.Item>

          <Form.Item name="importance" label="중요도" initialValue="medium" style={{ flex: 1 }}>
            <Select
              options={[
                { label: '상', value: 'high' },
                { label: '중', value: 'medium' },
                { label: '하', value: 'low' },
              ]}
            />
          </Form.Item>
        </Space>

        <Form.Item name="notes" label="노트 (마크다운)">
          <Input.TextArea rows={4} placeholder="학습 메모를 입력하세요..." />
        </Form.Item>

        <Form.Item label="태그">
          <div>
            <Space size={4} wrap style={{ marginBottom: tags.length > 0 ? 8 : 0 }}>
              {tags.map((tag) => (
                <Tag key={tag} closable onClose={() => handleRemoveTag(tag)}>
                  {tag}
                </Tag>
              ))}
            </Space>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="태그 입력"
                onPressEnter={(e) => {
                  e.preventDefault();
                  handleAddTag();
                }}
                aria-label="태그 입력"
              />
              <Button onClick={handleAddTag} aria-label="태그 추가">추가</Button>
            </Space.Compact>
          </div>
        </Form.Item>

        <Form.Item name="links" label="참고 링크 (줄바꿈으로 구분)">
          <Input.TextArea rows={2} placeholder="https://..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CardForm;
