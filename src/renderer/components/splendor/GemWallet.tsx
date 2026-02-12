import React from 'react';
import { Card } from 'antd';
import GemIcon from './GemIcon';
import type { GemWallet as GemWalletType, GemType } from '../../../shared/types';

interface GemWalletProps {
  wallet: GemWalletType | null;
  compact?: boolean;
}

const GEM_ORDER: GemType[] = ['emerald', 'sapphire', 'ruby', 'diamond'];

const GemWalletDisplay: React.FC<GemWalletProps> = ({ wallet, compact = false }) => {
  if (!wallet) return null;

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {GEM_ORDER.map((gem) => (
          <GemIcon key={gem} type={gem} size={14} count={wallet[gem]} />
        ))}
      </div>
    );
  }

  return (
    <Card size="small" title="보석 지갑" style={{ background: '#F5F5F0', borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {GEM_ORDER.map((gem) => (
          <div key={gem} style={{ textAlign: 'center' }}>
            <GemIcon type={gem} size={24} showLabel />
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{wallet[gem]}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GemWalletDisplay;
