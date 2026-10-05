import { useEffect, useState } from 'react';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

import { BookstoreHomeView } from '@/views/BookstoreHomeView';
import { BookVisionIntro } from '@/components/BookVisionIntro';
import { AccountView } from '@/views/AccountView';
import { AIBuyerView } from '@/views/AIBuyerView';
import { OrdersView } from '@/views/OrdersView';
import { CartView, type CartItem } from '@/views/CartView';
import { GrowthView } from '@/views/GrowthView';
import { ActivityView } from '@/views/ActivityView';
import { PaymentApprovalView } from '@/views/PaymentApprovalView';
import { PaymentFailureView } from '@/views/PaymentFailureView';
import RentalCheckoutView from './components/RentalCheckoutView';
import RentalManagementView from './components/RentalManagementView';
import { FavoritesView } from '@/views/FavoritesView';
import { CustomersView } from '@/views/CustomersView';

import type { Product } from '@/types';
import type { AccountUser } from '@/types';
import { toBookProduct, type BookApiRecord } from '@/lib/bookProducts';
import { apiFetch } from '@/lib/api';

type ViewKey =
  | 'dashboard'
  | 'account'
  | 'favorites'
  | 'ai-buyer'
  | 'orders'
  | 'cart'
  | 'growth'
  | 'activity'
  | 'payment-approval'
  | 'payment-failure'
  | 'rental-checkout'
  | 'rental-management'
  | 'customers';

const INTRO_SESSION_KEY = 'bookvision-intro-seen-v1';

function shouldPlayIntro() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      window.sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true'
    );
  } catch {
    return false;
  }
}

function App() {
  const [showIntro, setShowIntro] = useState(shouldPlayIntro);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [favoriteBooks, setFavoriteBooks] = useState<Product[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  useEffect(() => {
    let active = true;

    apiFetch('/auth/me')
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        const data = await response.json();
        return data.user as AccountUser;
      })
      .then((user) => {
        if (active) {
          setAccountUser(user);
        }
      })
      .catch(() => {
        if (active) {
          setAccountUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accountUser) {
      setFavoriteBooks([]);
      setFavoritesLoading(false);
      return;
    }

    let active = true;
    setFavoritesLoading(true);
    apiFetch('/favorites')
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.detail || 'Unable to load favorites.');
        }
        if (active && Array.isArray(data)) {
          setFavoriteBooks(data.map((book: BookApiRecord) => toBookProduct(book)));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          console.error('Favorites load error:', error);
          setFavoriteBooks([]);
        }
      })
      .finally(() => {
        if (active) {
          setFavoritesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [accountUser]);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [selectedQuantity, setSelectedQuantity] =
    useState(1);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [rentalProduct, setRentalProduct] =
  useState<Product | null>(null);

  const [rentalQuantity, setRentalQuantity] =
  useState(1);

  const [newRentalId, setNewRentalId] =
    useState<number | null>(null);

  const finishIntro = () => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
    } catch {
      // The intro still dismisses if browser storage is unavailable.
    }

    setShowIntro(false);
  };

  // =========================
  // NAVIGATION
  // =========================

  const navigate = (v: ViewKey) => {
    setView(v);
    if (v !== 'rental-management') {
      setNewRentalId(null);
    }
    setSidebarOpen(false);
  };

  const toggleFavorite = async (product: Product) => {
    if (!accountUser) {
      navigate('account');
      return;
    }

    const isFavorite = favoriteBooks.some((book) => book.id === product.id);
    try {
      const response = await apiFetch(`/favorites/${encodeURIComponent(product.id)}`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });
      if (!response.ok) {
        if (response.status === 401) {
          navigate('account');
        }
        throw new Error('Unable to update favorites.');
      }
      setFavoriteBooks((current) => isFavorite
        ? current.filter((book) => book.id !== product.id)
        : current.some((book) => book.id === product.id)
          ? current
          : [product, ...current]);
    } catch (error) {
      console.error('Favorites update error:', error);
    }
  };

  const favoriteIds = new Set(favoriteBooks.map((product) => product.id));

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAccountUser(null);
      navigate('account');
    }
  };

  // =========================
  // PAYMENT APPROVAL
  // =========================

  const openPaymentApproval = (
    product: Product,
    quantity: number
  ) => {
    setSelectedProduct(product);
    setSelectedQuantity(quantity);

    setView('payment-approval');
    setSidebarOpen(false);
  };
  const openRentalCheckout = (
  product: Product,
  quantity = 1
) => {
  console.log(
    'OPENING RENTAL CHECKOUT:',
    product.name,
    quantity
  );

  setRentalProduct(product);
  setRentalQuantity(quantity);
  setView('rental-checkout');
};

  // =========================
  // ADD TO CART
  // =========================

  const addToCart = (
    product: Product,
    quantity = 1,
    mode: CartItem['mode'] = 'purchase'
  ) => {
    console.log('ADDING TO CART:', product, quantity);

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) =>
          item.product.id === product.id &&
          item.mode === mode
      );

      // Product already exists
      if (existingItem) {
        const newQuantity =
          existingItem.quantity + quantity;

        return currentCart.map((item) =>
          item.product.id === product.id &&
          item.mode === mode
            ? {
                ...item,
                quantity: Math.min(
                  newQuantity,
                  product.stockCount
                ),
              }
            : item
        );
      }

      // New product
      return [
        ...currentCart,
        {
          product,
          mode,
          quantity: Math.min(
            quantity,
            product.stockCount
          ),
        },
      ];
    });
  };

  // =========================
  // UPDATE CART QUANTITY
  // =========================

  const updateCartQuantity = (
    productId: string,
    quantity: number,
    mode: CartItem['mode']
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.product.id !== productId || item.mode !== mode) {
          return item;
        }

        const safeQuantity = Math.max(
          1,
          Math.min(
            quantity,
            item.product.stockCount
          )
        );

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  };

  // =========================
  // REMOVE FROM CART
  // =========================

  const removeFromCart = (
    productId: string,
    mode: CartItem['mode']
  ) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          item.product.id !== productId || item.mode !== mode
      )
    );
  };

  // =========================
  // CART CHECKOUT
  // =========================

  const checkoutFromCart = (
    product: Product,
    quantity: number,
    mode: CartItem['mode']
  ) => {
    if (mode === 'rental') {
      openRentalCheckout(product, quantity);
    } else {
      openPaymentApproval(product, quantity);
    }
  };

  return (
    <>
      {showIntro && <BookVisionIntro onFinish={finishIntro} />}

      <div
        aria-hidden={showIntro}
        className="flex min-h-screen bg-ink-50"
      >

      {/* SIDEBAR */}
      <Sidebar
        current={view}
        onNavigate={navigate}
        open={sidebarOpen}
        isAdmin={accountUser?.is_admin === true}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">

        {/* TOPBAR */}
        <Topbar
          view={view}
          onMenu={() =>
            setSidebarOpen(true)
          }
          user={accountUser}
          onAccount={() => navigate('account')}
          onLogout={logout}
          onNavigate={navigate}
        />

        <main className={`flex-1 overflow-y-auto scrollbar-thin ${
          view === 'dashboard' ? '' : 'p-4 sm:p-6'
        }`}>

          <div
            key={view}
            className="animate-fade-in"
          >

            {/* ========================= */}
            {/* DASHBOARD */}
            {/* ========================= */}

            {view === 'dashboard' && (
              <BookstoreHomeView
                onNavigate={navigate}
                onAddToCart={addToCart}
                onAddRentalToCart={(product, quantity = 1) =>
                  addToCart(product, quantity, 'rental')
                }
                onRent={openRentalCheckout}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
              />
            )}

            {view === 'account' && (
              <AccountView
                user={accountUser}
                authLoading={authLoading}
                onAuthenticated={(user) => {
                  setAccountUser(user);
                  navigate('account');
                }}
                onLogout={logout}
              />
            )}

            {view === 'customers' && <CustomersView />}

            {/* ========================= */}
            {/* AI BUYER */}
            {/* ========================= */}

            {view === 'ai-buyer' && (
              <AIBuyerView
  onNavigate={navigate}
  onProductSelect={openPaymentApproval}
  onAddToCart={addToCart}
  onAddRentalToCart={(product, quantity = 1) =>
    addToCart(product, quantity, 'rental')
  }
  onRent={openRentalCheckout}
  favoriteIds={favoriteIds}
  onToggleFavorite={toggleFavorite}
/>
            )}

            {view === 'favorites' && (
              <FavoritesView
                user={accountUser}
                loading={favoritesLoading}
                products={favoriteBooks}
                onNavigate={navigate}
                onToggleFavorite={toggleFavorite}
                onAddToCart={addToCart}
                onAddRentalToCart={(product, quantity = 1) =>
                  addToCart(product, quantity, 'rental')
                }
                onRent={openRentalCheckout}
              />
            )}

            {/* ========================= */}
            {/* ORDERS */}
            {/* ========================= */}

            {view === 'orders' && (
              <OrdersView
                onManageRentals={() => navigate('rental-management')}
              />
            )}

            {/* ========================= */}
            {/* CART */}
            {/* ========================= */}

            {view === 'cart' && (
              <CartView
                cart={cart}
                onUpdateQuantity={
                  updateCartQuantity
                }
                onRemove={
                  removeFromCart
                }
                onCheckout={
                  checkoutFromCart
                }
              />
            )}

            {view === 'rental-management' && (
  <RentalManagementView
    onBack={() => navigate('ai-buyer')}
    newlyCreatedRentalId={newRentalId}
    isAdmin={accountUser?.is_admin === true}
  />
)}

            {/* ========================= */}
            {/* GROWTH */}
            {/* ========================= */}

            {view === 'growth' && (
              <GrowthView />
            )}

            {/* ========================= */}
            {/* ACTIVITY */}
            {/* ========================= */}

            {view === 'activity' && (
              <ActivityView />
            )}

            {/* ========================= */}
            {/* PAYMENT APPROVAL */}
            {/* ========================= */}

            {view === 'payment-approval' &&
              selectedProduct && (
                <PaymentApprovalView
                  onNavigate={navigate}
                  product={selectedProduct}
                  quantity={selectedQuantity}
                  user={accountUser}
                />
              )}

              {view === 'rental-checkout' && rentalProduct && (
  <RentalCheckoutView
    product={rentalProduct}
    quantity={rentalQuantity}
    onBack={() => navigate('ai-buyer')}
    onSuccess={(data) => {
      setNewRentalId(Number(data.rental_id));
      navigate('rental-management');
    }}
  />
)}

            {/* ========================= */}
            {/* PAYMENT FAILURE */}
            {/* ========================= */}

            {view === 'payment-failure' && (
              <PaymentFailureView
                onNavigate={navigate}
              />
            )}

          </div>

        </main>
      </div>
      </div>
    </>
  );
}

export default App;
