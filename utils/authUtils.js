const jwt = require("jsonwebtoken"); // JSON Web Token for token creation and verification
const bcrypt = require("bcryptjs"); // Library for hashing and comparing passwords

/**
 * Generate Access and Refresh Tokens (Async)
 * Creates access and refresh tokens for authentication.
 *
 * @param {Object} user - The user object (must include `id`).
 * @param {String} role - The role of the user (e.g., "buyer", "seller", "admin").
 * @returns {Promise<{ accessToken: String, refreshToken: String }>} - Returns a promise resolving to the generated tokens.
 */
const generateTokens = async (user, role) => {
  return new Promise((resolve, reject) => {
    try {
      // Generate an access token, valid for 15 minutes
      const accessToken = jwt.sign(
        { id: user.id, role }, // Payload containing user ID and role
        process.env.JWT_ACCESS_SECRET, // Secret key for access token
        { expiresIn: "15m" } // Expiry time
      );

      // Generate a refresh token, valid for 7 days
      const refreshToken = jwt.sign(
        { id: user.id, role }, // Payload containing user ID and role
        process.env.JWT_REFRESH_SECRET, // Secret key for refresh token
        { expiresIn: "7d" } // Expiry time
      );

      resolve({ accessToken, refreshToken }); // Resolve with the generated tokens
    } catch (error) {
      reject(error); // Reject the promise in case of errors
    }
  });
};

/**
 * Hash a Password (Async)
 * Hashes a plaintext password for secure storage.
 *
 * @param {String} password - The plaintext password to hash.
 * @returns {Promise<String>} - Returns the hashed password.
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
    return await bcrypt.hash(password, salt); // Hash the password with the generated salt
  } catch (error) {
    throw new Error("Error hashing password"); // Throw an error if hashing fails
  }
};

/**
 * Compare Plaintext Password with Hashed Password (Async)
 * Compares a plaintext password with a hashed password to verify identity.
 *
 * @param {String} password - The plaintext password.
 * @param {String} hashedPassword - The hashed password stored in the database.
 * @returns {Promise<Boolean>} - Returns true if the passwords match, otherwise false.
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword); // Compare passwords
  } catch (error) {
    throw new Error("Error comparing passwords"); // Throw an error if comparison fails
  }
};

/**
 * Generate a Password Reset Token (Async)
 * Creates a token that can be used for resetting the user's password.
 *
 * @param {String} userId - The user's unique ID.
 * @returns {String} - The generated reset token.
 */
const generatePasswordResetToken = (userId) => {
  return jwt.sign(
    { id: userId }, // Payload containing the user's ID
    process.env.JWT_RESET_SECRET, // Secret key for password reset token
    { expiresIn: "1h" } // Token valid for 1 hour
  );
};

/**
 * Verify a Password Reset Token (Async)
 * Verifies the validity of a password reset token.
 *
 * @param {String} token - The reset token to verify.
 * @returns {Promise<Object>} - Resolves to the decoded token payload if valid.
 */
const verifyPasswordResetToken = async (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token, // The token to verify
      process.env.JWT_RESET_SECRET, // Secret key used during token generation
      (err, decoded) => {
        if (err) {
          reject(new Error("Invalid or expired reset token")); // Reject if the token is invalid or expired
        } else {
          resolve(decoded); // Resolve with the decoded token payload
        }
      }
    );
  });
};

// Export the utility functions for use in other modules
module.exports = {
  generateTokens,
  hashPassword,
  comparePassword,
  generatePasswordResetToken,
  verifyPasswordResetToken,
};
