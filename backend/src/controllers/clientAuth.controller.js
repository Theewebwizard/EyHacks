import { generateClientToken } from "../lib/utils.js";
import ClientAuth from "../models/clientAuth.model.js";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger.js";
import { sendForgotPasswordEmail } from "../lib/email.js";
import crypto from "crypto";

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const client = await ClientAuth.findOne({ email: new RegExp('^' + email.trim() + '$', 'i') });
        if (!client) {
            return res.status(404).json({ message: "No account found with this email" });
        }

        // Generate a new random 8-character temporary password
        const tempPassword = crypto.randomBytes(4).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        client.password = hashedPassword;
        await client.save();

        // Send reset email to client
        await sendForgotPasswordEmail(client.email, tempPassword);

        res.status(200).json({ message: "Temporary password sent successfully" });
    } catch (error) {
        logger.error("Error in client forgotPassword controller", { error: error.message });
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
