import React, { useState, useEffect } from 'react';
import { Store, Product, CartItem, User, Subscription } from './types';
import { api } from './services/api';
import { HeroLandingView } from './components/HeroLandingView';
import { LoginView } from './components/LoginView';
import { MerchantLoginView } from './components/MerchantLoginView';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { StoreOwnerDashboard } from './components/StoreOwnerDashboard';
import { PublicStorefront } from './components/PublicStorefront';
import { ExploreStoresView } from './components/ExploreStoresView';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { useLanguage } from './context/LanguageContext';

export type AppView = 'landing' | 'login' | 'merchant_login' | 'super_admin' | 'store_owner' | 'storefront' | 'explore_stores';

export const App: React.FC = () => {
  const { isArabic } = useLanguage();


  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [view, setView] = useState<AppView>('landing');
  const [allStores, setAllStores] = useState<Store[]>([]);

  // Public Storefront State
  const [storefrontStore, setStorefrontStore] = useState<Store | null>(null);
  const [storefrontProducts, setStorefrontProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  // Helper to safely navigate and keep URL synchronized with browser history
  const navigateTo = (newView: AppView, params?: { storeId?: string }) => {
    setView(newView);
    const url = new URL(window.location.href);

    if (newView === 'storefront' && params?.storeId) {
      url.searchParams.set('view', 'storefront');
      url.searchParams.set('store_id', params.storeId);
      window.history.pushState({}, '', url.toString());
    } else if (newView === 'merchant_login') {
      url.searchParams.set('view', 'merchant_login');
      url.searchParams.delete('store_id');
      window.history.pushState({}, '', url.toString());
    } else if (newView === 'landing') {
      url.searchParams.set('view', 'landing');
      url.searchParams.delete('store_id');
      window.history.pushState({}, '', url.toString());
    } else if (newView === 'explore_stores') {
      url.searchParams.set('view', 'explore_stores');
      url.searchParams.delete('store_id');
      window.history.pushState({}, '', url.toString());
    } else if (newView === 'store_owner') {
      url.searchParams.set('view', 'store_owner');
      url.searchParams.delete('store_id');
      window.history.pushState({}, '', url.toString());
    } else if (newView === 'super_admin') {
      url.searchParams.set('view', 'super_admin');
      url.searchParams.delete('store_id');
      window.history.pushState({}, '', url.toString());
    } else {
      url.search = '';
      window.history.replaceState({}, '', url.pathname);
    }
  };

  // Initialize App & Routing
  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams(window.location.search);
        const urlView = params.get('view');
        const urlStoreId = params.get('store_id');

        // Fetch all stores for explore/showcase
        try {
          const stores = await api.getStores();
          setAllStores(stores);
        } catch {
          // ignore
        }

        // Restore identity only from the server's HttpOnly session cookie.
        localStorage.removeItem('my_store_user');
        const session = await api.session();
        if (session) {
          setCurrentUser(session.user);
          setCurrentStore(session.store);
          setCurrentSubscription(session.subscription);
        }

        // 0. Explicit Landing Page View (?view=landing)
        if (urlView === 'landing') {
          if (session?.user.role === 'super_admin') navigateTo('super_admin');
          else setView('landing');
          setIsLoading(false);
          return;
        }

        // 1. Direct Public Storefront View (?view=storefront&store_id=...)
        if (urlView === 'storefront' && urlStoreId) {
          const store = await api.getStore(urlStoreId);
          if (store) {
            setStorefrontStore(store);
            const prods = await api.getProducts(store.id);
            setStorefrontProducts(prods);
            setView('storefront');
            setIsLoading(false);
            return;
          }
        }

        // 2. Direct Explore Stores View (?view=explore_stores) - Strictly Super Admin Only
        if (urlView === 'explore_stores') {
          const isSuperAdmin = session?.user.role === 'super_admin';
          if (isSuperAdmin) {
            setView('explore_stores');
          } else {
            setView('landing');
          }
          setIsLoading(false);
          return;
        }

        // 3. Direct Store Owner Dashboard (?view=store_owner)
        if (urlView === 'store_owner') {
          setView(session?.user.role === 'super_admin' ? 'super_admin' : session ? 'store_owner' : 'merchant_login');
          setIsLoading(false);
          return;
        }

        // 4. Direct Super Admin Dashboard (?view=super_admin)
        if (urlView === 'super_admin') {
          setView(session?.user.role === 'super_admin' ? 'super_admin' : 'login');
          setIsLoading(false);
          return;
        }

        // 5. Direct Admin Login Portal (?view=admin_login or ?view=login)
        if (urlView === 'admin_login' || urlView === 'login') {
          setView(session?.user.role === 'super_admin' ? 'super_admin' : 'login');
          setIsLoading(false);
          return;
        }

        // 6. DEFAULT ENTRY: The Main Page (landing)
        if (session?.user.role === 'super_admin') navigateTo('super_admin');
        else setView('landing');
      } catch (err) {
        console.error('Initialization error:', err);
        setView('landing');
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // Handle Login Success
  const handleLoginSuccess = (user: User, store: Store | null, subscription: Subscription | null) => {
    setCurrentUser(user);
    setCurrentStore(store);
    setCurrentSubscription(subscription);
    navigateTo(user.role === 'super_admin' ? 'super_admin' : 'store_owner');
  };

  // Handle Logout
  const handleLogout = async (targetView: AppView = 'merchant_login') => {
    try { await api.logout(); } catch (error) { window.alert(error instanceof Error ? error.message : 'تعذر تسجيل الخروج'); return; }
    setCurrentUser(null);
    setCurrentStore(null);
    setCurrentSubscription(null);
    localStorage.removeItem('my_store_user');
    navigateTo(targetView);
  };

  // Preview Store in Public Storefront (Opens in new tab)
  const handlePreviewStore = async (storeId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?view=storefront&store_id=${storeId}`;
    window.open(url, '_blank');
  };

  // Open storefront inline (from landing page card clicks)
  const handleOpenStorefront = async (storeId?: string) => {
    if (!storeId) return;
    try {
      const store = await api.getStore(storeId);
      if (store) {
        setStorefrontStore(store);
        const prods = await api.getProducts(store.id);
        setStorefrontProducts(prods);
        navigateTo('storefront', { storeId });
      }
    } catch (err) {
      console.error('Error opening storefront:', err);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7fafe] dark:bg-slate-950 flex items-center justify-center p-4 font-cairo">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-3 border-[#0084d6] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {isArabic ? 'جاري الاتصال بقاعدة بيانات Cloudflare D1...' : 'Connecting to Cloudflare D1...'}
          </p>
        </div>
      </div>
    );
  }

  // ─── VIEW ROUTING ────────────────────────────────────────

  // 1. PUBLIC STOREFRONT (Customer view for individual store)
  if (view === 'storefront' && storefrontStore) {
    return (
      <>
        <PublicStorefront
          store={storefrontStore}
          products={storefrontProducts}
          cart={cart}
          onAddToCart={handleAddToCart}
          onOpenCart={() => setIsCartOpen(true)}
          onBackToDashboard={() => {
            // Clean up the URL when returning from storefront
            if (currentUser?.role === 'super_admin') {
              navigateTo('super_admin');
            } else if (currentUser?.role === 'merchant') {
              navigateTo('store_owner');
            } else {
              navigateTo('landing');
            }
          }}
        />
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          store={storefrontStore}
        />
      </>
    );
  }

  // 2. SUPER ADMIN DASHBOARD
  if (view === 'super_admin' && currentUser?.role === 'super_admin') {
    return (
      <SuperAdminDashboard
        onLogout={() => handleLogout('login')}
        onPreviewStore={handlePreviewStore}
        onExploreStores={() => navigateTo('explore_stores')}
      />
    );
  }

  // 3. STORE OWNER DASHBOARD
  if (view === 'store_owner' && currentUser) {
    return (
      <StoreOwnerDashboard
        user={currentUser}
        initialStore={currentStore}
        subscription={currentSubscription}
        onLogout={() => handleLogout('merchant_login')}
        onPreviewStore={handlePreviewStore}
        onBackToHome={() => navigateTo('landing')}
      />
    );
  }

  // 4. MERCHANT LOGIN VIEW (Dedicated External Portal for Store Owners)
  if (view === 'merchant_login') {
    return (
      <MerchantLoginView
        onLoginSuccess={handleLoginSuccess}
        onBackToHome={() => navigateTo('landing')}
      />
    );
  }

  // 5. SUPER ADMIN LOGIN VIEW
  if (view === 'login') {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onBackToHome={() => navigateTo('landing')}
        onGoToMerchantLogin={() => navigateTo('merchant_login')}
      />
    );
  }

  // 6. EXPLORE STORES VIEW (Super Admin Only per user request)
  if (view === 'explore_stores') {
    if (currentUser?.role !== 'super_admin') {
      navigateTo('landing');
      return null;
    }

    return (
      <ExploreStoresView
        stores={allStores}
        onSelectStore={(st) => handleOpenStorefront(st.id)}
        onManageStore={() => navigateTo('super_admin')}
        onCreateStore={() => navigateTo('super_admin')}
        onBackToHome={() => navigateTo('super_admin')}
      />
    );
  }

  // 7. LANDING PAGE
  return (
    <>
      <HeroLandingView
        store={currentStore}
        products={storefrontProducts}
        currentUser={currentUser}
        onOpenDashboard={() => {
          if (currentUser?.role === 'super_admin') {
            navigateTo('super_admin');
          } else if (currentUser?.role === 'merchant') {
            navigateTo('store_owner');
          } else {
            navigateTo('merchant_login');
          }
        }}
        onOpenMerchantLogin={() => {
          if (currentUser) {
            navigateTo('store_owner');
          } else {
            navigateTo('merchant_login');
          }
        }}
        onOpenStorefront={handleOpenStorefront}
        onOpenSetup={() => {
          if (currentUser?.role === 'merchant') {
            navigateTo('store_owner');
          } else if (currentUser?.role === 'super_admin') {
            navigateTo('super_admin');
          } else {
            navigateTo('merchant_login');
          }
        }}
        onLogout={() => handleLogout('merchant_login')}
      />
      <Footer />
    </>
  );
};

export default App;
