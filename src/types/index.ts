export type ViewKey =
  | 'dashboard'
  | 'account'
  | 'ai-buyer'
  | 'orders'
  | 'cart'
  | 'growth'
  | 'activity'
  | 'payment-approval'
  | 'payment-failure'
  | 'rental-checkout'
  | 'rental-management';
export type AgentActionType =
  | 'product_search'
  | 'stock_verification'
  | 'recommendation'
  | 'order_creation'
  | 'payment_approval';

export type AgentActionStatus = 'success' | 'pending' | 'failed';

export interface AccountUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  author: string;
  description: string;
  coverImage: string;
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

  // Rental information
  isRentable: boolean;
  rentalPrice: number;
  ownershipPrice?: number;
  rentalDurationDays: number;
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

export interface Order {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  total_amount: number;
  status: string;
  payment_status: string;
}
