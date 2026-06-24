import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useStore } from "../store/useStore.js";
import { axiosInstance } from "../lib/axios.js";
import { Captions, Search, AlertTriangle, X, Briefcase } from "lucide-react";
import toast from 'react-hot-toast';

const socket = io("http://localhost:5000");

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

      setSuggestions((prev) => {
        const newSuggestions = [formattedResponse, ...prev];
        return newSuggestions.length > 2 ? [formattedResponse] : newSuggestions;
      });

      startTypingEffect(formattedResponse);
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
  }, [displayedSuggestion]);
  
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
        setDisplayedSuggestion("");
        setSuggestions([]);
        setLiveTranscription([]);
        setClientSummary("");
        setClaimAmount("N/A");
        setIncidentDate("N/A");
        startTypingEffect("Memory has been successfully refreshed. Ready for new conversation.");
      } else {
        startTypingEffect("Failed to refresh memory. Please try again.");
      }
    } catch (error) {
      startTypingEffect("An error occurred while refreshing memory.");
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
        startTypingEffect("SAKSHAM has been started successfully.");
      } else {
        startTypingEffect("Failed to start SAKSHAM. Please try again.");
      }
    } catch (error) {
      startTypingEffect("An error occurred while starting SAKSHAM.");
    }
  };

  const startTypingEffect = (text) => {
    setDisplayedSuggestion("");
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedSuggestion((prev) => text.slice(0, index));
      index++;
      if (index > text.length) clearInterval(interval);
    }, 10);
  };

  return (
    <div className="flex flex-col h-screen z-1 font-dmsans pt-[6rem] px-8 gap-4 pb-4 overflow-hidden relative">
      
      {/* Sentiment Alert Banner */}
      {sentimentAlert && (
        <div className="w-full bg-red-900/80 border-2 border-red-500 p-4 rounded-2xl flex items-center gap-4 text-white animate-pulse shadow-[0_0_15px_#ef4444] shrink-0">
          <AlertTriangle size={32} className="text-red-400" />
          <div>
            <h3 className="font-bold text-xl uppercase tracking-wider text-red-200">Critical Client Sentiment: {sentimentAlert.emotion}</h3>
            <p className="font-medium text-lg">{sentimentAlert.message}</p>
          </div>
        </div>
      )}

      {/* Top Panel: Client Summary & Financial Details */}
      <div className="w-full bg-[rgba(0,0,0,0.7)] rounded-2xl flex flex-row items-stretch p-4 shrink-0 shadow-lg border border-gray-700">
        <div className="flex-[0.7] border-r border-gray-600 pr-6 flex flex-col justify-center">
           <h3 className="text-xl font-bold text-blue-400 mb-2 flex items-center gap-2">Live Client Summary</h3>
           <p className="text-gray-200 text-md italic h-12 overflow-auto font-medium">
             {clientSummary || "Waiting for conversation details..."}
           </p>
        </div>
        <div className="flex-[0.3] pl-6 flex flex-col justify-center gap-3">
           <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
             <span className="text-gray-400 font-semibold text-sm uppercase">Claim Amount:</span>
             <span className="text-green-400 font-bold text-lg">{claimAmount}</span>
           </div>
           <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
             <span className="text-gray-400 font-semibold text-sm uppercase">Incident Date:</span>
             <span className="text-blue-300 font-bold text-lg">{incidentDate}</span>
           </div>
        </div>
      </div>

      {/* Main 50/50 Split-Screen Section */}
      <div className="flex flex-row w-full gap-4 flex-1 min-h-0 relative">
        
        {/* Left Column: AI Suggestions (50%) */}
        <div className="w-1/2 bg-[rgba(0,0,0,0.7)] rounded-2xl flex flex-col h-full border border-gray-700 shadow-lg">
           <div className="h-[3.5rem] w-full bg-[rgba(0,0,0,0.8)] flex items-center px-6 rounded-t-2xl shrink-0">
             <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">RTS powered by SAKSHAM</span>
           </div>
           <div ref={containerRef} className="p-6 overflow-auto h-full font-medium text-lg text-white">
             {displayedSuggestion ? (
               <div className="whitespace-pre-wrap leading-relaxed">{displayedSuggestion}</div>
             ) : (
               <div className="h-full w-full flex justify-center items-center">
                 <div id="loader-wrapper">
                   <div id="loader"></div>
                 </div>
               </div>
             )}
           </div>
        </div>

        {/* Right Column: Live Transcription (50%) */}
        <div className="w-1/2 bg-[rgba(0,0,0,0.7)] rounded-2xl flex flex-col h-full border border-gray-700 shadow-lg">
           <div className="h-[3.5rem] w-full bg-[rgba(0,0,0,0.8)] flex items-center justify-between px-6 rounded-t-2xl shrink-0 border-b border-gray-700">
             <span className="text-xl font-extrabold text-gray-300 flex items-center gap-2"><Captions size={24} className="text-blue-400"/> Live Transcript</span>
             
             {/* Open Drawer Button */}
             <button 
               onClick={() => setIsDrawerOpen(true)} 
               className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-md"
             >
               <Briefcase size={16} />
               Case Tools
             </button>
           </div>
           <div ref={transcriptRef} className="p-4 overflow-auto h-full text-md text-gray-300 flex flex-col gap-3">
             {liveTranscription.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                   <Captions size={48} className="mb-2" />
                   <p className="italic font-medium">Awaiting live audio...</p>
                </div>
             ) : (
                liveTranscription.map((txt, i) => (
                  <div key={i} className="bg-gray-800/80 p-3 rounded-lg border border-gray-700 shadow-sm">
                    <span className="font-semibold text-blue-300 text-xs uppercase mb-1 block">Snippet</span>
                    {txt}
                  </div>
                ))
             )}
           </div>
        </div>

        {/* --- Slide-Out Drawer (Right Side) --- */}
        <div 
          className={`absolute top-0 right-0 h-full w-[40%] max-w-sm bg-gray-900 border-l border-gray-700 shadow-[[-10px_0_30px_rgba(0,0,0,0.8)]] transition-transform duration-300 ease-in-out z-20 flex flex-col rounded-r-2xl ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
           <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-gray-800/50 rounded-tr-2xl shrink-0">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Briefcase size={20} className="text-blue-400"/> Case Tools
             </h2>
             <button 
               onClick={() => setIsDrawerOpen(false)} 
               className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
             >
               <X size={24} />
             </button>
           </div>
           
           <div className="p-5 flex-1 overflow-auto flex flex-col gap-6">
              {/* Search & Claim Info */}
              <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-4 flex flex-col shadow-inner">
                 <h3 className="text-lg font-bold text-gray-200 mb-3 flex items-center gap-2">
                   <Search size={18} className="text-green-400"/> Search Claim
                 </h3>
                 <form onSubmit={handleSubmit2} className="flex gap-2 mb-3">
                   <input 
                     type="text" 
                     placeholder="Enter Claim ID" 
                     className="flex-1 rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" 
                     value={formData.claimID} 
                     onChange={(e) => setFormData({...formData, claimID: e.target.value})} 
                   />
                   <button type="submit" className="bg-green-700 p-2 rounded-lg text-white hover:bg-green-600 transition-colors">
                     <Search size={18}/>
                   </button>
                 </form>
                 
                 <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 min-h-[120px]">
                   {searchedClaim ? (
                      <div className="text-sm text-gray-300 space-y-2">
                        <div className="flex justify-between border-b border-gray-700 pb-2">
                          <strong className="text-white">ID:</strong> 
                          <span className="text-green-400 font-mono">{searchedClaim.claimID}</span>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">Client Name:</strong> 
                          <span className="bg-gray-800 px-2 py-1 rounded inline-block text-xs">{searchedClaim.clientName}</span>
                        </div>
                        <div>
                          <strong className="text-white block mb-1">Summary:</strong> 
                          <p className="text-xs leading-relaxed opacity-80">{searchedClaim.clientSummary}</p>
                        </div>
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-40 py-4">
                         <img src="/database.png" alt="database" className="size-10 mb-2" />
                         <p className="text-center italic text-white text-xs">No claim selected</p>
                      </div>
                   )}
                 </div>
              </div>

              {/* Create New Claim Form (Toggled inside drawer) */}
              <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-4 shadow-inner">
                <button 
                  onClick={() => setIsFormVisible(!isFormVisible)} 
                  className="w-full py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors mb-2"
                >
                  {isFormVisible ? "Close Form" : "Create New Claim"}
                </button>
                
                {isFormVisible && (
                  <div className="mt-3 border-t border-gray-700 pt-3">
                     <form onSubmit={handleSubmit} className="space-y-3">
                       <div>
                         <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Client Name</label>
                         <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500 text-sm" required />
                       </div>
                       <div>
                         <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Claim Type</label>
                         <select value={claimType} onChange={e => setClaimType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500 text-sm" required>
                           <option value="">Select Type</option>
                           <option value="medical">Medical</option>
                           <option value="financial">Financial</option>
                         </select>
                       </div>
                       <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-500 transition-colors mt-2 text-sm">Submit</button>
                     </form>
                     {claimID && (
                       <div className="mt-3 p-2 bg-green-900/40 border border-green-700 rounded text-center">
                         <p className="text-green-400 text-xs font-bold tracking-wider">ID: {claimID}</p>
                       </div>
                     )}
                  </div>
                )}
              </div>

              {/* Global Action Buttons */}
              <div className="mt-auto flex flex-col gap-3">
                 <button onClick={handleStartSaksham} className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:from-green-500 hover:to-green-400 shadow-md transition-all">Start SAKSHAM Voice</button>
                 <button onClick={handleRefreshMemory} disabled={isRefreshing} className="w-full py-2 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors">
                   {isRefreshing ? "Refreshing..." : "Refresh Memory"}
                 </button>
              </div>
           </div>
        </div>
        {/* --- End Slide-Out Drawer --- */}

      </div>
    </div>
  );
};

export default RealTsuggestion;
