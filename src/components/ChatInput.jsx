import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';

const ChatInput = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    try {
      await onSend(text.trim());
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleMouseLeave = () => {
    if (inputRef.current && !text.trim()) {
      inputRef.current.blur();
      setIsFocused(false);
    }
  };

  return (
    <div className="py-3 w-full">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="flex-1" onMouseLeave={handleMouseLeave}>
          {/* Smooth focus glow border */}
          <div
            className={`w-full rounded-2xl p-[1px] transition-all duration-300 ${
              isFocused
                ? 'bg-gradient-to-r from-blue-500 to-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Saksham AI anything..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full px-4 py-2.5 rounded-[15px] bg-slate-950 text-sm text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
        <button
          type="submit"
          className="p-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-2xl transition-all duration-300 shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center min-w-[44px] min-h-[44px]"
          disabled={!text.trim() || isLoading}
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
