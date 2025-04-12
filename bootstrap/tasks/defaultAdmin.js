const { models } = require("../../config/sequelize.config"); // Import Sequelize models
const constants = require("../../config/constants/default"); // Import default constants
const { hashPassword } = require("../../utils/authUtils"); // Utility function to hash passwords

/**
 * Initialize Default Admin
 * Ensures that a default admin account exists in the database.
 * If no default admin exists, the function creates one using predefined constants.
 */
async function initializeDefaultAdmin() {
  try {
    const { User } = models; // Destructure the User model from Sequelize models

    console.log("Checking for default Admin bulk...");

    // Check if the default admin already exists in the database
    const adminExists = await User.findOne({
      where: {
        email: constants.DEFAULT_ADMIN.email, // Match default admin email
        role: constants.DEFAULT_ADMIN.role, // Match default admin role
        source: constants.DEFAULT_ADMIN.source, // Match source (e.g., 'internal', 'external')
        status: constants.DEFAULT_ADMIN.status, // Match status (e.g., 'active', 'inactive')
      },
    });

    if (!adminExists) {
      // If no default admin exists, create a new one
      console.log("No default admin found. Creating a default admin...");

      const defaultAdmin = {
        name: constants.DEFAULT_ADMIN.name, // Use default name from constants
        email: constants.DEFAULT_ADMIN.email, // Use default email from constants
        password: await hashPassword(constants.DEFAULT_ADMIN.password), // Hash the default password
        role: constants.DEFAULT_ADMIN.role, // Assign default role (e.g., 'admin')
        source: constants.DEFAULT_ADMIN.source, // Assign default source
        status: constants.DEFAULT_ADMIN.status, // Assign default status (e.g., 'active')
      };

      await User.create(defaultAdmin); // Create the default admin in the database
      console.log("Default Admin created successfully.");
    } else {
      console.log("Default Admin already exists."); // Log if the default admin is already present
    }
  } catch (error) {
    console.error("Error initializing admin user:", error); // Log any errors
    throw error; // Propagate the error to stop further tasks
  }
}

module.exports = initializeDefaultAdmin; // Export the function for use in other parts of the application
