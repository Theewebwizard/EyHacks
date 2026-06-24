import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { FileUp, MessageSquare, LogOut, FileText } from 'lucide-react';
import Typewriter from '../components/Typewriter';

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
  const [claim, setClaim] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef(null);

  const claimID = localStorage.getItem('clientClaimID');

  useEffect(() => {
    if (!claimID) {
      navigate('/client/login');
      return;
    }
    fetchClaim();
    // Set up polling for status updates to mimic real-time updates without socket for now
    // (Or we could use socket.io for client updates if we wanted, but basic polling works for status)
    const interval = setInterval(fetchClaim, 5000);
    return () => clearInterval(interval);
  }, [claimID]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchClaim = async () => {
    try {
      const res = await axiosInstance.get(`/claims/search/${claimID}`);
      setClaim(res.data);
    } catch (err) {
      console.error(err);
      if (!claim) toast.error('Error fetching claim details');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientClaimID');
    navigate('/client/login');
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
      fetchClaim(); // Refresh claim data
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
      // Direct fetch to Assistant ChatBot
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

  if (!claim) return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[url('/backimg5.jpg')] bg-cover font-dmsans p-8 flex gap-8 text-white">
      {/* Left Column: Dashboard & Upload */}
      <div className="w-1/2 flex flex-col gap-8">
        
        {/* Header */}
        <div className="bg-[rgba(0,0,0,0.8)] p-6 rounded-2xl shadow-xl flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">Client Portal</h1>
            <p className="text-gray-300 mt-1">Welcome, <span className="font-semibold text-white">{claim.clientName}</span></p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Status Tracker */}
        <div className="bg-[rgba(0,0,0,0.8)] p-8 rounded-2xl shadow-xl flex-1">
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-700 pb-2">Claim Status Tracker</h2>
          
          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-[15px] top-4 bottom-4 w-1 bg-gray-700 rounded-full z-0"></div>
            
            <div className="flex items-center gap-4 z-10">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_10px_#22c55e]">✓</div>
              <div>
                <h3 className="text-lg font-bold">Claim Initiated</h3>
                <p className="text-gray-400 text-sm">ID: {claim.claimID}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${claim.documents?.length > 0 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`}>
                {claim.documents?.length > 0 ? '✓' : '2'}
              </div>
              <div>
                <h3 className="text-lg font-bold">Document Submission</h3>
                <p className="text-gray-400 text-sm">{claim.documents?.length > 0 ? `${claim.documents.length} document(s) uploaded` : 'Awaiting documents'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${claim.validation_status === 'Verified' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : claim.validation_status === 'Rejected' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : claim.documents?.length > 0 ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-gray-600'}`}>
                {claim.validation_status === 'Verified' ? '✓' : claim.validation_status === 'Rejected' ? 'X' : '3'}
              </div>
              <div>
                <h3 className="text-lg font-bold">AI Verification</h3>
                <p className="text-gray-400 text-sm">{claim.validation_status || 'Pending Review'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${claim.status === 'Resolved' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-600'}`}>4</div>
              <div>
                <h3 className="text-lg font-bold">Final Resolution</h3>
                <p className="text-gray-400 text-sm">{claim.status || 'In Progress'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Module */}
        <div className="bg-[rgba(0,0,0,0.8)] p-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileUp /> Upload Documents</h2>
          <form onSubmit={handleUpload} className="flex gap-4 items-center">
            <input 
              type="file" 
              onChange={handleFileChange}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
            />
            <button 
              type="submit" 
              disabled={isUploading || !file}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Submit'}
            </button>
          </form>
        </div>

      </div>

      {/* Right Column: Chatbot */}
      <div className="w-1/2 bg-[rgba(0,0,0,0.8)] p-6 rounded-2xl shadow-xl flex flex-col">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 pb-4 border-b border-gray-700"><MessageSquare /> Client Support Chat</h2>
        
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {messages.length === 0 && (
            <div className="text-gray-400 text-center mt-10">
              <MessageSquare className="mx-auto mb-2 opacity-50" size={48} />
              <p>Hello! I am your SAKSHAM AI assistant.</p>
              <p>Ask me anything regarding your claim policy or requirements.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${msg.isBot ? 'bg-gray-800 text-white rounded-tl-none border border-gray-700' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                {msg.isBot && msg.animate ? (
                  <Typewriter text={msg.text} speed={30} onUpdate={() => {
                    if(chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                  }}/>
                ) : (
                  parseMarkdown(msg.text)
                )}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 p-4 rounded-2xl rounded-tl-none border border-gray-700 flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about your claim..." 
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientPortal;
