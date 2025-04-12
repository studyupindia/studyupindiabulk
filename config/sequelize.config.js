const fs = require("fs"); // File system module for reading files
const path = require("path"); // Path module for handling and transforming file paths
const { Sequelize, Op } = require("sequelize"); // Sequelize ORM
const config = require("./db.config"); // Database configuration file

// Determine the environment (default to 'development' if not set)
const environment = process.env.NODE_ENV || "development";
const dbConfig = config[environment]; // Load the corresponding environment's database configuration

// Build base options object
const sequelizeOptions = {
  host: dbConfig.postgres.host, // Database host
  port: dbConfig.postgres.port, // Database port
  dialect: dbConfig.postgres.dialect, // Database dialect (e.g., postgres, mysql)
  logging: dbConfig.postgres.logging, // Enable/disable logging
  pool: dbConfig.postgres.pool, // Connection pooling configuration
};

// Conditionally include dialectOptions (e.g., for SSL) only in non-development
if (environment !== "development" && dbConfig.postgres.dialectOptions) {
  sequelizeOptions.dialectOptions = dbConfig.postgres.dialectOptions;
}

// Initialize Sequelize instance with database credentials and options
const sequelizeInstance = new Sequelize(
  dbConfig.postgres.database, // Database name
  dbConfig.postgres.username, // Username
  dbConfig.postgres.password, // Password
  sequelizeOptions
);

// Object to hold all Sequelize models
const models = {};

// Dynamically load all models from the models directory
const modelsDir = path.join(__dirname, "../app/models");

fs.readdirSync(modelsDir) // Read the contents of the models directory
  .filter((file) => file.endsWith(".js")) // Filter only `.js` files
  .forEach((file) => {
    // Dynamically import each model
    const model = require(path.join(modelsDir, file))(
      sequelizeInstance,
      Sequelize.DataTypes // Pass Sequelize DataTypes for model definition
    );
    models[model.name] = model; // Add the model to the models object
  });

// Set up associations between models (if defined)
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models); // Call the associate function if it exists
  }
});

/**
 * Helper function to connect to the database and sync models
 * @returns {Promise<void>}
 */
async function connectToDatabase() {
  try {
    console.debug("Attempting to authenticate database connection...");
    await sequelizeInstance.authenticate(); // Test database connection
    console.debug("Database authentication successful.");

    console.debug("Attempting to sync database models...");
    await sequelizeInstance.sync({ alter: true }); // Sync database models (use cautiously in production)
    console.debug("Database models synced successfully.");
  } catch (error) {
    console.error(
      "Error during database connection or synchronization:",
      error.message
    );
    throw error; // Propagate the error to be handled by the caller
  }
}

/**
 * Helper function to close the database connection
 * @returns {Promise<void>}
 */
const closeDatabaseConnection = async () => {
  try {
    await sequelizeInstance.close(); // Close the Sequelize connection
    console.debug("Database connection closed successfully.");
  } catch (error) {
    console.error("Error closing database connection:", error.message); // Log any errors
    throw error; // Propagate the error
  }
};

// Export Sequelize instance, models, and helper functions
module.exports = {
  sequelize: sequelizeInstance, // Export the Sequelize instance
  Sequelize, // Full Sequelize class
  Op, // Sequelize operators like Op.in, Op.or, etc.
  models, // Export the loaded models
  connectToDatabase, // Export the function to connect to the database
  closeDatabaseConnection, // Export the function to close the database connection
};
