const { models } = require("../../../config/sequelize.config");
const { User } = models; // Destructures the User model from Sequelize's models
const {
  hashPassword,
  comparePassword,
  generateTokens,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} = require("../../../utils/authUtils"); // Utility functions for authentication

const { sendTokensAsCookies } = require("../../../helpers/cookieHelpers"); // Helper function to send tokens as cookies

/**
 * Render Seller Signup Page
 * Renders the seller registration page.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to render the page.
 */
exports.renderSignupSeller = async (req, res) => {
  try {
    res.render("seller-registration", { title: "Seller Registration" });
  } catch (error) {
    console.log(error);
  }
};

/**
 * Render Seller Signin Page
 * Renders the seller login page.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to render the page.
 */
exports.renderSigninSeller = async (req, res) => {
  try {
    res.render("seller-login", { title: "Seller Login" });
  } catch (error) {
    console.log(error);
  }
};

/**
 * Register a Seller
 * Handles the registration of a new seller account.
 *
 * @param {Object} req - Express request object containing the seller's details.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.signupSeller = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      businessName,
      publication,
      gstin,
      address,
      city,
      state,
      pincode,
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Account already exists with this email." });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new seller
    await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      businessName,
      publication,
      gstin,
      address,
      city,
      state,
      pincode,
      role: "seller",
      status: "active", // Default status
    });

    res.status(201).json({ message: "Seller registered successfully!" });
  } catch (error) {
    console.error("Seller Registration Error:", error);
    res
      .status(500)
      .json({ error: "Registration failed due to an internal server error." });
  }
};

/**
 * Login a Seller
 * Handles the login of an existing seller.
 *
 * @param {Object} req - Express request object containing email and password.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.signinSeller = async (req, res) => {
  try {  
    const { email, password } = req.body; // Extract email and password from the request body

    // Find a seller in the database with the provided email and role
    const seller = await User.findOne({ where: { email, role: "seller" } });
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    // Check if seller account is active
    if (seller.status !== "active") {
      return res
        .status(403)
        .json({ error: "Account is not active. Please contact support." });
    }

    // Validate the provided password with the stored hashed password
    const isPasswordValid = await comparePassword(password, seller.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid credentials" });

    // Update last login timestamp
    seller.lastLogin = new Date();
    await seller.save();

    // Generate access and refresh tokens for the seller
    const { accessToken, refreshToken } = await generateTokens(
      seller,
      "seller"
    );

    // Send the tokens as cookies
    sendTokensAsCookies(res, accessToken, refreshToken);

    // Respond with success message
    res.status(200).json({
      message: "Login successful!",
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        businessName: seller.businessName,
        publication: seller.publication,
      },
    });
  } catch (error) {
    console.error("Seller Login Error:", error); // Log error for debugging
    res.status(500).json({ error: "Login failed" }); // Respond with failure message
  }
};

/**
 * Forgot Password for Seller
 * Handles sending a password reset token to the seller.
 *
 * @param {Object} req - Express request object containing the seller's email.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body; // Extract email from the request body

    // Find the seller in the database by email
    const seller = await User.findOne({ where: { email, role: "seller" } });
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    // Generate a password reset token for the seller
    const resetToken = generatePasswordResetToken(seller.id);

    // Store reset token in the database
    seller.resetPasswordToken = resetToken;
    seller.resetPasswordExpiry = new Date(Date.now() + 3600000); // Token expires in 1 hour
    await seller.save();

    // Here you would typically send an email with the reset link
    // For now, we'll just log it (replace with actual email sending logic)
    console.log(
      `Password Reset Link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    );

    // Respond with success message
    res
      .status(200)
      .json({ message: "Password reset instructions sent to your email!" });
  } catch (error) {
    console.error("Forgot Password Error:", error); // Log error for debugging
    res.status(500).json({ error: "Forgot password request failed" }); // Respond with failure message
  }
};

/**
 * Reset Password for Seller
 * Handles resetting the seller's password using a reset token.
 *
 * @param {Object} req - Express request object containing the reset token and new password.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body; // Extract reset token and new password from the request body

    // Find seller with this token and check if it's still valid
    const seller = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: new Date() }, // Token must not be expired
      },
    });

    if (!seller)
      return res
        .status(400)
        .json({ error: "Invalid or expired password reset token" });

    // Hash the new password and update the seller's record
    seller.password = await hashPassword(newPassword);

    // Clear the reset token fields
    seller.resetPasswordToken = null;
    seller.resetPasswordExpiry = null;

    await seller.save();

    // Respond with success message
    res.status(200).json({ message: "Password reset successful!" });
  } catch (error) {
    console.error("Reset Password Error:", error); // Log error for debugging
    res.status(500).json({ error: "Password reset failed" }); // Respond with failure message
  }
};

/**
 * Change Password for Seller
 * Allows a logged-in seller to change their password.
 *
 * @param {Object} req - Express request object containing the old and new passwords.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body; // Extract old and new passwords from the request body

    // Find the logged-in seller by their ID (retrieved from the authenticated user's token)
    const seller = await User.findByPk(req.user.id);
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    // Validate the old password
    const isPasswordValid = await comparePassword(oldPassword, seller.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Current password is incorrect" });

    // Hash the new password and update the seller's record
    seller.password = await hashPassword(newPassword);
    await seller.save();

    // Respond with success message
    res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.error("Change Password Error:", error); // Log error for debugging
    res.status(500).json({ error: "Change password failed" }); // Respond with failure message
  }
};

/**
 * Get Seller Profile
 * Retrieves the profile information of the logged-in seller.
 *
 * @param {Object} req - Express request object with authenticated user details.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.getSellerProfile = async (req, res) => {
  try {
    // Find the seller by ID (from authentication token)
    const seller = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ["password", "resetPasswordToken", "resetPasswordExpiry"],
      },
    });

    if (!seller) return res.status(404).json({ error: "Seller not found" });

    // Return seller profile data
    res.status(200).json({ seller });
  } catch (error) {
    console.error("Get Seller Profile Error:", error);
    res.status(500).json({ error: "Failed to retrieve seller profile" });
  }
};

/**
 * Update Seller Profile
 * Allows a seller to update their profile information.
 *
 * @param {Object} req - Express request object with updated profile data.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.updateSellerProfile = async (req, res) => {
  try {
    const { name, phone, businessName, address, city, state, pincode, gstin } =
      req.body;

    // Find the seller by ID
    const seller = await User.findByPk(req.user.id);
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    // Update fields
    if (name) seller.name = name;
    if (phone) seller.phone = phone;
    if (businessName) seller.businessName = businessName;
    if (address) seller.address = address;
    if (city) seller.city = city;
    if (state) seller.state = state;
    if (pincode) seller.pincode = pincode;
    if (gstin) seller.gstin = gstin;

    // Save changes
    await seller.save();

    // Return success response
    res.status(200).json({
      message: "Profile updated successfully",
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        businessName: seller.businessName,
        address: seller.address,
        city: seller.city,
        state: seller.state,
        pincode: seller.pincode,
        gstin: seller.gstin,
        publication: seller.publication,
      },
    });
  } catch (error) {
    console.error("Update Seller Profile Error:", error);
    res.status(500).json({ error: "Failed to update seller profile" });
  }
};

/**
 * Logout Seller
 * Handles seller logout by clearing authentication cookies.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.logoutSeller = async (req, res) => {
  try {
    // Clear authentication cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // Respond with success message
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
};
