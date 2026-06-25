import agent from "../models/agent.model.js"
import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import Agent from "../models/agent.model.js";
import { logger } from "../lib/logger.js";

export const signup = async (req, res) => {
    const { fullName, agentID, password } = req.body;
    try {
        if (!fullName || !agentID || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existingAgent = await Agent.findOne({ agentID }); // <-- Change variable name here
        if (existingAgent) {
            return res.status(400).json({ message: "Agent already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedpass = await bcrypt.hash(password, salt);

        const newAgent = new Agent({
            fullName,
            agentID,
            password: hashedpass
        });

        if (newAgent) {
            await newAgent.save();
            generateToken(newAgent._id, res);

            res.status(201).json({
                _id: newAgent._id,
                fullName: newAgent.fullName,
                agentID: newAgent.agentID,
                profilePic: newAgent.profilePic
            });
        } else {
            res.status(400).json({ message: "Invalid agent data" });
        }
    } catch (error) {
        logger.error("Error in signup controller", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    try {

        const { agentID, password } = req.body;
        const agent = await Agent.findOne({ agentID });

        if (!agent) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isPassCorrect = await bcrypt.compare(password, agent.password);
        if (!isPassCorrect) {
            return res.status(400).json({ message: "Invalid creadentials" });
        }

        generateToken(agent._id, res); // resend the cookie 

        res.status(200).json({
            _id: agent._id,
            fullName: agent.fullName,
            agentID: agent.agentID,
            profilePic: agent.profilePic

        });
    } catch (error) {
        logger.error("Error in login controller", { error: error.message });
        return res.status(500).json({ message: "internal server error" });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        return res.status(200).json({ message: "logged out successfully" });

    } catch (error) {
        logger.error("Error in logout controller", { error: error.message });
        return res.status(500).json({ message: "internal server error" });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.agent);
    } catch (error) {
        logger.error("Error in checkAuth controller", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};