/**
 * Row mappers that convert snake_case PostgreSQL columns to camelCase TypeScript properties.
 * Each mapper transforms a raw database row into its corresponding TypeScript interface shape.
 */

type DbRow = Record<string, unknown>;

export function mapUser(row: DbRow) {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    grade: (row.grade as string) || null,
    role: row.role as string,
    avatar: row.avatar as string,
    createdAt: row.created_at as string,
  };
}

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
    understandingScore: (row.understanding_score as number) ?? null,
    selfNote: (row.self_note as string) ?? null,
  };
}

export function mapWeeklyGoal(row: DbRow) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    weekStart: row.week_start as string,
    goals: row.goals as { id: string; text: string; completed: boolean }[],
    reflection: (row.reflection as string) ?? null,
    achievementRate: (row.achievement_rate as number) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapWeeklyReflection(row: DbRow) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    weekStart: row.week_start as string,
    whatWentWell: (row.what_went_well as string) ?? null,
    whatToImprove: (row.what_to_improve as string) ?? null,
    nextWeekFocus: (row.next_week_focus as string) ?? null,
    mood: (row.mood as number) ?? null,
    studyTimeTotal: row.study_time_total as number,
    reviewCount: row.review_count as number,
    goalRate: row.goal_rate as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapAchievement(row: DbRow) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    achievementKey: row.achievement_key as string,
    unlockedAt: row.unlocked_at as string,
  };
}

export function mapMonthlyReport(row: DbRow) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    month: row.month as string,
    reportData: row.report_data as Record<string, unknown>,
    generatedAt: row.generated_at as string,
  };
}

export function mapChallenge(row: DbRow) {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    challengeType: row.challenge_type as string,
    targetValue: row.target_value as number,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    createdBy: (row.created_by as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export function mapChallengeParticipant(row: DbRow) {
  return {
    challengeId: row.challenge_id as string,
    userId: row.user_id as string,
    currentValue: row.current_value as number,
    completed: Boolean(row.completed),
    completedAt: (row.completed_at as string) ?? null,
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
