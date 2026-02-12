import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spin, Empty, Tag } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../api/apiService';
import type { LearningPatterns as LearningPatternsType } from '../../../shared/types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getHeatmapColor(minutes: number, max: number): string {
  if (minutes === 0) return '#f5f5f5';
  const ratio = max > 0 ? minutes / max : 0;
  if (ratio < 0.25) return '#E8D5F5';
  if (ratio < 0.5) return '#C4A6E8';
  if (ratio < 0.75) return '#9B6FD4';
  return '#7C3AED';
}

const LearningPatternsView: React.FC = () => {
  const [patterns, setPatterns] = useState<LearningPatternsType | null>(null);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiService.getLearningPatterns(user.id);
        setPatterns(data);
      } catch {
        setPatterns(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  if (!patterns) {
    return (
      <div style={{ maxWidth: 1000 }}>
        <h2 style={{ marginBottom: 16 }}>학습 패턴</h2>
        <Empty description="학습 패턴 데이터가 없습니다" />
      </div>
    );
  }

  const dayData = patterns.dayOfWeek.map((d) => ({
    name: d.dayName,
    minutes: d.totalMinutes,
    sessions: d.sessionCount,
  }));

  const hourData = patterns.timeOfDay.map((h) => ({
    name: `${h.hour}시`,
    minutes: h.totalMinutes,
    sessions: h.sessionCount,
  }));

  // Build heatmap data (day x hour)
  const maxMinutes = Math.max(
    ...patterns.timeOfDay.map((h) => h.totalMinutes),
    ...patterns.dayOfWeek.map((d) => d.totalMinutes),
    1
  );

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2 style={{ marginBottom: 16 }}>학습 패턴</h2>

      {patterns.optimalStudyTime && (
        <Card size="small" style={{ marginBottom: 16, background: '#C8F7DC', borderColor: '#6DD4A0', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BulbOutlined style={{ fontSize: 18, color: '#2D8B5F' }} />
            <span style={{ fontWeight: 500 }}>최적 학습 시간: </span>
            <Tag color="green">{patterns.optimalStudyTime}</Tag>
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="요일별 학습량" size="small">
            {dayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="분" />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'minutes' ? [`${value}분`, '학습 시간'] : [`${value}회`, '세션']
                    }
                  />
                  <Bar dataKey="minutes" fill="#7C3AED" name="minutes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="시간대별 집중도" size="small">
            {hourData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={2} />
                  <YAxis unit="분" />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'minutes' ? [`${value}분`, '학습 시간'] : [`${value}회`, '세션']
                    }
                  />
                  <Bar dataKey="minutes" fill="#A78BFA" name="minutes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="학습 히트맵 (요일 x 시간대)" size="small">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 4, fontSize: 11 }}></th>
                    {HOURS.filter((h) => h % 2 === 0).map((h) => (
                      <th key={h} style={{ padding: 4, fontSize: 10, color: 'var(--text-muted)' }} colSpan={2}>
                        {h}시
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIdx) => {
                    const dayInfo = patterns.dayOfWeek.find((d) => d.day === dayIdx);
                    return (
                      <tr key={day}>
                        <td style={{ padding: 4, fontSize: 11, fontWeight: 500 }}>{day}</td>
                        {HOURS.map((h) => {
                          const hourInfo = patterns.timeOfDay.find((t) => t.hour === h);
                          const combined = Math.round(
                            ((dayInfo?.totalMinutes ?? 0) / 7 + (hourInfo?.totalMinutes ?? 0) / 7) / 2
                          );
                          return (
                            <td
                              key={h}
                              style={{
                                width: 20,
                                height: 20,
                                background: getHeatmapColor(combined, maxMinutes / 7),
                                borderRadius: 2,
                                border: '1px solid #fff',
                              }}
                              title={`${day} ${h}시: ~${combined}분`}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, fontSize: 11 }}>
              <span>적음</span>
              {['#f5f5f5', '#E8D5F5', '#C4A6E8', '#9B6FD4', '#7C3AED'].map((color, i) => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: color }} />
              ))}
              <span>많음</span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LearningPatternsView;
