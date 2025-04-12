const jwt = require("jsonwebtoken"); // JSON Web Token library
const { generateTokens } = require("./authUtils"); // Utility function to generate tokens
const { sendTokensAsCookies } = require("../helpers/cookieHelpers"); // Helper for cookies

/**
 * Verify a JWT Token (Async)
 * Verifies the authenticity and validity of a JWT token.
 *
 * @param {String} token - The JWT token to verify.
 * @param {String} secret - The secret key used to verify the token.
 * @returns {Promise<Object>} - Resolves to the decoded payload if the token is valid.
 * @throws {Error} - If the token is invalid or expired.
 */
const verifyToken = async (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token, // The token to verify
      secret, // Secret key for verification
      (err, decoded) => {
        if (err) {
          reject(new Error("Invalid or expired token")); // Reject if the token is invalid or expired
        } else {
          resolve(decoded); // Resolve with the decoded token payload
        }
      }
    );
  });
};

/**
 * Middleware for JWT Authentication without role checking
 * Checks if a user is logged in but allows access regardless
 *
 * @param {Object} UserModel - Sequelize User model to fetch user details.
 * @returns {Function} - Express middleware function for authentication.
 */
const authenticateUser = (UserModel) => async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken; // Extract access token from cookies
    const refreshToken = req.cookies.refreshToken; // Extract refresh token from cookies

    // If no tokens provided, set user to null and continue
    if (!accessToken && !refreshToken) {
      req.user = null;
      res.locals.user = null;
      return next();
    }

    // Step 1: Verify access token
    try {
      const decoded = await verifyToken(
        accessToken,
        process.env.JWT_ACCESS_SECRET
      ); // Verify access token with secret key

      const user = await UserModel.findByPk(decoded.id); // Fetch user from the database
      req.user = user || null; // Attach user details to the request object (or null)
      res.locals.user = user || null;
      return next(); // Proceed to the next middleware or route handler
    } catch {
      // Step 2: If access token is invalid, verify refresh token
      if (!refreshToken) {
        req.user = null;
        res.locals.user = null;
        return next();
      }

      try {
        const refreshDecoded = await verifyToken(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        ); // Verify refresh token with secret key

        const user = await UserModel.findByPk(refreshDecoded.id); // Fetch user from the database

        if (!user) {
          req.user = null;
          res.locals.user = null;
          return next();
        }

        // Step 3: Generate new tokens if refresh token is valid
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          await generateTokens(user, user.role); // Generate new tokens

        sendTokensAsCookies(res, newAccessToken, newRefreshToken); // Send new tokens as cookies

        req.user = user; // Attach user details to the request object
        res.locals.user = user;
        return next(); // Proceed to the next middleware or route handler
      } catch (refreshErr) {
        // If refresh token verification fails, set user to null and continue
        console.error("Invalid Refresh Token:", refreshErr); // Log the error
        req.user = null;
        res.locals.user = null;
        return next();
      }
    }
  } catch (error) {
    // Catch any unexpected errors, set user to null and continue
    console.error("Authentication Error:", error); // Log the error
    req.user = null;
    res.locals.user = null;
    return next();
  }
};

module.exports = {
  verifyToken, // Export the token verification function
  authenticateUser, // Export the user authentication middleware
};
