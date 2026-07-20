import React, { useState, useEffect } from 'react';
import { useClientAuthStore } from '../store/useClientAuthStore';
import { useAuthStore } from '../store/useAuthStore';
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const UnifiedLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Tabs: 'client' or 'agent' (default to 'client')
  const [activeTab, setActiveTab] = useState('client');
  
  // Toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

  // Form states
  const [clientData, setClientData] = useState({ email: '', password: '' });
  const [agentData, setAgentData] = useState({ agentID: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotAgentID, setForgotAgentID] = useState('');
  
  const [isResetting, setIsResetting] = useState(false);

  // Auth stores
  const { login: loginClient, isLoggingIn: isLoggingInClient, forgotPassword: forgotClientPass } = useClientAuthStore();
  const { login: loginAgent, isLoggingIn: isLoggingInAgent, forgotPassword: forgotAgentPass } = useAuthStore();

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'agent') {
      setActiveTab('agent');
    } else {
      setActiveTab('client');
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsForgotMode(false);
    setShowPassword(false);
    navigate(`/login?type=${tab}`, { replace: true });
  };

  const handleClientLogin = (e) => {
    e.preventDefault();
    if (!clientData.email.trim() || !clientData.password) {
      return toast.error("Please fill in all fields");
    }
    loginClient(clientData);
  };

  const handleAgentLogin = (e) => {
    e.preventDefault();
    if (!agentData.agentID.trim() || !agentData.password) {
      return toast.error("Please fill in all fields");
    }
    loginAgent(agentData);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setIsResetting(true);
    try {
      if (activeTab === 'client') {
        if (!forgotEmail.trim()) {
          toast.error("Email is required");
          setIsResetting(false);
          return;
        }
        const success = await forgotClientPass(forgotEmail.trim());
        if (success) {
          setForgotEmail('');
          setIsForgotMode(false);
        }
      } else {
        if (!forgotAgentID.trim()) {
          toast.error("Agent ID is required");
          setIsResetting(false);
          return;
        }
        const success = await forgotAgentPass(forgotAgentID.trim());
        if (success) {
          setForgotAgentID('');
          setIsForgotMode(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-dmsans p-4 relative">
      {/* Center glow */}
      <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)'}} />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated gradient-border p-6 md:p-10 rounded-3xl w-full max-w-md relative z-10"
      >
        <AnimatePresence mode="wait">
          {!isForgotMode ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Logo / Heading */}
              <div className="text-center mb-8">
                <div className="text-3xl md:text-4xl font-extrabold mb-2 glow-text"
                  style={{background:'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>
                  SAKSHAM Portal
                </div>
                <p className="text-gray-500 text-xs md:text-sm tracking-wide">Secure Terminal Authentication</p>
              </div>

              {/* Tabs */}
              <div className="flex bg-white/[0.04] p-1 rounded-2xl mb-8 border border-white/[0.08] relative">
                <div 
                  className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out z-0"
                  style={{
                    left: activeTab === 'client' ? '4px' : 'calc(50% + 2px)',
                    width: 'calc(50% - 6px)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 24px rgba(255,255,255,0.08)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleTabChange('client')}
                  className={`flex-1 text-center py-3 text-sm font-extrabold rounded-xl transition-all duration-300 relative z-10 ${
                    activeTab === 'client' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Client Portal
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('agent')}
                  className={`flex-1 text-center py-3 text-sm font-extrabold rounded-xl transition-all duration-300 relative z-10 ${
                    activeTab === 'agent' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Agent Terminal
                </button>
              </div>

              {/* Client Login Form */}
              {activeTab === 'client' && (
                <form onSubmit={handleClientLogin} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="size-5 text-gray-500" />
                      </div>
                      <input
                        type="email"
                        required
                        className="input-dark w-full !pl-10"
                        placeholder="you@example.com"
                        value={clientData.email}
                        onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Password</label>
                      <button
                        type="button"
                        onClick={() => setIsForgotMode(true)}
                        className="text-xs text-white/60 hover:text-white font-semibold transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="size-5 text-gray-500" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="input-dark w-full !pl-10 !pr-10"
                        placeholder="••••••••"
                        value={clientData.password}
                        onChange={(e) => setClientData({ ...clientData, password: e.target.value })}
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
                    disabled={isLoggingInClient}
                    className="w-full btn-pill-primary py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    {isLoggingInClient ? <Loader2 className="size-5 animate-spin" /> : "Secure Access"}
                  </button>
                </form>
              )}

              {/* Agent Login Form */}
              {activeTab === 'agent' && (
                <form onSubmit={handleAgentLogin} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Agent ID</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="size-5 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        className="input-dark w-full !pl-10"
                        placeholder="Agent ID or Email"
                        value={agentData.agentID}
                        onChange={(e) => setAgentData({ ...agentData, agentID: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Password</label>
                      <button
                        type="button"
                        onClick={() => setIsForgotMode(true)}
                        className="text-xs text-white/60 hover:text-white font-semibold transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="size-5 text-gray-500" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="input-dark w-full !pl-10 !pr-10"
                        placeholder="••••••••"
                        value={agentData.password}
                        onChange={(e) => setAgentData({ ...agentData, password: e.target.value })}
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
                    disabled={isLoggingInAgent}
                    className="w-full btn-pill-primary py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    {isLoggingInAgent ? <Loader2 className="size-5 animate-spin" /> : "Sign In"}
                  </button>
                </form>
              )}

              {/* Agent Registration Link (Only for agents) */}
              {activeTab === 'agent' && (
                <div className="text-center mt-6">
                  <p className="text-gray-400 text-sm">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-white hover:text-gray-300 font-bold underline">
                      Create Agent Account
                    </Link>
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Forgot Password Panel */
            <motion.div
              key="forgot-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Back Button */}
              <button
                type="button"
                onClick={() => setIsForgotMode(false)}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors mb-6 uppercase tracking-wider"
              >
                <ArrowLeft className="size-4" /> Back to Sign In
              </button>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Reset Password</h3>
                <p className="text-gray-400 text-xs md:text-sm">
                  {activeTab === 'client' 
                    ? "Enter your email to request a new temporary password." 
                    : "Enter your Agent ID (or email) to reset your account password."}
                </p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                {activeTab === 'client' ? (
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Client Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="size-5 text-gray-500" />
                      </div>
                      <input
                        type="email"
                        required
                        className="input-dark w-full !pl-10"
                        placeholder="client@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Agent ID</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="size-5 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        required
                        className="input-dark w-full !pl-10"
                        placeholder="Agent ID or Email"
                        value={forgotAgentID}
                        onChange={(e) => setForgotAgentID(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full btn-pill-primary py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {isResetting ? <Loader2 className="size-5 animate-spin" /> : "Request New Password"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default UnifiedLogin;
