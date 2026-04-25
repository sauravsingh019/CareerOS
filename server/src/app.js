const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

// Parse API traffic and expose uploaded resumes for local development.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    data: {
      databaseReady: Boolean(req.app.locals.databaseReady)
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai", aiRoutes);

app.use(express.static(path.join(__dirname, "../../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/index.html"));
});

app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "../../client/index.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
