export type UserRole = 'super_admin' | 'merchant';

export interface User {
  id: string;
  username: string;
  email?: string;
  password?: string;
  role: UserRole;
  store_id?: string | null;
  is_active: number;
  created_at?: string;
}

export type SubscriptionStatus = 'active' | 'trial' | 'awaiting_activation' | 'scheduled' | 'unsubscribed' | 'expired' | 'suspended' | 'cancelled';

export interface Subscription {
  id: string;
  store_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  price: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Store {
  id: string;
  name: string;
  activity_type: string;
  whatsapp_number: string;
  currency: string;
  bio: string;
  facebook_url: string;
  logo_data?: string;
  is_active: number;
  effective_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MerchantDetail {
  store: Store;
  user: User;
  subscription: Subscription;
  productCount?: number;
  effective_status?: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_data: string; // Strictly stored in Cloudflare D1
  is_available: number; // 1 or 0
  created_at?: string;
  updated_at?: string;
}

export interface TrafficStats {
  totalVisits: number;
  todayVisits: number;
  yesterdayVisits?: number;
  growthRate?: number;
  devices: Array<{ device: string; count: number; percentage?: number }>;
  recent: Array<{ id: string; visited_at: string; device: string; referrer: string; page: string }>;
  daily: Array<{
    day: string;
    count: number;
    date?: string;
    active?: boolean;
    dayNumber?: string;
    shortDate?: string;
    fullFormatted?: string;
  }>;
  rangeVisits?: number;
  dailyAverage?: number;
  peakDay?: { count: number; fullFormatted?: string; date?: string; day?: string };
  ordersSummary?: {
    total_orders: number;
    total_revenue: number;
  };
  productsSummary?: {
    total_products: number;
    available_products: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'new' | 'contacted' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface StoreOrder {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  items_json: string;
  total_price: number;
  status: OrderStatus | 'completed_via_whatsapp';
  created_at: string;
}

export interface CustomerOrder {
  store_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  notes?: string;
  items: CartItem[];
  total_price: number;
}
