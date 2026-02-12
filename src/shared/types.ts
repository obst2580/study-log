// ── Enums ──

export type Difficulty = 'high' | 'medium' | 'low';
export type Importance = 'high' | 'medium' | 'low';

export type GemType = 'emerald' | 'sapphire' | 'ruby' | 'diamond';

export interface GemCost {
  emerald: number;
  sapphire: number;
  ruby: number;
  diamond: number;
}

export interface GemWallet {
  emerald: number;
  sapphire: number;
  ruby: number;
  diamond: number;
  updatedAt: string;
}

export interface GemTransaction {
  id: number;
  gemType: GemType;
  amount: number;
  reason: string;
  referenceId: string | null;
  createdAt: string;
}
export type KanbanColumn = 'backlog' | 'today' | 'reviewing' | 'mastered';
export type TimerType = 'pomodoro' | 'stopwatch';
export type UserRole = 'student' | 'parent';

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string }[] = [
  { key: 'backlog', label: '백로그' },
  { key: 'today', label: '오늘 학습' },
  { key: 'reviewing', label: '복습 대기' },
  { key: 'mastered', label: '마스터' },
];

export type GradeLevel = 'middle-1' | 'middle-2' | 'middle-3' | 'high-1' | 'high-2' | 'high-2-science' | 'high-3' | 'high-3-science';

export interface User {
  id: string;
  email: string;
  name: string;
  grade: string | null;
  role: UserRole;
  avatar: string;
  createdAt: string;
}

// ── Data Models ──

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  subjectId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  unitId: string;
  title: string;
  notes: string;
  difficulty: Difficulty;
  importance: Importance;
  tags: string[];
  column: KanbanColumn;
  studyTimeTotal: number;
  nextReviewAt: string | null;
  sortOrder: number;
  masteryCount: number;
  gemCost: GemCost;
  purchased: boolean;
  purchaseDiscount: GemCost;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  topicId: string;
  text: string;
  checked: boolean;
  sortOrder: number;
}

export interface Link {
  id: string;
  topicId: string;
  url: string;
  label: string;
  sortOrder: number;
}

export interface StudySession {
  id: string;
  topicId: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  timerType: TimerType;
}

export interface ReviewEntry {
  id: string;
  topicId: string;
  reviewedAt: string;
  fromColumn: KanbanColumn;
  toColumn: KanbanColumn;
  understandingScore: number | null;
  selfNote: string | null;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  subjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ── XP / Level ──

export interface UserStats {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  prestigePoints: number;
}

// ── App Settings ──

export interface AppSettings {
  theme: 'light' | 'dark';
  pomodoroFocus: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  pomodoroCycles: number;
  dailyGoal: number;
  llmProvider: 'openai' | 'anthropic' | null;
  llmModel: string;
  sidebarCollapsed: boolean;
}

// ── Composite Types ──

export interface TopicWithRelations extends Topic {
  subject?: Subject;
  unit?: Unit;
  checklist: ChecklistItem[];
  links: Link[];
  studySessions: StudySession[];
  reviewHistory: ReviewEntry[];
}

export interface DailyStudyCount {
  date: string;
  count: number;
}

export interface SubjectMastery {
  subjectId: string;
  subjectName: string;
  totalTopics: number;
  completedTopics: number;
  ratio: number;
}

// ── Goals ──

export interface GoalItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface WeeklyGoal {
  id: string;
  userId: string;
  weekStart: string;
  goals: GoalItem[];
  reflection: string | null;
  achievementRate: number | null;
  createdAt: string;
  updatedAt: string;
}

// ── Self-Evaluation ──

export interface SelfEvaluation {
  understandingScore: number;
  selfNote: string;
}

// ── Parent Dashboard ──

export interface ChildSummary {
  userId: string;
  profileName: string;
  studyTimeThisWeek: number;
  reviewCount: number;
  currentStreak: number;
  goalAchievementRate: number;
  subjectProgress: SubjectMastery[];
}

export interface DailyActivity {
  date: string;
  studyMinutes: number;
  reviewCount: number;
}

export interface WeeklyActivity {
  userId: string;
  days: DailyActivity[];
}

// ── Reflections ──

export interface WeeklyReflection {
  id: string;
  userId: string;
  weekStart: string;
  whatWentWell: string;
  whatToImprove: string;
  nextWeekFocus: string;
  mood: number;
  studyTimeTotal: number;
  reviewCount: number;
  goalRate: number;
  createdAt: string;
  updatedAt: string;
}

// ── Achievements ──

export interface Achievement {
  id: string;
  userId: string;
  achievementKey: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface AchievementWithStatus {
  achievementKey: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

// ── Analysis ──

export interface WeakTopic {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  avgUnderstanding: number;
  reviewCount: number;
  lastReviewedAt: string;
}

export interface StudyEfficiency {
  userId: string;
  avgSessionDuration: number;
  totalStudyTime: number;
  topicsCompleted: number;
  avgUnderstanding: number;
}

// ── Reports ──

export type ChallengeType = 'study_time' | 'review_count' | 'streak' | 'goal_rate';

export interface MonthlyReportData {
  totalStudyTime: number;
  reviewCount: number;
  avgUnderstanding: number;
  subjectProgress: SubjectMastery[];
  weeklyGoalRates: number[];
  growthVsPrevMonth: {
    studyTimeDelta: number;
    reviewCountDelta: number;
    understandingDelta: number;
  };
}

export interface MonthlyReport {
  id: string;
  userId: string;
  month: string;
  reportData: MonthlyReportData;
  generatedAt: string;
}

// ── Challenges ──

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  challengeType: ChallengeType;
  targetValue: number;
  startDate: string;
  endDate: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ChallengeParticipant {
  challengeId: string;
  userId: string;
  currentValue: number;
  completed: boolean;
  completedAt: string | null;
}

export interface ChallengeWithParticipants extends Challenge {
  participants: ChallengeParticipant[];
}

// ── Learning Patterns ──

export interface DayOfWeekDistribution {
  day: number;
  dayName: string;
  totalMinutes: number;
  sessionCount: number;
}

export interface TimeOfDayConcentration {
  hour: number;
  totalMinutes: number;
  sessionCount: number;
}

export interface LearningPatterns {
  userId: string;
  dayOfWeek: DayOfWeekDistribution[];
  timeOfDay: TimeOfDayConcentration[];
  optimalStudyTime: string | null;
}

// ── Curriculum Templates ──

export interface CurriculumTemplate {
  id: string;
  grade: string;
  version: number;
  generatedBy: string;
  status: 'generating' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumTemplateDetail extends CurriculumTemplate {
  subjects: CurriculumSubject[];
}

export interface CurriculumSubject {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  units: CurriculumUnit[];
}

export interface CurriculumUnit {
  id: string;
  name: string;
  sortOrder: number;
  topics: CurriculumTopic[];
}

export interface CurriculumTopic {
  id: string;
  title: string;
  difficulty: Difficulty;
  importance: Importance;
  sortOrder: number;
  checklistItems: { id: string; text: string; sortOrder: number }[];
}

// -- Curriculum Generation Progress --

export interface CurriculumGenerationProgress {
  phase: number;
  totalUnits: number;
  completedUnits: number;
  currentSubject?: string;
  currentUnit?: string;
}

// -- Daily Progress --

export interface DailyProgress {
  completedToday: number;
  totalToday: number;
  reviewingCount: number;
  dailyLimit: number;
}

export interface CurriculumProgress {
  backlogCount: number;
  activeCount: number;
  masteredCount: number;
  totalCount: number;
  progressPercent: number;
}

export interface UnitWithProgress extends Unit {
  backlogCount: number;
  reviewingCount: number;
  masteredCount: number;
  totalCount: number;
  topics: Topic[];
}

export interface SubjectWithProgress extends Subject {
  backlogCount: number;
  reviewingCount: number;
  masteredCount: number;
  units: UnitWithProgress[];
}

// -- Splendor / Gem Economy --

export interface NobleProgress {
  unitId: string;
  unitName: string;
  subjectName: string;
  subjectColor: string;
  totalTopics: number;
  masteredTopics: number;
  completed: boolean;
}

export interface CardDetail {
  topic: Topic;
  baseCost: GemCost;
  discount: GemCost;
  effectiveCost: GemCost;
  purchasable: boolean;
  alreadyPurchased: boolean;
}

export interface SubjectDiscount {
  subjectId: string;
  subjectName: string;
  masteredCount: number;
  discount: GemCost;
}

export interface SplendorOverview {
  wallet: GemWallet;
  prestigePoints: number;
  nobles: NobleProgress[];
}
