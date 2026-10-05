package com.litemarket.order;

public enum OrderStatus {
    /** Received (WhatsApp or added by hand), not paid yet. */
    NEW,
    /** Customer was sent to the payment page and hasn't finished yet. */
    PENDING_PAYMENT,
    PAID,
    DELIVERED,
    CANCELLED;

    public boolean countsAsSale() {
        return this == PAID || this == DELIVERED;
    }
}
