# 🛒 ShopPilot — Agentic Commerce Platform

> **An AI-powered commerce agent that helps customers discover products, make bounded purchase decisions, and complete payments securely through Razorpay Test Mode.**

## 🚀 Overview

**ShopPilot** is an Agentic Commerce platform built for the Razorpay hackathon.

It combines an AI shopping agent with a merchant catalog, purchase guardrails, explicit payment approval, and Razorpay payment processing.

The agent can understand natural-language shopping requests, search the merchant's catalog, check product availability, recommend suitable products, and initiate a purchase flow.

Every money action is designed to be:

* 🔍 **Explainable** — the agent explains why a product is recommended.
* 🛡️ **Bounded** — spending limits and stock checks prevent unsafe purchases.
* 👤 **Gated** — the user must explicitly approve a payment.
* 📋 **Auditable** — important agent and payment actions are recorded.
* 🔄 **Failure-aware** — failed or cancelled payments are handled gracefully.

---

## ✨ Key Features

### 🤖 AI Buyer

Customers can interact with ShopPilot using natural language.

Example:

> "Show me running products under ₹5000"

The AI agent searches the catalog and returns relevant products.

### 🛍️ Product Catalog

The platform provides an agent-readable product catalog containing:

* Product name
* Category
* Price
* Rating
* Stock availability
* Description

### 📦 Smart Stock Checking

Before purchase, ShopPilot checks whether the requested quantity is available.

This prevents the agent from attempting to purchase unavailable inventory.

### 💰 Purchase Guardrails

ShopPilot uses a spending limit to control autonomous purchasing.

For example:

```text
Spending Limit: ₹5,000
Requested Purchase: ₹4,999
Status: Allowed
```

Purchases exceeding the configured limit are blocked before payment.

### 👤 Explicit Payment Approval

The AI agent cannot silently complete a purchase.

The user sees:

* Product
* Quantity
* Total amount
* Spending limit
* Agent reasoning
* Approval action

The payment flow continues only after explicit approval.

### 💳 Razorpay Integration

ShopPilot integrates **Razorpay Test Mode** for payment processing.

The flow is:

```text
AI Buyer
   ↓
Product Recommendation
   ↓
Stock Check
   ↓
Purchase Approval
   ↓
Razorpay Checkout
   ↓
Payment
   ↓
Server-side Verification
   ↓
PAID / CAPTURED
   ↓
Order Confirmation
```

No real money is used during the demonstration.

### 📋 Order Management

Successful payments create orders containing:

* Order ID
* Product
* Quantity
* Total amount
* Order status
* Payment status

### 🔎 Audit Trail

Important agent actions can be tracked to provide visibility into the commerce workflow.

Example:

```text
PRODUCT_SEARCH
      ↓
STOCK_CHECK
      ↓
PAYMENT_REQUESTED
      ↓
USER_APPROVED
      ↓
PAYMENT_SUCCESS
      ↓
ORDER_CONFIRMED
```

### ❌ Graceful Payment Failure

ShopPilot also handles failed or cancelled payments.

Instead of leaving the user in an unclear state, the application displays a payment-failure state and preserves the transaction flow.

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │      ShopPilot UI    │
                    │    React + TypeScript │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      FastAPI API     │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌─────────────┐  ┌──────────────┐
       │ Groq AI    │   │   SQLite    │  │   Razorpay   │
       │ Agent      │   │  Database   │  │  Test Mode   │
       └────────────┘   └─────────────┘  └──────────────┘
```

---

## 🧰 Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Lucide React

### Backend

* Python
* FastAPI
* SQLite
* Razorpay Python SDK

### AI

* Groq API
* Tool-based AI agent
* Product search
* Product lookup
* Stock verification

### Payments

* Razorpay Test Mode
* Razorpay Standard Checkout
* Server-side payment verification

---

## 📁 Project Structure

```text
ShopPilot/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── lib/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── database.py
│   ├── shoppilot.db
│   ├── requirements.txt
│   └── .env
│
└── README.md
```

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd ShopPilot
```

### 2. Backend setup

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```cmd
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file inside the backend directory:

```env
GROQ_API_KEY=your_groq_api_key

RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
```

⚠️ **Never commit `.env` to GitHub.**

Add this to `.gitignore`:

```gitignore
.env
venv/
__pycache__/
*.pyc
```

### 4. Start the backend

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

### 5. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally run at:

```text
http://localhost:5173
```

---

## 🔌 API Endpoints

| Method | Endpoint           | Purpose                |
| ------ | ------------------ | ---------------------- |
| GET    | `/products`        | Get product catalog    |
| GET    | `/products/search` | Search products        |
| GET    | `/ai/catalog`      | Agent-readable catalog |
| GET    | `/ai/chat`         | Interact with AI buyer |
| POST   | `/order/confirm`   | Confirm order          |
| GET    | `/orders`          | Get orders             |

Payment endpoints are used internally for Razorpay order creation and payment verification.

---

## 🧠 AI Agent Tools

ShopPilot's AI agent uses tools instead of relying only on generated text.

### `search_products`

Searches the merchant catalog based on:

* Product name
* Category
* Description
* Maximum price

### `get_product`

Retrieves detailed information about a specific product.

### `check_stock`

Checks whether the requested quantity is available.

This ensures the agent has access to real catalog information before recommending or purchasing a product.

---

## 🛡️ Commerce Safety Model

ShopPilot follows a simple bounded-agent model:

```text
             CUSTOMER REQUEST
                    │
                    ▼
              AI REASONING
                    │
                    ▼
             CATALOG SEARCH
                    │
                    ▼
              STOCK CHECK
                    │
                    ▼
            SPENDING LIMIT
                    │
             ┌──────┴──────┐
             │             │
           BLOCK         ALLOW
             │             │
             │             ▼
             │       USER APPROVAL
             │             │
             │             ▼
             │      RAZORPAY CHECKOUT
             │             │
             │             ▼
             │       PAYMENT VERIFY
             │             │
             │             ▼
             │       ORDER CONFIRMED
             │
             ▼
          SAFE STOP
```

---

## 🧪 Testing

The application was tested for:

* ✅ AI product search
* ✅ Product recommendation
* ✅ Quantity selection
* ✅ Stock validation
* ✅ Spending-limit validation
* ✅ Explicit payment approval
* ✅ Razorpay Test Mode checkout
* ✅ Successful payment
* ✅ Captured payment
* ✅ Order creation
* ✅ Payment failure handling
* ✅ Payment cancellation handling
* ✅ Audit/activity tracking

---

## 🎯 Razorpay Hackathon Alignment

ShopPilot addresses the challenge of making a merchant **transactable by an AI buyer**.

### Challenge requirement

> Every money action should be explainable, bounded and gated.

### ShopPilot implementation

| Requirement      | ShopPilot                         |
| ---------------- | --------------------------------- |
| Explainable      | AI provides purchase reasoning    |
| Bounded          | Spending limit + stock validation |
| Gated            | Explicit user payment approval    |
| Transactable     | Razorpay Test Mode Checkout       |
| Auditable        | Agent/payment activity            |
| Failure handling | Payment failure state             |

---

## 💡 Example User Journey

```text
User:
"Find me running shoes under ₹5,000"

        ↓

ShopPilot searches catalog

        ↓

Runner Pro Shoes
₹4,999
Rating: 4.5
Stock: Available

        ↓

User selects quantity

        ↓

ShopPilot checks:
✓ Stock available
✓ ₹4,999 <= ₹5,000 spending limit

        ↓

Payment Approval

        ↓

User clicks APPROVE

        ↓

Razorpay Checkout

        ↓

Test payment successful

        ↓

Payment:
PAID / CAPTURED

        ↓

Order confirmed
```

---

## 🔐 Security Notes

* Razorpay secret keys are stored only on the backend.
* Test Mode is used for development and demonstration.
* Payment signatures are verified server-side.
* The AI agent cannot bypass explicit purchase approval.
* Spending limits are enforced before payment.
* `.env` files must not be committed to the repository.

---

## 🚀 Future Improvements

* Multi-product cart purchasing through the agent
* Personalized upselling and cross-selling
* Automated merchant campaigns
* Webhook-based payment reconciliation
* Persistent agent memory
* Multi-agent shopping workflows
* ACP/AP2-compatible agent commerce protocols
* Advanced merchant revenue analytics

---

## 👨‍💻 Built For

**Razorpay Agentic Commerce Hackathon**

**Project:** ShopPilot
**Category:** Agentic Commerce / AI Buyer
**Payment:** Razorpay Test Mode

---

## ⭐ Conclusion

ShopPilot demonstrates how an AI agent can move beyond product recommendations and participate in a **controlled, explainable and gated commerce workflow**.

The system connects AI-driven product discovery with real payment infrastructure while maintaining merchant and customer safeguards at every money-action boundary.
