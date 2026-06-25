import jwt from "jsonwebtoken"

export const generateToken = (agentId, res) => {
    const token = jwt.sign({ agentId }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development"
    })

    return token;
};

export const generateClientToken = (clientId, res) => {
    const token = jwt.sign({ clientId }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("client-jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development"
    })

    return token;
};