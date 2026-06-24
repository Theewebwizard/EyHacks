import { Calendar, FileUser, Headset, House, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: <House size={24} />, label: "Dashboard" },
    { path: "/realTs", icon: <Headset size={24} />, label: "Real-Time Voice" },
    { path: "/claims", icon: <FileUser size={24} />, label: "Claims Queue" },
    { path: "/calendar", icon: <Calendar size={24} />, label: "Scheduler" }
  ];

  const sidebarContent = (
    <div className="flex flex-col items-center pt-[6rem] gap-6 w-full h-full">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/home');
        return (
          <Link to={item.path} key={item.path} onClick={onClose} className="w-full flex justify-center">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`min-w-[44px] min-h-[44px] size-14 rounded-2xl flex items-center justify-center transition-all duration-300 group
                ${isActive 
                  ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.5)] border border-green-400/50" 
                  : "bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white border border-white/5 hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                }`}
              title={item.label}
              aria-label={item.label}
            >
              {item.icon}
            </motion.button>
          </Link>
        )
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (md and up) */}
      <div className="hidden md:flex fixed left-0 top-0 h-screen w-[5rem] bg-[#0f172a]/80 backdrop-blur-md border-r border-white/10 z-40">
        {sidebarContent}
      </div>

      {/* Mobile Hamburger Sidebar (< md) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            {/* Slide-in Menu */}
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed left-0 top-0 h-screen w-20 bg-[#0f172a]/95 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.8)]"
            >
              <button 
                onClick={onClose} 
                className="absolute top-4 left-1/2 -translate-x-1/2 text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex justify-center items-center"
              >
                <X size={28} />
              </button>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
