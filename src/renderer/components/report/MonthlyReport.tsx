import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Empty } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { apiService } from '../../api/apiService';
import type { MonthlyReport as MonthlyReportType } from '../../../shared/types';

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

const MonthlyReportView: React.FC = () => {
  const [report, setReport] = useState<MonthlyReportType | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getRecentMonths(1)[0]);
  const [loading, setLoading] = useState(false);

  const months = getRecentMonths(12);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiService.getMonthlyReport(selectedMonth);
        setReport(data);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedMonth]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  const data = report?.reportData;

  const growthData = data?.weeklyGoalRates.map((rate, i) => ({
    week: `${i + 1}주차`,
    goalRate: Math.round(rate * 100),
  })) ?? [];

  const radarData = data?.subjectProgress.map((sp) => ({
    subject: sp.subjectName,
    progress: Math.round(sp.ratio * 100),
  })) ?? [];

  const growth = data?.growthVsPrevMonth;

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>월간 리포트</h2>
        <Select
          value={selectedMonth}
          onChange={setSelectedMonth}
          style={{ width: 140 }}
          options={months.map((m) => ({ label: m, value: m }))}
        />
      </div>

      {!data ? (
        <Empty description="이 달의 리포트가 없습니다" />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="총 학습 시간"
                  value={formatMinutes(data.totalStudyTime)}
                  prefix={<ClockCircleOutlined />}
                />
                {growth && (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {growth.studyTimeDelta >= 0 ? (
                      <span style={{ color: '#52c41a' }}><ArrowUpOutlined /> {formatMinutes(growth.studyTimeDelta)}</span>
                    ) : (
                      <span style={{ color: '#ff4d4f' }}><ArrowDownOutlined /> {formatMinutes(Math.abs(growth.studyTimeDelta))}</span>
                    )}
                    <span style={{ color: '#999' }}> vs 전월</span>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="복습 횟수"
                  value={data.reviewCount}
                  prefix={<CheckCircleOutlined />}
                  suffix="회"
                />
                {growth && (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {growth.reviewCountDelta >= 0 ? (
                      <span style={{ color: '#52c41a' }}><ArrowUpOutlined /> +{growth.reviewCountDelta}</span>
                    ) : (
                      <span style={{ color: '#ff4d4f' }}><ArrowDownOutlined /> {growth.reviewCountDelta}</span>
                    )}
                    <span style={{ color: '#999' }}> vs 전월</span>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="평균 이해도"
                  value={data.avgUnderstanding.toFixed(1)}
                  prefix={<StarOutlined />}
                  suffix="/ 5"
                />
                {growth && (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {growth.understandingDelta >= 0 ? (
                      <span style={{ color: '#52c41a' }}><ArrowUpOutlined /> +{growth.understandingDelta.toFixed(1)}</span>
                    ) : (
                      <span style={{ color: '#ff4d4f' }}><ArrowDownOutlined /> {growth.understandingDelta.toFixed(1)}</span>
                    )}
                    <span style={{ color: '#999' }}> vs 전월</span>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic
                  title="주간 목표 달성률"
                  value={growthData.length > 0 ? Math.round(growthData.reduce((sum, g) => sum + g.goalRate, 0) / growthData.length) : 0}
                  suffix="%"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={14}>
              <Card title="주별 목표 달성률 추이" size="small">
                {growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Area type="monotone" dataKey="goalRate" stroke="#1677ff" fill="#e6f4ff" name="달성률" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="과목별 진행률" size="small">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="진행률" dataKey="progress" stroke="#1677ff" fill="#1677ff" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="과목 데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default MonthlyReportView;
