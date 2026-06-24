import React, { useState, useEffect, useRef } from 'react';

const Typewriter = ({ text, speed = 50, animate = true, onUpdate }) => {
  const [displayedText, setDisplayedText] = useState(animate ? '' : text);
  // Store onUpdate in a ref so it never causes the effect to re-run
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      return;
    }
    // Reset and start fresh each time `text` changes
    setDisplayedText('');
    let index = 0;
    const interval = setInterval(() => {
      index++;
      setDisplayedText(text.slice(0, index));
      if (onUpdateRef.current) onUpdateRef.current();
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
    // Only restart when text/speed/animate actually change — NOT onUpdate
  }, [text, speed, animate]);

  // Parse **bold** markdown
  const parseMarkdown = (input) => {
    const parts = input.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (/^\*\*.*\*\*$/.test(part)) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return <span>{parseMarkdown(displayedText)}</span>;
};

export default Typewriter;
