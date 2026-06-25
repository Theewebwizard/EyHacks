import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useStore } from "../store/useStore.js";
import { axiosInstance } from "../lib/axios.js";
import { Captions, Search, AlertTriangle, X, Briefcase } from "lucide-react";
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion";

const socket = io("http://localhost:5000");

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
  const [formData, setFormData] = useState({ claimID: "" });

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
    <div className="flex flex-col h-[100dvh] z-1 font-dmsans pt-[5rem] md:pt-[6rem] px-4 md:px-8 gap-4 pb-4 overflow-hidden relative w-full">
      
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
        className="w-full bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col md:flex-row items-stretch p-5 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 gap-4 md:gap-0"
      >
        <div className="flex-[0.7] md:border-r border-white/10 md:pr-6 flex flex-col justify-center">
           <h3 className="text-lg md:text-xl font-bold text-blue-400 mb-2 flex items-center gap-2">Live Client Summary</h3>
           <p className="text-gray-200 text-sm md:text-md italic h-16 md:h-12 overflow-y-auto font-medium pr-2">
             {clientSummary || "Waiting for conversation details..."}
           </p>
        </div>
        <div className="flex-[0.3] md:pl-6 flex flex-col justify-center gap-3">
           <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
             <span className="text-gray-400 font-bold text-xs md:text-sm uppercase tracking-wider">Claim Amount:</span>
             <span className="text-green-400 font-bold text-md md:text-lg drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">{claimAmount}</span>
           </div>
           <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
             <span className="text-gray-400 font-bold text-xs md:text-sm uppercase tracking-wider">Incident Date:</span>
             <span className="text-blue-300 font-bold text-md md:text-lg">{incidentDate}</span>
           </div>
        </div>
      </motion.div>

      {/* Main 50/50 Split-Screen Section */}
      <div className="flex flex-col md:flex-row w-full gap-4 flex-1 min-h-0 relative">
        
        {/* Left Column: AI Suggestions (50%) */}
        <motion.div layout className="w-full md:w-1/2 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col h-1/2 md:h-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
           <div className="h-[3.5rem] w-full bg-slate-900/60 backdrop-blur-md flex items-center px-6 rounded-t-2xl shrink-0 border-b border-white/10">
             <span className="text-lg md:text-xl font-extrabold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(20,184,166,0.2)]">RTS powered by SAKSHAM</span>
           </div>
           <div ref={containerRef} className="flex-1 p-4 md:p-6 overflow-y-auto font-medium text-md md:text-lg text-gray-100 flex flex-col gap-4">
             {suggestions.length > 0 ? (
               suggestions.map((sug, i) => (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   key={i} 
                   className={`p-4 md:p-5 rounded-2xl border transition-all ${
                     i === suggestions.length - 1 
                       ? 'bg-blue-900/30 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                       : 'bg-slate-800/50 border-white/5 opacity-80 hover:opacity-100'
                   }`}
                 >
                   <div className="flex items-center gap-2 mb-3">
                     <span className={`w-2 h-2 rounded-full ${i === suggestions.length - 1 ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`}></span>
                     <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Suggestion {i + 1}</span>
                   </div>
                   <SuggestionCard text={sug} isNew={i === suggestions.length - 1} scrollToBottom={scrollToBottom} />
                 </motion.div>
               ))
             ) : (
               <div className="h-full w-full flex flex-col justify-center items-center opacity-70 gap-4">
                 <div id="loader-wrapper" className="scale-75">
                   <div id="loader"></div>
                 </div>
                 <p className="text-sm italic text-gray-400">Analyzing conversation to generate suggestions...</p>
               </div>
             )}
           </div>
        </motion.div>

        {/* Right Column: Live Transcription (50%) */}
        <motion.div layout className="w-full md:w-1/2 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col h-1/2 md:h-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">
           <div className="h-[3.5rem] w-full bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 md:px-6 rounded-t-2xl shrink-0 border-b border-white/10 z-10">
             <span className="text-lg md:text-xl font-extrabold text-gray-200 flex items-center gap-2">
               <Captions size={24} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]"/> Live Transcript
             </span>
             
             {/* Open Drawer Button */}
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setIsDrawerOpen(true)} 
               className="bg-blue-600/80 hover:bg-blue-500 backdrop-blur-sm text-white px-3 md:px-4 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50"
             >
               <Briefcase size={18} />
               <span className="hidden md:inline">Case Tools</span>
             </motion.button>
           </div>
           
           <div ref={transcriptRef} className="flex-1 p-4 overflow-y-auto text-sm md:text-md text-gray-200 flex flex-col gap-3">
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
                    className="bg-slate-800/60 backdrop-blur-sm p-4 rounded-xl border border-white/5 shadow-sm"
                  >
                    <span className="font-bold text-blue-400 text-xs uppercase tracking-wider mb-2 block">Snippet</span>
                    <p className="leading-relaxed">{txt}</p>
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
                   className="fixed md:absolute top-0 right-0 h-full w-[85%] md:w-[85%] lg:w-[70%] max-w-md bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-[-10px_0_40px_rgba(0,0,0,0.8)] z-50 flex flex-col rounded-l-2xl md:rounded-l-none md:rounded-r-2xl"
                 >
                   <div className="flex justify-between items-center p-5 border-b border-white/10 bg-slate-800/40 shrink-0">
                     <h2 className="text-xl font-bold text-white flex items-center gap-3">
                       <Briefcase size={22} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]"/> Case Tools
                     </h2>
                     <button 
                       onClick={() => setIsDrawerOpen(false)} 
                       className="text-gray-400 hover:text-white p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                     >
                       <X size={24} />
                     </button>
                   </div>
                   
                   <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6">
                      {/* Search & Claim Info */}
                      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 flex flex-col shadow-inner">
                         <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                           <Search size={18} className="text-green-400"/> Search Claim
                         </h3>
                         <form onSubmit={handleSubmit2} className="flex gap-2 mb-4">
                           <input 
                             type="text" 
                             placeholder="Enter Claim ID" 
                             className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                             value={formData.claimID} 
                             onChange={(e) => setFormData({...formData, claimID: e.target.value})} 
                           />
                           <motion.button 
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             type="submit" 
                             className="bg-green-600/80 hover:bg-green-500 min-w-[44px] min-h-[44px] rounded-xl text-white flex items-center justify-center border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all"
                           >
                             <Search size={20}/>
                           </motion.button>
                         </form>
                         
                         <div className="bg-black/40 p-4 rounded-xl border border-white/5 min-h-[140px]">
                           {searchedClaim ? (
                              <div className="text-sm text-gray-300 space-y-3">
                                <div className="flex justify-between border-b border-white/10 pb-3">
                                  <strong className="text-white">ID:</strong> 
                                  <span className="text-green-400 font-mono font-bold tracking-wider">{searchedClaim.claimID}</span>
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
                      <div className="bg-white/5 rounded-2xl border border-white/10 p-5 shadow-inner">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsFormVisible(!isFormVisible)} 
                          className="w-full py-3 min-h-[44px] bg-blue-600/80 text-white rounded-xl font-bold hover:bg-blue-500 transition-all border border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
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
                                     <label className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-2">Client Name</label>
                                     <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full min-h-[44px] bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all" required />
                                   </div>
                                   <div>
                                     <label className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-2">Claim Type</label>
                                     <select value={claimType} onChange={e => setClaimType(e.target.value)} className="w-full min-h-[44px] bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all appearance-none" required>
                                       <option value="">Select Type</option>
                                       <option value="medical">Medical</option>
                                       <option value="financial">Financial</option>
                                     </select>
                                   </div>
                                   <motion.button 
                                     whileHover={{ scale: 1.02 }}
                                     whileTap={{ scale: 0.98 }}
                                     type="submit" 
                                     className="w-full min-h-[44px] bg-green-600/90 text-white py-3 rounded-xl font-bold hover:bg-green-500 transition-all mt-4 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
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
                           className="w-full min-h-[44px] py-4 bg-gradient-to-r from-green-500 to-emerald-400 text-slate-900 rounded-2xl font-extrabold shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all uppercase tracking-wider"
                         >
                           Start SAKSHAM Voice
                         </motion.button>
                         <motion.button 
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           onClick={handleRefreshMemory} 
                           disabled={isRefreshing} 
                           className="w-full min-h-[44px] py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
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
