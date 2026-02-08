import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../api/apiService';
import type { TopicWithRelations, Subject, Unit, Exam, UserStats, SubjectMastery, DailyStudyCount } from '../../shared/types';

/**
 * Hook for fetching a single topic with all its relations.
 */
export function useTopicDetail(topicId: string | null) {
  const [topic, setTopic] = useState<TopicWithRelations | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!topicId) {
      setTopic(null);
      return;
    }
    setLoading(true);
    try {
      const result = await apiService.getTopicById(topicId);
      setTopic(result as TopicWithRelations | null);
    } catch (err) {
      console.error('Failed to load topic:', err);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { topic, loading, refresh };
}

/**
 * Hook for fetching units for a subject.
 */
export function useUnits(subjectId: string | null) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!subjectId) {
      setUnits([]);
      return;
    }
    setLoading(true);
    try {
      const result = await apiService.getUnits(subjectId);
      setUnits(result as Unit[]);
    } catch (err) {
      console.error('Failed to load units:', err);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { units, loading, refresh };
}

/**
 * Hook for fetching user stats (XP, streaks).
 */
export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getUserStats();
      setStats(result as UserStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}

/**
 * Hook for fetching subject mastery data.
 */
export function useSubjectMastery() {
  const [mastery, setMastery] = useState<SubjectMastery[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getSubjectMastery();
      setMastery(result as SubjectMastery[]);
    } catch (err) {
      console.error('Failed to load mastery:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { mastery, loading, refresh };
}

/**
 * Hook for fetching daily study counts (for contribution graph).
 */
export function useDailyStudyCounts(startDate: string, endDate: string) {
  const [counts, setCounts] = useState<DailyStudyCount[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getDailyStudyCounts(startDate, endDate);
      setCounts(result as DailyStudyCount[]);
    } catch (err) {
      console.error('Failed to load daily counts:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, loading, refresh };
}

/**
 * Hook for fetching exams.
 */
export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getExams();
      setExams(result as Exam[]);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { exams, loading, refresh };
}
