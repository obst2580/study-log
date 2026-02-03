/**
 * Row mappers that convert snake_case SQLite columns to camelCase TypeScript properties.
 * Each mapper transforms a raw database row into its corresponding TypeScript interface shape.
 */

type DbRow = Record<string, unknown>;

export function mapSubject(row: DbRow) {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    icon: row.icon as string,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapUnit(row: DbRow) {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapTopic(row: DbRow) {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string,
    unitId: row.unit_id as string,
    title: row.title as string,
    notes: row.notes as string,
    difficulty: row.difficulty as string,
    importance: row.importance as string,
    tags: JSON.parse((row.tags as string) || '[]') as string[],
    column: row.column_name as string,
    studyTimeTotal: row.study_time_total as number,
    nextReviewAt: (row.next_review_at as string) || null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapTopicWithJoins(row: DbRow) {
  const mapped = mapTopic(row);
  const extras: Record<string, unknown> = {};
  if (row.subject_name !== undefined) {
    extras.subjectName = row.subject_name as string;
  }
  if (row.subject_color !== undefined) {
    extras.subjectColor = row.subject_color as string;
  }
  return { ...mapped, ...extras };
}

export function mapChecklistItem(row: DbRow) {
  return {
    id: row.id as string,
    topicId: row.topic_id as string,
    text: row.text as string,
    checked: Boolean(row.checked),
    sortOrder: row.sort_order as number,
  };
}

export function mapLink(row: DbRow) {
  return {
    id: row.id as string,
    topicId: row.topic_id as string,
    url: row.url as string,
    label: row.label as string,
    sortOrder: row.sort_order as number,
  };
}

export function mapStudySession(row: DbRow) {
  return {
    id: row.id as string,
    topicId: row.topic_id as string,
    startedAt: row.started_at as string,
    endedAt: row.ended_at as string,
    duration: row.duration as number,
    timerType: row.timer_type as string,
  };
}

export function mapReviewEntry(row: DbRow) {
  return {
    id: row.id as string,
    topicId: row.topic_id as string,
    reviewedAt: row.reviewed_at as string,
    fromColumn: row.from_column as string,
    toColumn: row.to_column as string,
  };
}

export function mapExam(row: DbRow) {
  return {
    id: row.id as string,
    name: row.name as string,
    date: row.date as string,
    subjectIds: JSON.parse((row.subject_ids as string) || '[]') as string[],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapUserStats(row: DbRow) {
  return {
    totalXp: row.total_xp as number,
    currentStreak: row.current_streak as number,
    longestStreak: row.longest_streak as number,
    lastStudyDate: (row.last_study_date as string) || null,
  };
}

export function mapAppSettings(row: DbRow) {
  return {
    theme: row.theme as string,
    pomodoroFocus: row.pomodoro_focus as number,
    pomodoroShortBreak: row.pomodoro_short_break as number,
    pomodoroLongBreak: row.pomodoro_long_break as number,
    pomodoroCycles: row.pomodoro_cycles as number,
    dailyGoal: row.daily_goal as number,
    llmProvider: (row.llm_provider as string) || null,
    llmModel: row.llm_model as string,
    sidebarCollapsed: Boolean(row.sidebar_collapsed),
  };
}
