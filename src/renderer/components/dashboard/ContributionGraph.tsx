import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useDailyStudyCounts } from '../../hooks/useDatabase';

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS = 52;
const DAYS_PER_WEEK = 7;

const INTENSITY_COLORS = [
  '#ebedf0', // 0
  '#C8F7DC', // 1-2
  '#6DD4A0', // 3-4
  '#3EAF73', // 5-7
  '#2D8B5F', // 8+
];

function getIntensityColor(count: number): string {
  if (count === 0) return INTENSITY_COLORS[0];
  if (count <= 2) return INTENSITY_COLORS[1];
  if (count <= 4) return INTENSITY_COLORS[2];
  if (count <= 7) return INTENSITY_COLORS[3];
  return INTENSITY_COLORS[4];
}

const ContributionGraph: React.FC = () => {
  const endDate = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs().subtract(WEEKS * 7, 'day').format('YYYY-MM-DD');
  const { counts } = useDailyStudyCounts(startDate, endDate);

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of counts) {
      map.set(c.date, c.count);
    }
    return map;
  }, [counts]);

  const weeks = useMemo(() => {
    const result: { date: string; count: number }[][] = [];
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    let current = start.startOf('week');
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const date = current.add(d, 'day');
        if (date.isAfter(end)) break;
        if (date.isBefore(start)) {
          week.push({ date: '', count: 0 });
        } else {
          const dateStr = date.format('YYYY-MM-DD');
          week.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 });
        }
      }
      result.push(week);
      current = current.add(1, 'week');
    }
    return result;
  }, [startDate, endDate, countMap]);

  const svgWidth = weeks.length * (CELL_SIZE + CELL_GAP);
  const svgHeight = DAYS_PER_WEEK * (CELL_SIZE + CELL_GAP);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={svgWidth} height={svgHeight}>
        {weeks.map((week, weekIdx) =>
          week.map((day, dayIdx) => (
            <Tooltip
              key={`${weekIdx}-${dayIdx}`}
              title={day.date ? `${day.date}: ${day.count}개 학습` : ''}
            >
              <rect
                x={weekIdx * (CELL_SIZE + CELL_GAP)}
                y={dayIdx * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={2}
                fill={day.date ? getIntensityColor(day.count) : 'transparent'}
                style={{ cursor: day.date ? 'pointer' : 'default' }}
              />
            </Tooltip>
          ))
        )}
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>적음</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
};

export default ContributionGraph;
