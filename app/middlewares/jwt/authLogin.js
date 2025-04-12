const { models } = require("../../../config/sequelize.config");
const { User } = models;
const { authenticateUser } = require("../../../utils/authLoginMiddlewareUtils");

const userAuthLoginMiddleware = authenticateUser(User);
module.exports = { userAuthLoginMiddleware };
