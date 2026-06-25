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
    <div className="flex flex-col items-center pt-8 gap-6 w-full h-full">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/home');
        return (
          <Link to={item.path} key={item.path} onClick={onClose} className="w-full flex justify-center relative">
            {isActive && (
              <motion.div 
                layoutId="active-pill"
                className="absolute inset-0 mx-auto w-14 h-14 rounded-2xl bg-teal-500/20 shadow-[0_0_20px_rgba(45,212,191,0.25)] border border-teal-400/50 pointer-events-none"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`relative z-10 min-w-[44px] min-h-[44px] size-14 rounded-2xl flex items-center justify-center transition-all duration-300 group
                ${isActive 
                  ? "text-teal-400" 
                  : "bg-transparent text-slate-400 hover:bg-white/[0.03] hover:text-white border border-transparent hover:border-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]"
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
      <div className="hidden md:flex fixed left-0 top-[4rem] h-[calc(100vh-4rem)] w-[5rem] bg-[#0e1322]/60 backdrop-blur-lg border-r border-t border-white/[0.06] z-30">
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
              className="md:hidden fixed left-0 top-0 h-screen w-20 bg-[#0e1322]/90 backdrop-blur-lg border-r border-white/[0.06] z-50 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.8)]"
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
