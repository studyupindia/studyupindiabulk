const {
  renderSignupSeller,
  renderSigninSeller,
  signupSeller,
  signinSeller,
  forgotPassword,
  resetPassword,
  changePassword,
  getSellerProfile,
  updateSellerProfile,
  logoutSeller,
} = require("../../controllers/seller/sellerAuthController");

const { sellerAuthMiddleware } = require("../../middlewares/jwt/authSeller");

function initRoutes(app) {
  // Render Pages
  // app.get("/seller/signup", renderSignupSeller);
  app.get("/seller/signin", renderSigninSeller);

  // Authentication Endpoints
  app.post("/seller/signup", signupSeller);
  app.post("/seller/signin", signinSeller);
  app.post("/seller/forgot-password", forgotPassword);
  app.post("/seller/reset-password", resetPassword);
  app.post("/seller/logout", logoutSeller);

  // Protected routes (require authentication)
  app.get("/seller/profile", sellerAuthMiddleware, getSellerProfile);
  app.put("/seller/profile", sellerAuthMiddleware, updateSellerProfile);
  app.post("/seller/change-password", sellerAuthMiddleware, changePassword);
}

module.exports = initRoutes;
