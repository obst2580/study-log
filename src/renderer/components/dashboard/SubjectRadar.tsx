import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Empty } from 'antd';
import type { SubjectMastery } from '../../types';

interface SubjectRadarProps {
  mastery: SubjectMastery[];
}

const SubjectRadar: React.FC<SubjectRadarProps> = ({ mastery }) => {
  if (mastery.length === 0) {
    return <Empty description="과목 데이터 없음" />;
  }

  const data = mastery.map((m) => ({
    subject: m.subjectName,
    mastery: Math.round(m.ratio * 100),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Radar
          name="숙련도"
          dataKey="mastery"
          stroke="#1890ff"
          fill="#1890ff"
          fillOpacity={0.3}
        />
        <Tooltip formatter={(value: number) => [`${value}%`, '숙련도']} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default SubjectRadar;
