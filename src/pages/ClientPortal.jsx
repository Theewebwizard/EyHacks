import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import { useClientAuthStore } from '../store/useClientAuthStore';
import toast from 'react-hot-toast';
import { FileUp, MessageSquare, LogOut, FileText, ArrowLeft } from 'lucide-react';
import Typewriter from '../components/Typewriter';
import { motion } from 'framer-motion';

const parseMarkdown = (input) => {
  const lines = input.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('####')) {
      const content = line.replace(/^####\s*/, '');
      return (
        <React.Fragment key={idx}>
          <h4><strong>{content}</strong></h4><br />
        </React.Fragment>
      );
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const parsedParts = parts.map((part, i) => {
        if (/^\*\*.*\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
        return <span key={i}>{part}</span>;
      });
      return (
        <React.Fragment key={idx}>{parsedParts}<br /></React.Fragment>
      );
    }
  });
};

const ClientPortal = () => {
  const { claimID } = useParams();
  const { authClient, logout } = useClientAuthStore();
  
  const [claim, setClaim] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef(null);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackComments.trim()) {
      return toast.error("Please enter a detailed review comment.");
    }
    setIsSubmittingFeedback(true);
    try {
      const res = await axiosInstance.put(`/claims/feedback/${claimID}`, {
        rating: feedbackRating,
        comments: feedbackComments.trim()
      });
      setClaim(res.data);
      toast.success("Feedback submitted. Thank you!");
    } catch (err) {
      toast.error("Failed to submit feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const scrollChatToBottom = useCallback(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    if (!authClient) {
      navigate('/client/login');
      return;
    }
    if (!claimID) {
      navigate('/client/dashboard');
      return;
    }
    fetchClaim();
    const interval = setInterval(fetchClaim, 5000);
    return () => clearInterval(interval);
  }, [authClient, claimID]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchClaim = async () => {
    try {
      // Secure check to ensure the claim matches
      const res = await axiosInstance.get(`/claims/search/${claimID}`);
      setClaim(res.data);
    } catch (err) {
      console.error(err);
      if (!claim) toast.error('Error fetching claim details');
      navigate('/client/dashboard');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a file to upload');
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    
    try {
      await axiosInstance.post(`/documents/upload/${claimID}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully!');
      setFile(null);
      fetchClaim();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const text = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { text, isBot: false, timestamp: new Date().toISOString() }]);
    setIsChatLoading(true);
    
    try {
      const response = await fetch('http://localhost:8080/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, role: 'client' })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { 
        text: data.response || "Sorry, I couldn't process your request.", 
        isBot: true, 
        timestamp: new Date().toISOString(),
        animate: true
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: "Error connecting to assistant.", isBot: true, timestamp: new Date().toISOString() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!claim) return <div className="h-[100dvh] flex items-center justify-center text-white bg-slate-900">Loading...</div>;

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black font-dmsans p-4 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 text-white pt-10 md:pt-8 w-full overflow-x-hidden">
      {/* Left Column: Dashboard & Upload */}
      <div className="w-full md:w-1/2 flex flex-col gap-6 md:gap-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigate('/client/dashboard')} className="text-gray-400 hover:text-white transition-colors mr-2">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(20,184,166,0.3)]">Client Portal</h1>
            </div>
            <p className="text-gray-300 mt-1 text-sm md:text-base ml-8">Welcome, <span className="font-semibold text-white">{claim.clientName}</span></p>
            <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1 ml-8">✉️ {authClient?.email}</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout} 
            className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl transition-all border border-red-500/30"
          >
            <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
          </motion.button>
        </motion.div>

        {/* Status Tracker */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/40 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 flex-1"
        >
          <h2 className="text-xl md:text-2xl font-bold mb-6 border-b border-white/10 pb-3">Claim Status Tracker</h2>
          
          <div className="flex flex-col gap-6 relative ml-2 md:ml-4">
            <div className="absolute left-[15px] top-4 bottom-4 w-1 bg-white/10 rounded-full z-0"></div>
            
            <div className="flex items-center gap-4 z-10">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)]">✓</div>
              <div>
                <h3 className="text-base md:text-lg font-bold">Claim Initiated</h3>
                <p className="text-gray-400 text-xs md:text-sm">ID: {claim.claimID}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${claim.documents?.length > 0 ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`}>
                {claim.documents?.length > 0 ? '✓' : '2'}
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold">Document Submission</h3>
                <p className="text-gray-400 text-xs md:text-sm">{claim.documents?.length > 0 ? `${claim.documents.length} document(s) uploaded` : 'Awaiting documents'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${claim.validation_status === 'Verified' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : claim.validation_status === 'Rejected' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : claim.documents?.length > 0 ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-700'}`}>
                {claim.validation_status === 'Verified' ? '✓' : claim.validation_status === 'Rejected' ? 'X' : '3'}
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold">AI Verification</h3>
                <p className="text-gray-400 text-xs md:text-sm">{claim.validation_status || 'Pending Review'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                claim.status === 'Resolved' 
                  ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                  : claim.status === 'Disapproved' 
                    ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : 'bg-slate-700'
              }`}>
                {claim.status === 'Resolved' ? '✓' : claim.status === 'Disapproved' ? 'X' : '4'}
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold">Final Resolution</h3>
                <p className="text-gray-400 text-xs md:text-sm">{claim.status || 'In Progress'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upload Module or Feedback Module */}
        {claim.status === 'Resolved' || claim.status === 'Disapproved' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10"
          >
            <h2 className="text-lg md:text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-yellow-400">★</span> Share Your Experience
            </h2>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              Your claim is now finalized ({claim.status}). Please help us improve by rating your experience and leaving detailed feedback.
            </p>

            {claim.feedback && claim.feedback.submittedAt ? (
              <div className="bg-slate-950/40 border border-white/10 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-teal-400 bg-teal-950/40 border border-teal-500/20 px-2 py-0.5 rounded-full">Submitted</span>
                  <div className="flex gap-0.5 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-lg">
                        {star <= claim.feedback.rating ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-300 text-sm italic">
                  "{claim.feedback.comments}"
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                {/* Star selection */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 font-medium">Rating:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className={`text-2xl transition-all duration-150 transform hover:scale-125 ${
                          star <= feedbackRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400/50'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment box */}
                <textarea
                  required
                  rows="3"
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Tell us what went well, or what we can do better..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-white"
                />

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={isSubmittingFeedback || !feedbackComments.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white min-h-[44px] rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(52,211,153,0.2)] border-0"
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </motion.button>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10"
          >
            <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2"><FileUp className="text-blue-400"/> Upload Documents</h2>
            <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-center">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="w-full sm:flex-1 min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer file:transition-colors text-white cursor-pointer" 
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit" 
                disabled={isUploading || !file}
                className="w-full sm:w-auto bg-blue-600/90 hover:bg-blue-500 disabled:opacity-50 text-white min-h-[44px] px-8 py-2.5 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500/50"
              >
                {isUploading ? 'Uploading...' : 'Submit'}
              </motion.button>
            </form>
          </motion.div>
        )}

      </div>

      {/* Right Column: Chatbot */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full md:w-1/2 bg-slate-900/40 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 flex flex-col h-[500px] md:h-auto"
      >
        <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 pb-4 border-b border-white/10 shrink-0">
          <MessageSquare className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> Client Support Chat
        </h2>
        
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-gray-400 text-center mt-10 p-4">
              <MessageSquare className="mx-auto mb-3 opacity-40 text-blue-400" size={56} />
              <p className="font-semibold text-lg text-gray-300">Hello! I am your SAKSHAM AI assistant.</p>
              <p className="text-sm mt-2">Ask me anything regarding your claim policy or requirements.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[90%] md:max-w-[85%] p-4 text-sm md:text-base rounded-2xl border transition-all duration-300 ${
                msg.isBot 
                  ? 'bg-slate-900/60 text-slate-100 border-white/10 rounded-tl-none hover:border-white/20' 
                  : 'bg-teal-950/40 text-teal-100 border-teal-500/20 rounded-tr-none hover:border-teal-500/35 shadow-[0_0_15px_rgba(20,184,166,0.05)]'
              }`}>
                {msg.isBot && msg.animate ? (
                  <Typewriter text={msg.text} speed={30} onUpdate={scrollChatToBottom}/>
                ) : (
                  parseMarkdown(msg.text)
                )}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900/40 border border-white/10 p-3.5 rounded-2xl rounded-tl-none flex items-center space-x-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-thinking" style={{animationDelay: '0s'}}></div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-thinking" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-thinking" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-3 shrink-0 items-center">
          <div className="flex-1">
            <div className="w-full rounded-xl p-[1px] bg-white/10 hover:bg-white/15 focus-within:bg-gradient-to-r focus-within:from-blue-500 focus-within:to-emerald-500 focus-within:shadow-[0_0_15px_rgba(52,211,153,0.2)] transition-all duration-300">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your claim policy or requirements..." 
                className="w-full bg-slate-950 text-white placeholder-gray-400 border-0 rounded-[11px] px-4 py-3 min-h-[42px] text-sm focus:outline-none focus:ring-0"
              />
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit" 
            disabled={isChatLoading || !chatInput.trim()} 
            className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-40 text-white min-h-[44px] px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center border-0"
          >
            <span className="hidden sm:inline">Send</span>
            <span className="sm:hidden">→</span>
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ClientPortal;
