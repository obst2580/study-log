import { Notification, BrowserWindow } from 'electron';

export function sendSystemNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.show();
  }
}

export function sendRendererNotification(
  window: BrowserWindow | null,
  data: { title: string; body: string }
): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send('notification', data);
  }
}

export function notifyReviewsDue(window: BrowserWindow | null, count: number): void {
  if (count > 0) {
    sendSystemNotification(
      'StudyLog - 복습 알림',
      `복습할 카드가 ${count}개 있습니다.`
    );

    if (window && !window.isDestroyed()) {
      window.webContents.send('reviews-due', count);
    }
  }
}

export function notifyStreakWarning(window: BrowserWindow | null): void {
  sendSystemNotification(
    'StudyLog - 스트릭 위험',
    '오늘 아직 학습을 완료하지 않았습니다. 스트릭을 유지하세요!'
  );

  sendRendererNotification(window, {
    title: '스트릭 위험',
    body: '오늘 학습을 완료하지 않으면 스트릭이 끊깁니다.',
  });
}

export function notifyExamDday(window: BrowserWindow | null, examName: string, daysLeft: number): void {
  sendSystemNotification(
    `StudyLog - 시험 D-${daysLeft}`,
    `${examName}까지 ${daysLeft}일 남았습니다.`
  );

  sendRendererNotification(window, {
    title: `시험 D-${daysLeft}`,
    body: `${examName}까지 ${daysLeft}일 남았습니다.`,
  });
}
