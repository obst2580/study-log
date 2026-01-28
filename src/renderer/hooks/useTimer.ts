import { useEffect, useRef } from 'react';
import { useTimerStore } from '../stores/timerStore';

/**
 * Hook that drives the timer tick interval.
 * Must be mounted once in the app (e.g., in StudyTimer component).
 */
export function useTimerTick() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const tick = useTimerStore((s) => s.tick);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, tick]);
}

/**
 * Format seconds to MM:SS or HH:MM:SS display.
 */
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format seconds to a human-readable duration string.
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}초`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}시간`;
  return `${hours}시간 ${remainingMinutes}분`;
}
