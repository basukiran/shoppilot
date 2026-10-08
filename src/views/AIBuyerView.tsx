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
  RefreshCw,
} from 'lucide-react';

import type {
  AgentActionType,
  ChatMessage,
  Product,
} from '@/types';

import { ProductCard } from '@/components/ProductCard';
import { toBookProduct } from '@/lib/bookProducts';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';


// =====================================================
// ACTION ICONS
// =====================================================

const actionIcon: Record<
  AgentActionType,
  typeof Search
> = {
  product_search: Search,
  stock_verification: PackageCheck,
  recommendation: Lightbulb,
  order_creation: ShoppingCart,
  payment_approval: ShieldCheck,
};


// =====================================================
// ACTION LABELS
// =====================================================

const actionLabel: Record<
  AgentActionType,
  string
> = {
  product_search: 'Book search',
  stock_verification: 'Stock verification',
  recommendation: 'Recommendation',
  order_creation: 'Order creation',
  payment_approval: 'Payment approval',
};


// =====================================================
// SUGGESTIONS
// =====================================================

const suggestions = [
  'I want a Python book for beginners',
  'Recommend me an AI/ML book',
  'I need a book for learning SQL',
  'Show me books under ₹500',
  'Which programming book is suitable for a beginner?',
  'I want to rent a programming book',
];


// =====================================================
// AI BUYER VIEW
// =====================================================

export function AIBuyerView({
  onNavigate,
  onProductSelect,
  onAddToCart,
  onAddRentalToCart,
  onRent,
  favoriteIds,
  onToggleFavorite,
}: {
  onNavigate: (v: any) => void;

  onProductSelect: (
    product: Product,
    quantity: number
  ) => void;

  onAddToCart: (
    product: Product,
    quantity?: number
  ) => void;

  onAddRentalToCart: (
    product: Product,
    quantity?: number
  ) => void;

  onRent?: (
    product: Product,
    quantity?: number
  ) => void;
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (product: Product) => void;
}) {
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] =
    useState('');

  const [typing, setTyping] =
    useState(false);

  const endRef =
    useRef<HTMLDivElement>(null);


  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [
    messages,
    typing,
  ]);


  // ===================================================
  // SEND MESSAGE
  // ===================================================

  const send = async (
    text: string
  ) => {
    if (
      !text.trim() ||
      typing
    ) {
      return;
    }


    // ================================================
    // USER MESSAGE
    // ================================================

    const userMsg: ChatMessage = {
      id:
        `u${Date.now()}`,

      role: 'user',

      content:
        text,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        ),
    };


    setMessages(
      (m) => [
        ...m,
        userMsg,
      ]
    );

    setInput('');
    setTyping(true);


    try {

      // ==============================================
      // 1. ASK AI BACKEND
      // ==============================================

      const response =
        await apiFetch(
          `/ai/chat?message=${encodeURIComponent(
            text
          )}`
        );


      if (!response.ok) {
        throw new Error(
          `Backend request failed: ${response.status}`
        );
      }


      const data =
        await response.json();


      console.log(
        '================================='
      );

      console.log(
        'BOOKVISION AI RESPONSE:',
        data
      );

      console.log(
        '================================='
      );


      // ==============================================
      // 2. GET AI PRODUCT RESULTS
      // ==============================================

      const backendProducts =
        Array.isArray(
          data.tool_result
        )
          ? data.tool_result
          : [];


      console.log(
        'AI PRODUCTS:',
        backendProducts
      );


      // ==============================================
      // 3. GET FULL PRODUCTS FROM DATABASE
      // ==============================================

      let fullProducts: any[] = [];


      try {

        const fullProductsResponse =
          await apiFetch('/products');


        if (
          fullProductsResponse.ok
        ) {

          const productsData =
            await fullProductsResponse.json();


          fullProducts =
            Array.isArray(
              productsData
            )
              ? productsData
              : [];


          console.log(
            'FULL PRODUCTS FROM DATABASE:',
            fullProducts
          );

        } else {

          console.warn(
            'Could not fetch full product data:',
            fullProductsResponse.status
          );

        }

      } catch (productError) {

        console.warn(
          'Could not load full product information:',
          productError
        );

      }


      // ==============================================
      // 4. MERGE AI PRODUCT + DATABASE PRODUCT
      // ==============================================

      const mergedProducts =
        backendProducts.map(
          (aiProduct: any) => {

            const fullProduct =
              fullProducts.find(
                (dbProduct: any) =>
                  String(
                    dbProduct.id
                  ) ===
                  String(
                    aiProduct.id
                  )
              );


            const merged =
              {
                ...(aiProduct ?? {}),

                ...(fullProduct ?? {}),
              };


            console.log(
              '---------------------------------'
            );

            console.log(
              'PRODUCT:',
              merged.name
            );

            console.log(
              'ID:',
              merged.id
            );

            console.log(
              'is_rentable:',
              merged.is_rentable
            );

            console.log(
              'rental_price:',
              merged.rental_price
            );

            console.log(
              'ownership_price:',
              merged.ownership_price
            );

            console.log(
              'rental_duration_days:',
              merged.rental_duration_days
            );

            console.log(
              '---------------------------------'
            );


            return merged;
          }
        );


      // ==============================================
      // 5. CONVERT TO FRONTEND PRODUCT
      // ==============================================

      const agentProducts: Product[] =
        mergedProducts.map(
          toBookProduct
        );


      console.log(
        'FINAL FRONTEND PRODUCTS:',
        agentProducts
      );


      // ==============================================
      // 6. AGENT MESSAGE
      // ==============================================

      const agentMsg:
        ChatMessage = {

        id:
          `a${Date.now()}`,

        role:
          'agent',

        content:
          data.response ??
          (
            agentProducts.length > 0
              ? 'I found these products for you.'
              : 'I could not find any matching products.'
          ),

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          ),

        products:
          agentProducts.length > 0
            ? agentProducts
            : undefined,

        actions:
          data.tool_used
            ? [
                'product_search',
                'stock_verification',
                'recommendation',
              ]
            : [],
      };


      // ==============================================
      // 7. ADD AGENT MESSAGE
      // ==============================================

      setMessages(
        (m) => [
          ...m,
          agentMsg,
        ]
      );


    } catch (error) {

      console.error(
        'BookVision AI Error:',
        error
      );


      const errorMsg:
        ChatMessage = {

        id:
          `e${Date.now()}`,

        role:
          'agent',

        content:
          'Sorry, I could not connect to the BookVision agent. Please make sure the FastAPI backend is running on port 8000.',

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          ),
      };


      setMessages(
        (m) => [
          ...m,
          errorMsg,
        ]
      );


    } finally {

      setTyping(false);

    }
  };


  // ===================================================
  // UI
  // ===================================================

  return (

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

      {/* ============================================ */}
      {/* CHAT */}
      {/* ============================================ */}

      <div className="card flex h-[calc(100vh-7rem)] flex-col lg:col-span-2">

        {/* HEADER */}

        <div className="flex items-center gap-3 border-b border-ink-200/70 p-4">

          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">

            <Bot className="h-5 w-5" />

            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success-500 ring-2 ring-white" />

          </div>


          <div>

            <p className="font-display text-sm font-bold text-ink-900">

              BookVision Buyer Agent

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


        {/* ========================================== */}
        {/* MESSAGES */}
        {/* ========================================== */}

        <div className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin">

          {messages.length === 0 && !typing && (
            <p className="rounded-xl bg-brand-50 p-4 text-sm leading-6 text-ink-600">
              Tell me what you’re looking for, and I’ll find books from the live BookVision catalog.
            </p>
          )}

          {messages.map(
            (m) => (

              <MessageBubble
                key={m.id}

                message={m}

                onNavigate={
                  onNavigate
                }

                onProductSelect={
                  onProductSelect
                }

                onAddToCart={
                  onAddToCart
                }

                onAddRentalToCart={
                  onAddRentalToCart
                }

                onRent={
                  onRent
                }

                favoriteIds={favoriteIds}

                onToggleFavorite={onToggleFavorite}
              />

            )
          )}


          {/* TYPING */}

          {typing && (

            <div className="flex items-center gap-2 text-ink-400">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">

                <Bot className="h-4 w-4 text-brand-600" />

              </div>


              <div className="flex items-center gap-1 rounded-2xl bg-ink-100 px-4 py-3">

                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-400"
                  style={{
                    animationDelay:
                      '0ms',
                  }}
                />

                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-400"
                  style={{
                    animationDelay:
                      '200ms',
                  }}
                />

                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-400"
                  style={{
                    animationDelay:
                      '400ms',
                  }}
                />

              </div>

            </div>

          )}


          <div
            ref={endRef}
          />

        </div>


        {/* ========================================== */}
        {/* INPUT */}
        {/* ========================================== */}

        <div className="border-t border-ink-200/70 p-4">

          <div className="mb-3 flex flex-wrap gap-2">

            {suggestions.map(
              (s) => (

                <button
                  key={s}

                  onClick={() =>
                    send(s)
                  }

                  disabled={
                    typing
                  }

                  className="chip border border-ink-200 bg-white text-ink-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {s}

                </button>

              )
            )}

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
                setInput(
                  e.target.value
                )
              }

              placeholder="Ask the agent to find, compare, or buy something…"

              className="input flex-1"
            />


            <button
              type="submit"

              className="btn-primary"

              disabled={
                !input.trim() ||
                typing
              }
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


      {/* ============================================ */}
      {/* RIGHT SIDEBAR */}
      {/* ============================================ */}

      <div className="space-y-4">

        {/* RENTAL INFO */}

        <div className="card border border-brand-100 bg-brand-50/40 p-5">

          <div className="flex items-center gap-2">

            <RefreshCw className="h-4 w-4 text-brand-600" />

            <h3 className="font-display text-sm font-bold text-brand-800">

              Book rentals

            </h3>

          </div>


          <p className="mt-2 text-xs leading-relaxed text-ink-600">

            Rental availability, price, and duration come from each book's
            catalog record. Ask for a rentable title to see its current terms.

          </p>

        </div>

      </div>

    </div>
  );
}


// =====================================================
// MESSAGE BUBBLE
// =====================================================

function MessageBubble({
  message,
  onNavigate,
  onProductSelect,
  onAddToCart,
  onAddRentalToCart,
  onRent,
  favoriteIds,
  onToggleFavorite,
}: {
  message: ChatMessage;

  onNavigate: (
    v: any
  ) => void;

  onProductSelect: (
    product: Product,
    quantity: number
  ) => void;

  onAddToCart: (
    product: Product,
    quantity?: number
  ) => void;

  onAddRentalToCart: (
    product: Product,
    quantity?: number
  ) => void;

  onRent?: (
    product: Product,
    quantity?: number
  ) => void;
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (product: Product) => void;
}) {

  const isUser =
    message.role === 'user';


  return (

    <div
      className={cn(
        'flex animate-fade-in gap-3',
        isUser &&
          'flex-row-reverse'
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
          isUser &&
            'items-end'
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

              {message.actions.map(
                (a) => {

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

                }
              )}

            </div>

          )}


        {/* ========================================== */}
        {/* PRODUCTS */}
        {/* ========================================== */}

        {message.products &&
          message.products.length > 0 && (

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

              {message.products.map(
                (p) => (

                  <ProductCard
                    key={p.id}

                    product={p}

                    isFavorite={favoriteIds.has(p.id)}

                    onToggleFavorite={onToggleFavorite}

                    compact

                    onAddToCart={
                      onAddToCart
                    }

                    onAddRentalToCart={
                      onAddRentalToCart
                    }

                    onRent={
                      onRent ??
                      (() => {
                        console.warn(
                          'Rental callback is not connected.'
                        );
                      })
                    }
                  />

                )
              )}

            </div>

          )}


        {/* ========================================== */}
        {/* BUY BUTTON */}
        {/* ========================================== */}

        {message.role === 'agent' &&
          message.products &&
          message.products.length > 0 && (

            <div className="flex gap-2">

              <button
                onClick={() => {

                  const firstProduct =
                    message.products?.[0];


                  if (
                    firstProduct
                  ) {

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
                  setTimeout(
                    () => {

                      const input =
                        document.querySelector(
                          'input[placeholder*="Ask the agent"]'
                        ) as HTMLInputElement | null;


                      input?.focus();

                    },
                    0
                  )
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
            isUser &&
              'text-right'
          )}
        >

          {message.timestamp}

        </p>

      </div>

    </div>

  );
}
