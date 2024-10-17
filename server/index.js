import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import ProductRoute from "./routes/ProductRoute.js";

// Server Creation
const server = express();
const port = process.env.PORT || 8000;
const corsOptions = {
  origin: true,
  credentials: true,
};

// Mongoose to database connection
const connect = async () => {
  try {
    await mongoose.connect(process.env.LOCAL_MONGO_URL);
    console.log("🎉 Database Connected 🎉");
  } catch (error) {
    console.log("Database Connection Failure" + error);
    process.exit(1);
  }
};

// Middleware
server.use(cors(corsOptions));
server.use("/api/v1/product_transaction", ProductRoute);

// Server connection to port
server.listen(port, () => {
  connect();
  console.log("Server Started at", port);
});
