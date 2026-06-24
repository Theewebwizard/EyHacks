import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const { authAgent } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isClientRoute = location.pathname.startsWith('/client');

  return (
    <div className="min-h-screen w-full bg-transparent text-white overflow-x-hidden font-dmsans">
      {/* Show Navbar only if NOT on a Client route */}
      {!isClientRoute && <Navbar />}
      
      {authAgent && !isClientRoute && (
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

          {/* Sidebar */}
          <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </>
      )}

      {/* Main Content Area */}
      <main className={`transition-all duration-300 min-h-screen flex flex-col ${authAgent && !isClientRoute ? 'md:ml-[5rem]' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
