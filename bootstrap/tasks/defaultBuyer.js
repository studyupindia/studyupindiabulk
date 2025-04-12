const { models } = require("../../config/sequelize.config"); // Import Sequelize models
const constants = require("../../config/constants/default"); // Import default constants
const { hashPassword } = require("../../utils/authUtils"); // Utility function to hash passwords

/**
 * Initialize Default Admin
 * Ensures that a default admin account exists in the database.
 * If no default admin exists, the function creates one using predefined constants.
 */
async function initializeDefaultBuyer() {
  try {
    const { User } = models; // Destructure the User model from Sequelize models

    console.log("Checking for default Buyer bulk...");

    // Check if the default admin already exists in the database
    const buyerExists = await User.findOne({
      where: {
        email: constants.DEFAULT_BUYER.email, // Match default admin email
        role: constants.DEFAULT_BUYER.role, // Match default admin role
        source: constants.DEFAULT_BUYER.source, // Match source (e.g., 'internal', 'external')
        status: constants.DEFAULT_BUYER.status, // Match status (e.g., 'active', 'inactive')
      },
    });

    if (!buyerExists) {
      // If no default admin exists, create a new one
      console.log("No default buyer found. Creating a default buyer...");

      const defaultbuyer = {
        name: constants.DEFAULT_BUYER.name, // Use default name from constants
        email: constants.DEFAULT_BUYER.email, // Use default email from constants
        password: await hashPassword(constants.DEFAULT_BUYER.password), // Hash the default password
        role: constants.DEFAULT_BUYER.role, // Assign default role (e.g., 'admin')
        source: constants.DEFAULT_BUYER.source, // Assign default source
        status: constants.DEFAULT_BUYER.status, // Assign default status (e.g., 'active')
        phone: constants.DEFAULT_BUYER.phone, // Match phone number
        address: constants.DEFAULT_BUYER.address, // Match address
        city: constants.DEFAULT_BUYER.city, // Match city
        state: constants.DEFAULT_BUYER.state, // Match state
        pincode: constants.DEFAULT_BUYER.pincode, // Match pincode
      };

      await User.create(defaultbuyer); // Create the default admin in the database
      console.log("Default Buyer created successfully.");
    } else {
      console.log("Default Buyer already exists."); // Log if the default admin is already present
    }
  } catch (error) {
    console.error("Error initializing Buyer user:", error); // Log any errors
    throw error; // Propagate the error to stop further tasks
  }
}

module.exports = initializeDefaultBuyer; // Export the function for use in other parts of the application
