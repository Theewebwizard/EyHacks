import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

const ClaimsQueue = () => {
  const { authAgent } = useAuthStore();
  const { claims, fetchClaims } = useStore();

  useEffect(() => {
    if (authAgent?.agentID) {
      fetchClaims(authAgent.agentID);
    }
  }, [authAgent, fetchClaims]);

  const getPriorityColor = (priority) => {
    if (priority >= 4) return "bg-red-900 text-red-300 border-red-500";
    if (priority === 3) return "bg-yellow-900 text-yellow-300 border-yellow-500";
    return "bg-green-900 text-green-300 border-green-500";
  };

  const getValidationIcon = (status) => {
    if (status === 'Verified') return <CheckCircle className="text-green-400 size-5" />;
    if (status === 'Rejected') return <AlertCircle className="text-red-400 size-5" />;
    return <Clock className="text-yellow-400 size-5" />;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[rgba(0,0,0,0.6)] font-dmsans text-white pt-[6rem] px-[6rem] pb-10 overflow-hidden">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent mb-2">
            My Claims Queue
          </h1>
          <p className="text-lg text-gray-300">
            Active caseload for {authAgent?.fullName || "Agent"}
          </p>
        </div>
        <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-lg">
          <span className="text-gray-400 font-semibold uppercase text-sm mr-3">Total Active:</span>
          <span className="text-2xl font-bold text-white">{claims.length}</span>
        </div>
      </div>
      
      <div className="bg-[rgba(0,0,0,0.8)] rounded-2xl h-full border border-gray-700 shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-auto w-full h-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-900 sticky top-0 z-10 shadow">
              <tr>
                <th className="p-4 font-bold text-gray-300 uppercase tracking-wider text-sm border-b border-gray-700">Claim ID</th>
                <th className="p-4 font-bold text-gray-300 uppercase tracking-wider text-sm border-b border-gray-700">Client Name</th>
                <th className="p-4 font-bold text-gray-300 uppercase tracking-wider text-sm border-b border-gray-700">Type</th>
                <th className="p-4 font-bold text-gray-300 uppercase tracking-wider text-sm border-b border-gray-700">Priority</th>
                <th className="p-4 font-bold text-gray-300 uppercase tracking-wider text-sm border-b border-gray-700">Status</th>
                <th className="p-4 font-bold text-gray-300 uppercase tracking-wider text-sm border-b border-gray-700">AI Validation</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center opacity-50">
                    <div className="flex flex-col items-center justify-center">
                      <img src="/database.png" alt="database" className="size-20 mb-4 opacity-70" />
                      <p className="text-lg italic">No active claims assigned to you.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim._id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-mono text-blue-300 font-bold">{claim.claimID}</td>
                    <td className="p-4 font-medium">{claim.clientName}</td>
                    <td className="p-4 capitalize">{claim.claimType}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(claim.priority)}`}>
                        Level {claim.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-900/40 text-blue-300 border border-blue-700/50 px-3 py-1 rounded-md text-sm font-medium">
                        {claim.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getValidationIcon(claim.validation_status)}
                        <span className={`font-semibold ${
                          claim.validation_status === 'Verified' ? 'text-green-400' :
                          claim.validation_status === 'Rejected' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {claim.validation_status || 'Pending Review'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClaimsQueue;
