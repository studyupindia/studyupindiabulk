const { schedule } = require("node-cron");

async function initializeCronJobs() {
  try {
    console.log("Initializing cron jobs...");

    // Example cron job to run every minute
    schedule("* * * * *", () => {
      console.log("Cron job executed at", new Date().toISOString());
    });

    console.log("Cron jobs initialized.");
  } catch (error) {
    console.error("Error initializing cron jobs:", error);
    throw error; // Fail the bootstrap process if cron job setup fails
  }
}

module.exports = initializeCronJobs;
