import React, { useEffect, useState } from 'react';
import { Modal, Button, message, Descriptions, Tag } from 'antd';
import GemIcon from './GemIcon';
import { apiService } from '../../api/apiService';
import { useSplendorStore } from '../../stores/splendorStore';
import type { CardDetail, GemType } from '../../../shared/types';

const GEM_ORDER: GemType[] = ['emerald', 'sapphire', 'ruby', 'diamond'];

interface CardPurchaseModalProps {
  topicId: string | null;
  open: boolean;
  onClose: () => void;
  onPurchased?: () => void;
}

const CardPurchaseModal: React.FC<CardPurchaseModalProps> = ({ topicId, open, onClose, onPurchased }) => {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const purchaseCard = useSplendorStore((s) => s.purchaseCard);
  const wallet = useSplendorStore((s) => s.wallet);

  useEffect(() => {
    if (topicId && open) {
      setLoading(true);
      apiService.getCardDetail(topicId)
        .then(setCard)
        .catch(() => setCard(null))
        .finally(() => setLoading(false));
    }
  }, [topicId, open]);

  const handlePurchase = async () => {
    if (!topicId) return;
    setPurchasing(true);
    const result = await purchaseCard(topicId);
    setPurchasing(false);
    if (result.success) {
      message.success('카드를 구매했습니다!');
      onPurchased?.();
      onClose();
    } else {
      message.error('구매에 실패했습니다.');
    }
  };

  return (
    <Modal
      title={card?.topic.title ?? '카드 구매'}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>취소</Button>,
        <Button
          key="purchase"
          type="primary"
          disabled={!card?.purchasable || card?.alreadyPurchased}
          loading={purchasing}
          onClick={handlePurchase}
        >
          {card?.alreadyPurchased ? '이미 구매됨' : '구매하기'}
        </Button>,
      ]}
      loading={loading}
    >
      {card && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="난이도">
              <Tag>{card.topic.difficulty}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="중요도">
              <Tag>{card.topic.importance}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>비용</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {GEM_ORDER.map((gem) => {
                const base = card.baseCost[gem];
                const disc = card.discount[gem];
                const effective = card.effectiveCost[gem];
                if (base === 0 && effective === 0) return null;
                return (
                  <div key={gem} style={{ textAlign: 'center' }}>
                    <GemIcon type={gem} size={20} showLabel />
                    <div style={{ marginTop: 4 }}>
                      {disc > 0 ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#999', marginRight: 4 }}>{base}</span>
                          <span style={{ fontWeight: 700, color: '#52c41a' }}>{effective}</span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 700 }}>{effective}</span>
                      )}
                    </div>
                    {wallet && (
                      <div style={{ fontSize: 11, color: wallet[gem] >= effective ? '#52c41a' : '#ff4d4f' }}>
                        보유: {wallet[gem]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!card.purchasable && !card.alreadyPurchased && (
            <div style={{ color: '#ff4d4f', fontSize: 13 }}>
              보석이 부족합니다.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default CardPurchaseModal;
