import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const Layout = ({ children }) => {
  const { authAgent } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white overflow-x-hidden font-dmsans">
      {/* Navbar always visible, but we can overlay a mobile menu toggle if authenticated */}
      <Navbar />
      
      {authAgent && (
        <>
          {/* Mobile Header Toggle */}
          <div className="md:hidden fixed top-0 left-0 w-full h-[4rem] z-50 flex items-center px-4 bg-transparent pointer-events-none">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="pointer-events-auto bg-gray-900/80 backdrop-blur-md p-2 rounded-lg border border-white/10 text-white shadow-[0_0_15px_rgba(20,184,166,0.2)] mt-2"
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Sidebar logic is handled inside Sidebar component, we just pass the mobile state */}
          <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </>
      )}

      {/* Main Content Area */}
      <main className={`transition-all duration-300 min-h-screen flex flex-col ${authAgent ? 'md:ml-[5rem]' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
