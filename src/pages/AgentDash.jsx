import { FileUser, Headset } from "lucide-react";
import { useEffect, useRef } from "react";
import ChatContainer from "../components/ChatContainer";
import { useStore } from "../store/useStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";

// Monochrome theme variables removed.
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
  const { audioAlerts } = useSettingsStore();
  const prevClaimsCount = useRef(0);

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
    <div className="w-full h-[100dvh] bg-transparent relative overflow-y-auto md:overflow-hidden flex flex-col px-4 md:px-6 pt-24 pb-8 gap-6 font-dmsans">
      
      {/* KPI Row (Top, full width) */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 z-10 shrink-0">
        
        {/* Active Claims Token */}
        <div className="group relative overflow-hidden glass-card p-5 glass-card-hover">
          <div className="stat-glow-blob w-32 h-32 top-0 right-0 bg-white" style={{opacity:0.12}} />
          <h3 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Active Claims</h3>
          <div className="text-5xl font-bold text-white glow-text">{activeClaimsCount}</div>
          <div className="mt-2 text-xs text-gray-500 font-medium">Assigned to you</div>
        </div>

        {/* Calls Made Token */}
        <div className="group relative overflow-hidden glass-card p-5 glass-card-hover">
          <div className="stat-glow-blob w-28 h-28 top-0 right-0 bg-white" style={{opacity:0.08}} />
          <h3 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Activity Today</h3>
          <div className="text-5xl font-bold text-white glow-text">{callsToday}</div>
          <div className="mt-2 text-xs text-gray-500 font-medium">Files with summaries</div>
        </div>

        {/* Satisfaction Token */}
        <div className="group relative overflow-hidden glass-card p-5 glass-card-hover">
          <div className="stat-glow-blob w-24 h-24 top-0 right-0 bg-white" style={{opacity:0.07}} />
          <h3 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Satisfaction</h3>
          <div className="text-xl font-bold mt-3 text-white glow-text">{satisfactionText}</div>
          <div className="mt-2 text-xs text-gray-500 font-medium">From client ratings</div>
        </div>

        {/* Pending Token */}
        <div className="group relative overflow-hidden glass-card p-5 glass-card-hover">
          <div className="stat-glow-blob w-28 h-28 top-0 right-0 bg-amber-400" style={{opacity:0.10}} />
          <h3 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Pending Review</h3>
          <div className="text-5xl font-bold text-white glow-text">{pendingClaimsCount}</div>
          <div className="mt-2 text-xs text-amber-500/70 font-medium">Awaiting AI analysis</div>
        </div>

      </div>

      {/* 3 Equal Columns Row (Bottom, full width) */}
      <div className="w-full flex flex-col md:flex-row gap-6 flex-1 min-h-0 z-10">
        
        {/* Claims Queue (1/3) */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden min-h-[400px] md:min-h-0">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] shrink-0">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <FileUser className="w-5 h-5 text-gray-400" /> Claims Pipeline
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
                <div key={claim.claimID} className="group p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all duration-300 shrink-0">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="badge-pill mb-2">
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
                          <button onClick={() => resolveClaim(claim.claimID, authAgent.agentID, 'Resolved')} className="flex-1 btn-pill-primary py-2 rounded-xl text-xs">
                            Approve
                          </button>
                          <button onClick={() => resolveClaim(claim.claimID, authAgent.agentID, 'Disapproved')} className="flex-1 btn-pill-danger py-2 rounded-xl text-xs">
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
        <div className="flex-1 flex flex-col glass-card overflow-hidden min-h-[300px] md:min-h-0">
          <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] shrink-0">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <span className="text-gray-400 text-xl">★</span> Recent Feedback
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            {recentFeedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                No feedback collected yet.
              </div>
            ) : (
              recentFeedbacks.map((c, idx) => (
                <div key={idx} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <h3 className="font-semibold text-slate-200">{c.clientName || 'Client'}</h3>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-xs ${i < c.feedback.rating ? 'text-gray-300' : 'text-gray-700'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed relative z-10 italic">
                    &quot;{c.feedback.comments}&quot;
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
        <div className="flex-1 flex flex-col glass-card overflow-hidden relative min-h-[500px] md:min-h-0">
          
          <div className="px-6 py-5 border-b border-white/[0.08] flex items-center gap-3 z-10 shrink-0"
            style={{background:'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)'}}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_16px_rgba(255,255,255,0.08)]"
              style={{background:'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 100%)'}}>
              <Headset className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ask Saksham AI</h2>
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
