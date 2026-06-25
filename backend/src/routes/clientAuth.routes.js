import express from "express";
import { signup, login, logout, checkAuth } from "../controllers/clientAuth.controller.js";
import { protectClientRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check", protectClientRoute, checkAuth);

export default router;
