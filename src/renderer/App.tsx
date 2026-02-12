import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
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
import SplendorDashboard from './components/splendor/SplendorDashboard';
import HomePage from './components/home/HomePage';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { useAppStore } from './stores/appStore';
import { useAuthStore } from './stores/authStore';

const App: React.FC = () => {
  const loadSettings = useAppStore((s) => s.loadSettings);
  const loadSubjects = useAppStore((s) => s.loadSubjects);
  const appTheme = useAppStore((s) => s.theme);
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
      loadSettings();
      loadSubjects();
    }
  }, [isAuthenticated, loadUser, loadSettings, loadSubjects]);

  const isDark = appTheme === 'dark';

  if (!isAuthenticated) {
    return (
      <ConfigProvider
        theme={{
          algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#6366F1',
            colorSuccess: '#10B981',
            colorWarning: '#F59E0B',
            colorError: '#F43F5E',
            borderRadius: 12,
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          },
        }}
      >
        <Routes>
          <Route path="/register" element={<RegisterForm />} />
          <Route path="*" element={<LoginForm />} />
        </Routes>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#6366F1',
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          colorError: '#F43F5E',
          borderRadius: 12,
          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
      }}
    >
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
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
          <Route path="/splendor" element={<SplendorDashboard />} />
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </ConfigProvider>
  );
};

export default App;
