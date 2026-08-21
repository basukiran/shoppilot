export type ViewKey = 'dashboard' | 'ai-buyer' | 'growth' | 'activity' | 'payment-approval' | 'payment-failure';

export type AgentActionType =
  | 'product_search'
  | 'stock_verification'
  | 'recommendation'
  | 'order_creation'
  | 'payment_approval';

export type AgentActionStatus = 'success' | 'pending' | 'failed';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  category: string;
  image: string;
  inStock: boolean;
  stockCount: number;
  tags: string[];
  matchScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  products?: Product[];
  actions?: AgentActionType[];
}

export interface AgentAction {
  id: string;
  type: AgentActionType;
  title: string;
  description: string;
  status: AgentActionStatus;
  timestamp: string;
  agent: string;
  meta?: Record<string, string>;
}

export interface Metric {
  label: string;
  value: string;
  delta: number;
  trend: number[];
  accent: 'brand' | 'accent' | 'success' | 'warning' | 'danger';
  icon: 'revenue' | 'conversion' | 'ai-sales' | 'opportunity';
}

export interface GrowthOpportunity {
  id: string;
  title: string;
  impact: string;
  confidence: number;
  category: string;
}

export interface PaymentRequest {
  id: string;
  product: string;
  brand: string;
  amount: number;
  currency: string;
  spendingLimit: number;
  reason: string;
  merchant: string;
  category: string;
  image: string;
  agent: string;
  createdAt: string;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}
