const {
  renderSellerDashboard,
} = require("../../controllers/seller/sellerNavigateController");

const { sellerAuthMiddleware } = require("../../middlewares/jwt/authSeller");

function initRoutes(app) {
  app.get("/seller-dashboard",sellerAuthMiddleware, renderSellerDashboard);
}

module.exports = initRoutes;
