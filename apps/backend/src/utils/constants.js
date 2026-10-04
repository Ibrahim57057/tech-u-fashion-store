/**
//  * Fixed value lists used across the backend. Never type these strings
//  * by hand elsewhere: import them, so a typo like "shiped" becomes an
//  * error at startup instead of a silent bug in production.
//  */
export const ORDER_STATUS = Object.freeze({
    PENDING_PAYMENT: 'pending_payment',
    PENDING_CONFIRMATION: 'pending_confirmation', // pay on delivery, awaiting a phone call
    CONFIRMED: 'confirmed',
    PACKED: 'packed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    FAILED_DELIVERY: 'failed_delivery',
});

// Which status an order may move to from its current one.
// Anything not listed here is rejected by the server.
export const ORDER_STATUS_TRANSITIONS = Object.freeze({
    [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PENDING_CONFIRMATION]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PACKED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PACKED]: [ORDER_STATUS.SHIPPED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FAILED_DELIVERY],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.FAILED_DELIVERY]: [],
});

export const PAYMENT_METHOD = Object.freeze({
    ONLINE: 'online',
    PAY_ON_DELIVERY: 'pay_on_delivery',
});

export const PAYMENT_STATUS = Object.freeze({
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
});