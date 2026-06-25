import React, { useState } from 'react';
import { useClientAuthStore } from '../store/useClientAuthStore';
import { Eye, EyeOff, Loader2, User, Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const ClientSignup = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
    });

    const { signup, isSigningUp } = useClientAuthStore();

    const validateForm = () => {
        if (!formData.fullName.trim()) return toast.error("Full name is required");
        if (!formData.email.trim()) return toast.error("Email is required");
        if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
        if (!formData.password) return toast.error("Password is required");
        if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const success = validateForm();
        if (success === true) signup(formData);
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-dmsans bg-black/50 p-4">
            <div className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent mb-2">Create Account</h2>
                    <p className="text-gray-400 text-sm">Sign up to manage and track your claims</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="size-5 text-gray-500" />
                            </div>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="size-5 text-gray-500" />
                            </div>
                            <input
                                type="email"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="size-5 text-gray-500" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="size-5 text-gray-500 hover:text-gray-300" />
                                ) : (
                                    <Eye className="size-5 text-gray-500 hover:text-gray-300" />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSigningUp}
                        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                        {isSigningUp ? <Loader2 className="size-5 animate-spin" /> : "Create Account"}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-gray-400 text-sm">
                        Already have an account?{" "}
                        <Link to="/client/login" className="text-blue-400 hover:text-blue-300 font-bold">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ClientSignup;
