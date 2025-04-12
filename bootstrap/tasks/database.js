const { connectToDatabase } = require("../../config/sequelize.config"); // Import the function to establish a database connection

/**
 * Initialize Database
 * Attempts to connect to the database with a specified number of retries in case of failure.
 * Ensures a robust retry mechanism for reliable database connectivity.
 */
async function initializeDatabase() {
  const maxRetries = 3; // Maximum number of retry attempts
  const retryDelay = 5000; // Delay between retries in milliseconds (5 seconds)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Connecting to the database... (Attempt ${attempt}/${maxRetries})`
      );
      await connectToDatabase(); // Attempt to establish a database connection
      console.log("Database connection established."); // Log success
      return; // Exit the function after a successful connection
    } catch (error) {
      // Log the error for the current attempt
      console.error(
        `Database connection attempt ${attempt} failed: ${error.message}`
      );

      if (attempt < maxRetries) {
        // If the maximum retries have not been reached, wait before retrying
        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait for the specified delay
      } else {
        // If all attempts fail, log a final error message
        console.error("All database connection attempts failed.");
        throw error; // Re-throw the error to ensure it is handled upstream
      }
    }
  }
}

module.exports = initializeDatabase; // Export the function for use in other parts of the application
