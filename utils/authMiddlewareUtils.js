const { generateTokens } = require("./authUtils"); // Utility function to generate access and refresh tokens
const { sendTokensAsCookies } = require("../helpers/cookieHelpers"); // Helper function to send tokens as cookies
const jwt = require("jsonwebtoken"); // JSON Web Token library for token creation and verification

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
 * Get login path based on the required role
 * @param {String} role - The user role (e.g., "buyer", "seller", "admin")
 * @returns {String} - The appropriate login path
 */
const getLoginPathByRole = (role) => {
  switch (role) {
    case "buyer":
      return "/buyer/signin";
    case "seller":
      return "/seller/signin";
    case "admin":
      return "/admin/signin";
    default:
      return "/signin";
  }
};

/**
 * Middleware for JWT Authentication and Role-Based Access Control
 * Protects routes by ensuring valid tokens and required roles.
 *
 * @param {Object} UserModel - Sequelize User model to fetch user details.
 * @param {String} requiredRole - The role required to access the route (e.g., "buyer", "seller", "admin").
 * @returns {Function} - Express middleware function for authentication.
 */
const authenticateJWT = (UserModel, requiredRole) => async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken; // Extract access token from cookies
    const refreshToken = req.cookies.refreshToken; // Extract refresh token from cookies

    // If both tokens are missing, redirect to the appropriate login page
    if (!accessToken && !refreshToken) {
      const loginPath = getLoginPathByRole(requiredRole);

      // Check if the request expects JSON (API call) or HTML (browser navigation)
      const isApiRequest =
        req.xhr || req.headers.accept.includes("application/json");

      if (isApiRequest) {
        return res.status(401).json({
          message: "Authentication required",
          redirect: loginPath,
        });
      } else {
        return res.redirect(loginPath);
      }
    }

    // Step 1: Verify access token
    try {
      const decoded = await verifyToken(
        accessToken,
        process.env.JWT_ACCESS_SECRET
      ); // Verify access token with secret key

      const user = await UserModel.findByPk(decoded.id); // Fetch user from the database
      if (!user || user.role !== requiredRole) {
        // Check if the user exists and has the required role
        const loginPath = getLoginPathByRole(requiredRole);

        if (req.xhr || req.headers.accept.includes("application/json")) {
          return res.status(403).json({
            message: "Access denied for this role",
            redirect: loginPath,
          });
        } else {
          return res.redirect(loginPath);
        }
      }

      req.user = user; // Attach user details to the request object
      res.locals.user = user;
      return next(); // Proceed to the next middleware or route handler
    } catch {
      // Step 2: If access token is invalid, verify refresh token
      if (!refreshToken) {
        const loginPath = getLoginPathByRole(requiredRole);

        if (req.xhr || req.headers.accept.includes("application/json")) {
          return res.status(403).json({
            message: "Refresh token missing",
            redirect: loginPath,
          });
        } else {
          return res.redirect(loginPath);
        }
      }

      try {
        const refreshDecoded = await verifyToken(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        ); // Verify refresh token with secret key

        const user = await UserModel.findByPk(refreshDecoded.id); // Fetch user from the database
        if (!user || user.role !== requiredRole) {
          const loginPath = getLoginPathByRole(requiredRole);

          if (req.xhr || req.headers.accept.includes("application/json")) {
            return res.status(403).json({
              message: "Access denied for this role",
              redirect: loginPath,
            });
          } else {
            return res.redirect(loginPath);
          }
        }

        // Step 3: Generate new tokens if refresh token is valid
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          await generateTokens(user, user.role); // Generate new tokens

        sendTokensAsCookies(res, newAccessToken, newRefreshToken); // Send new tokens as cookies

        req.user = user; // Attach user details to the request object
        res.locals.user = user;
        return next(); // Proceed to the next middleware or route handler
      } catch (refreshErr) {
        // If refresh token verification fails, redirect to login
        console.error("Invalid Refresh Token:", refreshErr); // Log the error
        const loginPath = getLoginPathByRole(requiredRole);

        if (req.xhr || req.headers.accept.includes("application/json")) {
          return res.status(403).json({
            message: "Invalid refresh token",
            redirect: loginPath,
          });
        } else {
          return res.redirect(loginPath);
        }
      }
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error("Authentication Error:", error); // Log the error
    const loginPath = getLoginPathByRole(requiredRole);

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({
        message: "Internal server error",
        redirect: loginPath,
      });
    } else {
      return res.redirect(loginPath);
    }
  }
};

module.exports = {
  verifyToken, // Export the token verification function
  authenticateJWT, // Export the JWT authentication middleware
};
