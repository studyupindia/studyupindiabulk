const { models } = require("../../../config/sequelize.config");
const { User } = models;
const { authenticateJWT } = require("../../../utils/authMiddlewareUtils");

const sellerAuthMiddleware = authenticateJWT(User, "seller");
module.exports = {sellerAuthMiddleware };
