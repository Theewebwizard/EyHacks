import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { claims, fetchClaims, resolveClaim } = useStore();
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);

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
                    onClick={() => setSelectedClaim(claim)}
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

      <AnimatePresence>
        {selectedClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/90 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/10 bg-slate-950/40">
                <div>
                  <span className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-semibold font-mono mr-2">
                    {selectedClaim.claimID}
                  </span>
                  <h2 className="text-xl font-bold text-white inline-block">Claim Details</h2>
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="text-gray-400 hover:text-white transition-colors text-2xl font-semibold leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm leading-relaxed">
                {/* Meta info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 block text-xs">Client Name</span>
                    <span className="text-white font-semibold">{selectedClaim.clientName}</span>
                  </div>
                  <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 block text-xs">Client Email</span>
                    <span className="text-white font-semibold">{selectedClaim.clientEmail || 'test@example.com'}</span>
                  </div>
                  <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 block text-xs">Claim Type</span>
                    <span className="text-white font-semibold capitalize">{selectedClaim.claimType}</span>
                  </div>
                  <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 block text-xs font-semibold">Priority</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(selectedClaim.priority)}`}>
                      Level {selectedClaim.priority}
                    </span>
                  </div>
                  <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 block text-xs">Status</span>
                    <span className="inline-block mt-0.5 bg-blue-900/30 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded text-xs font-bold">
                      {selectedClaim.status}
                    </span>
                  </div>
                  <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5">
                    <span className="text-gray-400 block text-xs">AI Validation</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getValidationIcon(selectedClaim.validation_status)}
                      <span className={`font-semibold ${
                        selectedClaim.validation_status === 'Verified' ? 'text-green-400' :
                        selectedClaim.validation_status === 'Rejected' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {selectedClaim.validation_status || 'Pending Review'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary / Description */}
                <div>
                  <h3 className="text-gray-400 font-semibold mb-2">Claim Description / Summary</h3>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 text-gray-200 min-h-[60px]">
                    {selectedClaim.clientSummary}
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="text-gray-400 font-semibold mb-2">Attached Documents</h3>
                  {selectedClaim.documents && selectedClaim.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedClaim.documents.map((doc, idx) => {
                        const filename = doc.split(/[/\\]/).pop();
                        return (
                          <a
                            key={idx}
                            href={`http://localhost:5001/${doc}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-slate-950/30 hover:bg-slate-950/60 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all"
                          >
                            <span className="text-xl">📄</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-blue-400 hover:underline truncate font-mono" title={filename}>
                                {filename}
                              </p>
                              <span className="text-[10px] text-gray-500">Click to open/download</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic p-3 bg-slate-950/20 rounded-xl border border-white/5 text-center">
                      No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-white/10 bg-slate-950/40 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-gray-300 hover:text-white transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                {selectedClaim.status !== 'Resolved' && selectedClaim.status !== 'Disapproved' && (
                  <>
                    {selectedClaim.validation_status === 'Verified' ? (
                      <>
                        <button
                          onClick={async () => {
                            await resolveClaim(selectedClaim.claimID, authAgent?.agentID, 'Resolved');
                            setSelectedClaim(null);
                          }}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            await resolveClaim(selectedClaim.claimID, authAgent?.agentID, 'Disapproved');
                            setSelectedClaim(null);
                          }}
                          className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-red-600/20"
                        >
                          Disapprove
                        </button>
                      </>
                    ) : (
                      <button
                        disabled
                        className="px-5 py-2 bg-slate-800 text-gray-500 border border-white/5 rounded-xl text-sm font-bold cursor-not-allowed text-center animate-pulse"
                      >
                        Awaiting AI Resolution
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClaimsQueue;
