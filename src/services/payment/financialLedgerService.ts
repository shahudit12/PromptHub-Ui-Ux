// Double-Entry Financial Ledger & Marketplace Transactions Service — Standalone Mock Mode
// Zero database queries, zero external network requests
import type { 
  MarketplaceOrder, 
  SellerEarning, 
  PayoutRecord, 
  RefundRecord, 
  DisputeRecord, 
} from '../../db/schema';

export interface SellerAnalyticsSummary {
  totalSalesCount: number;
  grossRevenue: number;
  platformFees: number;
  paymentProcessingFees: number;
  taxWithholdings: number;
  netEarnings: number;
  pendingPayoutAmount: number;
  eligiblePayoutAmount: number;
  paidOutAmount: number;
  currency: string;
  earningsList: SellerEarning[];
  ordersList: MarketplaceOrder[];
  payoutsList: PayoutRecord[];
  refundsList: RefundRecord[];
  disputesList: DisputeRecord[];
  loadError?: string;
}

const MOCK_SELLER_ANALYTICS: SellerAnalyticsSummary = {
  totalSalesCount: 14,
  grossRevenue: 4890,
  platformFees: 489,
  paymentProcessingFees: 98,
  taxWithholdings: 49,
  netEarnings: 4254,
  pendingPayoutAmount: 1200,
  eligiblePayoutAmount: 3054,
  paidOutAmount: 0,
  currency: 'INR',
  earningsList: [
    {
      id: 'earn_01',
      orderId: 'ord_01',
      sellerId: '00000000-0000-4000-a000-000000000001',
      grossAmount: 499,
      platformFee: 50,
      platformFeePercent: 10,
      paymentProcessingFee: 10,
      taxWithholding: 5,
      taxRuleApplied: '18% GST Platform Share',
      netAmount: 434,
      currency: 'INR',
      status: 'eligible',
      payoutEligibleAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'earn_02',
      orderId: 'ord_02',
      sellerId: '00000000-0000-4000-a000-000000000001',
      grossAmount: 999,
      platformFee: 100,
      platformFeePercent: 10,
      paymentProcessingFee: 20,
      taxWithholding: 10,
      taxRuleApplied: '18% GST Platform Share',
      netAmount: 869,
      currency: 'INR',
      status: 'pending',
      payoutEligibleAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ],
  ordersList: [
    {
      id: 'ord_01',
      buyerId: 'usr_buyer_1',
      sellerId: '00000000-0000-4000-a000-000000000001',
      promptId: 'seed-prompt-01',
      promptTitle: 'Senior Next.js 15 & React 19 Architect',
      currency: 'INR',
      totalAmount: 499,
      paymentProvider: 'mock_gateway',
      paymentStatus: 'paid',
      settledAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'ord_02',
      buyerId: 'usr_buyer_2',
      sellerId: '00000000-0000-4000-a000-000000000001',
      promptId: 'seed-prompt-02',
      promptTitle: 'Autonomous ReAct Agent Decision Engine',
      currency: 'INR',
      totalAmount: 999,
      paymentProvider: 'mock_gateway',
      paymentStatus: 'paid',
      settledAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ],
  payoutsList: [],
  refundsList: [],
  disputesList: [],
};

export class FinancialLedgerService {
  static async getSellerAnalytics(_sellerId: string): Promise<SellerAnalyticsSummary> {
    return MOCK_SELLER_ANALYTICS;
  }
}
