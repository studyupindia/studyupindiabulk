/**
 * Helper Function to Send Access and Refresh Tokens as Secure Cookies
 * Sends JWT tokens as HTTP-only cookies for enhanced security.
 *
 * @param {Object} res - The Express response object used to set cookies.
 * @param {String} accessToken - The JWT access token to be sent as a cookie.
 * @param {String} refreshToken - The JWT refresh token to be sent as a cookie.
 */

/**
 * Helper Function to Send Access and Refresh Tokens as Secure Cookies
 */
const sendTokensAsCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
};

module.exports = { sendTokensAsCookies };

