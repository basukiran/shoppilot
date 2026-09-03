import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Search,
  PackageCheck,
  Lightbulb,
  ShoppingCart,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

import type {
  AgentActionType,
  ChatMessage,
  Product,
  ViewKey,
} from '@/types';

import { chatMessages } from '@/data/mockData';
import { ProductCard } from '@/components/ProductCard';
import { cn } from '@/lib/utils';

const actionIcon: Record<AgentActionType, typeof Search> = {
  product_search: Search,
  stock_verification: PackageCheck,
  recommendation: Lightbulb,
  order_creation: ShoppingCart,
  payment_approval: ShieldCheck,
};

const actionLabel: Record<AgentActionType, string> = {
  product_search: 'Product search',
  stock_verification: 'Stock verification',
  recommendation: 'Recommendation',
  order_creation: 'Order creation',
  payment_approval: 'Payment approval',
};

const suggestions = [
  'Find headphones below ₹3000',
  'Find products below ₹5000',
  'Find fitness products',
  'Find electronics',
  'Show me running products',
];

function getProductImage(name: string, category: string): string {
  const value = `${name} ${category}`.toLowerCase();

  if (
    value.includes('headphone') ||
    value.includes('earbud') ||
    value.includes('earphone')
  ) {
    return 'headphones';
  }

  if (
    value.includes('keyboard') ||
    value.includes('mouse')
  ) {
    return 'keyboard';
  }

  if (
    value.includes('stand') ||
    value.includes('laptop')
  ) {
    return 'laptop-stand';
  }

  if (
    value.includes('webcam') ||
    value.includes('camera')
  ) {
    return 'webcam';
  }

  if (
    value.includes('lamp') ||
    value.includes('light')
  ) {
    return 'lamp';
  }

  if (
    value.includes('ssd') ||
    value.includes('storage')
  ) {
    return 'ssd';
  }

  if (
    value.includes('shoe') ||
    value.includes('running')
  ) {
    return 'shoes';
  }

  if (value.includes('watch')) {
    return 'watch';
  }

  if (value.includes('bag')) {
    return 'bag';
  }

  if (value.includes('sock')) {
    return 'socks';
  }

  return 'default';
}

function convertBackendProduct(product: any): Product {
  return {
    id: String(product.id),
    name: product.name,
    brand: 'ShopPilot',
    price: Number(product.price),
    rating: Number(product.rating ?? 0),
    reviews: 0,
    category: product.category,
    image: getProductImage(
      product.name,
      product.category
    ),
    inStock: Number(product.stock ?? 0) > 0,
    stockCount: Number(product.stock ?? 0),
    tags: [],
    originalPrice: undefined,
    matchScore: undefined,
  };
}

export function AIBuyerView({
  onNavigate,
  onProductSelect,
  onAddToCart,
}: {
  onNavigate: (v: ViewKey) => void;

  // Used when going to Payment Approval
  onProductSelect: (
    product: Product,
    quantity: number
  ) => void;

  // Used when adding product to Cart
  onAddToCart: (
    product: Product,
    quantity?: number
  ) => void;
}) {
  const [messages, setMessages] =
    useState<ChatMessage[]>(chatMessages);

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim() || typing) {
      return;
    }

    const userMsg: ChatMessage = {
      id: `u${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((m) => [
      ...m,
      userMsg,
    ]);

    setInput('');
    setTyping(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/ai/chat?message=${encodeURIComponent(
          text
        )}`
      );

      if (!response.ok) {
        throw new Error(
          `Backend request failed: ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        'SHOPPILOT AI RESPONSE:',
        data
      );

      const backendProducts =
        Array.isArray(data.tool_result)
          ? data.tool_result
          : [];

      const agentProducts: Product[] =
        backendProducts.map(
          convertBackendProduct
        );

      const agentMsg: ChatMessage = {
        id: `a${Date.now()}`,
        role: 'agent',

        content:
          data.response ||
          (
            agentProducts.length > 0
              ? 'I found these products for you.'
              : 'I could not find any matching products.'
          ),

        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),

        products:
          agentProducts.length > 0
            ? agentProducts
            : undefined,

        actions: data.tool_used
          ? [
              'product_search',
              'stock_verification',
              'recommendation',
            ]
          : [],
      };

      setMessages((m) => [
        ...m,
        agentMsg,
      ]);

    } catch (error) {
      console.error(
        'ShopPilot AI Error:',
        error
      );

      const errorMsg: ChatMessage = {
        id: `e${Date.now()}`,
        role: 'agent',

        content:
          'Sorry, I could not connect to the ShopPilot agent. Please make sure the FastAPI backend is running on port 8000.',

        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((m) => [
        ...m,
        errorMsg,
      ]);

    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

      {/* ============================= */}
      {/* CHAT */}
      {/* ============================= */}

      <div className="card flex h-[calc(100vh-7rem)] flex-col lg:col-span-2">

        {/* HEADER */}

        <div className="flex items-center gap-3 border-b border-ink-200/70 p-4">

          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">

            <Bot className="h-5 w-5" />

            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success-500 ring-2 ring-white" />

          </div>

          <div>
            <p className="font-display text-sm font-bold text-ink-900">
              Buyer Agent
            </p>

            <p className="text-xs text-success-600">
              Online · responds in seconds
            </p>
          </div>

          <span className="ml-auto chip bg-brand-50 text-brand-700">

            <Sparkles className="h-3 w-3" />

            Autonomous

          </span>

        </div>

        {/* ============================= */}
        {/* MESSAGES */}
        {/* ============================= */}

        <div className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin">

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onNavigate={onNavigate}
              onProductSelect={onProductSelect}
              onAddToCart={onAddToCart}
            />
          ))}

          {typing && (
            <div className="flex items-center gap-2 text-ink-400">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">

                <Bot className="h-4 w-4 text-brand-600" />

              </div>

              <div className="flex items-center gap-1 rounded-2xl bg-ink-100 px-4 py-3">

                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-400"
                  style={{
                    animationDelay: '0ms',
                  }}
                />

                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-400"
                  style={{
                    animationDelay: '200ms',
                  }}
                />

                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-400"
                  style={{
                    animationDelay: '400ms',
                  }}
                />

              </div>

            </div>
          )}

          <div ref={endRef} />

        </div>

        {/* ============================= */}
        {/* INPUT */}
        {/* ============================= */}

        <div className="border-t border-ink-200/70 p-4">

          <div className="mb-3 flex flex-wrap gap-2">

            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={typing}
                className="chip border border-ink-200 bg-white text-ink-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {s}
              </button>
            ))}

          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >

            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="Ask the agent to find, compare, or buy something…"
              className="input flex-1"
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={!input.trim() || typing}
            >

              {typing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}

            </button>

          </form>

        </div>

      </div>

      {/* ============================= */}
      {/* RIGHT SIDEBAR */}
      {/* ============================= */}

      <div className="space-y-4">

        {/* AGENT CAPABILITIES */}

        <div className="card p-5">

          <h3 className="font-display text-sm font-bold text-ink-900">
            Agent capabilities
          </h3>

          <p className="mt-1 text-xs text-ink-500">
            Your Buyer Agent can perform these actions autonomously.
          </p>

          <div className="mt-4 space-y-2">

            {Object.entries(actionLabel).map(
              ([key, label]) => {

                const Icon =
                  actionIcon[
                    key as AgentActionType
                  ];

                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl bg-ink-50 p-3"
                  >

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-soft">

                      <Icon className="h-4 w-4 text-brand-600" />

                    </div>

                    <span className="text-sm font-medium text-ink-700">
                      {label}
                    </span>

                    <span className="ml-auto h-2 w-2 rounded-full bg-success-500" />

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* SPENDING GUARDRAILS */}

        <div className="card p-5">

          <h3 className="font-display text-sm font-bold text-ink-900">
            Spending guardrails
          </h3>

          <div className="mt-3 flex items-center justify-between text-sm">

            <span className="text-ink-500">
              Monthly limit
            </span>

            <span className="font-semibold text-ink-900">
              ₹50,000
            </span>

          </div>

          <div className="mt-3 flex items-center justify-between text-sm">

            <span className="text-ink-500">
              Used this month
            </span>

            <span className="font-semibold text-ink-900">
              ₹16,200
            </span>

          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100">

            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
              style={{
                width: '32%',
              }}
            />

          </div>

          <p className="mt-2 text-xs text-ink-400">
            Agents request approval for any purchase above your threshold.
          </p>

        </div>

      </div>

    </div>
  );
}

/* ================================================= */
/* MESSAGE BUBBLE */
/* ================================================= */

function MessageBubble({
  message,
  onNavigate,
  onProductSelect,
  onAddToCart,
}: {
  message: ChatMessage;

  onNavigate: (v: ViewKey) => void;

  onProductSelect: (
    product: Product,
    quantity: number
  ) => void;

  onAddToCart: (
    product: Product,
    quantity?: number
  ) => void;
}) {

  const isUser =
    message.role === 'user';

  return (
    <div
      className={cn(
        'flex animate-fade-in gap-3',
        isUser && 'flex-row-reverse'
      )}
    >

      {/* AVATAR */}

      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser
            ? 'bg-ink-100 text-ink-600'
            : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white'
        )}
      >

        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}

      </div>

      {/* CONTENT */}

      <div
        className={cn(
          'max-w-[85%] space-y-3',
          isUser && 'items-end'
        )}
      >

        {/* MESSAGE */}

        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-brand-600 text-white'
              : 'bg-ink-50 text-ink-800'
          )}
        >
          {message.content}
        </div>

        {/* ACTIONS */}

        {message.actions &&
          message.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">

              {message.actions.map((a) => {

                const Icon =
                  actionIcon[a];

                return (
                  <span
                    key={a}
                    className="chip border border-ink-200 bg-white text-ink-600"
                  >

                    <Icon className="h-3 w-3 text-brand-500" />

                    {actionLabel[a]}

                  </span>
                );
              })}

            </div>
          )}

        {/* PRODUCTS */}

        {message.products &&
          message.products.length > 0 && (

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

              {message.products.map((p) => (

                <ProductCard
  key={p.id}
  product={p}
  compact
  onAddToCart={onAddToCart}
/>

              ))}

            </div>
          )}

        {/* ORDER BUTTON */}

        {message.role === 'agent' &&
          message.products &&
          message.products.length > 0 && (

            <div className="flex gap-2">

              <button
                onClick={() => {
                  const firstProduct =
                    message.products?.[0];

                  if (firstProduct) {
                    onProductSelect(
                      firstProduct,
                      1
                    );
                  }
                }}
                className="btn-primary text-xs"
              >

                <ShieldCheck className="h-3.5 w-3.5" />

                Prepare order

              </button>

              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  setTimeout(() => {

                    const input =
                      document.querySelector(
                        'input[placeholder*="Ask the agent"]'
                      ) as HTMLInputElement | null;

                    input?.focus();

                  }, 0)
                }
              >
                Refine results
              </button>

            </div>
          )}

        {/* TIMESTAMP */}

        <p
          className={cn(
            'text-[10px] text-ink-400',
            isUser && 'text-right'
          )}
        >
          {message.timestamp}
        </p>

      </div>

    </div>
  );
}