const {
  renderSignupBuyer,
  renderSigninBuyer,
  signupBuyer,
  signinBuyer,
  forgotPassword,
  resetPassword,
  changePassword,
  getBuyerProfile,
  updateBuyerProfile,
  logoutBuyer,
  renderBuyerForgetPassword,
} = require("../../controllers/buyer/buyerAuthController");

const { buyerAuthMiddleware } = require("../../middlewares/jwt/authBuyer");

function initRoutes(app) {
  // Render Pages
  app.get("/buyer/signup", renderSignupBuyer);
  app.get("/buyer/signin", renderSigninBuyer);

  // Authentication Endpoints
  app.post("/buyer/signup", signupBuyer);
  app.post("/buyer/signin", signinBuyer);
  app.post("/buyer/logout", logoutBuyer);
  app.post("/buyer/forgot-password", forgotPassword);
  app.post("/buyer/reset-password", resetPassword);
  app.get("/buyer/forgot-reset-password", renderBuyerForgetPassword);

  // Protected routes (require authentication)
  app.get("/buyer/profile", buyerAuthMiddleware, getBuyerProfile);
  app.put("/buyer/profile", buyerAuthMiddleware, updateBuyerProfile);
  app.post("/buyer/change-password", buyerAuthMiddleware, changePassword);
}

module.exports = initRoutes;
