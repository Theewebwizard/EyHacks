import mongoose from "mongoose";
import { logger } from "./logger.js";

export const connectDB = async () => {

    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/myDatabase");
        logger.info("Connected to MongoDB");
    } catch (err) {
        logger.error("MongoDB connection error", { error: err.message });
    }
}