import { useEffect, useCallback, useState, useRef } from 'react';
import { message } from 'antd';
import { apiService } from '../api/apiService';
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
 * Hook for managing in-app notifications.
 * Handles:
 * - Periodic checks for reviews due and streak risk
 */
export function useNotification() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationsRef = useRef<AppNotification[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const reviewCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const streakCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateNotifications = useCallback((updater: (prev: AppNotification[]) => AppNotification[]) => {
    setNotifications((prev) => {
      const next = updater(prev);
      notificationsRef.current = next;
      return next;
    });
  }, []);

  // Check for reviews due periodically (every 5 minutes)
  useEffect(() => {
    const checkReviewsDue = async () => {
      try {
        const upcomingTopics = await apiService.getUpcomingReviews();
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
          const existingReviewNotification = notificationsRef.current.find(
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

            updateNotifications((prev) => [notification, ...prev].slice(0, 50));

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
  }, [messageApi, updateNotifications]);

  // Check for streak risk (once per hour in the evening)
  useEffect(() => {
    const checkStreakRisk = async () => {
      try {
        const stats = await apiService.getUserStats() as {
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
          const existingStreakNotification = notificationsRef.current.find(
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

            updateNotifications((prev) => [notification, ...prev].slice(0, 50));

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
  }, [messageApi, updateNotifications]);

  const markAsRead = useCallback((id: string) => {
    updateNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, [updateNotifications]);

  const markAllAsRead = useCallback(() => {
    updateNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [updateNotifications]);

  const clearAll = useCallback(() => {
    updateNotifications(() => []);
  }, [updateNotifications]);

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

    updateNotifications((prev) => [notification, ...prev].slice(0, 50));

    messageApi.info({
      content: `${title}: ${body}`,
      duration: 5,
    });
  }, [messageApi, updateNotifications]);

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
