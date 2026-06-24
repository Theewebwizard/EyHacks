import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import Typewriter from './Typewriter';
import { Plus, User } from 'lucide-react';

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
      const response = await fetch('http://localhost:8080/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
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
    setMessages([]);
    localStorage.removeItem('chatMessages');
  };

  return (
    <div className="flex flex-col h-full w-full font-dmsans">
      {/* Scrollable Message History */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
            <User className="size-10 mb-3 text-emerald-400" />
            <p className="text-sm">Welcome to Saksham AI</p>
            <p className="text-xs text-gray-400 mt-1">Ask questions about claims process validation rules, status, or files.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.isBot ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm border transition-all duration-300 ${
                  message.isBot
                    ? 'bg-slate-900/60 text-slate-100 border-white/10 rounded-tl-none hover:border-white/20'
                    : 'bg-teal-950/40 text-teal-100 border-teal-500/20 rounded-tr-none hover:border-teal-500/35'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
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
                  className={`text-[10px] mt-1.5 font-medium tracking-wide ${
                    message.isBot ? 'text-gray-500' : 'text-teal-400/70'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/40 border border-white/10 p-3.5 rounded-2xl rounded-tl-none flex items-center space-x-1.5 shadow-sm">
              <div
                style={{ animationDelay: '0s' }}
                className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-thinking"
              ></div>
              <div
                style={{ animationDelay: '0.2s' }}
                className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-thinking"
              ></div>
              <div
                style={{ animationDelay: '0.4s' }}
                className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-thinking"
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar Section */}
      <div className="flex items-center gap-2 border-t border-white/10 pt-2 shrink-0 bg-transparent">
        <button
          onClick={handleNewChat}
          className="p-3 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-300 group flex items-center justify-center min-w-[44px] min-h-[44px]"
          title="Start a New Chat"
        >
          <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" />
        </button>
        <div className="flex-1">
          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
