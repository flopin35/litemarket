package com.litemarket.payment;

/** Who holds the seller's share of an order payment. */
public enum Settlement {
    /** Not an order payment (or a demo). */
    NONE,
    /** The gateway already split the money into the seller's sub-account. */
    SPLIT,
    /** The platform received it and owes the seller their share. */
    OWED,
    /** The admin has paid the seller. */
    PAID_OUT
}
