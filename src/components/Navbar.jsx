import { Bell, LogOut, X } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { logout, authAgent } = useAuthStore();
  const { claims } = useStore();
  const { aiLevel, setAiLevel, audioAlerts, setAudioAlerts } = useSettingsStore();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasNewNotifs, setHasNewNotifs] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Dynamic notifications based on claims
  const notifications = claims
    .filter(c => c.status !== 'Resolved' && c.status !== 'Disapproved')
    .map(c => {
       if (c.validation_status === 'Verified') {
         return { id: `verified-${c.claimID}`, message: `Saksham AI: Verification completed for ${c.claimID}.` };
       } else if (c.validation_status === 'Discrepancy Found' || c.validation_status === 'Awaiting Documents') {
         return { id: `issue-${c.claimID}`, message: `Action Required: Issues found in ${c.claimID}.` };
       } else {
         return { id: `new-${c.claimID}`, message: `New claim ${c.claimID} assigned to you.` };
       }
    })
    .slice(0, 5);

  // Helper to extract initials from the agent's name
  const getInitials = (name) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      <div className="fixed top-0 left-0 w-full backdrop-blur-md border-b border-white/[0.08] z-50"
        style={{background:'linear-gradient(180deg, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.88) 100%)', boxShadow:'0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.6)'}}
      >
        <div className="pl-[4.5rem] pr-[1rem] md:pl-[6.5rem] md:pr-[1.5rem] h-16 flex items-center bg-transparent">
          <div className="flex flex-row justify-between items-center w-full">
            <div className="text-xl md:text-2xl font-extrabold font-dmsans tracking-tight mr-2 glow-text"
              style={{background:'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text'}}>
              Saksham AI
            </div>
            
            <div className="flex items-center gap-4">
              {authAgent && (
                <div
                  className="relative"
                  onMouseEnter={() => {
                    setIsNotificationsOpen(true);
                    setHasNewNotifs(false);
                  }}
                  onMouseLeave={() => setIsNotificationsOpen(false)}
                >
                  <button 
                    className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 relative group"
                    aria-label="Notifications"
                  >
                    <Bell className="size-5 transition-transform duration-300 group-hover:rotate-12" />
                    {hasNewNotifs && (
                      <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-[22rem] bg-[#151515]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-white/10 bg-black/20">
                          <h3 className="font-bold text-white text-sm">Notifications</h3>
                        </div>
                        <div className="p-3 flex flex-col gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-500">
                              No new notifications
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200"
                              >
                                <p className="text-xs text-gray-300 leading-normal">
                                  {notif.message}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}


              {authAgent && (
                <>
                  {/* Logout Button */}
                  <button
                    className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 relative"
                    onClick={() => setShowLogoutConfirm(true)}
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogOut className="size-5" />
                  </button>

                  {/* Dynamic Initial Profile Avatar */}
                  <div className="relative group cursor-pointer">
                    {authAgent.profilePic ? (
                      <img
                        src={authAgent.profilePic}
                        alt={authAgent.fullName}
                        className="size-10 rounded-full border border-white/10 object-cover shadow-[0_0_12px_rgba(255,255,255,0.1)] transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white border border-white/20 shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/20">
                        {getInitials(authAgent.fullName)}
                      </div>
                    )}
                    
                    {/* Hover profile info tooltip */}
                    <div className="absolute right-0 top-12 w-48 p-3 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-50">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{authAgent.fullName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">Agent ID: {authAgent.agentID}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
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
                <LogOut className="size-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to log out? Any unsaved changes in your session may be lost.
              </p>
              <div className="flex gap-3 w-full justify-center">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-sm font-semibold transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition-all duration-200"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
