import os
import json

from groq import Groq
from dotenv import load_dotenv

from database import get_connection

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


# -----------------------------
# TOOL: Search products
# -----------------------------

def search_products(query: str, max_price: float | None = None):
    conn = get_connection()

    sql = """
        SELECT
            id,
            name,
            category,
            price,
            rating,
            stock,
            description
        FROM products
        WHERE stock > 0
        AND (
            name LIKE ?
            OR category LIKE ?
            OR description LIKE ?
        )
    """

    search_term = f"%{query}%"

    params = [
        search_term,
        search_term,
        search_term
    ]

    if max_price is not None:
        sql += " AND price <= ?"
        params.append(max_price)

    sql += " ORDER BY rating DESC"

    products = conn.execute(
        sql,
        params
    ).fetchall()

    conn.close()

    return [dict(product) for product in products]


# -----------------------------
# TOOL DEFINITION FOR THE LLM
# -----------------------------
def get_product(product_id: int):
    conn = get_connection()

    product = conn.execute(
        """
        SELECT
            id,
            name,
            category,
            price,
            rating,
            stock,
            description
        FROM products
        WHERE id = ?
        """,
        (product_id,)
    ).fetchone()

    conn.close()

    if product is None:
        return None

    return dict(product)
def check_stock(product_id: int, quantity: int = 1):
    conn = get_connection()

    product = conn.execute(
        """
        SELECT id, name, price, stock
        FROM products
        WHERE id = ?
        """,
        (product_id,)
    ).fetchone()

    conn.close()

    if product is None:
        return {
            "available": False,
            "reason": "Product not found"
        }

    if product["stock"] < quantity:
        return {
            "available": False,
            "product_id": product_id,
            "product": product["name"],
            "requested_quantity": quantity,
            "available_stock": product["stock"]
        }

    return {
        "available": True,
        "product_id": product_id,
        "product": product["name"],
        "requested_quantity": quantity,
        "available_stock": product["stock"],
        "price": product["price"]
    }
def create_order(product_id: int, quantity: int):
    conn = get_connection()
    product = conn.execute(
        """
        SELECT id, name, price, stock
        FROM products
        WHERE id = ?
        """,
        (product_id,)
        ).fetchone()
    if product is None:
        conn.close()
        return {
            "success": False,
            "reason": "Product not found"
        }

    if quantity <= 0:
        conn.close()
        return {
            "success": False,
            "reason": "Quantity must be greater than 0"
        }

    if product["stock"] < quantity:
        conn.close()
        return {
            "success": False,
            "reason": "Insufficient stock",
            "available_stock": product["stock"]
        }

    total_amount = product["price"] * quantity

    cursor = conn.execute(
        """
        INSERT INTO orders
        (product_id, quantity, total_amount, status, payment_status)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            product_id,
            quantity,
            total_amount,
            "PENDING",
            "NOT_PAID"
        )
    )

    order_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return {
        "success": True,
        "order_id": order_id,
        "product_id": product_id,
        "product": product["name"],
        "quantity": quantity,
        "unit_price": product["price"],
        "total_amount": total_amount,
        "status": "PENDING",
        "payment_status": "NOT_PAID"
    }
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search the ShopPilot product catalog. Use this when the customer wants to find or compare products.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Short product or category search phrase, such as running shoes or earbuds."
                    },
                    "max_price": {
                        "type": "number",
                        "description": "Maximum product price in INR. Use null when there is no price limit."
                    }
                },
                "required": [
                    "query"
                ]
            }
        }
    },
    {
    "type": "function",
    "function": {
        "name": "get_product",
        "description": "Get complete details for a specific ShopPilot product using its product ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "The product ID."
                }
            },
            "required": ["product_id"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "check_stock",
        "description": "Check whether a specific product has enough stock for the requested quantity.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "The product ID."
                },
                "quantity": {
                    "type": "integer",
                    "description": "Number of units requested."
                }
            },
            "required": ["product_id", "quantity"]
        }
    }
}
]

def mark_order_paid(order_id: int, razorpay_payment_id: str):
    conn = get_connection()

    conn.execute(
        """
        UPDATE orders
        SET
            status = ?,
            payment_status = ?
        WHERE id = ?
        """,
        (
            "CONFIRMED",
            "PAID",
            order_id
        )
    )

    conn.commit()

    order = conn.execute(
        """
        SELECT
            orders.id,
            orders.product_id,
            products.name AS product_name,
            orders.quantity,
            orders.total_amount,
            orders.status,
            orders.payment_status
        FROM orders
        JOIN products
            ON orders.product_id = products.id
        WHERE orders.id = ?
        """,
        (order_id,)
    ).fetchone()

    conn.close()

    if order is None:
        return {
            "success": False,
            "reason": "Order not found"
        }

    return {
        "success": True,
        "order_id": order["id"],
        "product_id": order["product_id"],
        "product": order["product_name"],
        "quantity": order["quantity"],
        "total_amount": order["total_amount"],
        "status": order["status"],
        "payment_status": order["payment_status"],
        "razorpay_payment_id": razorpay_payment_id
    }


# -----------------------------
# MAIN AGENT
# -----------------------------

def ask_agent(user_message: str):

    messages = [
        {
            "role": "system",
            "content": """
You are ShopPilot, an AI commerce agent.

You help customers discover products from the ShopPilot catalog.

When the customer asks about products, use the search_products tool.

IMPORTANT:
- All prices in the catalog are in Indian Rupees (INR).
- Always display prices using ₹.
- Never convert INR prices to another currency.
- Never change the numerical price returned by a tool.
- Checking stock does NOT create an order.
- Never claim that an order or purchase has been created.
- Do not create orders or payments yet.
"""
        },
        {
            "role": "user",
            "content": user_message
        }
    ]

    # -----------------------------
    # FIRST LLM CALL
    # -----------------------------

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0
    )

    assistant_message = response.choices[0].message

    # -----------------------------
    # CHECK WHETHER TOOL WAS CALLED
    # -----------------------------

    if assistant_message.tool_calls:

        messages.append(
            assistant_message
        )

        for tool_call in assistant_message.tool_calls:

            function_name = tool_call.function.name

            arguments = json.loads(
                tool_call.function.arguments
            )

            if function_name == "search_products":
                result = search_products(
                query=arguments["query"],
                max_price=arguments.get("max_price")
    )

            elif function_name == "get_product":
                result = get_product(
                product_id=arguments["product_id"]
    )

            elif function_name == "check_stock":
                result = check_stock(
                product_id=arguments["product_id"],
                quantity=arguments["quantity"]
    )

            else:
                result = {
                    "error": f"Unknown tool: {function_name}"
    }


            messages.append(
    {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result)
    }
)

        # -----------------------------
        # SECOND LLM CALL
        # -----------------------------

        final_response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=messages,
        temperature=0.2,
        tool_choice="none"
)

        return {
    "customer_request": user_message,
    "tool_used": True,
    "tool": "search_products",
    "tool_result": result,
    "response": final_response.choices[0].message.content
}

    # -----------------------------
    # NO TOOL NEEDED
    # -----------------------------

    return {
        "customer_request": user_message,
        "tool_used": False,
        "response": assistant_message.content
    }