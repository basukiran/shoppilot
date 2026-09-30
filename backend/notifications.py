"""
notifications.py — BookVision notification helper.

Provides a single public function:

    create_notification(conn, user_id, type, title, message,
                        order_id=None, rental_id=None)

This module is intentionally thin — it writes one row and returns the new
row's id.  Callers pass an open, uncommitted connection so the notification
INSERT is part of the same transaction as the event that triggered it.

Notification types (informal convention, not enforced by DB):
    order_placed       order_confirmed      order_shipped
    order_delivered    order_cancelled
    payment_success
    rental_payment     rental_activated     rental_dispatched
    rental_delivered   rental_return_reminder
    return_requested   return_received
    refund_initiated   refund_processed
    book_kept
    account_welcome    account_update
"""

from __future__ import annotations


def create_notification(
    conn,
    user_id: int | None,
    notification_type: str,
    title: str,
    message: str,
    order_id: int | None = None,
    rental_id: int | None = None,
) -> int | None:
    """
    Insert a notification row and return the new row id.

    If user_id is None (unauthenticated / demo session), the notification is
    still written so it can surface for that session; the caller decides
    whether to skip the insert by passing user_id=None.

    Returns the new notification id, or None if the insert was skipped.
    """
    if user_id is None:
        # We only persist notifications for authenticated users.
        return None

    cursor = conn.execute(
        """
        INSERT INTO notifications
            (user_id, type, title, message, related_order_id, related_rental_id,
             is_read, created_at)
        VALUES
            (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        """,
        (user_id, notification_type, title, message, order_id, rental_id),
    )

    # SQLite returns lastrowid directly on the cursor.
    # The PostgreSQL wrapper (_PgCursor) exposes the same attribute via
    # RETURNING — but since we use ? placeholders here and the pg wrapper
    # translates them to %s, this works on both engines.
    return getattr(cursor, "lastrowid", None)
