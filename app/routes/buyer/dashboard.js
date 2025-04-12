const {
  getBooks,
  createOrder,
  getUserOrders,
  filterOrders,
  // searchOrders,
  getOrdersByCategory,
  acceptQuote,
  rejectQuote,
  processPayment,
  requestRevision,
  cancelOrder,
  submitDispute,
  handleRazorpayWebhook,
} = require("../../controllers/buyer/buyerDashboardController");

const { buyerAuthMiddleware } = require("../../middlewares/jwt/authBuyer");
const express = require("express");

function initRoutes(app) {
  // app.post("/ncert", getNcertBooks);
  // app.use(buyerAuthMiddleware);
  app.get("/get-books", getBooks);
  app.post("/create-order",buyerAuthMiddleware, createOrder);
  // Get all orders for the current user
  app.get("/orders", buyerAuthMiddleware, getUserOrders);

  // Filter orders
  app.get("/orders/filter", buyerAuthMiddleware, filterOrders);

  // Search orders - Will be updated when required in future (search and apply filter) 
  //need two two different api endpoints
  // app.get("/orders/search", searchOrders);

  // Get orders by category/tab will need in future
  // app.get("/orders/category/:category", getOrdersByCategory);

  // Order actions
  app.put("/orders/:orderId/accept-quote", buyerAuthMiddleware, acceptQuote);
  app.put("/orders/:orderId/reject-quote", buyerAuthMiddleware, rejectQuote);
  app.post("/orders/:orderId/payment", buyerAuthMiddleware, processPayment);
  app.post("/orders/:orderId/request-revision",buyerAuthMiddleware, requestRevision);
  app.put("/orders/:orderId/cancel", buyerAuthMiddleware, cancelOrder);
  app.post("/orders/:orderId/dispute", buyerAuthMiddleware, submitDispute);
  app.post("/rzp-webhook", express.raw({ type: "application/json" }), handleRazorpayWebhook);
}

module.exports = initRoutes;
