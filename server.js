const { loadEnvironmentConfig } = require("./config/env.config");
loadEnvironmentConfig(); // Load environment configurations
const { closeDatabaseConnection } = require("./config/sequelize.config"); // Import function to close database connection
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const bootstrap = require("./bootstrap"); // Import the bootstrap script
const client = require("prom-client");

const app = express(); // Create an Express application

const register = new client.Registry();
client.collectDefaultMetrics({ register }); // basic metrics

// Optional custom metric
// const requestCounter = new client.Counter({
//   name: "http_requests_total",
//   help: "Total number of HTTP requests",
// });

const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

register.registerMetric(requestCounter);

// Middleware to increment counter with labels
app.use((req, res, next) => {
  res.on('finish', () => {
    requestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path, // handles route matching
      status: res.statusCode,
    });
  });
  next();
});

// app.use((req, res, next) => {
//   requestCounter.inc(); // count each request
//   next();
// });

app.use((req, res, next) => {
  if (req.path !== "/metrics") {
    requestCounter.inc();
  }
  next();
});


// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware setup
app.use(cookieParser()); // Parse cookies from incoming requests
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "'unsafe-inline'",],
//         "img-src": [
//           "'self'",
//           "https://images.unsplash.com",
//           "https://studyupindia.com",
//         ],
//       },
//     },
//   })
// ); // Apply security best practices to HTTP headers
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the 'public' directory
app.set("views", path.join(__dirname, "app/views")); // Set the directory for views (e.g., templates)
app.disable("x-powered-by"); // Hide the 'X-Powered-By' header to obscure the use of Express

// CORS options
const corsOptions = {
  origin: "*", // Allow requests from all origins
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Allow specified HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow specified headers
  credentials: true, // Allow credentials (e.g., cookies) to be sent
  optionsSuccessStatus: 200, // HTTP status for preflight response
};

// Apply middleware
app.use(cors(corsOptions)); // Enable CORS with specified options
app.use(express.json({ limit: "10kb" })); // Parse JSON payloads, limiting body size to 10KB
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // Parse URL-encoded payloads
app.use(bodyParser.json()); // Parse JSON payloads (legacy middleware for compatibility)

// Routes
require("./app/routes/buyer/auth")(app); // Register application routes for buyer authentication
require("./app/routes/buyer/navigate")(app); // Register application routes for buyer authentication
require("./app/routes/buyer/dashboard")(app); // Register application routes for buyer dashboard
require("./app/routes/seller/navigate")(app); // Register application routes for seller dashboard 

require("./app/routes/seller/auth")(app); // Register application routes for seller authentication
require("./app/routes/seller/dashboard")(app); // Register application routes for seller dashboard

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Resource not found" })); // Handle unknown routes

const PORT = process.env.PORT || 3000; // Set the application port (default to 3000)

// Track active connections
const activeConnections = new Set(); // Maintain a set of active connections
let server; // Server instance

// Start server
(async () => {
  try {
    await bootstrap(); // Initialize the application (e.g., database connections, initial configurations)
    server = app.listen(PORT, () => {
      console.debug(`Server is running on http://localhost:${PORT}`); // Log server start message
    });

    // Track active connections
    server.on("connection", (socket) => {
      activeConnections.add(socket); // Add a new connection to the set
      socket.on("close", () => activeConnections.delete(socket)); // Remove the connection when it closes
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`); // Handle port already in use
      } else {
        console.error(`Server error: ${err.message}`); // Log other server errors
      }
      process.exit(1); // Exit with error
    });
  } catch (error) {
    console.error("Failed to start the server:", error.message); // Log bootstrap failure
    process.exit(1); // Exit if initialization fails
  }
})();

// Graceful shutdown
const gracefulShutdown = async () => {
  console.debug("Received kill signal, initiating graceful shutdown...");

  try {
    // Close the server
    if (server) {
      console.debug("Closing server...");
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error("Error during server close:", err); // Log error while closing server
            return reject(err);
          } else {
            console.debug("Server closed successfully.");
            server.getConnections((err, count) => {
              if (err) {
                console.error("Error retrieving active connections:", err);
              } else {
                console.debug(
                  `Number of active connections during shutdown: ${count}`
                );
                if (count > 0) {
                  console.warn("Some connections are still open."); // Warn about active connections
                }
              }
            });
            resolve();
          }
        });
      });
    }

    // Close the database connection
    console.debug("Closing database connection...");
    await closeDatabaseConnection(); // Gracefully close the database
    console.debug("Database connection closed successfully.");

    console.debug("Graceful shutdown completed. Exiting with code 0.");
    process.exit(0); // Exit cleanly
  } catch (error) {
    console.error("Error during graceful shutdown:", error.message); // Log shutdown errors
    process.exit(1); // Exit with error
  }

  // Force shutdown if connections hang
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down."
    );
    activeConnections.forEach((socket) => socket.destroy()); // Forcefully destroy active connections
    console.error("Exiting forcefully with Exit Code 1.");
    process.exit(1);
  }, 10000); // 10-second timeout for forced shutdown
};

// Handle signals
process.on("SIGTERM", gracefulShutdown); // Handle termination signal
process.on("SIGINT", gracefulShutdown); // Handle interrupt signal (Ctrl+C)

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`); // Log uncaught exceptions
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason); // Log unhandled promise rejections
  process.exit(1);
});
