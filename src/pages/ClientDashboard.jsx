import React, { useEffect, useState } from 'react';
import { useClientAuthStore } from '../store/useClientAuthStore';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import { FileText, LogOut, Loader2, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ClientDashboard = () => {
  const { authClient, logout } = useClientAuthStore();
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authClient) {
      navigate('/client/login');
      return;
    }

    const fetchMyClaims = async () => {
      try {
        const response = await axiosInstance.get('/claims/my-claims');
        setClaims(response.data);
      } catch (error) {
        toast.error("Failed to load your claims");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyClaims();
  }, [authClient, navigate]);

  const handleClaimClick = (claim) => {
    if (claim.status === 'Resolved') {
      return; // Do nothing, it's unclickable
    }
    navigate(`/client/portal/${claim.claimID}`);
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin size-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-transparent font-dmsans p-6 md:p-10 pt-20">

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
              My Dashboard
            </h1>
            <p className="text-gray-400">Welcome back, <span className="text-white font-bold">{authClient?.fullName}</span></p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-4 md:mt-0 btn-pill-danger !py-2.5 !px-5"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Claims Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
            <FileText className="text-white" /> Your Claims
          </h2>

          {claims.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center flex flex-col items-center">
              <ShieldAlert size={48} className="text-gray-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Claims Found</h3>
              <p className="text-gray-400">There are currently no active or resolved claims registered under your email address ({authClient?.email}).</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {claims.map((claim, idx) => {
                const isResolved = claim.status === 'Resolved';

                return (
                  <motion.div
                    key={claim._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleClaimClick(claim)}
                    className={`relative overflow-hidden rounded-2xl p-6 border transition-all ${isResolved
                      ? 'bg-white/5 border-white/10 opacity-80 cursor-default'
                      : 'glass-card glass-card-hover cursor-pointer'
                      }`}
                  >
                    {isResolved && (
                      <div className="absolute top-0 right-0 bg-white/10 text-white px-3 py-1 rounded-bl-lg font-bold text-xs flex items-center gap-1 border-b border-l border-white/20">
                        <CheckCircle2 size={12} /> RESOLVED
                      </div>
                    )}
                    {!isResolved && (
                      <div className="absolute top-0 right-0 bg-white/10 text-white px-3 py-1 rounded-bl-lg font-bold text-xs flex items-center gap-1 border-b border-l border-white/20">
                        <Clock size={12} /> ACTIVE
                      </div>
                    )}

                    <div className="mb-4 mt-2">
                      <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-gray-300">
                        {claim.claimID}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 capitalize">
                      {claim.claimType} Claim
                    </h3>

                    <p className="text-sm text-gray-400 line-clamp-2 mb-6">
                      {claim.clientSummary}
                    </p>

                    <div className="flex justify-between items-end border-t border-white/10 pt-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <p className="text-sm font-bold text-white">
                          {claim.status}
                        </p>
                      </div>

                      {!isResolved && (
                        <span className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          View Details →
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm card-elevated gradient-border p-6 shadow-2xl z-10 flex flex-col items-center text-center font-dmsans text-white"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <LogOut className="size-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to log out of the Client Dashboard?
              </p>
              <div className="flex gap-3 w-full justify-center">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 btn-pill-ghost !py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="flex-1 btn-pill-danger !py-2.5"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientDashboard;
