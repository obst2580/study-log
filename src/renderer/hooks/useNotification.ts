import { useEffect, useCallback, useState, useRef } from 'react';
import { message } from 'antd';
import { useAppStore } from '../stores/appStore';

interface AppNotification {
  id: string;
  type: 'review' | 'streak' | 'exam' | 'info';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

/**
 * Hook for managing in-app and system notifications.
 * Handles:
 * - Notifications from the main process (review reminders, streak warnings)
 * - Periodic checks for reviews due and streak risk
 * - System toast notifications via the Electron Notification API
 */
export function useNotification() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const reviewCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const streakCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for notifications from the main process
  useEffect(() => {
    if (!window.electronAPI?.onNotification) return;

    const cleanup = window.electronAPI.onNotification((data) => {
      const notification: AppNotification = {
        id: Date.now().toString(),
        type: 'info',
        title: data.title,
        body: data.body,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 50));

      messageApi.info({
        content: `${data.title}: ${data.body}`,
        duration: 5,
      });
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [messageApi]);

  // Check for reviews due periodically (every 5 minutes)
  useEffect(() => {
    const checkReviewsDue = async () => {
      if (!window.electronAPI) return;

      try {
        const upcomingTopics = await window.electronAPI.getUpcomingReviews();
        const topics = upcomingTopics as { id: string; title: string; nextReviewAt: string }[];

        // Filter topics where nextReviewAt has passed
        const now = new Date();
        const dueTopics = topics.filter((t) => {
          if (!t.nextReviewAt) return false;
          return new Date(t.nextReviewAt) <= now;
        });

        if (dueTopics.length > 0) {
          // Update the app store count
          useAppStore.getState().setReviewsDueCount(dueTopics.length);

          // Show notification if there are newly due reviews
          const existingReviewNotification = notifications.find(
            (n) => n.type === 'review' && !n.read
          );

          if (!existingReviewNotification) {
            const notification: AppNotification = {
              id: `review-${Date.now()}`,
              type: 'review',
              title: '복습 알림',
              body: `${dueTopics.length}개의 카드가 복습 대기 중입니다.`,
              timestamp: new Date().toISOString(),
              read: false,
            };

            setNotifications((prev) => [notification, ...prev].slice(0, 50));

            messageApi.info({
              content: `복습 알림: ${dueTopics.length}개의 카드가 복습 대기 중입니다.`,
              duration: 5,
            });
          }
        }
      } catch (err) {
        console.error('Failed to check reviews due:', err);
      }
    };

    // Initial check
    checkReviewsDue();

    // Periodic check every 5 minutes
    reviewCheckInterval.current = setInterval(checkReviewsDue, 5 * 60 * 1000);

    return () => {
      if (reviewCheckInterval.current) {
        clearInterval(reviewCheckInterval.current);
      }
    };
  }, [messageApi, notifications]);

  // Check for streak risk (once per hour in the evening)
  useEffect(() => {
    const checkStreakRisk = async () => {
      if (!window.electronAPI) return;

      try {
        const stats = await window.electronAPI.getUserStats() as {
          currentStreak: number;
          lastStudyDate: string | null;
        };

        if (!stats.lastStudyDate || stats.currentStreak === 0) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const lastStudy = stats.lastStudyDate.split('T')[0];

        // If user hasn't studied today and it's after 18:00, show streak risk
        const isEvening = now.getHours() >= 18;
        if (lastStudy !== today && isEvening && stats.currentStreak > 0) {
          const existingStreakNotification = notifications.find(
            (n) => n.type === 'streak' && !n.read &&
              n.timestamp.split('T')[0] === today
          );

          if (!existingStreakNotification) {
            const notification: AppNotification = {
              id: `streak-${Date.now()}`,
              type: 'streak',
              title: '스트릭 위험!',
              body: `현재 ${stats.currentStreak}일 연속 학습 중입니다. 오늘 학습을 완료하세요!`,
              timestamp: new Date().toISOString(),
              read: false,
            };

            setNotifications((prev) => [notification, ...prev].slice(0, 50));

            messageApi.warning({
              content: `스트릭 위험: ${stats.currentStreak}일 연속 학습이 끊길 수 있습니다!`,
              duration: 8,
            });
          }
        }
      } catch (err) {
        console.error('Failed to check streak risk:', err);
      }
    };

    // Check streak risk initially and then every hour
    const initialTimeout = setTimeout(checkStreakRisk, 10000); // Wait 10s after mount
    streakCheckInterval.current = setInterval(checkStreakRisk, 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (streakCheckInterval.current) {
        clearInterval(streakCheckInterval.current);
      }
    };
  }, [messageApi, notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const triggerNotification = useCallback((
    type: AppNotification['type'],
    title: string,
    body: string,
  ) => {
    const notification: AppNotification = {
      id: `manual-${Date.now()}`,
      type,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50));

    messageApi.info({
      content: `${title}: ${body}`,
      duration: 5,
    });
  }, [messageApi]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    triggerNotification,
    contextHolder,
  };
}
