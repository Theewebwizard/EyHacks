import { Bell, Cog, LogOut, X, User, Sliders, Shield, Palette } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { logout, authAgent } = useAuthStore();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasNewNotifs, setHasNewNotifs] = useState(true);

  // Custom configuration state for the Settings modal
  const [aiLevel, setAiLevel] = useState("balanced");
  const [themeAccent, setThemeAccent] = useState("teal");
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Sample notifications data
  const notifications = [
    { id: 1, message: "New claim CLM-1001 assigned to you." },
    { id: 2, message: "Saksham AI: Verification completed for CLM-1000." },
  ];

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
      <div className="fixed top-0 left-0 w-full bg-slate-950/40 backdrop-blur-md border-b border-white/10 z-50">
        <div className="pl-[6.5rem] pr-[1.5rem] md:pl-[6.5rem] h-16 flex items-center bg-transparent">
          <div className="flex flex-row justify-between items-center w-full">
            <div className="text-3xl font-extrabold font-dmsans bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]">
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
                        className="absolute right-0 mt-2 w-[22rem] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-white/10 bg-slate-950/20">
                          <h3 className="font-bold text-white text-sm">Notifications</h3>
                        </div>
                        <div className="p-3 flex flex-col gap-1.5">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200"
                            >
                              <p className="text-xs text-gray-300 leading-normal">
                                {notif.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Settings Button */}
              <button 
                onClick={(e) => { e.preventDefault(); setIsSettingsOpen(true); }}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 relative"
                aria-label="Settings"
                title="Settings"
              >
                <Cog className="size-5 transition-transform duration-300 hover:rotate-90" />
              </button>

              {authAgent && (
                <>
                  {/* Logout Button */}
                  <button
                    className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 relative"
                    onClick={logout}
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
                      <div className="size-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-sm font-bold text-slate-900 border border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all duration-300 hover:scale-105 hover:border-yellow-200">
                        {getInitials(authAgent.fullName)}
                      </div>
                    )}
                    
                    {/* Hover profile info tooltip */}
                    <div className="absolute right-0 top-12 w-48 p-3 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-50">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{authAgent.fullName}</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5 uppercase tracking-wider font-semibold">Agent ID: {authAgent.agentID}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal (Overlay Overlay) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col font-dmsans text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <Cog className="size-6 text-emerald-400" />
                  <h2 className="text-xl font-bold">Preferences & Settings</h2>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-6">
                {/* Profile Overview */}
                {authAgent && (
                  <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <div className="size-14 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-lg font-bold text-white shadow-md">
                      {getInitials(authAgent.fullName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{authAgent.fullName}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Agent Role (Claims Adjuster)</p>
                      <p className="text-[11px] font-mono text-emerald-400 mt-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block">
                        ID: {authAgent.agentID}
                      </p>
                    </div>
                  </div>
                )}

                {/* Saksham AI Settings */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <Sliders className="size-4 text-blue-400" />
                    <span>Saksham AI Suggestions style</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
                    {["conservative", "balanced", "aggressive"].map((level) => (
                      <button
                        key={level}
                        onClick={() => setAiLevel(level)}
                        className={`py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                          aiLevel === level
                            ? "bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-sm"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Aggressive increases prompt suggestion counts. Conservative limits recommendations to high confidence checks.
                  </p>
                </div>

                {/* App Theme Accents */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <Palette className="size-4 text-purple-400" />
                    <span>Theme Accent Glow</span>
                  </div>
                  <div className="flex gap-3">
                    {[
                      { id: "teal", color: "bg-teal-500" },
                      { id: "blue", color: "bg-blue-500" },
                      { id: "purple", color: "bg-purple-500" },
                      { id: "emerald", color: "bg-emerald-500" },
                    ].map((accent) => (
                      <button
                        key={accent.id}
                        onClick={() => setThemeAccent(accent.id)}
                        className={`size-8 rounded-full ${accent.color} flex items-center justify-center border-2 transition-all ${
                          themeAccent === accent.id ? "border-white scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                        aria-label={`Select ${accent.id} accent`}
                      />
                    ))}
                  </div>
                </div>

                {/* System Permissions / Alerts */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <Shield className="size-4 text-emerald-400" />
                    <span>Notifications & Alerts</span>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-slate-950/20 border border-white/5 rounded-xl cursor-pointer">
                    <span className="text-xs text-gray-300">Enable Desktop Audio Alerts on new cases</span>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="toggle toggle-success toggle-sm"
                    />
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-slate-950/20 flex justify-end">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Settings
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
