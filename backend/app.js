const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const evaluateRoutes = require("./routes/evaluateRoutes");
const evaluationRoutes = require("./routes/evaluationRoutes");
const publicRoutes = require("./routes/publicRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "MaweshiAI backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/evaluate", evaluateRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/r", publicRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ message });
});

module.exports = app;
