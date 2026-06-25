import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useStore } from "../store/useStore.js";
import { useSettingsStore } from "../store/useSettingsStore.js";
import { axiosInstance } from "../lib/axios.js";
import { Captions, Search, AlertTriangle, X, Briefcase } from "lucide-react";
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";

const socket = io("http://localhost:5000");

const themeColors = {
  emerald: { bg: 'bg-emerald-600/10', border: 'hover:border-emerald-500/30', glow: 'via-emerald-500/50', text: 'from-emerald-300 to-teal-500', shadow: 'rgba(52,211,153,0.3)', button: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40' },
  teal: { bg: 'bg-teal-600/10', border: 'hover:border-teal-500/30', glow: 'via-teal-500/50', text: 'from-teal-300 to-emerald-500', shadow: 'rgba(20,184,166,0.3)', button: 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border-teal-500/20 hover:border-teal-500/40' },
  blue: { bg: 'bg-blue-600/10', border: 'hover:border-blue-500/30', glow: 'via-blue-500/50', text: 'from-blue-300 to-indigo-500', shadow: 'rgba(59,130,246,0.3)', button: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 hover:border-blue-500/40' },
  purple: { bg: 'bg-purple-600/10', border: 'hover:border-purple-500/30', glow: 'via-purple-500/50', text: 'from-purple-300 to-fuchsia-500', shadow: 'rgba(168,85,247,0.3)', button: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20 hover:border-purple-500/40' },
};

const SuggestionCard = ({ text, isNew, scrollToBottom }) => {
  const [displayed, setDisplayed] = useState(isNew ? "" : text);
  
  useEffect(() => {
    if (isNew) {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayed((prev) => text.slice(0, index));
        index++;
        scrollToBottom();
        if (index > text.length) clearInterval(interval);
      }, 10);
      return () => clearInterval(interval);
    }
  }, [text, isNew, scrollToBottom]);

  return <div className="whitespace-pre-wrap leading-relaxed">{displayed}</div>;
};

const RealTsuggestion = () => {
  const [suggestions, setSuggestions] = useState([]); 
  const [displayedSuggestion, setDisplayedSuggestion] = useState(""); 
  
  // New States for Split-Screen and Summary
  const [liveTranscription, setLiveTranscription] = useState([]);
  const [clientSummary, setClientSummary] = useState("");
  const [claimAmount, setClaimAmount] = useState("N/A");
  const [incidentDate, setIncidentDate] = useState("N/A");
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const containerRef = useRef(null);
  const transcriptRef = useRef(null);
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [clientName, setClientName] = useState("");
  const [claimType, setClaimType] = useState("");
  const [claimID, setClaimID] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sentimentAlert, setSentimentAlert] = useState(null);

  const { searchedClaim, searchClaim } = useStore();
  const { themeAccent } = useSettingsStore();
  const [formData, setFormData] = useState({ claimID: "" });

  const theme = themeColors[themeAccent] || themeColors.emerald;

  useEffect(() => {
    socket.on("new_suggestion", (data) => {
      const formattedResponse = data.response
        .split("\n")
        .map((line) => `${line}`)
        .join("\n");

      setSuggestions((prev) => [...prev, formattedResponse]);
    });

    socket.on("sentiment_alert", (data) => {
      setSentimentAlert(data);
      toast.error(`SENTIMENT ALERT: ${data.message} (${data.score * 100}%)`, { duration: 6000, icon: '🚨' });
      setTimeout(() => setSentimentAlert(null), 10000);
    });

    socket.on("new_ai_task", async (data) => {
      try {
        const payload = {
          title: data.title,
          dueDate: data.dueDate,
          isAIGenerated: true
        };
        await axiosInstance.post('/tasks', payload);
        toast.success(`AI Auto-Scheduled: ${data.title}`, { icon: '📅' });
      } catch (error) {
        console.error("Failed to save AI task", error);
      }
    });
    
    // New Sockets for live transcription and summary
    socket.on("live_transcription", (data) => {
      setLiveTranscription(prev => [...prev, data.text]);
    });
    
    socket.on("client_summary", (data) => {
      if (data.client_summary) setClientSummary(data.client_summary);
      if (data.claim_amount) setClaimAmount(data.claim_amount);
      if (data.incident_date) setIncidentDate(data.incident_date);
    });

    return () => {
      socket.off("new_suggestion");
      socket.off("sentiment_alert");
      socket.off("new_ai_task");
      socket.off("live_transcription");
      socket.off("client_summary");
    };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [suggestions]);
  
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [liveTranscription]);

  const handleSubmit2 = async (e) => {
    e.preventDefault();
    searchClaim(formData.claimID);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post("/claims", { clientName, claimType });
      setClaimID(response.data.claimID);
    } catch (error) {
      console.error("Failed to create claim", error);
    }
  };

  const handleRefreshMemory = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("http://localhost:5000/refresh_history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setSuggestions([]);
        setLiveTranscription([]);
        setClientSummary("");
        setClaimAmount("N/A");
        setIncidentDate("N/A");
        toast.success("Memory has been successfully refreshed.");
      } else {
        toast.error("Failed to refresh memory. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred while refreshing memory.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartSaksham = async () => {
    try {
      const response = await fetch("http://localhost:5000/start_vat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast.success("SAKSHAM has been started successfully.");
      } else {
        toast.error("Failed to start SAKSHAM. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred while starting SAKSHAM.");
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // Only auto-scroll if we are already near the bottom (within 150px)
      if (scrollHeight - scrollTop - clientHeight < 150) {
        containerRef.current.scrollTop = scrollHeight;
      }
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] z-1 font-dmsans pt-[6rem] md:pt-[7rem] px-4 md:px-8 gap-6 pb-6 overflow-hidden relative w-full bg-[#060b14]">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full ${theme.bg} blur-[120px] pointer-events-none transition-colors duration-1000`} />
      
      {/* Sentiment Alert Banner */}
      <AnimatePresence>
        {sentimentAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full bg-red-900/80 backdrop-blur-md border border-red-500 p-4 rounded-2xl flex items-center gap-4 text-white shadow-[0_0_20px_#ef4444] shrink-0"
          >
            <AlertTriangle size={32} className="text-red-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-lg md:text-xl uppercase tracking-wider text-red-200">Critical Client Sentiment: {sentimentAlert.emotion}</h3>
              <p className="font-medium text-sm md:text-lg">{sentimentAlert.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Panel: Client Summary & Financial Details */}
      <motion.div 
        layout
        className="w-full bg-white/[0.02] backdrop-blur-2xl rounded-3xl flex flex-col md:flex-row items-stretch p-6 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-white/10 gap-4 md:gap-0 relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent ${theme.glow} to-transparent opacity-50`} />
        
        <div className="flex-[0.7] md:border-r border-white/10 md:pr-6 flex flex-col justify-center">
           <h3 className={`text-lg md:text-xl font-bold bg-gradient-to-r ${theme.text} bg-clip-text text-transparent mb-2 flex items-center gap-2`}>Live Client Summary</h3>
           <p className="text-slate-300 text-sm md:text-md italic h-16 md:h-12 overflow-y-auto font-medium pr-2">
             {clientSummary || "Waiting for conversation details..."}
           </p>
        </div>
        <div className="flex-[0.3] md:pl-6 flex flex-col justify-center gap-3">
           <div className="relative flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/10 backdrop-blur-md overflow-hidden">
             <div className="absolute inset-0 bg-teal-500/5 blur-2xl pointer-events-none" />
             <span className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-wider relative z-10">Claim Amount:</span>
             <span className={`font-bold text-md md:text-lg bg-gradient-to-r ${theme.text} bg-clip-text text-transparent relative z-10`} style={{ dropShadow: `0 0 10px ${theme.shadow}` }}>{claimAmount}</span>
           </div>
           <div className="relative flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/10 backdrop-blur-md overflow-hidden">
             <div className="absolute inset-0 bg-teal-500/5 blur-2xl pointer-events-none" />
             <span className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-wider relative z-10">Incident Date:</span>
             <span className="text-slate-200 font-bold text-md md:text-lg relative z-10">{incidentDate}</span>
           </div>
        </div>
      </motion.div>

      {/* Main 50/50 Split-Screen Section */}
      <div className="flex flex-col md:flex-row w-full gap-4 flex-1 min-h-0 relative">
        
        {/* Left Column: AI Suggestions (50%) */}
        <motion.div layout className="w-full md:w-1/2 bg-white/[0.02] backdrop-blur-3xl rounded-3xl flex flex-col h-1/2 md:h-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden relative">
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] ${theme.bg} blur-[100px] pointer-events-none transition-colors duration-1000`} />
           <div className="h-[4rem] w-full bg-white/[0.02] flex items-center px-6 shrink-0 border-b border-white/10 z-10">
             <span className={`text-lg md:text-xl font-bold bg-gradient-to-r ${theme.text} bg-clip-text text-transparent`}>RTS powered by SAKSHAM</span>
           </div>
           <div ref={containerRef} className="flex-1 p-4 md:p-6 overflow-y-auto font-medium text-md md:text-lg text-slate-200 flex flex-col gap-4 z-10 custom-scrollbar">
             {suggestions.length > 0 ? (
               suggestions.map((sug, i) => (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   key={i} 
                   className={`p-5 rounded-2xl border transition-all duration-300 ${
                     i === suggestions.length - 1 
                       ? `bg-white/[0.04] border-white/20 shadow-[0_0_20px_${theme.shadow}]` 
                       : 'bg-black/20 border-white/5 opacity-70 hover:opacity-100'
                   }`}
                 >
                   <div className="flex items-center gap-2 mb-3">
                     <span className={`w-2 h-2 rounded-full ${i === suggestions.length - 1 ? 'bg-white animate-pulse' : 'bg-slate-500'}`}></span>
                     <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Suggestion {i + 1}</span>
                   </div>
                   <SuggestionCard text={sug} isNew={i === suggestions.length - 1} scrollToBottom={scrollToBottom} />
                 </motion.div>
               ))
             ) : (
               <div className="h-full w-full flex flex-col justify-center items-center opacity-90 gap-8">
                 <div className="relative flex items-center justify-center w-32 h-32">
                   {/* Outer dynamic ring */}
                   <motion.div
                     key={liveTranscription.length}
                     initial={{ scale: 1, opacity: 0.5 }}
                     animate={{ scale: 2, opacity: 0 }}
                     transition={{ duration: 1, ease: "easeOut" }}
                     className="absolute inset-0 rounded-full border border-teal-400/50 bg-teal-500/10"
                   />
                   {/* Inner breathing ring */}
                   <motion.div
                     animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                     transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                     className="absolute inset-4 rounded-full bg-gradient-to-tr from-teal-400/40 to-emerald-500/40 shadow-[0_0_30px_rgba(45,212,191,0.4)] backdrop-blur-sm border border-teal-300/30"
                   />
                 </div>
                 <p className="text-sm italic text-teal-200/70 font-medium tracking-wide">Listening for conversation markers...</p>
               </div>
             )}
           </div>
        </motion.div>

        {/* Right Column: Live Transcription (50%) */}
        <motion.div layout className="w-full md:w-1/2 bg-white/[0.02] backdrop-blur-3xl rounded-3xl flex flex-col h-1/2 md:h-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] ${theme.bg} blur-[100px] pointer-events-none transition-colors duration-1000`} />
           <div className="h-[4rem] w-full bg-white/[0.02] flex items-center justify-between px-4 md:px-6 shrink-0 border-b border-white/10 z-10">
             <span className="text-lg md:text-xl font-bold text-slate-200 flex items-center gap-2">
               <Captions size={24} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]"/> Live Transcript
             </span>
             
             {/* Open Drawer Button */}
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setIsDrawerOpen(true)} 
               className={`px-3 md:px-4 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all border ${theme.button}`}
             >
               <Briefcase size={18} />
               <span className="hidden md:inline">Case Tools</span>
             </motion.button>
           </div>
           
           <div ref={transcriptRef} className="flex-1 p-4 md:p-6 overflow-y-auto text-sm md:text-md text-slate-200 flex flex-col gap-3 z-10 custom-scrollbar">
             {liveTranscription.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                   <Captions size={48} className="mb-2" />
                   <p className="italic font-medium text-sm md:text-base">Awaiting live audio...</p>
                </div>
             ) : (
                liveTranscription.map((txt, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="bg-black/20 backdrop-blur-sm p-4 md:p-5 rounded-2xl border border-white/5 shadow-sm hover:border-white/10 transition-all"
                  >
                    <span className={`font-bold text-xs uppercase tracking-wider mb-2 block bg-gradient-to-r ${theme.text} bg-clip-text text-transparent`}>Snippet</span>
                    <p className="leading-relaxed font-medium">{txt}</p>
                  </motion.div>
                ))
             )}
           </div>

           {/* --- Slide-Out Drawer (Right Side) Overlay within Right Column on Mobile, Absolute globally on Desktop --- */}
           <AnimatePresence>
             {isDrawerOpen && (
               <>
                 {/* Drawer Backdrop */}
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   onClick={() => setIsDrawerOpen(false)}
                   className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:absolute md:inset-0"
                 />
                 
                 {/* Drawer Panel */}
                 <motion.div 
                   initial={{ x: "100%" }}
                   animate={{ x: 0 }}
                   exit={{ x: "100%" }}
                   transition={{ type: "spring", damping: 25, stiffness: 200 }}
                   className="fixed md:absolute top-0 right-0 h-full w-[85%] md:w-[85%] lg:w-[70%] max-w-md bg-[#060b14]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-10px_0_40px_rgba(0,0,0,0.8)] z-50 flex flex-col rounded-l-3xl md:rounded-l-none md:rounded-r-3xl overflow-hidden"
                 >
                   <div className={`absolute top-0 right-0 w-[80%] h-[50%] rounded-full ${theme.bg} blur-[100px] pointer-events-none transition-colors duration-1000`} />
                   
                   <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/[0.02] shrink-0 z-10">
                     <h2 className="text-xl font-bold text-slate-200 flex items-center gap-3">
                       <Briefcase size={22} className={`bg-gradient-to-r ${theme.text} bg-clip-text text-transparent`} style={{ dropShadow: `0 0 8px ${theme.shadow}` }}/> Case Tools
                     </h2>
                     <button 
                       onClick={() => setIsDrawerOpen(false)} 
                       className="text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                     >
                       <X size={24} />
                     </button>
                   </div>
                   
                   <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 z-10 custom-scrollbar">
                      {/* Search & Claim Info */}
                      <div className="bg-white/[0.03] rounded-3xl border border-white/10 p-5 flex flex-col shadow-inner backdrop-blur-md">
                         <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                           <Search size={18} className="text-blue-400"/> Search Claim
                         </h3>
                         <form onSubmit={handleSubmit2} className="flex gap-2 mb-4">
                           <input 
                             type="text" 
                             placeholder="Enter Claim ID" 
                             className="flex-1 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-white/30 transition-all backdrop-blur-md" 
                             value={formData.claimID} 
                             onChange={(e) => setFormData({...formData, claimID: e.target.value})} 
                           />
                           <motion.button 
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             type="submit" 
                             className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all border ${theme.button}`}
                           >
                             <Search size={20}/>
                           </motion.button>
                         </form>
                         
                         <div className="bg-black/20 p-4 rounded-xl border border-white/5 min-h-[140px] backdrop-blur-sm">
                           {searchedClaim ? (
                              <div className="text-sm text-slate-300 space-y-3">
                                <div className="flex justify-between border-b border-white/10 pb-3">
                                  <strong className="text-slate-200">ID:</strong> 
                                  <span className={`font-mono font-bold tracking-wider bg-gradient-to-r ${theme.text} bg-clip-text text-transparent`}>{searchedClaim.claimID}</span>
                                </div>
                                <div>
                                  <strong className="text-white block mb-1.5">Client Name:</strong> 
                                  <span className="bg-white/10 px-3 py-1.5 rounded-lg inline-block text-sm font-semibold">{searchedClaim.clientName}</span>
                                </div>
                                <div>
                                  <strong className="text-white block mb-1.5">Summary:</strong> 
                                  <p className="text-sm leading-relaxed opacity-90">{searchedClaim.clientSummary}</p>
                                </div>
                              </div>
                           ) : (
                              <div className="h-full flex flex-col items-center justify-center opacity-40 py-6">
                                 <img src="/database.png" alt="database" className="size-12 mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                                 <p className="text-center italic text-white text-sm font-medium">No claim selected</p>
                              </div>
                           )}
                         </div>
                      </div>

                      {/* Create New Claim Form (Toggled inside drawer) */}
                      <div className="bg-white/[0.03] rounded-3xl border border-white/10 p-5 shadow-inner backdrop-blur-md">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsFormVisible(!isFormVisible)} 
                          className={`w-full py-3 min-h-[44px] rounded-xl font-bold transition-all border ${theme.button}`}
                        >
                          {isFormVisible ? "Close Form" : "Create New Claim"}
                        </motion.button>
                        
                        <AnimatePresence>
                          {isFormVisible && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-white/10">
                                 <form onSubmit={handleSubmit} className="space-y-4">
                                   <div>
                                     <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Client Name</label>
                                     <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full min-h-[44px] bg-white/[0.03] border border-white/10 text-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-white/30 transition-all text-sm backdrop-blur-md" required />
                                   </div>
                                   <div>
                                     <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Claim Type</label>
                                     <select value={claimType} onChange={e => setClaimType(e.target.value)} className="w-full min-h-[44px] bg-[#060b14]/80 border border-white/10 text-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-white/30 transition-all text-sm appearance-none backdrop-blur-md" required>
                                       <option value="">Select Type</option>
                                       <option value="medical">Medical</option>
                                       <option value="financial">Financial</option>
                                     </select>
                                   </div>
                                   <motion.button 
                                     whileHover={{ scale: 1.02 }}
                                     whileTap={{ scale: 0.98 }}
                                     type="submit" 
                                     className={`w-full min-h-[44px] py-3 rounded-xl font-bold transition-all mt-4 border ${theme.button}`}
                                   >
                                     Submit Claim
                                   </motion.button>
                                 </form>
                                 {claimID && (
                                   <motion.div 
                                     initial={{ opacity: 0, scale: 0.9 }}
                                     animate={{ opacity: 1, scale: 1 }}
                                     className="mt-4 p-3 bg-green-900/30 border border-green-500/50 rounded-xl text-center shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                                   >
                                     <p className="text-green-400 text-sm font-bold tracking-widest">ID: {claimID}</p>
                                   </motion.div>
                                 )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Global Action Buttons */}
                      <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-white/10">
                         <motion.button 
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           onClick={handleStartSaksham} 
                           className={`w-full min-h-[44px] py-4 rounded-2xl font-extrabold transition-all uppercase tracking-wider border ${theme.button}`}
                         >
                           Start SAKSHAM Voice
                         </motion.button>
                         <motion.button 
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           onClick={handleRefreshMemory} 
                           disabled={isRefreshing} 
                           className="w-full min-h-[44px] py-3 bg-white/[0.02] border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/[0.05] transition-all"
                         >
                           {isRefreshing ? "Refreshing..." : "Refresh Memory"}
                         </motion.button>
                      </div>
                   </div>
                 </motion.div>
               </>
             )}
           </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
};

export default RealTsuggestion;
