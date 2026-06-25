import { FileUser, Headset } from "lucide-react";
import { React, useEffect, useRef } from "react";
import ChatInput from "../components/ChatInput";
import ChatContainer from "../components/ChatContainer";
import { useStore } from "../store/useStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import GlowEffect from "../components/GlowEffect";

const themeColors = {
  emerald: { bg: 'bg-emerald-600/10', border: 'hover:border-emerald-500/30', glow: 'via-emerald-500/50', text: 'from-emerald-300 to-teal-500', shadow: 'rgba(52,211,153,0.3)', button: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40' },
  teal: { bg: 'bg-teal-600/10', border: 'hover:border-teal-500/30', glow: 'via-teal-500/50', text: 'from-teal-300 to-emerald-500', shadow: 'rgba(20,184,166,0.3)', button: 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border-teal-500/20 hover:border-teal-500/40' },
  blue: { bg: 'bg-blue-600/10', border: 'hover:border-blue-500/30', glow: 'via-blue-500/50', text: 'from-blue-300 to-indigo-500', shadow: 'rgba(59,130,246,0.3)', button: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 hover:border-blue-500/40' },
  purple: { bg: 'bg-purple-600/10', border: 'hover:border-purple-500/30', glow: 'via-purple-500/50', text: 'from-purple-300 to-fuchsia-500', shadow: 'rgba(168,85,247,0.3)', button: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20 hover:border-purple-500/40' },
};

const playPing = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio play blocked", e);
  }
};

const AgentDash = () => {
  const { authAgent } = useAuthStore();
  const { fetchClaims, claims, resolveClaim } = useStore();
  const { themeAccent, audioAlerts } = useSettingsStore();
  const prevClaimsCount = useRef(claims.length);

  const theme = themeColors[themeAccent] || themeColors.emerald;

  useEffect(() => {
    if (authAgent && authAgent.agentID) {
      fetchClaims(authAgent.agentID);
    }
  }, [authAgent, fetchClaims]);

  useEffect(() => {
    if (audioAlerts && claims.length > prevClaimsCount.current) {
      // New claim added
      playPing();
    }
    prevClaimsCount.current = claims.length;
  }, [claims.length, audioAlerts]);

  // Dynamic calculations
  const activeClaimsCount = claims.filter(c => c.status !== 'Resolved' && c.status !== 'Disapproved').length;
  const pendingClaimsCount = claims.filter(c => !c.validation_status || c.validation_status === 'Pending Review' || c.validation_status === 'Awaiting Documents').length;
  
  const claimsWithFeedback = claims.filter(c => c.feedback && c.feedback.rating);
  let satisfactionText = "No ratings";
  if (claimsWithFeedback.length > 0) {
    const avg = claimsWithFeedback.reduce((acc, c) => acc + c.feedback.rating, 0) / claimsWithFeedback.length;
    if (avg >= 4) satisfactionText = "Very Happy";
    else if (avg >= 3) satisfactionText = "Satisfied";
    else satisfactionText = "Needs Focus";
  }

  const callsToday = claims.filter(c => c.clientSummary && c.clientSummary.trim().length > 0).length;

  const recentFeedbacks = claims
    .filter(c => c.feedback && c.feedback.comments)
    .sort((a, b) => new Date(b.feedback.submittedAt || 0) - new Date(a.feedback.submittedAt || 0))
    .slice(0, 5);

  return (
    <div className="w-full h-[100dvh] bg-[#060b14] relative overflow-y-auto md:overflow-hidden flex flex-col px-4 md:px-6 pt-24 pb-8 gap-6 font-dmsans">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full ${theme.bg} blur-[120px] pointer-events-none transition-colors duration-1000`} />
      
      {/* KPI Row (Top, full width) */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 z-10 shrink-0">
        
        {/* Active Claims Token (Dynamic Theme) */}
        <div className={`group relative overflow-hidden bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.04] ${theme.border}`}>
          <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent ${theme.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          <h3 className="text-sm font-medium text-slate-400 tracking-wide uppercase mb-1">Active Claims</h3>
          <div className={`text-5xl font-bold bg-gradient-to-br ${theme.text} bg-clip-text text-transparent`} style={{ dropShadow: `0 0 15px ${theme.shadow}` }}>
            {activeClaimsCount}
          </div>
        </div>

        {/* Calls Made Token */}
        <div className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-white/[0.04]">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-sm font-medium text-slate-400 tracking-wide uppercase mb-1">Activity Today</h3>
          <div className="text-5xl font-bold bg-gradient-to-br from-blue-300 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(96,165,250,0.3)]">
            {callsToday}
          </div>
        </div>

        {/* Satisfaction Token */}
        <div className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-1 hover:border-violet-500/30 hover:bg-white/[0.04]">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-sm font-medium text-slate-400 tracking-wide uppercase mb-1">Satisfaction</h3>
          <div className="text-xl font-bold mt-3 bg-gradient-to-br from-violet-300 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(167,139,250,0.3)]">
            {satisfactionText}
          </div>
        </div>

        {/* Pending Token */}
        <div className="group relative overflow-hidden bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-1 hover:border-rose-500/30 hover:bg-white/[0.04]">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-sm font-medium text-slate-400 tracking-wide uppercase mb-1">Pending Review</h3>
          <div className="text-5xl font-bold bg-gradient-to-br from-rose-300 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,113,133,0.3)]">
            {pendingClaimsCount}
          </div>
        </div>

      </div>

      {/* 3 Equal Columns Row (Bottom, full width) */}
      <div className="w-full flex flex-col md:flex-row gap-6 flex-1 min-h-0 z-10">
        
        {/* Claims Queue (1/3) */}
        <div className="flex-1 flex flex-col bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden min-h-[400px] md:min-h-0">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] shrink-0">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <FileUser className="w-5 h-5 text-blue-400" /> Claims Pipeline
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            {claims.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <div className="w-12 h-12 rounded-full bg-slate-800/50 mb-3 flex items-center justify-center border border-white/5">
                  <FileUser className="w-5 h-5 text-slate-600" />
                </div>
                No active claims assigned.
              </div>
            ) : (
              claims.map((claim) => (
                <div key={claim.claimID} className={`group p-4 bg-slate-900/40 rounded-2xl border border-white/[0.03] hover:bg-slate-800/40 transition-all duration-300 shrink-0 ${theme.border}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                        {claim.claimID}
                      </span>
                      <h3 className="text-slate-200 font-medium">{claim.clientName}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize tracking-wide">{claim.claimType} Claim</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500 bg-slate-950/50 px-2 py-1 rounded-md border border-white/5">
                      {claim.status || 'Received'}
                    </span>
                  </div>

                  {claim.documents && claim.documents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {claim.documents.map((doc, idx) => {
                        const filename = doc.split(/[/\\]/).pop();
                        return (
                          <a key={idx} href={`http://localhost:5001/${doc}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.05] rounded-lg transition-all text-xs">
                            📄 <span className="truncate max-w-[120px]">{filename}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {claim.status !== 'Resolved' && claim.status !== 'Disapproved' && (
                    <div className="mt-4 flex gap-2">
                      {claim.validation_status === 'Verified' ? (
                        <>
                          <button onClick={() => resolveClaim(claim.claimID, authAgent.agentID, 'Resolved')} className={`flex-1 py-2 border rounded-xl font-medium text-xs transition-all ${theme.button}`}>
                            Approve
                          </button>
                          <button onClick={() => resolveClaim(claim.claimID, authAgent.agentID, 'Disapproved')} className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl font-medium text-xs transition-all">
                            Disapprove
                          </button>
                        </>
                      ) : (
                        <div className="w-full py-2 bg-slate-950/50 text-slate-500 border border-white/[0.02] rounded-xl font-medium text-xs text-center flex items-center justify-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse" />
                          Awaiting AI Analysis
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feedback Queue (1/3) */}
        <div className="flex-1 flex flex-col bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden min-h-[300px] md:min-h-0">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] shrink-0">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <span className="text-amber-400 text-xl">★</span> Recent Feedback
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            {recentFeedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                No feedback collected yet.
              </div>
            ) : (
              recentFeedbacks.map((c, idx) => (
                <div key={idx} className="p-5 bg-gradient-to-br from-slate-900/60 to-slate-800/40 rounded-2xl border border-white/[0.05] hover:border-white/10 transition-all duration-300 relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <h3 className="font-semibold text-slate-200">{c.clientName || 'Client'}</h3>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-xs ${i < c.feedback.rating ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed relative z-10 italic">
                    "{c.feedback.comments}"
                  </p>
                  <div className="mt-3 text-[10px] font-mono text-slate-600 relative z-10">
                    REF: {c.claimID}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Assistant Sidebar (1/3) */}
        <div className="flex-1 flex flex-col bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden relative min-h-[500px] md:min-h-0">
          {/* Subtle glow behind the chat */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] ${theme.bg} blur-[100px] pointer-events-none transition-colors duration-1000`} />
          
          <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02] flex items-center gap-3 z-10 shrink-0">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${theme.text} flex items-center justify-center shadow-lg shadow-[${theme.shadow}]`}>
              <Headset className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className={`text-lg font-bold bg-gradient-to-r ${theme.text} bg-clip-text text-transparent`}>Ask Saksham AI</h2>
              <p className="text-xs text-slate-400">Agent Co-Pilot</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col p-4 z-10">
             <ChatContainer />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AgentDash;
