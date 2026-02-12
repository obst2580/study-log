import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Spin, Button } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import GemWalletDisplay from './GemWallet';
import GemIcon from './GemIcon';
import NobleProgressDisplay from './NobleProgress';
import CardPurchaseModal from './CardPurchaseModal';
import { useSplendorStore } from '../../stores/splendorStore';
import { useKanbanStore } from '../../stores/kanbanStore';
import type { Topic, GemType } from '../../../shared/types';

const GEM_ORDER: GemType[] = ['emerald', 'sapphire', 'ruby', 'diamond'];

const REASON_LABELS: Record<string, string> = {
  study_session: '공부 세션',
  review_note_quality: '리뷰 노트',
  understanding_high: '높은 이해도',
  understanding_perfect: '완벽한 이해',
  card_purchase: '카드 구매',
};

const SplendorDashboard: React.FC = () => {
  const {
    wallet, nobles, transactions, prestigePoints, loading,
    loadOverview, loadTransactions, loadDiscounts,
  } = useSplendorStore();
  const topics = useKanbanStore((s) => s.topics);

  const [purchaseTopicId, setPurchaseTopicId] = useState<string | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  useEffect(() => {
    loadOverview();
    loadTransactions();
    loadDiscounts();
  }, [loadOverview, loadTransactions, loadDiscounts]);

  const purchasableTopics = topics.filter(
    (t) => t.column !== 'mastered' && !t.purchased
  );

  const handlePurchased = () => {
    loadOverview();
    loadTransactions();
  };

  if (loading && !wallet) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h2 style={{ marginBottom: 16 }}>Study Splendor</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <GemWalletDisplay wallet={wallet} />
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic
              title="프레스티지"
              value={prestigePoints}
              prefix={<CrownOutlined style={{ color: '#D97706' }} />}
              suffix="점"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="구매 가능한 카드" size="small">
            {purchasableTopics.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                구매 가능한 카드가 없습니다
              </div>
            ) : (
              <List
                dataSource={purchasableTopics.slice(0, 20)}
                renderItem={(topic: Topic) => (
                  <List.Item
                    actions={[
                      <Button
                        key="buy"
                        type="link"
                        size="small"
                        onClick={() => {
                          setPurchaseTopicId(topic.id);
                          setPurchaseOpen(true);
                        }}
                      >
                        구매
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={<span style={{ fontSize: 13 }}>{topic.title}</span>}
                      description={
                        <div style={{ display: 'flex', gap: 8 }}>
                          {GEM_ORDER.map((gem) => {
                            const cost = topic.gemCost[gem];
                            if (cost === 0) return null;
                            return <GemIcon key={gem} type={gem} size={12} count={cost} />;
                          })}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="귀족 타일 (단원 완성)" size="small">
            <NobleProgressDisplay nobles={nobles} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="최근 보석 거래" size="small">
            <List
              dataSource={transactions.slice(0, 10)}
              renderItem={(tx) => (
                <List.Item style={{ padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <GemIcon type={tx.gemType} size={14} />
                    <span style={{
                      fontWeight: 600,
                      color: tx.amount > 0 ? '#10B981' : '#ff4d4f',
                    }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {REASON_LABELS[tx.reason] || tx.reason}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </List.Item>
              )}
              locale={{ emptyText: '거래 내역이 없습니다' }}
            />
          </Card>
        </Col>
      </Row>

      <CardPurchaseModal
        topicId={purchaseTopicId}
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onPurchased={handlePurchased}
      />
    </div>
  );
};

export default SplendorDashboard;
