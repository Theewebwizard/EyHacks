import { Eye, EyeOff, Loader2, User, Lock, Hash } from 'lucide-react';
import { React, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const AgentSignup = () => {
  const [showPass, setShowPass] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    agentID: '',
    password: '',
  });

  const { signUp, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error('Full name is required');
    if (!formData.agentID.trim()) return toast.error('Agent ID is required');
    if (!formData.password) return toast.error('Password is required');
    if (formData.password.length < 6)
      return toast.error('Password must be at least 6 characters');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) signUp(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-dmsans p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="glass-card p-8 md:p-10">
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <User className="size-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">Create Agent Account</h1>
            <p className="text-sm text-gray-400">Register your BPO Agent terminal access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all text-sm"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            {/* Agent ID */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Agent ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="size-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="AGT-001 or agent@company.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all text-sm"
                  value={formData.agentID}
                  onChange={(e) => setFormData({ ...formData, agentID: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-4 text-gray-500" />
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass
                    ? <EyeOff className="size-4 text-gray-500 hover:text-gray-300 transition-colors" />
                    : <Eye className="size-4 text-gray-500 hover:text-gray-300 transition-colors" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSigningUp}
              className="w-full mt-2 btn-pill-primary py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSigningUp
                ? <><Loader2 className="size-4 animate-spin" /> Creating Account...</>
                : 'Create Agent Account'
              }
            </button>
          </form>

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-white hover:text-gray-300 font-bold underline transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AgentSignup;
