// IPC channel type definitions for type-safe renderer-to-main communication
import type {
  Subject, Unit, Topic, TopicWithRelations, ChecklistItem, Link,
  StudySession, ReviewEntry, Exam, UserStats, AppSettings,
  SubjectMastery, DailyStudyCount,
} from '../../shared/types';

export interface IpcChannels {
  // Subjects
  'subjects:getAll': { args: []; return: Subject[] };
  'subjects:create': { args: [{ name: string; color?: string; icon?: string }]; return: Subject };
  'subjects:update': { args: [string, Partial<Subject>]; return: Subject | null };
  'subjects:delete': { args: [string]; return: { success: boolean } };

  // Units
  'units:getBySubject': { args: [string]; return: Unit[] };
  'units:create': { args: [{ subjectId: string; name: string }]; return: Unit };
  'units:update': { args: [string, { name?: string; sortOrder?: number }]; return: Unit | null };
  'units:delete': { args: [string]; return: { success: boolean } };

  // Topics
  'topics:getAll': { args: [{ subjectId?: string; column?: string; unitId?: string }?]; return: Topic[] };
  'topics:getById': { args: [string]; return: TopicWithRelations | null };
  'topics:getBySubject': { args: [string]; return: Topic[] };
  'topics:getByColumn': { args: [string]; return: Topic[] };
  'topics:create': { args: [Partial<Topic> & { subjectId: string; unitId: string; title: string }]; return: Topic };
  'topics:update': { args: [string, Partial<Topic>]; return: Topic | null };
  'topics:delete': { args: [string]; return: { success: boolean } };
  'topics:move': { args: [string, string, number]; return: Topic | null };
  'topics:moveToNextColumn': { args: [string]; return: { success: boolean; topic?: Topic; fromColumn?: string; toColumn?: string; xpAwarded?: number; message?: string } };

  // Checklist
  'topics:getChecklist': { args: [string]; return: ChecklistItem[] };
  'topics:upsertChecklistItem': { args: [{ id?: string; topicId: string; text: string; checked?: boolean; sortOrder?: number }]; return: ChecklistItem };
  'topics:deleteChecklistItem': { args: [string]; return: { success: boolean } };

  // Links
  'links:getByTopic': { args: [string]; return: Link[] };
  'links:upsert': { args: [{ id?: string; topicId: string; url: string; label?: string; sortOrder?: number }]; return: Link };
  'links:delete': { args: [string]; return: { success: boolean } };

  // Study Sessions
  'studySessions:create': { args: [Omit<StudySession, 'id'>]; return: StudySession };
  'studySessions:getAll': { args: [string?]; return: StudySession[] };
  'studySessions:getByTopic': { args: [string]; return: StudySession[] };
  'studySessions:getByDateRange': { args: [string, string]; return: StudySession[] };
  'studySessions:dailyCounts': { args: [string, string]; return: DailyStudyCount[] };

  // Reviews
  'reviews:create': { args: [{ topicId: string; fromColumn: string; toColumn?: string }]; return: { success: boolean; review?: ReviewEntry; topic?: Topic; xpAwarded?: number; message?: string } };
  'reviews:getByTopic': { args: [string]; return: ReviewEntry[] };
  'reviews:getRecent': { args: [number?]; return: ReviewEntry[] };
  'reviews:getUpcoming': { args: []; return: Topic[] };

  // Stats
  'stats:get': { args: []; return: UserStats };
  'stats:addXp': { args: [number, string]; return: UserStats };
  'stats:updateStreak': { args: []; return: UserStats };
  'stats:subjectMastery': { args: []; return: SubjectMastery[] };

  // Search
  'search:query': { args: [string, { subjectId?: string }?]; return: Topic[] };

  // Settings
  'settings:get': { args: []; return: AppSettings };
  'settings:update': { args: [Partial<AppSettings>]; return: AppSettings };

  // Exams
  'exams:getAll': { args: []; return: Exam[] };
  'exams:create': { args: [{ name: string; date: string; subjectIds?: string[] }]; return: Exam };
  'exams:update': { args: [string, { name?: string; date?: string; subjectIds?: string[] }]; return: Exam | null };
  'exams:delete': { args: [string]; return: { success: boolean } };

  // Backup
  'backup:export': { args: []; return: string };
  'backup:import': { args: [string]; return: { success: boolean } };
}

// Event channels from main to renderer
export interface IpcEvents {
  navigate: (route: string) => void;
  'reviews-due': (count: number) => void;
  notification: (data: { title: string; body: string }) => void;
}
