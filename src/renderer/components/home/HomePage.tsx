import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrophyOutlined,
  BookOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useUserStats } from '../../hooks/useDatabase';
import { calculateLevel, getLevelProgress, formatXp } from '../../utils/xp';
import { COLUMN_LABELS, COLUMN_COLORS } from '../../utils/constants';
import type { Topic } from '../../../shared/types';

const DONUT_COLUMNS = ['backlog', 'today', 'reviewing', 'mastered'] as const;

const COURSE_ACCENT_COLORS = [
  '#7C3AED', '#3B82F6', '#0D9488', '#D97706', '#F43F5E',
  '#059669', '#DB2777', '#EA580C', '#4F46E5', '#65A30D',
];

interface SubjectCourse {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  totalTopics: number;
  masteredTopics: number;
  todayTopics: number;
  reviewingTopics: number;
  progressPercent: number;
  accentColor: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const subjects = useAppStore((s) => s.subjects);
  const { stats } = useUserStats();

  const loadTopics = useKanbanStore((s) => s.loadTopics);
  const loadDailyProgress = useKanbanStore((s) => s.loadDailyProgress);
  const topics = useKanbanStore((s) => s.topics);

  useEffect(() => {
    loadTopics();
    loadDailyProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalXp = stats?.totalXp ?? 0;
  const currentStreak = stats?.currentStreak ?? 0;
  const level = calculateLevel(totalXp);
  const levelProgress = getLevelProgress(totalXp);
  const displayName = user?.name ?? 'Student';

  const subjectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const s of subjects) {
      map.set(s.id, { name: s.name, color: s.color });
    }
    return map;
  }, [subjects]);

  // Column distribution for donut chart
  const columnDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      backlog: 0, today: 0, reviewing: 0, mastered: 0,
    };
    for (const t of topics) {
      if (t.column in counts) {
        counts[t.column] += 1;
      }
    }
    return DONUT_COLUMNS.map((col) => ({
      name: COLUMN_LABELS[col] ?? col,
      value: counts[col],
      color: COLUMN_COLORS[col],
    }));
  }, [topics]);

  const totalTopicCount = topics.length;
  const masteredCount = columnDistribution.find((d) => d.name === COLUMN_LABELS.mastered)?.value ?? 0;
  const overallPercent = totalTopicCount > 0 ? Math.round((masteredCount / totalTopicCount) * 100) : 0;

  // Group by subject for course cards
  const courseList: SubjectCourse[] = useMemo(() => {
    const grouped = new Map<string, Topic[]>();
    for (const t of topics) {
      const existing = grouped.get(t.subjectId) ?? [];
      grouped.set(t.subjectId, [...existing, t]);
    }

    const result: SubjectCourse[] = [];
    let idx = 0;
    for (const [subjectId, subjectTopics] of grouped) {
      const info = subjectMap.get(subjectId);
      if (!info) continue;
      const mastered = subjectTopics.filter((t) => t.column === 'mastered').length;
      const today = subjectTopics.filter((t) => t.column === 'today').length;
      const reviewing = subjectTopics.filter((t) => t.column === 'reviewing').length;
      const total = subjectTopics.length;
      result.push({
        subjectId,
        subjectName: info.name,
        subjectColor: info.color,
        totalTopics: total,
        masteredTopics: mastered,
        todayTopics: today,
        reviewingTopics: reviewing,
        progressPercent: total > 0 ? Math.round((mastered / total) * 100) : 0,
        accentColor: COURSE_ACCENT_COLORS[idx % COURSE_ACCENT_COLORS.length],
      });
      idx++;
    }
    return result;
  }, [topics, subjectMap]);

  return (
    <div className="hp">
      {/* Section: Progress */}
      <div className="hp-section-head">
        <h1 className="hp-title">Progress</h1>
        <span className="hp-greeting">
          {displayName}님, 오늘도 화이팅!
        </span>
      </div>

      {/* Top grid: Statistics + Skills + Awards */}
      <div className="hp-top-grid">
        {/* Statistics card with donut */}
        <div className="hp-stats-card">
          <div className="hp-stats-header">
            <h3 className="hp-card-title">Statistics</h3>
            <span className="hp-card-subtitle">전체 학습 현황</span>
          </div>

          <div className="hp-stats-body">
            <div className="hp-donut-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={columnDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {columnDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="hp-donut-center">
                <span className="hp-donut-percent">{overallPercent}%</span>
                <span className="hp-donut-label">완료</span>
              </div>
            </div>

            <div className="hp-stats-legend">
              {columnDistribution.map((item) => (
                <div key={item.name} className="hp-legend-row">
                  <span className="hp-legend-dot" style={{ background: item.color }} />
                  <span className="hp-legend-name">{item.name}</span>
                  <span className="hp-legend-value">{item.value}</span>
                </div>
              ))}
              <div className="hp-legend-row hp-legend-total">
                <span className="hp-legend-name">총 토픽</span>
                <span className="hp-legend-value">{totalTopicCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Skills + Awards */}
        <div className="hp-right-col">
          {/* Skills card */}
          <div className="hp-skills-card">
            <div className="hp-card-title-row">
              <h3 className="hp-card-title">Skills</h3>
              <span className="hp-card-count">{subjects.length}개 과목</span>
            </div>
            <div className="hp-skills-grid">
              {subjects.slice(0, 6).map((s) => (
                <div key={s.id} className="hp-skill-item">
                  <span
                    className="hp-skill-dot"
                    style={{ background: s.color }}
                  />
                  <span className="hp-skill-name">{s.name}</span>
                </div>
              ))}
              {subjects.length === 0 && (
                <span className="hp-empty-text">과목 없음</span>
              )}
            </div>
          </div>

          {/* Awards card */}
          <div className="hp-awards-card">
            <div className="hp-card-title-row">
              <h3 className="hp-card-title">Awards</h3>
              <TrophyOutlined style={{ color: '#D97706', fontSize: 18 }} />
            </div>
            <div className="hp-awards-body">
              <div className="hp-level-badge">
                <span className="hp-level-num">Lv.{level}</span>
                <span className="hp-level-xp">{formatXp(totalXp)} XP</span>
              </div>
              <div className="hp-level-bar-wrap">
                <div className="hp-level-bar">
                  <div
                    className="hp-level-bar-fill"
                    style={{ width: `${levelProgress.progressPercent}%` }}
                  />
                </div>
                <span className="hp-level-next">
                  다음 레벨까지 {formatXp(levelProgress.nextLevelXp - totalXp)} XP
                </span>
              </div>
              <div className="hp-streak-badge">
                🔥 {currentStreak}일 연속
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: My courses */}
      <div className="hp-section-head">
        <h2 className="hp-title">My courses</h2>
        <button
          className="hp-see-all"
          onClick={() => navigate('/kanban')}
        >
          See all <RightOutlined style={{ fontSize: 11 }} />
        </button>
      </div>

      {courseList.length === 0 ? (
        <div className="hp-empty-courses">
          <BookOutlined style={{ fontSize: 40, color: 'var(--text-muted)' }} />
          <span>아직 과목이 없어요</span>
          <button
            className="hp-empty-btn"
            onClick={() => navigate('/curriculum')}
          >
            커리큘럼에서 추가하기
          </button>
        </div>
      ) : (
        <div className="hp-courses-grid">
          {courseList.map((c) => (
            <div key={c.subjectId} className="hp-course-card">
              <div
                className="hp-course-accent"
                style={{ background: c.accentColor }}
              />
              <div className="hp-course-body">
                <span
                  className="hp-course-dot"
                  style={{ background: c.accentColor }}
                />
                <h4 className="hp-course-name">{c.subjectName}</h4>
                <div className="hp-course-meta">
                  <span>{c.totalTopics} topics</span>
                  <span>{c.masteredTopics} mastered</span>
                </div>
                <div className="hp-course-bar">
                  <div
                    className="hp-course-bar-fill"
                    style={{
                      width: `${c.progressPercent}%`,
                      background: c.accentColor,
                    }}
                  />
                </div>
                <div className="hp-course-footer">
                  <span className="hp-course-score">{c.progressPercent}%</span>
                  <button
                    className="hp-course-btn"
                    onClick={() => {
                      useAppStore.getState().setSelectedSubject(c.subjectId);
                      navigate('/kanban');
                    }}
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
