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

// ─── CORS ──────────────────────────────────────────────────────────────────
// Allow the Vercel frontend and local dev.
// In production set CLIENT_URL = https://your-app.vercel.app
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, same-host)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CareerOS API is healthy",
    data: {
      env: process.env.NODE_ENV || "development",
      databaseReady: Boolean(req.app.locals.databaseReady),
      aiProvider: process.env.AI_PROVIDER || "auto"
    }
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai", aiRoutes);

// ─── Static Client (local dev / single-host deploy) ───────────────────────
// When deployed to Vercel+Render (Option B), the static files are served by
// Vercel, so these routes only matter for local development.
if (process.env.NODE_ENV !== "production" || process.env.SERVE_STATIC === "true") {
  app.use(express.static(path.join(__dirname, "../../client")));

  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) return next();
    res.sendFile(path.join(__dirname, "../../client/index.html"));
  });
}

// ─── Error Handling ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
