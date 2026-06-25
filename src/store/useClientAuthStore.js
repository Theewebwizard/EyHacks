import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useClientAuthStore = create((set, get) => ({
    authClient: null,
    isSigningUp: false,
    isLoggingIn: false,
    isCheckingAuth: true,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/client-auth/check");
            set({ authClient: res.data });
        } catch (error) {
            set({ authClient: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/client-auth/signup", data);
            set({ authClient: res.data });
            toast.success("Account created successfully");
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/client-auth/login", data);
            set({ authClient: res.data });
            toast.success("Logged in successfully");
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/client-auth/logout");
            set({ authClient: null });
            toast.success("Logged out successfully");
            
            // clear legacy localStorage just in case
            localStorage.removeItem('clientClaimID');
            localStorage.removeItem('clientEmail');
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },
}));
