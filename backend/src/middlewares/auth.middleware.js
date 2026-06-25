import jwt from "jsonwebtoken";
import Agent from "../models/agent.model.js";
import { logger } from "../lib/logger.js";
export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }

        const agent = await Agent.findById(decoded.agentId).select("-password");

        if (!agent) {
            return res.status(404).json({ message: "User not found" });
        }

        req.agent = agent;
        next();
    } catch (error) {
        logger.error("Error in protectRoute middleware", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};

import ClientAuth from "../models/clientAuth.model.js";

export const protectClientRoute = async (req, res, next) => {
    try {
        const token = req.cookies['client-jwt'];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }

        const client = await ClientAuth.findById(decoded.clientId).select("-password");

        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }

        req.client = client;
        next();
    } catch (error) {
        logger.error("Error in protectClientRoute middleware", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};