const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require("./routes/accountRoutes");
const studentRoutes = require("./routes/studentRoutes");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Routes
app.use("/api/account", userRoutes);
app.use("/api/students", studentRoutes);

module.exports = app;
