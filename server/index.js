require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB, dbMiddleware } = require("./utils/db");

const filesRouter = require("./routes/files");
const fileChunksRouter = require("./routes/fileChunks");
const decryptRouter = require("./routes/decrypt");
const analyticsRouter = require("./routes/analytics");
const reconcileRouter = require("./routes/reconcile");
const auditRouter = require("./routes/audit");
const miscRouter = require("./routes/misc");
const authRouter = require("./routes/auth");
const adminUsersRouter = require("./routes/adminUsers");
const adminAuditRouter = require("./routes/adminAudit");
const adminDeletionsRouter = require("./routes/adminDeletions");
const passwordResetRouter = require("./routes/passwordReset");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://new-cmd-app-amber.vercel.app",
];

if (process.env.FRONTEND_URL) {
  const envUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
  if (!allowedOrigins.includes(envUrl)) {
    allowedOrigins.push(envUrl);
  }
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: "500mb" }));

// Pre-initialize DB connection on server startup
connectDB().catch((err) => console.warn("Initial DB connect deferred:", err.message));

// Apply database connection middleware to guarantee active DB across serverless invocations
app.use(dbMiddleware);

// Mount modular API routers
app.use("/api", authRouter);
app.use("/api", passwordResetRouter);
app.use("/api", adminUsersRouter);
app.use("/api", adminAuditRouter);
app.use("/api", adminDeletionsRouter);
app.use("/api", filesRouter);
app.use("/api", fileChunksRouter);
app.use("/api", decryptRouter);
app.use("/api", analyticsRouter);
app.use("/api", reconcileRouter);
app.use("/api", auditRouter);
app.use("/api", miscRouter);

// Export for serverless / Vercel deployment
module.exports = app;

// Start Server in standalone mode
if (process.env.NODE_ENV !== "test" && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
