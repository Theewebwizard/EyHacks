import express from "express"
import { signup, login, logout, checkAuth, forgotPassword } from "../controllers/agent.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.get("/check", protectRoute, checkAuth);

export default router;