const { models } = require("../../config/sequelize.config"); // Import Sequelize models
const constants = require("../../config/constants/default"); // Import default constants
const { hashPassword } = require("../../utils/authUtils"); // Utility function to hash passwords

/**
 * Initialize Default Seller
 * Checks if a default seller account exists in the database, and if not, creates one using predefined constants.
 * This ensures the system always has a default seller for initial setup.
 */
async function initializeDefaultSeller() {
  try {
    const { User } = models; // Destructure the User model from Sequelize models

    console.log("Checking for default Seller bulk...");

    // Check if the default seller already exists in the database
    const sellerExists = await User.findOne({
      where: {
        email: constants.DEFAULT_SELLER.email, // Match default seller email
        role: constants.DEFAULT_SELLER.role, // Match default seller role
        publication: constants.DEFAULT_SELLER.publication, // Match publication (e.g., 'NCERT')
        source: constants.DEFAULT_SELLER.source, // Match source (e.g., 'internal', 'external')
        status: constants.DEFAULT_SELLER.status, // Match status (e.g., 'active', 'inactive')
      },
    });

    if (!sellerExists) {
      // If the default seller does not exist, create a new one
      console.log("No default seller found. Creating a default seller...");

      const defaultSeller = {
        name: constants.DEFAULT_SELLER.name, // Use default name from constants
        email: constants.DEFAULT_SELLER.email, // Use default email from constants
        password: await hashPassword(constants.DEFAULT_SELLER.password), // Hash the default password
        role: constants.DEFAULT_SELLER.role, // Assign default role (e.g., 'seller')
        publication: constants.DEFAULT_SELLER.publication, // Match publication (e.g., 'NCERT')
        source: constants.DEFAULT_SELLER.source, // Assign default source
        status: constants.DEFAULT_SELLER.status, // Assign default status (e.g., 'active')
        phone: constants.DEFAULT_SELLER.phone, // Match phone number
        address: constants.DEFAULT_SELLER.address, // Match address
        city: constants.DEFAULT_SELLER.city, // Match city
        state: constants.DEFAULT_SELLER.state, // Match state
        pincode: constants.DEFAULT_SELLER.pincode, // Match pincode
      };

      await User.create(defaultSeller); // Create the default seller in the database
      console.log("Default seller created successfully.");
    } else {
      console.log("Default seller already exists."); // Log if the default seller is already present
    }
  } catch (error) {
    console.error("Error initializing default seller:", error); // Log any errors
    throw error; // Propagate the error to stop further tasks
  }
}

module.exports = initializeDefaultSeller; // Export the function for use in other parts of the application
