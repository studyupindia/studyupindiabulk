const {
  renderNcert,
  renderZee,
  renderHome,
  renderOrderHistory,
  renderContactUs,
  renderPrivacyPolicy,
  renderReturnRefundPolicy,
  renderTermsAndConditions,
  renderShippingPolicy,
} = require("../../controllers/buyer/buyerNavigateController");

const { userAuthLoginMiddleware } = require("../../middlewares/jwt/authLogin");
const { buyerAuthMiddleware } = require("../../middlewares/jwt/authBuyer");

function initRoutes(app) {
  app.get("/", userAuthLoginMiddleware, renderHome);
  app.get("/contact",userAuthLoginMiddleware, renderContactUs);
  app.get("/privacy-policy", userAuthLoginMiddleware, renderPrivacyPolicy);
  app.get("/terms-and-conditions", userAuthLoginMiddleware, renderTermsAndConditions);
  app.get("/return-and-refund", userAuthLoginMiddleware, renderReturnRefundPolicy);
  app.get("/shipping-policy", userAuthLoginMiddleware, renderShippingPolicy);
  app.get("/publication/ncert",buyerAuthMiddleware, renderNcert);
  app.get("/publication/zee",buyerAuthMiddleware, renderZee);
  app.get("/order-history",buyerAuthMiddleware, renderOrderHistory);
}

module.exports = initRoutes;
