import os
import json
import re

from groq import Groq
from dotenv import load_dotenv

from database import get_connection


SEARCH_STOP_WORDS = {
    "a", "about", "all", "an", "and", "are", "book", "books",
    "can", "do", "find", "for", "from", "help", "i", "in", "is",
    "it", "me", "my", "need", "of", "on", "please", "recommend",
    "rent", "rental", "show", "suitable", "the", "this", "to", "under",
    "want", "which", "with", "below", "beginner", "beginners", "learning",
}

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


# -----------------------------
# TOOL: Search products
# -----------------------------

def search_products(
    query: str,
    max_price: float | None = None,
    rentable_only: bool = False
):
    conn = get_connection()

    sql = """
        SELECT
            id,
            name,
            author,
            category,
            price,
            rating,
            stock,
            description,
            cover_image,
            is_rentable,
            rental_price,
            ownership_price,
            rental_duration_days
        FROM products
        WHERE is_book = 1
        AND stock > 0
    """

    terms = []
    for term in re.findall(r"[a-z0-9]+", query.lower()):
        if term in SEARCH_STOP_WORDS or term.isdigit():
            continue
        normalized_term = (
            term[:-1]
            if term.endswith("s") and len(term) > 4 and term != "sapiens"
            else term
        )
        if normalized_term not in terms:
            terms.append(normalized_term)

    params = []
    if terms:
        term_conditions = []
        for term in terms:
            term_conditions.append(
                "(name LIKE ? OR author LIKE ? OR category LIKE ? OR description LIKE ?)"
            )
            params.extend([f"%{term}%"] * 4)
        sql += " AND (" + " OR ".join(term_conditions) + ")"

    if max_price is not None:
        sql += " AND price <= ?"
        params.append(max_price)

    if rentable_only:
        sql += " AND is_rentable = 1"

    sql += " ORDER BY rating DESC"

    products = conn.execute(
        sql,
        params
    ).fetchall()

    conn.close()

    def matches_terms(product):
        searchable_text = " ".join(
            str(product[field] or "")
            for field in ("name", "author", "category", "description")
        ).lower()
        return any(
            re.search(
                rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])",
                searchable_text
            )
            if len(term) <= 2
            else term in searchable_text
            for term in terms
        )

    return [
        dict(product)
        for product in products
        if not terms or matches_terms(product)
    ]


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
            author,
            category,
            price,
            rating,
            stock,
            description,
            cover_image,
            is_rentable,
            rental_price,
            ownership_price,
            rental_duration_days
        FROM products
        WHERE id = ? AND is_book = 1
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
        WHERE id = ? AND is_book = 1
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
def create_order(product_id: int, quantity: int, user_id: int | None = None):
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
        (product_id, quantity, total_amount, status, payment_status, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            product_id,
            quantity,
            total_amount,
            "PENDING",
            "NOT_PAID",
            user_id
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
            "description": "Search in-stock BookVision books by title, author, topic, or subject. Use rentable_only for rental requests and max_price when the customer gives a budget.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A book title, author, category, or subject to search for."
                    },
                    "max_price": {
                        "type": "number",
                        "description": "Maximum book price in INR. Use only when the customer gives a price limit."
                    },
                    "rentable_only": {
                        "type": "boolean",
                        "description": "Set true when the customer specifically wants to rent a book."
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
        "description": "Get complete details for a specific book using its product ID.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "The database ID of a book."
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
            "description": "Check whether a specific book has enough stock for the requested quantity.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "The database ID of a book."
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
You are BookVision, an AI book-shopping agent.

You help customers find books in the live BookVision catalog by title, author,
subject, category, description, level, and reading goal.

For book recommendations and availability questions, use search_products.
Pass concise topic/title/author terms rather than relying on generated facts.
Extract a stated maximum price into max_price. For a request to rent, set
rentable_only to true. Use get_product for more catalog details and check_stock
when the customer asks about a specific quantity.

IMPORTANT:
- All prices in the catalog are in Indian Rupees (INR).
- Always display prices using ₹.
- Never convert INR prices to another currency.
- Never change the numerical price returned by a tool.
- Use only returned catalog data for titles, authors, categories, descriptions,
  ratings, prices, stock, and rental availability or terms.
- If the search returns no matching book, say so; do not invent a title,
    availability, rating, price, or rental option.
- Do not describe a book as suitable for a level or goal unless its catalog
    description supports that recommendation.
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

        book_results = {}

        for tool_call in assistant_message.tool_calls:

            function_name = tool_call.function.name

            arguments = json.loads(
                tool_call.function.arguments
            )

            if function_name == "search_products":
                result = search_products(
                query=arguments["query"],
                max_price=arguments.get("max_price"),
                rentable_only=arguments.get("rentable_only", False)
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

            if isinstance(result, list):
                for book in result:
                    if isinstance(book, dict) and book.get("id") is not None:
                        book_results[str(book["id"])] = book
            elif isinstance(result, dict) and result.get("id") is not None:
                book_results[str(result["id"])] = result

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
    "tool_result": list(book_results.values()),
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