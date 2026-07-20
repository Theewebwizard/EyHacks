import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import Typewriter from './Typewriter';
import { Plus, User, Bot, Trash2 } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to parse markdown in static messages.
const parseMarkdown = (input) => {
  const lines = input.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('####')) {
      const content = line.replace(/^####\s*/, '');
      return (
        <React.Fragment key={idx}>
          <h4>
            <strong>{content}</strong>
          </h4>
          <br />
        </React.Fragment>
      );
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const parsedParts = parts.map((part, i) => {
        if (/^\*\*.*\*\*$/.test(part)) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      });
      return (
        <React.Fragment key={idx}>
          {parsedParts}
          <br />
        </React.Fragment>
      );
    }
  });
};

const ChatContainer = () => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Lazy initialization: load messages from localStorage and disable animation on reload.

  const [messages, setMessages] = useState(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      let parsed = JSON.parse(storedMessages);
      parsed = parsed.map((msg) =>
        msg.isBot ? { ...msg, animate: false } : msg
      );
      return parsed;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  // Scroll the container to the bottom.
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { aiLevel } = useSettingsStore();

  const handleSendMessage = async (text) => {
    try {
      setIsLoading(true);
      setMessages((prev) => [
        ...prev,
        {
          text: text.trim(),
          isBot: false,
          timestamp: new Date().toISOString(),
        },
      ]);
      const response = await fetch('http://localhost:5000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, style: aiLevel }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          text: data.response || "Sorry, I couldn't process that request.",
          isBot: true,
          timestamp: new Date().toISOString(),
          animate: true,
        },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          text: 'Error processing your request. Please try again.',
          isBot: true,
          timestamp: new Date().toISOString(),
          animate: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setShowClearConfirm(true);
  };

  const confirmClearChat = () => {
    setMessages([]);
    localStorage.removeItem('chatMessages');
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col h-full w-full font-dmsans">
      {/* Scrollable Message History */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6">
            <div className="size-14 mb-4 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.05)]">
              <User className="size-7 text-white/60" />
            </div>
            <p className="text-sm font-semibold text-white/70">Welcome to Saksham AI</p>
            <p className="text-xs text-gray-400 mt-1">Ask questions about claims process validation rules, status, or files.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex w-full mb-4 ${
                message.isBot ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`flex gap-3 max-w-[85%] ${
                  message.isBot ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  {message.isBot ? (
                    <div className="size-8 rounded-full flex items-center justify-center text-white shadow-[0_0_12px_rgba(255,255,255,0.12)] border border-white/20 bg-white/[0.08]">
                      <Bot size={16} />
                    </div>
                  ) : (
                    <div className="size-8 rounded-full bg-white/[0.14] flex items-center justify-center text-gray-300 border border-white/15 shadow-sm">
                      <User size={16} />
                    </div>
                  )}
                </div>

                <div
                  className={`p-4 rounded-2xl shadow-sm transition-all duration-300 ${
                    message.isBot
                      ? 'chat-bubble-bot rounded-tl-sm'
                      : 'chat-bubble-user rounded-tr-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed tracking-wide">
                  {message.isBot ? (
                    message.animate ? (
                      <Typewriter
                        text={message.text}
                        speed={30}
                        animate={true}
                        onUpdate={scrollToBottom}
                      />
                    ) : (
                      parseMarkdown(message.text)
                    )
                  ) : (
                    parseMarkdown(message.text)
                  )}
                  </div>
                  <div
                    className={`text-[10px] mt-2 font-medium tracking-wide flex items-center gap-1 ${
                      message.isBot ? 'text-gray-500' : 'text-gray-500 justify-end'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="chat-bubble-bot p-3.5 rounded-2xl rounded-tl-none flex items-center space-x-1.5 shadow-sm">
              <div
                style={{ animationDelay: '0s' }}
                className="w-1.5 h-1.5 bg-white/60 rounded-full animate-thinking"
              ></div>
              <div
                style={{ animationDelay: '0.2s' }}
                className="w-1.5 h-1.5 bg-white/60 rounded-full animate-thinking"
              ></div>
              <div
                style={{ animationDelay: '0.4s' }}
                className="w-1.5 h-1.5 bg-white/60 rounded-full animate-thinking"
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar Section */}
        <div className="flex items-center gap-2 border-t border-white/[0.08] pt-2 shrink-0 bg-transparent">
        <button
          onClick={handleNewChat}
          className="p-3 bg-white/[0.04] border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/20 rounded-2xl transition-all duration-300 group flex items-center justify-center min-w-[44px] min-h-[44px] hover:shadow-[0_0_16px_rgba(255,255,255,0.05)]"
          title="Start a New Chat"
        >
          <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" />
        </button>
        <div className="flex-1">
          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>

      {/* Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-[#151515]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center text-center font-dmsans text-white"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <Trash2 className="size-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Clear Chat?</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to start a new chat? Your current conversation history will be permanently cleared.
              </p>
              <div className="flex gap-3 w-full justify-center">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-sm font-semibold transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearChat}
                  className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition-all duration-200"
                >
                  Clear Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatContainer;
