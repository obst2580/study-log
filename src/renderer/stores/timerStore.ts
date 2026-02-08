import { create } from 'zustand';
import { apiService } from '../api/apiService';
import type { TimerType } from '../../shared/types';
import {
  DEFAULT_POMODORO_FOCUS,
  DEFAULT_POMODORO_SHORT_BREAK,
  DEFAULT_POMODORO_LONG_BREAK,
  DEFAULT_POMODORO_CYCLES,
} from '../utils/constants';

type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface LapEntry {
  index: number;
  time: number;
  split: number;
}

interface TimerState {
  // Common
  isRunning: boolean;
  timerType: TimerType;
  activeTopicId: string | null;
  startedAt: string | null;
  minimized: boolean;

  // Stopwatch
  elapsedSeconds: number;
  laps: LapEntry[];

  // Pomodoro
  pomodoroPhase: PomodoroPhase;
  pomodoroRemainingSeconds: number;
  pomodoroCycleCount: number;
  pomodoroSettings: {
    focusDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    totalCycles: number;
  };

  // Actions
  setTimerType: (type: TimerType) => void;
  setActiveTopic: (topicId: string | null) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  completePomodoro: () => void;
  saveSession: () => Promise<void>;
  updatePomodoroSettings: (settings: Partial<TimerState['pomodoroSettings']>) => void;
  addLap: () => void;
  toggleMinimized: () => void;
  playNotificationSound: () => void;
}

/**
 * Play a beep notification using Web Audio API.
 * Creates a short tone at 880Hz for 200ms to signal timer phase completion.
 */
function playBeep(): void {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);

    // Play a second beep after a short pause
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.4);
    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.4);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
    osc2.start(audioCtx.currentTime + 0.4);
    osc2.stop(audioCtx.currentTime + 0.7);

    // Clean up context after sounds finish
    setTimeout(() => {
      audioCtx.close();
    }, 1000);
  } catch (err) {
    console.warn('Audio notification not available:', err);
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  isRunning: false,
  timerType: 'pomodoro',
  activeTopicId: null,
  startedAt: null,
  minimized: false,

  elapsedSeconds: 0,
  laps: [],

  pomodoroPhase: 'focus',
  pomodoroRemainingSeconds: DEFAULT_POMODORO_FOCUS,
  pomodoroCycleCount: 0,
  pomodoroSettings: {
    focusDuration: DEFAULT_POMODORO_FOCUS,
    shortBreakDuration: DEFAULT_POMODORO_SHORT_BREAK,
    longBreakDuration: DEFAULT_POMODORO_LONG_BREAK,
    totalCycles: DEFAULT_POMODORO_CYCLES,
  },

  setTimerType: (type) => {
    const state = get();
    if (state.isRunning) return;
    set({
      timerType: type,
      elapsedSeconds: 0,
      laps: [],
      pomodoroPhase: 'focus',
      pomodoroRemainingSeconds: state.pomodoroSettings.focusDuration,
      pomodoroCycleCount: 0,
    });
  },

  setActiveTopic: (topicId) => set({ activeTopicId: topicId }),

  start: () => {
    const state = get();
    if (state.isRunning) return;
    set({
      isRunning: true,
      startedAt: state.startedAt ?? new Date().toISOString(),
    });
  },

  pause: () => set({ isRunning: false }),

  reset: () => {
    const state = get();
    set({
      isRunning: false,
      startedAt: null,
      elapsedSeconds: 0,
      laps: [],
      pomodoroPhase: 'focus',
      pomodoroRemainingSeconds: state.pomodoroSettings.focusDuration,
      pomodoroCycleCount: 0,
    });
  },

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    if (state.timerType === 'stopwatch') {
      set({ elapsedSeconds: state.elapsedSeconds + 1 });
    } else {
      const remaining = state.pomodoroRemainingSeconds - 1;
      if (remaining <= 0) {
        get().completePomodoro();
      } else {
        set({ pomodoroRemainingSeconds: remaining });
      }
    }
  },

  completePomodoro: () => {
    const state = get();
    const { pomodoroPhase, pomodoroCycleCount, pomodoroSettings } = state;

    // Play notification sound when any phase completes
    playBeep();

    if (pomodoroPhase === 'focus') {
      const newCycleCount = pomodoroCycleCount + 1;
      if (newCycleCount >= pomodoroSettings.totalCycles) {
        // All cycles complete - long break
        set({
          pomodoroPhase: 'longBreak',
          pomodoroRemainingSeconds: pomodoroSettings.longBreakDuration,
          pomodoroCycleCount: 0,
          isRunning: false,
        });
      } else {
        // Short break between cycles
        set({
          pomodoroPhase: 'shortBreak',
          pomodoroRemainingSeconds: pomodoroSettings.shortBreakDuration,
          pomodoroCycleCount: newCycleCount,
          isRunning: false,
        });
      }
    } else {
      // Break complete, back to focus
      set({
        pomodoroPhase: 'focus',
        pomodoroRemainingSeconds: pomodoroSettings.focusDuration,
        isRunning: false,
      });
    }
  },

  saveSession: async () => {
    const state = get();
    if (!state.activeTopicId || !state.startedAt) return;

    const endedAt = new Date().toISOString();
    const duration = state.timerType === 'stopwatch'
      ? state.elapsedSeconds
      : state.pomodoroSettings.focusDuration - state.pomodoroRemainingSeconds;

    if (duration <= 0) return;

    try {
      await apiService.createStudySession({
        topicId: state.activeTopicId,
        startedAt: state.startedAt,
        endedAt,
        duration,
        timerType: state.timerType,
      });
    } catch (err) {
      console.error('Failed to save study session:', err);
    }
  },

  updatePomodoroSettings: (settings) => {
    set((s) => {
      const newSettings = { ...s.pomodoroSettings, ...settings };
      return {
        pomodoroSettings: newSettings,
        pomodoroRemainingSeconds: s.pomodoroPhase === 'focus'
          ? newSettings.focusDuration
          : s.pomodoroPhase === 'shortBreak'
            ? newSettings.shortBreakDuration
            : newSettings.longBreakDuration,
      };
    });
  },

  addLap: () => {
    const state = get();
    if (state.timerType !== 'stopwatch' || !state.isRunning) return;

    const previousLapTime = state.laps.length > 0
      ? state.laps[state.laps.length - 1].time
      : 0;

    const newLap: LapEntry = {
      index: state.laps.length + 1,
      time: state.elapsedSeconds,
      split: state.elapsedSeconds - previousLapTime,
    };

    set({ laps: [...state.laps, newLap] });
  },

  toggleMinimized: () => set((s) => ({ minimized: !s.minimized })),

  playNotificationSound: () => {
    playBeep();
  },
}));
