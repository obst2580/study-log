import { create } from 'zustand';
import { apiService } from '../api/apiService';
import type { GemWallet, GemTransaction, NobleProgress, SubjectDiscount, Topic } from '../../shared/types';

interface SplendorState {
  wallet: GemWallet | null;
  transactions: GemTransaction[];
  nobles: NobleProgress[];
  discounts: SubjectDiscount[];
  prestigePoints: number;
  loading: boolean;
  error: string | null;

  loadWallet: () => Promise<void>;
  loadTransactions: (limit?: number, offset?: number) => Promise<void>;
  loadNobles: () => Promise<void>;
  loadDiscounts: () => Promise<void>;
  loadOverview: () => Promise<void>;
  purchaseCard: (topicId: string) => Promise<{ success: boolean; topic?: Topic }>;
}

export const useSplendorStore = create<SplendorState>((set) => ({
  wallet: null,
  transactions: [],
  nobles: [],
  discounts: [],
  prestigePoints: 0,
  loading: false,
  error: null,

  loadWallet: async () => {
    try {
      const wallet = await apiService.getGemWallet();
      set({ wallet });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadTransactions: async (limit = 20, offset = 0) => {
    try {
      const transactions = await apiService.getGemTransactions(limit, offset);
      set({ transactions });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadNobles: async () => {
    try {
      const nobles = await apiService.getNobles();
      set({ nobles });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadDiscounts: async () => {
    try {
      const discounts = await apiService.getDiscounts();
      set({ discounts });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadOverview: async () => {
    set({ loading: true });
    try {
      const overview = await apiService.getSplendorOverview();
      set({
        wallet: overview.wallet,
        prestigePoints: overview.prestigePoints,
        nobles: overview.nobles,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  purchaseCard: async (topicId: string) => {
    try {
      const result = await apiService.purchaseCard(topicId);
      if (result.success) {
        set({ wallet: result.wallet });
      }
      return { success: result.success, topic: result.topic };
    } catch (e) {
      set({ error: (e as Error).message });
      return { success: false };
    }
  },
}));
