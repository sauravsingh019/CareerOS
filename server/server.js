const app = require("./src/app");
const connectDatabase = require("./src/config/db");

const PORT = process.env.PORT || 5051;

const startServer = async () => {
  let databaseReady = false;

  try {
    await connectDatabase();
    databaseReady = true;
  } catch (error) {
    console.warn(`MongoDB connection unavailable: ${error.message}`);
    console.warn("Starting server in limited mode so the frontend preview is still available.");
  }

  app.locals.databaseReady = databaseReady;

  app.listen(PORT, () => {
    console.log(`AI Career Assistant server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
