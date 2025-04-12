const initializeDatabase = require("./tasks/database");
const initializeDefaultAdmin = require("./tasks/defaultAdmin");
const initializeDefaultSeller = require("./tasks/defaultSeller");
const initializeDefaultBuyer = require("./tasks/defaultBuyer");
const intializeDefaultBooks = require("./tasks/initialBooks");
const initializeCronJobs = require("./tasks/cronJobs");
const initializeTest = require("./tasks/test");


// List of tasks to execute
const tasks = [
  { task: initializeDatabase, optional: false },
  { task: initializeDefaultAdmin, optional: false },
  { task: initializeDefaultSeller, optional: false },
  { task: initializeDefaultBuyer, optional: false },
  { task: intializeDefaultBooks, optional: false },
  { task: initializeTest, optional: false },
  // { task: initializeCronJobs, optional: true }, // Optional task
];

async function bootstrap() {
  console.log("Starting application bootstrap process...");

  for (const item of tasks) {
    const task = item.task || item;
    const isOptional = item.optional || false;

    try {
      console.log(`Executing bootstrap task: ${task.name}`);
      await task();
    } catch (error) {
      if (isOptional) {
        console.warn(
          `Optional bootstrap task "${task.name}" failed: ${error.message}`
        );
      } else {
        console.error(`Error during bootstrap task: ${task.name}`, error);
        console.error(
          `Bootstrap process halted. Dependent tasks will not be executed.`
        );
        throw error; // Stop the process on failure
      }
    }
  }

  console.log("Bootstrap process completed successfully.");
}

module.exports = bootstrap;
