import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import KanbanBoard from './components/kanban/KanbanBoard';
import Dashboard from './components/dashboard/Dashboard';
import CalendarView from './components/calendar/CalendarView';
import TimelineView from './components/timeline/TimelineView';
import StudyTimer from './components/timer/StudyTimer';
import AiChat from './components/ai/AiChat';
import SettingsView from './components/settings/SettingsView';
import { useAppStore } from './stores/appStore';
import type { ElectronAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const loadSettings = useAppStore((s) => s.loadSettings);
  const loadSubjects = useAppStore((s) => s.loadSubjects);

  useEffect(() => {
    loadSettings();
    loadSubjects();

    if (window.electronAPI?.onNavigate) {
      window.electronAPI.onNavigate((route: string) => {
        navigate(route);
      });
    }

    if (window.electronAPI?.onReviewsDue) {
      window.electronAPI.onReviewsDue((count: number) => {
        useAppStore.getState().setReviewsDueCount(count);
      });
    }

    // Ctrl+K global keyboard shortcut is handled in GlobalSearch
  }, [navigate, loadSettings, loadSubjects]);

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<KanbanBoard />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/timeline" element={<TimelineView />} />
        <Route path="/timer" element={<StudyTimer />} />
        <Route path="/ai" element={<AiChat />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
