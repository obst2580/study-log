import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import KanbanBoard from './components/kanban/KanbanBoard';
import Dashboard from './components/dashboard/Dashboard';
import CalendarView from './components/calendar/CalendarView';
import TimelineView from './components/timeline/TimelineView';
import StudyTimer from './components/timer/StudyTimer';
import AiChat from './components/ai/AiChat';
import SettingsView from './components/settings/SettingsView';
import ParentDashboard from './components/parent/ParentDashboard';
import WeeklyReflectionForm from './components/reflection/WeeklyReflectionForm';
import AchievementList from './components/achievements/AchievementList';
import MonthlyReportView from './components/report/MonthlyReport';
import ChallengeListView from './components/challenge/ChallengeList';
import LearningPatternsView from './components/analysis/LearningPatterns';
import CurriculumBrowser from './components/curriculum/CurriculumBrowser';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { useAppStore } from './stores/appStore';
import { useAuthStore } from './stores/authStore';

const App: React.FC = () => {
  const loadSettings = useAppStore((s) => s.loadSettings);
  const loadSubjects = useAppStore((s) => s.loadSubjects);
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
      loadSettings();
      loadSubjects();
    }
  }, [isAuthenticated, loadUser, loadSettings, loadSubjects]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterForm />} />
        <Route path="*" element={<LoginForm />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<KanbanBoard />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/curriculum" element={<CurriculumBrowser />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/timeline" element={<TimelineView />} />
        <Route path="/timer" element={<StudyTimer />} />
        <Route path="/ai" element={<AiChat />} />
        <Route path="/reflection" element={<WeeklyReflectionForm />} />
        <Route path="/achievements" element={<AchievementList />} />
        <Route path="/report" element={<MonthlyReportView />} />
        <Route path="/challenges" element={<ChallengeListView />} />
        <Route path="/analysis" element={<LearningPatternsView />} />
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
