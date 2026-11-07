import { Store, Product, TrafficStats, CustomerOrder, OrderStatus, StoreOrder, User, Subscription, MerchantDetail, SubscriptionFeatureKey, SubscriptionPaymentRequest } from '../types';



export function createStoreApi(API_BASE='/api/store') { return {
  async session(): Promise<{user: User; store: Store | null; subscription: Subscription | null} | null> {
    const res = await fetch(`${API_BASE}/auth/session`, { cache: 'no-store' });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error('تعذر التحقق من تسجيل الدخول');
    return res.json();
  },
  async logout(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/logout`, {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    if (!res.ok) throw new Error('تعذر تسجيل الخروج. حاول مرة أخرى.');
  },
  async logoutHubSession(): Promise<void> {
    const res = await fetch('/api/ecosystem/logout', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    if (!res.ok) throw new Error('تعذر تسجيل الخروج من دعيدر هب. حاول مرة أخرى.');
  },
  // 1. Authentication
  async login(username: string, password: string, linkIdentity=false): Promise<{
    user: User;
    store: Store | null;
    subscription: Subscription | null;
  }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, link_identity:linkIdentity }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل تسجيل الدخول');
    }
    return {
      user: data.user,
      store: data.store,
      subscription: data.subscription,
    };
  },

  // 1.5. Merchant Self Registration
  async registerMerchant(merchantData: {
    store_name: string;
    activity_type: string;
    whatsapp_number: string;
    currency?: string;
    email: string;
    username?: string;
    password: string;
  }): Promise<{
    user: User;
    store: Store | null;
    subscription: Subscription | null;
  }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merchantData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل تسجيل حساب المتجر');
    }
    return {
      user: data.user,
      store: data.store,
      subscription: data.subscription,
    };
  },

  // 2. Super Admin: Merchants Management
  async getMerchants(): Promise<MerchantDetail[]> {
    const res = await fetch(`${API_BASE}/admin/merchants`);
    if (!res.ok) throw new Error('فشل جلب قائمة المتاجر');
    const data = await res.json();
    return data.merchants || [];
  },

  async createMerchant(merchantData: {
    store_name: string;
    activity_type: string;
    whatsapp_number: string;
    currency?: string;
    email?: string;
    username: string;
    password: string;
    plan_name?: string;
    duration_months?: number;
    price?: number;
  }): Promise<MerchantDetail> {
    const res = await fetch(`${API_BASE}/admin/merchants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merchantData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل إنشاء حساب التاجر');
    }
    return data.merchant;
  },

  async toggleMerchantStatus(storeId: string): Promise<number> {
    const res = await fetch(`${API_BASE}/admin/merchants/${storeId}/toggle-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل تحديث حالة المتجر');
    }
    return data.is_active;
  },

  async deleteStore(storeId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/merchants/${storeId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل حذف المتجر');
    }
  },

  async renewSubscription(storeId: string, months: number = 12): Promise<Subscription> {
    const res = await fetch(`${API_BASE}/admin/merchants/${storeId}/renew-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ months }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'فشل تجديد الاشتراك');
    }
    return data.subscription;
  },

  async getAdminAnalytics(): Promise<{ totalOrders: number; totalProducts: number; monthMap: Record<string, number> }> {
      const res = await fetch(`${API_BASE}/admin/analytics`);
      const data = await res.json();
      if (!res.ok || !data.analytics) throw new Error(data.error || 'تعذر تحميل مؤشرات المتاجر');
      return data.analytics;
  },

  // 3. Store info & settings
  async getStores(): Promise<Store[]> {
    const res = await fetch(`${API_BASE}/stores`);
    if (!res.ok) throw new Error('Failed to fetch stores');
    const data = await res.json();
    return data.stores || [];
  },

  async getStore(storeId?: string): Promise<Store | null> {
    const query = storeId ? `?id=${encodeURIComponent(storeId)}` : '';
    const res = await fetch(`${API_BASE}/store${query}`);
    if (!res.ok) throw new Error('Failed to fetch store');
    const data = await res.json();
    return data.store;
  },

  async createStore(storeData: { name: string; activity_type?: string; whatsapp_number: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/create-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'تعذر إنشاء المتجر. تحقق من الاتصال وحاول مرة أخرى.');
    }
  },

  async activateFreeStore(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/activate-free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'تعذر تفعيل الاشتراك المجاني. حاول مرة أخرى.');
  },

  async createSubscriptionPaymentRequest(features: SubscriptionFeatureKey[], proof: string): Promise<{id:string;status:'pending';monthly_total:number;annual_total:number;due_now:number}> {
    const res=await fetch(`${API_BASE}/subscription-requests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({features,proof})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.success)throw new Error(data.error||'تعذر إرسال طلب الاشتراك');
    return data.request;
  },

  async getSubscriptionPaymentRequests(): Promise<SubscriptionPaymentRequest[]> {
    const res=await fetch(`${API_BASE}/admin/subscription-requests`,{cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.success)throw new Error(data.error||'تعذر تحميل طلبات الاشتراك');
    return data.requests||[];
  },

  async getSubscriptionPaymentProof(id:string): Promise<Blob> {
    const res=await fetch(`${API_BASE}/admin/subscription-requests/${encodeURIComponent(id)}/proof`,{cache:'no-store'});
    if(!res.ok)throw new Error('تعذر تحميل إيصال التحويل');
    return res.blob();
  },

  async reviewSubscriptionPaymentRequest(id:string,status:'approved'|'rejected'): Promise<void> {
    const res=await fetch(`${API_BASE}/admin/subscription-requests/${encodeURIComponent(id)}/review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.success)throw new Error(data.error||'تعذرت مراجعة طلب الاشتراك');
  },

  async saveStore(storeData: Partial<Store>): Promise<Store> {
    const res = await fetch(`${API_BASE}/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData),
    });
    if (!res.ok) throw new Error('Failed to save store');
    const data = await res.json();
    return data.store;
  },

  // 4. Products for specific store
  async getProducts(storeId?: string): Promise<Product[]> {
    const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
    const res = await fetch(`${API_BASE}/products${query}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    return data.products;
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'تعذر حفظ المنتج. تحقق من بياناته وحاول مرة أخرى.');
    return data.product;
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'تعذر تعديل المنتج. حاول مرة أخرى.');
    return data.product;
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'تعذر حذف المنتج. حاول مرة أخرى.');
  },

  // 5. Orders
  async getOrders(storeId?: string): Promise<StoreOrder[]> {
    const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
    const res = await fetch(`${API_BASE}/orders${query}`);
    if (!res.ok) throw new Error(res.status===401?'انتهت الجلسة. سجل دخولك مرة أخرى.':'تعذر تحميل الطلبات. حاول مرة أخرى.');
    const data = await res.json();
    return data.orders || [];
  },

  async recordOrder(order: CustomerOrder): Promise<string> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || typeof data.orderId !== 'string') throw new Error(data.error || 'تعذر تسجيل الطلب. حاول مرة أخرى.');
    return data.orderId;
  },

  async updateOrderStatus(orderId: string, storeId: string, status: OrderStatus): Promise<void> {
    const query = new URLSearchParams({ id: orderId, store_id: storeId });
    const res = await fetch(`${API_BASE}/orders?${query}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'تعذر تحديث حالة الطلب. حاول مرة أخرى.');
  },

  // 6. Diagnostic & Traffic
  async getTrafficStats(storeId?: string, range: string = '7days'): Promise<TrafficStats> {
    try {
      const params = new URLSearchParams();
      if (storeId) params.append('store_id', storeId);
      if (range) params.append('range', range);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/stats${query}`);
      if (!res.ok) return { totalVisits: 0, todayVisits: 0, devices: [], recent: [], daily: [] };
      const data = await res.json();
      return data.stats || { totalVisits: 0, todayVisits: 0, devices: [], recent: [], daily: [] };
    } catch {
      return { totalVisits: 0, todayVisits: 0, devices: [], recent: [], daily: [] };
    }
  },

  async recordVisit(referrer?: string, storeId?: string, device?: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrer, store_id: storeId, device }),
      });
    } catch {}
  },

  async simulateVisit(storeId?: string): Promise<TrafficStats> {
    const res = await fetch(`${API_BASE}/simulate-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId }),
    });
    const data = await res.json();
    return data.stats;
  },

  async simulateOrder(storeId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/simulate-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId }),
    });
    const data = await res.json();
    return data;
  },

  async resetStats(storeId?: string): Promise<void> {
    await fetch(`${API_BASE}/reset-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId }),
    });
  },

  async getD1Status(): Promise<any> {
    const res = await fetch(`${API_BASE}/d1-status`);
    return res.json();
  }
}; }
export const api=createStoreApi();
