const dotenv = require("dotenv"); // Library to load environment variables from a .env file
const fs = require("fs"); // File system module to interact with the file system
const path = require("path"); // Path module for handling and transforming file paths

/**
 * Load Environment Configuration
 * Dynamically loads environment variables based on the current environment.
 * Ensures that the appropriate `.env` file is used for each environment (e.g., development, production).
 */
function loadEnvironmentConfig() {
  // Determine the current environment (default to 'development' if not set)
  const environment = process.env.NODE_ENV || "development";
  let envFile = ".env.development"; // Default to the development environment file

  // Switch the environment file based on the current environment
  if (environment === "production") {
    envFile = ".env.production"; // Use production environment file
  } else if (environment === "stage") {
    envFile = ".env.stage"; // Use stage environment file
  }
  // Additional environments can be added here with more else-if blocks

  // Construct the full path to the .env file
  const envFilePath = path.join(__dirname, "../", envFile);

  // Check if the .env file exists
  if (!fs.existsSync(envFilePath)) {
    console.warn(`Warning: ${envFile} not found.`); // Log a warning if the file is missing

    // Critical environments require the configuration file to exist
    if (
      environment === "production" ||
      environment === "development" ||
      environment === "stage"
    ) {
      console.error(
        `Environment configuration file is mandatory in the ${environment} environment.`
      );
      process.exit(1); // Halt execution if the .env file is missing in these environments
    }
  } else {
    // Load environment variables from the specified .env file
    dotenv.config({ path: envFilePath });
    console.debug(
      `Environment set to ${environment}, using configuration from ${envFile}`
    ); // Log the loaded environment
  }
}

module.exports = { loadEnvironmentConfig }; // Export the function for use in other modules
