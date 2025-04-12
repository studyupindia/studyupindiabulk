const {
    getSellerOrders,
    getSellerBooks,
    // filterOrders,
    // searchOrders,
    // getOrdersByCategory,
    getOrderDetails,
    createQuote,
    updateQuote,
    processOrder,
    uploadInvoice,
    shipOrder,
    completeOrder,
    cancelOrder
} = require("../../controllers/seller/sellerDashboardController");

const { sellerAuthMiddleware } = require("../../middlewares/jwt/authSeller");

function initRoutes(app) {
  // Get all orders for the current seller
  app.get("/seller/orders", sellerAuthMiddleware, getSellerOrders);
  app.get("/seller/books", sellerAuthMiddleware , getSellerBooks);

  // Filter seller orders
  // app.get("/seller/orders/filter", sellerAuthMiddleware, filterOrders);

  // Search seller orders
  // app.get("/seller/orders/search", sellerAuthMiddleware, searchOrders);

  // Get orders by category/pipeline for seller
  // app.get(
  //   "/seller/orders/category/:category",
  //   sellerAuthMiddleware, getOrdersByCategory
  // );

  // Get order details
  app.get("/seller/orders/:orderId", sellerAuthMiddleware, getOrderDetails);

  // Seller order actions
  app.post("/seller/orders/:orderId/quote", sellerAuthMiddleware, createQuote);
  app.put("/seller/orders/:orderId/quote/:quoteId", sellerAuthMiddleware, updateQuote);
  app.put("/seller/orders/:orderId/process", sellerAuthMiddleware, processOrder);
  app.post("/seller/orders/:orderId/invoice", sellerAuthMiddleware, uploadInvoice);
  app.put("/seller/orders/:orderId/ship", sellerAuthMiddleware, shipOrder);
  app.put("/seller/orders/:orderId/complete", sellerAuthMiddleware, completeOrder);
  app.put("/seller/orders/:orderId/cancel", sellerAuthMiddleware, cancelOrder);
}

module.exports = initRoutes;
