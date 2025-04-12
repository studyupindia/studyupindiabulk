module.exports = {
  USER_ROLES: ["buyer", "seller", "admin", "system"],
  USER_STATUSES: ["active", "inactive"],
  USER_SOURCES: ["internal", "external"],
  BOOK_TYPES: [
    "textbook",
    "novel",
    "magazine",
    "comic",
    "competitive",
    "other",
  ],
  BOOK_LANGUAGES: ["english", "hindi", "sanskrit", "other"],
  BOOK_CLASSES: [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "other",
  ],
  ORDER_REQUEST_STATUSES: [
    "pending", // Initial state when created
    "quoted", // Received a quote
    "quote_revised", // Seller has revised the quote
    "quote_accepted", // Buyer accepted the quote
    "quote_rejected", // Buyer rejected the quote
    "awaiting_payment", // Payment pending
    "payment_failed", // Payment attempt failed
    "payment_completed", // Payment successful
    "processed", // Being prepared for shipping
    "shipped", // Items shipped
    "delivered", // Delivered to buyer
    "completed", // Order cycle complete
    "cancelled", // Cancelled by buyer
    "cancelled_by_seller", // Cancelled by seller
    "disputed", // Issue raised
  ],
  QUOTE_STATUSES: [
    "draft", // Initial state (seller side)
    "sent", // Sent to buyer
    "viewed", // Buyer has viewed it
    "pending_revision", // Buyer requested changes
    "revised", // Seller has made changes
    "accepted", // Buyer accepted
    "rejected", // Buyer rejected
    "expired", // Quote timed out
    "cancelled", // Cancelled by seller
  ],
  PAYMENT_STATUSES: [
    "pending",
    "processing",
    "completed",
    "failed",
    "refunded",
    "partially_refunded",
  ],
  PAYMENT_METHODS: [
    "card",
    "upi",
    "bank_transfer",
    "wallet",
    "emi",
    "paylater",
    "razorpay",
  ],
  SHIPPING_CARRIERS: [
    "blue_dart",
    "delhivery",
    "dtdc",
    "speed_post",
    "fedex",
    "ecom_express",
    "other",
  ],
};
