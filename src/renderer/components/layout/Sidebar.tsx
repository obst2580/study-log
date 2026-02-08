import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Button, Modal, Input, ColorPicker } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  PlusOutlined,
  RobotOutlined,
  SettingOutlined,
  BookOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  SwapOutlined,
  FormOutlined,
  StarOutlined,
  BarChartOutlined,
  FlagOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../api/apiService';
import { SUBJECT_PRESET_COLORS } from '../../utils/constants';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const subjects = useAppStore((s) => s.subjects);
  const selectedSubjectId = useAppStore((s) => s.selectedSubjectId);
  const setSelectedSubject = useAppStore((s) => s.setSelectedSubject);
  const loadSubjects = useAppStore((s) => s.loadSubjects);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const { user, logout } = useAuthStore();

  const isParent = user?.role === 'parent';

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_PRESET_COLORS[0]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    await apiService.createSubject({
      name: newSubjectName.trim(),
      color: newSubjectColor,
    });
    setNewSubjectName('');
    setNewSubjectColor(SUBJECT_PRESET_COLORS[0]);
    setAddModalOpen(false);
    await loadSubjects();
  };

  const handleSubjectClick = (subjectId: string | null) => {
    setSelectedSubject(subjectId);
    navigate('/kanban');
  };

  const viewItems = [
    { key: '/kanban', icon: <AppstoreOutlined />, label: '칸반 보드' },
    { key: '/curriculum', icon: <BookOutlined />, label: '커리큘럼 관리' },
    { key: '/dashboard', icon: <DashboardOutlined />, label: '대시보드' },
    { key: '/calendar', icon: <CalendarOutlined />, label: '달력' },
    { key: '/timeline', icon: <FieldTimeOutlined />, label: '타임라인' },
    { key: '/timer', icon: <ClockCircleOutlined />, label: '타이머' },
    { key: '/reflection', icon: <FormOutlined />, label: '주간 성찰' },
    { key: '/achievements', icon: <StarOutlined />, label: '업적' },
    { key: '/report', icon: <BarChartOutlined />, label: '월간 리포트' },
    { key: '/challenges', icon: <FlagOutlined />, label: '챌린지' },
    { key: '/analysis', icon: <LineChartOutlined />, label: '학습 패턴' },
  ];

  const subjectItems = [
    {
      key: 'all',
      icon: <BookOutlined />,
      label: '전체',
      onClick: () => handleSubjectClick(null),
    },
    ...subjects.map((s) => ({
      key: s.id,
      icon: <BookOutlined style={{ color: s.color }} />,
      label: s.name,
      onClick: () => handleSubjectClick(s.id),
    })),
  ];

  const bottomItems = [
    { key: '/ai', icon: <RobotOutlined />, label: 'AI 채팅' },
    ...(isParent ? [{ key: '/parent', icon: <TeamOutlined />, label: '보호자 대시보드' }] : []),
    { key: '/settings', icon: <SettingOutlined />, label: '설정' },
  ];

  if (sidebarCollapsed) {
    return (
      <div
        style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}
        role="navigation"
        aria-label="주요 내비게이션"
      >
        {viewItems.map((item) => (
          <Button
            key={item.key}
            type={location.pathname === item.key ? 'primary' : 'text'}
            icon={item.icon}
            size="small"
            onClick={() => navigate(item.key)}
            aria-label={item.label}
            title={item.label}
          />
        ))}
        <div style={{ flex: 1 }} />
        {bottomItems.map((item) => (
          <Button
            key={item.key}
            type={location.pathname === item.key ? 'primary' : 'text'}
            icon={item.icon}
            size="small"
            onClick={() => navigate(item.key)}
            aria-label={item.label}
            title={item.label}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      role="navigation"
      aria-label="주요 내비게이션"
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname === '/' ? '/kanban' : location.pathname]}
        items={viewItems}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0 }}
      />

      <div style={{ padding: '8px 16px', fontWeight: 600, fontSize: 12, color: '#999', textTransform: 'uppercase' }}>
        과목
      </div>

      <Menu
        mode="inline"
        selectedKeys={selectedSubjectId ? [selectedSubjectId] : ['all']}
        items={subjectItems}
        style={{ borderRight: 0, flex: 1, overflowY: 'auto' }}
      />

      <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          block
          size="small"
          onClick={() => setAddModalOpen(true)}
        >
          과목 추가
        </Button>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color, #f0f0f0)', marginTop: 8 }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={bottomItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </div>

      <Modal
        title="과목 추가"
        open={addModalOpen}
        onOk={handleAddSubject}
        onCancel={() => setAddModalOpen(false)}
        okText="추가"
        cancelText="취소"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label
              htmlFor="new-subject-name"
              style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}
            >
              과목명
            </label>
            <Input
              id="new-subject-name"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="예: 수학"
              onPressEnter={handleAddSubject}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>색상</label>
            <ColorPicker
              value={newSubjectColor}
              onChange={(_, hex) => setNewSubjectColor(hex)}
              presets={[{ label: '추천 색상', colors: SUBJECT_PRESET_COLORS }]}
            />
          </div>
        </div>
      </Modal>

      <div style={{ padding: '4px 16px', borderTop: '1px solid var(--border-color, #f0f0f0)' }}>
        <Button
          type="text"
          icon={<SwapOutlined />}
          block
          size="small"
          onClick={logout}
        >
          로그아웃
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
