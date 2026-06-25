import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import agentAuthRoutes from "./routes/agentAuth.routes.js";
import clientAuthRoutes from "./routes/clientAuth.routes.js";
import { connectDB } from "./lib/db.js";
import claimRoutes from "./routes/claimRoutes.js"
import documentRoutes from "./routes/documentRoutes.js"
import taskRoutes from "./routes/taskRoutes.js"
import cookieParser from "cookie-parser";
import cron from "node-cron";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { connectRedis, redisClient } from "./lib/redis.js";
import { connectRabbitMQ } from "./lib/rabbitmq.js";
import { spawn } from 'child_process';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();

const PORT = process.env.PORT;

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS must come BEFORE rate limiter so OPTIONS preflight requests get headers
const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Raised from 100 — auth/check is called on every page load
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/auth/check', // never rate-limit the auth check
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
});
app.use("/api/", limiter);

app.use("/api/auth", agentAuthRoutes);
app.use("/api/client-auth", clientAuthRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


// Schedule the /assign endpoint to run every 5 minutes
cron.schedule('*/1 * * * *', () => {
    console.log('Running claim assignment job...');
    axios.post(`http://localhost:${PORT}/api/claims/assign`)
        .then(response => console.log('Claims assigned:', response.data))
        .catch(error => console.error('Error assigning claims:', error));
});



const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

server.listen(PORT, async () => {
    console.log(`server is running on port ${PORT}`);
    await connectDB();
    await connectRedis();
    await connectRabbitMQ(io);
});
