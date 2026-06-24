import { FileUser, Headset } from "lucide-react";
import { React, useEffect } from "react";
import ChatInput from "../components/ChatInput";
import ChatContainer from "../components/ChatContainer";
import { useStore } from "../store/useStore";
import { useAuthStore } from "../store/useAuthStore";
import GlowEffect from "../components/GlowEffect";

const AgentDash = () => {
  const { authAgent } = useAuthStore();
  const { fetchClaims, claims, resolveClaim } = useStore();

  useEffect(() => {
    if (authAgent && authAgent.agentID) {
      fetchClaims(authAgent.agentID);
    }
  }, [authAgent, fetchClaims]);

  return (
    <div className="w-full flex p-6 gap-6">
      {/* box layer */}
      <div className="flex flex-col w-[63%]">
        <div className="h-[25%] mt-[5rem] w-full flex gap-5">
          <div className="w-[25%] h-[12rem] bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]">
            <div className="flex flex-col items-center justify-center font-medium font-dmsans text-lg pt-[10%] w-full p-[1rem] bg-slate-950/30 border-b border-white/5 rounded-t-2xl">
              Active Claims
            </div>
            <div className="flex flex-col items-center justify-center font-extrabold font-dmsans text-6xl pt-[10%] text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">
              {" "}
              {claims.length}
            </div>
          </div>
          <div className="w-[25%] h-[12rem] bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]">
            <div className="flex flex-col items-center justify-center font-medium font-dmsans text-lg pt-[10%] w-full p-[1rem] bg-slate-950/30 border-b border-white/5 rounded-t-2xl">
              Calls made today
            </div>
            <div className="flex flex-col items-center justify-center font-extrabold font-dmsans text-6xl pt-[10%] text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
              {" "}
              4
            </div>
          </div>
          <div className="w-[25%] h-[12rem] bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]">
            <div className="flex flex-col items-center justify-center font-medium font-dmsans text-lg pt-[10%] w-full p-[1rem] bg-slate-950/30 border-b border-white/5 rounded-t-2xl">
              Customer satisfaction
            </div>
            <div className="flex flex-col items-center justify-center font-bold font-dmsans text-xl pt-[10%] text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)] text-center px-2">
              {" "}
              Mostly happy
            </div>
          </div>
          <div className="w-[25%] h-[12rem] bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <div className="flex flex-col items-center justify-center font-medium font-dmsans text-lg pt-[10%] w-full p-[1rem] bg-slate-950/30 border-b border-white/5 rounded-t-2xl">
              Pending Claims
            </div>
            <div className="flex flex-col items-center justify-center font-extrabold font-dmsans text-6xl pt-[10%] text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.3)]">
              {" "}
              3
            </div>
          </div>
        </div>

        <div className="h-full w-full mt-[2rem] flex justify-between gap-5">
          {/* current claim */}
          <div className="w-[50%] h-[33rem] bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg flex flex-col">
            <div className="font-dmsans font-bold ml-5 mt-4 mb-2 text-xl text-white">
              Customer Feedback
            </div>
            <div className="flex-1 w-[93%] mx-auto mb-4 bg-slate-950/20 rounded-xl p-2 flex flex-col gap-3 overflow-y-auto">
              <div className="bg-teal-950/30 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.05)] p-4 rounded-xl flex flex-col gap-1 transition-all duration-300 hover:border-teal-500/40">
                <h3 className="font-bold text-teal-300">Shubh Shreshth</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  "The claim process was smooth and quick. The team kept me
                  updated at every step and resolved my queries efficiently.
                  Really appreciate the professionalism!"
                </p>
              </div>
              <div className="bg-teal-950/30 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.05)] p-4 rounded-xl flex flex-col gap-1 transition-all duration-300 hover:border-teal-500/40">
                <h3 className="font-bold text-teal-300">Kartev Sumit</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  "I had a great experience with the claims department. They
                  handled my case with care and ensured timely processing. Kudos
                  to the support team!"
                </p>
              </div>
            </div>
          </div>

          {/* claims today*/}
          <div className="w-[50%] h-[33rem] bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg flex flex-col">
            <div className="font-dmsans font-bold ml-5 mt-4 mb-2 text-xl text-white">
              Claims Today
            </div>
            <div className="flex-1 w-[93%] mx-auto mb-4 bg-slate-950/20 rounded-xl p-2 flex flex-col gap-2 overflow-y-auto">
              {claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                  No claims assigned today.
                </div>
              ) : (
                claims.map((claim) => (
                  <div
                    key={claim.claimID}
                    className="bg-slate-950/40 border border-white/5 p-4 rounded-xl transition-all duration-300 hover:border-white/20"
                  >
                    <h3 className="mb-2 flex items-center justify-between">
                      <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full font-semibold">
                        {claim.claimID}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{claim.status || 'Received'}</span>
                    </h3>
                    <p className="text-sm mb-1 text-gray-300">
                      <span className="text-gray-400 font-medium mr-1">Client:</span>
                      {claim.clientName}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-400 font-medium mr-1">Type:</span>
                      {claim.claimType}
                    </p>
                    
                    {claim.status !== 'Resolved' && (
                      <button 
                        onClick={() => resolveClaim(claim.claimID, authAgent.agentID)}
                        className="mt-3 w-full py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition-all shadow-md"
                      >
                        Resolve Claim
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* chatbot */}
      <div className="w-[37%] mt-[5rem] flex flex-col">
        <div className="w-full h-[47rem] rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 flex flex-col text-white shadow-xl">
          <div className="pl-[1.5rem] pt-[1.5rem] pb-[0.75rem] text-2xl font-extrabold font-dmsans bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.1)]">
            Ask Saksham AI
          </div>
          <div className="flex-1 w-[93%] mx-auto mb-4 bg-slate-950/20 rounded-xl flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              <ChatContainer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDash;
