const { models } = require("../../../config/sequelize.config");
const { User } = models;
const { authenticateJWT } = require("../../../utils/authMiddlewareUtils");

const buyerAuthMiddleware = authenticateJWT(User, "buyer");
module.exports = { buyerAuthMiddleware };
