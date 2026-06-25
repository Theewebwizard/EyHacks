import { generateClientToken } from "../lib/utils.js";
import ClientAuth from "../models/clientAuth.model.js";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger.js";

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const clientExists = await ClientAuth.findOne({ email: new RegExp('^' + email + '$', 'i') });

        if (clientExists) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newClient = new ClientAuth({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
        });

        if (newClient) {
            // generate jwt token
            generateClientToken(newClient._id, res);
            await newClient.save();

            res.status(201).json({
                _id: newClient._id,
                fullName: newClient.fullName,
                email: newClient.email,
            });
        } else {
            res.status(400).json({ message: "Invalid client data" });
        }
    } catch (error) {
        logger.error("Error in client signup controller", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const client = await ClientAuth.findOne({ email: new RegExp('^' + email + '$', 'i') });

        if (!client) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, client.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        generateClientToken(client._id, res);

        res.status(200).json({
            _id: client._id,
            fullName: client.fullName,
            email: client.email,
        });
    } catch (error) {
        logger.error("Error in client login controller", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie("client-jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        logger.error("Error in client logout controller", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.client);
    } catch (error) {
        logger.error("Error in checkAuth controller", { error: error.message });
        res.status(500).json({ message: "Internal server error" });
    }
};
