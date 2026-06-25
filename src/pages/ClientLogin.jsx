import React, { useState } from 'react';
import { useClientAuthStore } from '../store/useClientAuthStore';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const ClientLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
      email: "",
      password: "",
  });

  const { login, isLoggingIn } = useClientAuthStore();

  const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.email.trim() || !formData.password) {
        return toast.error("Please fill in all fields");
      }
      login(formData);
  };

  return (
      <div className="min-h-screen flex items-center justify-center font-dmsans bg-black/50 p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10"
          >
              <div className="text-center mb-8">
                  <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent mb-2">Welcome Back</h2>
                  <p className="text-gray-400 text-sm">Sign in to your Client Portal</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                      disabled={isLoggingIn}
                      className="w-full mt-4 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                      {isLoggingIn ? <Loader2 className="size-5 animate-spin" /> : "Secure Access"}
                  </button>
              </form>

              <div className="text-center mt-6">
                  <p className="text-gray-400 text-sm">
                      Don't have an account?{" "}
                      <Link to="/client/signup" className="text-blue-400 hover:text-blue-300 font-bold">
                          Create account
                      </Link>
                  </p>
              </div>
          </motion.div>
      </div>
  );
};

export default ClientLogin;
