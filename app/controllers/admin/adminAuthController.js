const { models } = require("../../../config/sequelize.config");
const { User } = models; // Destructures the User model from Sequelize's models
const {
  hashPassword,
  comparePassword,
  generateTokens,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} = require("../../../utils/authUtils"); // Utility functions for authentication

const { sendTokensAsCookies } = require("../../../helpers/cookieHelper"); // Helper function to send tokens as cookies

/**
 * Register an Admin
 * Handles the registration of a new admin account.
 *
 * @param {Object} req - Express request object containing the admin's details (name, email, password).
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body; // Extract name, email, and password from the request body

    // Hash the admin's password for security
    const hashedPassword = await hashPassword(password);

    // Create a new admin record in the database
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin", // Assign role as 'admin'
    });

    // Respond with success message
    res.status(201).json({ message: "Admin registered successfully!" });
  } catch (error) {
    console.error("Admin Registration Error:", error); // Log error for debugging
    res.status(500).json({ error: "Registration failed" }); // Respond with failure message
  }
};

/**
 * Login an Admin
 * Handles the login of an existing admin.
 *
 * @param {Object} req - Express request object containing email and password.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.loginadmin = async (req, res) => {
  try {
    const { email, password } = req.body; // Extract email and password from the request body

    // Find an admin in the database with the provided email and role
    const admin = await User.findOne({ where: { email, role: "admin" } });
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    // Validate the provided password with the stored hashed password
    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid credentials" });

    // Generate access and refresh tokens for the admin
    const { accessToken, refreshToken } = await generateTokens(admin, "admin");

    // Send the tokens as cookies
    sendTokensAsCookies(res, accessToken, refreshToken);

    // Respond with success message
    res.status(200).json({ message: "Login successful!" });
  } catch (error) {
    console.error("Admin Login Error:", error); // Log error for debugging
    res.status(500).json({ error: "Login failed" }); // Respond with failure message
  }
};

/**
 * Forgot Password for Admin
 * Handles sending a password reset token to the admin.
 *
 * @param {Object} req - Express request object containing the admin's email.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body; // Extract email from the request body

    // Find the admin in the database by email
    const admin = await User.findOne({ where: { email, role: "admin" } });
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    // Generate a password reset token for the admin
    const resetToken = generatePasswordResetToken(admin.id);

    // Simulate sending the reset token via email (replace with actual email sending logic)
    console.log("Password Reset Token:", resetToken);

    // Respond with success message
    res.status(200).json({ message: "Password reset token sent!" });
  } catch (error) {
    console.error("Forgot Password Error:", error); // Log error for debugging
    res.status(500).json({ error: "Forgot password failed" }); // Respond with failure message
  }
};

/**
 * Reset Password for Admin
 * Handles resetting the admin's password using a reset token.
 *
 * @param {Object} req - Express request object containing the reset token and new password.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body; // Extract reset token and new password from the request body

    // Verify the reset token and decode it to get the admin's ID
    const decoded = await verifyPasswordResetToken(token);

    // Find the admin by ID
    const admin = await User.findByPk(decoded.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    // Hash the new password and update the admin's record
    admin.password = await hashPassword(newPassword);
    await admin.save();

    // Respond with success message
    res.status(200).json({ message: "Password reset successful!" });
  } catch (error) {
    console.error("Reset Password Error:", error); // Log error for debugging
    res.status(500).json({ error: "Password reset failed" }); // Respond with failure message
  }
};

/**
 * Change Password for Admin
 * Allows a logged-in admin to change their password.
 *
 * @param {Object} req - Express request object containing the old and new passwords.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body; // Extract old and new passwords from the request body

    // Find the logged-in admin by their ID (retrieved from the authenticated user's token)
    const admin = await User.findByPk(req.user.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    // Validate the old password
    const isPasswordValid = await comparePassword(oldPassword, admin.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid old password" });

    // Hash the new password and update the admin's record
    admin.password = await hashPassword(newPassword);
    await admin.save();

    // Respond with success message
    res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.error("Change Password Error:", error); // Log error for debugging
    res.status(500).json({ error: "Change password failed" }); // Respond with failure message
  }
};
