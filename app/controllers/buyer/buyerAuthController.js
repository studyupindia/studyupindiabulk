const crypto = require("crypto");
const { sequelize, Op, models } = require("../../../config/sequelize.config");
const { User } = models; // Destructures the User model from Sequelize's models
const {
  hashPassword,
  comparePassword,
  generateTokens,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} = require("../../../utils/authUtils"); // Utility functions for authentication
const { sendResetPasswordEmail } = require("../../../services/email");

const { sendTokensAsCookies } = require("../../../helpers/cookieHelpers"); // Helper function to send tokens as cookies

/**
 * Render Buyer Signup Page
 * Renders the buyer registration page.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to render the page.
 */
exports.renderSignupBuyer = async (req, res) => {
  try {
    res.render("buyer-registration", { title: "Buyer Registration" });
  } catch (error) {
    console.log(error);
  }
};

/**
 * Render Buyer Signin Page
 * Renders the buyer login page.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to render the page.
 */
exports.renderSigninBuyer = async (req, res) => {
  try {
    res.render("buyer-login", { title: "Buyer Login" });
  } catch (error) {
    console.log(error);
  }
};

/**
 * Register a Buyer
 * Handles the registration of a new buyer account.
 *
 * @param {Object} req - Express request object containing the buyer's details.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.signupBuyer = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      address,
      city,
      state,
      pincode,
      isBusinessAccount,
      businessName,
      gstin,
      newsletter,
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Account already exists with this email." });
    }

    // Validate GSTIN if provided
    if (gstin) {
      const gstinPattern =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinPattern.test(gstin)) {
        return res.status(400).json({ error: "Invalid GSTIN format." });
      }
    }

    // Business name is required if isBusinessAccount is true
    if (isBusinessAccount && !businessName) {
      return res
        .status(400)
        .json({ error: "Business name is required for business accounts." });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Prepare meta data
    const meta = {
      isBusinessAccount: isBusinessAccount || false,
      newsletterSubscribed: newsletter || false,
      registeredDate: new Date().toISOString(),
    };

    // Create new buyer
    await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      address,
      city,
      state,
      pincode,
      businessName: isBusinessAccount ? businessName : null,
      gstin: isBusinessAccount ? gstin : null,
      role: "buyer",
      status: "active", // Default status
      meta: meta,
    });

    res.status(201).json({ message: "Buyer registered successfully!" });
  } catch (error) {
    console.error("Buyer Registration Error:", error);
    res
      .status(500)
      .json({ error: "Registration failed due to an internal server error." });
  }
};

/**
 * Login a Buyer
 * Handles the login of an existing buyer.
 *
 * @param {Object} req - Express request object containing email and password.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.signinBuyer = async (req, res) => {
  try {
    const { email, password } = req.body; // Extract email and password from the request body

    // Find a buyer in the database with the provided email and role
    const buyer = await User.findOne({ where: { email, role: "buyer" } });
    if (!buyer) return res.status(404).json({ error: "Buyer not found" });

    // Check if buyer account is active
    if (buyer.status !== "active") {
      return res
        .status(403)
        .json({ error: "Account is not active. Please contact support." });
    }

    // Validate the provided password with the stored hashed password
    const isPasswordValid = await comparePassword(password, buyer.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid credentials" });

    // Update last login timestamp
    buyer.lastLogin = new Date();
    await buyer.save();

    // Generate access and refresh tokens for the buyer
    const { accessToken, refreshToken } = await generateTokens(buyer, "buyer");

    // Send the tokens as cookies
    sendTokensAsCookies(res, accessToken, refreshToken);

    // Respond with success message
    res.status(200).json({
      message: "Login successful!",
      buyer: {
        id: buyer.id,
        name: buyer.name,
        email: buyer.email,
      },
    });
  } catch (error) {
    console.error("Buyer Login Error:", error); // Log error for debugging
    res.status(500).json({ error: "Login failed" }); // Respond with failure message
  }
};

/**
 * Render Buyer Forget Password Page
 * Renders the buyer Password Rest page.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to render the page.
 */
exports.renderBuyerForgetPassword = async (req, res) => {
  try {
    res.render("buyer-forgot-reset-password", {});
  } catch (error) {
    console.log(error);
  }
};

/**
 * Forgot Password for Buyer
 * Handles sending a password reset token to the buyer.
 *
 * @param {Object} req - Express request object containing the buyer's email.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const buyer = await User.findOne({ where: { email, role: "buyer" } });
    if (!buyer)
      return res.status(404).json({ error: "No buyer found with that email." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    buyer.resetPasswordToken = resetToken;
    buyer.resetPasswordExpiry = new Date(Date.now() + 3600000); // 1 hour
    await buyer.save();

    const resetLink = `${process.env.FRONTEND_URL}/buyer/forgot-reset-password?token=${resetToken}`;

    try {
      sendResetPasswordEmail({
        to: buyer.email,
        name: buyer.name || "there",
        resetLink,
      });
    } catch (error) {
      console.log("Error sending email:", error);
    }

    return res
      .status(200)
      .json({ message: "Reset link has been sent to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
};

/**
 * Reset Password for Buyer
 * Handles resetting the buyer's password using a reset token.
 *
 * @param {Object} req - Express request object containing the reset token and new password.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res
        .status(400)
        .json({ error: "Token and new password are required." });

    const buyer = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: { [Op.gt]: new Date() },
        role: "buyer",
      },
    });

    if (!buyer)
      return res.status(400).json({
        error: "Reset link is invalid or has expired. Please request again.",
      });

    buyer.password = await hashPassword(newPassword);
    buyer.resetPasswordToken = null;
    buyer.resetPasswordExpiry = null;
    await buyer.save();

    return res
      .status(200)
      .json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ error: "Could not reset password." });
  }
};


/**
 * Change Password for Buyer
 * Allows a logged-in buyer to change their password.
 *
 * @param {Object} req - Express request object containing the old and new passwords.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body; // Extract old and new passwords from the request body

    // Find the logged-in buyer by their ID (retrieved from the authenticated user's token)
    const buyer = await User.findByPk(req.user.id);
    if (!buyer) return res.status(404).json({ error: "Buyer not found" });

    // Validate the old password
    const isPasswordValid = await comparePassword(oldPassword, buyer.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Current password is incorrect" });

    // Hash the new password and update the buyer's record
    buyer.password = await hashPassword(newPassword);
    await buyer.save();

    // Respond with success message
    res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.error("Change Password Error:", error); // Log error for debugging
    res.status(500).json({ error: "Change password failed" }); // Respond with failure message
  }
};

/**
 * Get Buyer Profile
 * Retrieves the profile information of the logged-in buyer.
 *
 * @param {Object} req - Express request object with authenticated user details.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.getBuyerProfile = async (req, res) => {
  try {
    // Find the buyer by ID (from authentication token)
    const buyer = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ["password", "resetPasswordToken", "resetPasswordExpiry"],
      },
    });

    if (!buyer) return res.status(404).json({ error: "Buyer not found" });

    // Return buyer profile data
    res.status(200).json({ buyer });
  } catch (error) {
    console.error("Get Buyer Profile Error:", error);
    res.status(500).json({ error: "Failed to retrieve buyer profile" });
  }
};

/**
 * Update Buyer Profile
 * Allows a buyer to update their profile information.
 *
 * @param {Object} req - Express request object with updated profile data.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.updateBuyerProfile = async (req, res) => {
  try {
    const { name, phone, address, city, state, pincode } = req.body;

    // Find the buyer by ID
    const buyer = await User.findByPk(req.user.id);
    if (!buyer) return res.status(404).json({ error: "Buyer not found" });

    // Update fields
    if (name) buyer.name = name;
    if (phone) buyer.phone = phone;
    if (address) buyer.address = address;
    if (city) buyer.city = city;
    if (state) buyer.state = state;
    if (pincode) buyer.pincode = pincode;

    // Save changes
    await buyer.save();

    // Return success response
    res.status(200).json({
      message: "Profile updated successfully",
      buyer: {
        id: buyer.id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        address: buyer.address,
        city: buyer.city,
        state: buyer.state,
        pincode: buyer.pincode,
      },
    });
  } catch (error) {
    console.error("Update Buyer Profile Error:", error);
    res.status(500).json({ error: "Failed to update buyer profile" });
  }
};

/**
 * Logout Buyer
 * Handles buyer logout by clearing authentication cookies.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object used to send the HTTP response.
 */
exports.logoutBuyer = async (req, res) => {
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
