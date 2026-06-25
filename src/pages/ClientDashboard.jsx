import React, { useEffect, useState } from 'react';
import { useClientAuthStore } from '../store/useClientAuthStore';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import { FileText, LogOut, Loader2, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const ClientDashboard = () => {
  const { authClient, logout } = useClientAuthStore();
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
    return <div className="h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="animate-spin size-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black font-dmsans p-6 md:p-10 pt-20">
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(20,184,166,0.3)] mb-2">
              My Dashboard
            </h1>
            <p className="text-gray-400">Welcome back, <span className="text-white font-bold">{authClient?.fullName}</span></p>
          </div>
          
          <button 
            onClick={logout}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl transition-all border border-red-500/30"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Claims Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
            <FileText className="text-blue-400" /> Your Claims
          </h2>
          
          {claims.length === 0 ? (
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-10 text-center flex flex-col items-center">
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
                    className={`relative overflow-hidden rounded-2xl p-6 border transition-all ${
                      isResolved 
                        ? 'bg-green-900/10 border-green-500/20 opacity-80 cursor-default' 
                        : 'bg-slate-900/60 border-white/10 hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] group'
                    }`}
                  >
                    {isResolved && (
                      <div className="absolute top-0 right-0 bg-green-500/20 text-green-400 px-3 py-1 rounded-bl-lg font-bold text-xs flex items-center gap-1 border-b border-l border-green-500/30">
                        <CheckCircle2 size={12} /> RESOLVED
                      </div>
                    )}
                    {!isResolved && (
                      <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-bl-lg font-bold text-xs flex items-center gap-1 border-b border-l border-blue-500/30">
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
                        <p className={`text-sm font-bold ${isResolved ? 'text-green-400' : 'text-blue-400'}`}>
                          {claim.status}
                        </p>
                      </div>
                      
                      {!isResolved && (
                        <span className="text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
    </div>
  );
};

export default ClientDashboard;
