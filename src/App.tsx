import { useState } from 'react';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

import { DashboardView } from '@/views/DashboardView';
import { AIBuyerView } from '@/views/AIBuyerView';
import { OrdersView } from '@/views/OrdersView';
import { CartView, type CartItem } from '@/views/CartView';
import { GrowthView } from '@/views/GrowthView';
import { ActivityView } from '@/views/ActivityView';
import { PaymentApprovalView } from '@/views/PaymentApprovalView';
import { PaymentFailureView } from '@/views/PaymentFailureView';

import type { Product, ViewKey } from '@/types';

function App() {
  const [view, setView] = useState<ViewKey>('dashboard');

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [selectedQuantity, setSelectedQuantity] =
    useState(1);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // =========================
  // NAVIGATION
  // =========================

  const navigate = (v: ViewKey) => {
    setView(v);
    setSidebarOpen(false);
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

  // =========================
  // ADD TO CART
  // =========================

  const addToCart = (
    product: Product,
    quantity = 1
  ) => {
    console.log('ADDING TO CART:', product, quantity);

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id
      );

      // Product already exists
      if (existingItem) {
        const newQuantity =
          existingItem.quantity + quantity;

        return currentCart.map((item) =>
          item.product.id === product.id
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
    quantity: number
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.product.id !== productId) {
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
    productId: string
  ) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.product.id !== productId
      )
    );
  };

  // =========================
  // CART CHECKOUT
  // =========================

  const checkoutFromCart = (
    product: Product,
    quantity: number
  ) => {
    openPaymentApproval(
      product,
      quantity
    );
  };

  return (
    <div className="flex min-h-screen bg-ink-50">

      {/* SIDEBAR */}
      <Sidebar
        current={view}
        onNavigate={navigate}
        open={sidebarOpen}
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
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">

          <div
            key={view}
            className="animate-fade-in"
          >

            {/* ========================= */}
            {/* DASHBOARD */}
            {/* ========================= */}

            {view === 'dashboard' && (
              <DashboardView
                onNavigate={navigate}
              />
            )}

            {/* ========================= */}
            {/* AI BUYER */}
            {/* ========================= */}

            {view === 'ai-buyer' && (
              <AIBuyerView
                onNavigate={navigate}
                onProductSelect={
                  openPaymentApproval
                }
                onAddToCart={addToCart}
              />
            )}

            {/* ========================= */}
            {/* ORDERS */}
            {/* ========================= */}

            {view === 'orders' && (
              <OrdersView />
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
  );
}

export default App;