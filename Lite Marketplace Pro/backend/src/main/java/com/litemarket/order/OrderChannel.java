package com.litemarket.order;

public enum OrderChannel {
    /** Customer filled the cart and sent the order on WhatsApp. */
    WHATSAPP,
    /** Customer paid online at checkout. */
    ONLINE,
    /** Seller typed it in from a call, DM or walk-in. */
    MANUAL
}
