import mongoose from "mongoose";

export const connectDB = async () => {

    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/myDatabase");
        console.log("connected to the database");
    } catch (err) {
        console.log("mongodb connection error:", err);
    }
}