import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import axios from "axios";
import { data } from "react-router-dom";
import toast from "react-hot-toast";
const BASE_URL = "http://localhost:5001"

export const useAuthStore = create((set, get) => ({
    authAgent: null,
    isSigningUP: false,
    isLoggingIn: false,
    isCheckingAuth: true,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("auth/check");
            set({ authAgent: res.data });

        } catch (error) {
            // Safe to ignore or log minimally: means no active agent cookie session exists
            console.log("No active agent session detected.");
            set({ authAgent: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signUp: async (data) => {
        set({ isSigningUp: true });
        try {
            const response = await axiosInstance.post("/auth/signup", data);
            toast.success("succesfully signed up");
            set({ authAgent: response.data });
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    },

    login: async (data) => {

        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            toast.success("successfully logged in");
            set({ authAgent: res.data });

        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async (data) => {
        try {
            await axiosInstance.post("/auth/logout");
            toast.success("successfully logged out");
            set({ authAgent: null });

        } catch (error) {
            toast.error(error.response.data.message);
        }
    },
}));
