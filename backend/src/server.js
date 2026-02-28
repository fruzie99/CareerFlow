const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const counsellorRoutes = require("./routes/counsellorRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const communityPostRoutes = require("./routes/communityPostRoutes");
const communityReplyRoutes = require("./routes/communityReplyRoutes");
const aiRoutes = require("./routes/aiRoutes");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const localhostPattern = /^http:\/\/localhost:\d+$/;
const vercelPattern = /\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || localhostPattern.test(origin) || vercelPattern.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.raw({ type: "application/pdf", limit: "10mb" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    geminiKey: process.env.GEMINI_KEY ? "set (" + process.env.GEMINI_KEY.substring(0, 8) + "...)" : "MISSING",
    mongoUri: process.env.MONGODB_URI ? "set" : "MISSING",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/counsellors", counsellorRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/community/posts", communityPostRoutes);
app.use("/api/community/replies", communityReplyRoutes);
app.use("/api/ai", aiRoutes);

// Fallback for unknown routes to avoid HTML responses
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal server error",
  });
});

const bootstrap = async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`API running on port ${port}`);
    console.log("ENV CLIENT_URLS:", process.env.CLIENT_URLS);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
