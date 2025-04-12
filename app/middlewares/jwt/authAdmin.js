const { models } = require("../../../config/sequelize.config");
const { User } = models;
const { authenticateJWT } = require("../../../utils/authMiddlewareUtils");

const adminAuthMiddleware = authenticateJWT(User, "admin");
module.exports = adminAuthMiddleware;
