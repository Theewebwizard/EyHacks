import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const SkeletonRow = () => (
  <tr className="border-b border-white/10 animate-pulse">
    <td className="p-4"><div className="h-4 bg-white/10 rounded w-24"></div></td>
    <td className="p-4"><div className="h-4 bg-white/10 rounded w-32"></div></td>
    <td className="p-4"><div className="h-4 bg-white/10 rounded w-20"></div></td>
    <td className="p-4"><div className="h-6 bg-white/10 rounded-full w-20"></div></td>
    <td className="p-4"><div className="h-6 bg-white/10 rounded-md w-28"></div></td>
    <td className="p-4 flex gap-2 items-center"><div className="size-5 bg-white/10 rounded-full"></div><div className="h-4 bg-white/10 rounded w-24"></div></td>
  </tr>
);

const ClaimsQueue = () => {
  const { authAgent } = useAuthStore();
  const { claims, fetchClaims } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (authAgent?.agentID) {
        await fetchClaims(authAgent.agentID);
      }
      setLoading(false);
    };
    loadData();
  }, [authAgent, fetchClaims]);

  const getPriorityColor = (priority) => {
    if (priority >= 4) return "bg-red-900/50 text-red-300 border-red-500/50";
    if (priority === 3) return "bg-yellow-900/50 text-yellow-300 border-yellow-500/50";
    return "bg-green-900/50 text-green-300 border-green-500/50";
  };

  const getValidationIcon = (status) => {
    if (status === 'Verified') return <CheckCircle className="text-green-400 size-5" />;
    if (status === 'Rejected') return <AlertCircle className="text-red-400 size-5" />;
    return <Clock className="text-yellow-400 size-5" />;
  };

  return (
    <div className="flex flex-col min-h-screen w-full font-dmsans text-white pt-[6rem] px-4 md:px-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent mb-2 drop-shadow-[0_0_10px_rgba(20,184,166,0.3)]">
            My Claims Queue
          </h1>
          <p className="text-lg text-gray-300">
            Active caseload for <span className="font-semibold text-white">{authAgent?.fullName || "Agent"}</span>
          </p>
        </div>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-slate-900/40 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center gap-3"
        >
          <span className="text-gray-400 font-semibold uppercase text-sm tracking-wider">Total Active:</span>
          <span className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
            {loading ? '-' : claims.length}
          </span>
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/40 backdrop-blur-md rounded-2xl h-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col flex-1"
      >
        <div className="overflow-x-auto w-full h-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-900/60 backdrop-blur-md sticky top-0 z-10 shadow-sm border-b border-white/10">
              <tr>
                <th className="p-5 font-bold text-gray-300 uppercase tracking-wider text-xs md:text-sm">Claim ID</th>
                <th className="p-5 font-bold text-gray-300 uppercase tracking-wider text-xs md:text-sm">Client Name</th>
                <th className="p-5 font-bold text-gray-300 uppercase tracking-wider text-xs md:text-sm">Type</th>
                <th className="p-5 font-bold text-gray-300 uppercase tracking-wider text-xs md:text-sm">Priority</th>
                <th className="p-5 font-bold text-gray-300 uppercase tracking-wider text-xs md:text-sm">Status</th>
                <th className="p-5 font-bold text-gray-300 uppercase tracking-wider text-xs md:text-sm">AI Validation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center opacity-50">
                    <div className="flex flex-col items-center justify-center">
                      <img src="/database.png" alt="database" className="size-20 mb-4 opacity-70 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                      <p className="text-lg italic font-medium tracking-wide">No active claims assigned to you.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                    key={claim._id} 
                    className="border-b border-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="p-5 font-mono text-blue-400 font-bold group-hover:text-blue-300 transition-colors">{claim.claimID}</td>
                    <td className="p-5 font-semibold text-gray-200">{claim.clientName}</td>
                    <td className="p-5 capitalize text-gray-300">{claim.claimType}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getPriorityColor(claim.priority)} shadow-sm`}>
                        Level {claim.priority}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="bg-blue-900/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide">
                        {claim.status}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        {getValidationIcon(claim.validation_status)}
                        <span className={`font-semibold text-sm ${
                          claim.validation_status === 'Verified' ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                          claim.validation_status === 'Rejected' ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : 'text-yellow-400'
                        }`}>
                          {claim.validation_status || 'Pending Review'}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default ClaimsQueue;
