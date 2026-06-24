import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AgentSignup from './pages/AgentSignup';
import AgentLogin from './pages/AgentLogin';
import AgentDash from './pages/AgentDash';
import RealTsuggestion from './pages/RealTsuggestion';
import ClientLogin from './pages/ClientLogin';
import ClientPortal from './pages/ClientPortal';
import ClaimsQueue from './pages/ClaimsQueue';
import Scheduler from './pages/Scheduler';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore.js';
import { useEffect } from 'react';
import Layout from './components/Layout';

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full"
  >
    {children}
  </motion.div>
);

const App = () => {
  const { authAgent, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Layout>
      <div className="w-full h-full flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={authAgent ? <PageTransition><AgentDash /></PageTransition> : <Navigate to="/login" />}
            />
            <Route
              path="/login"
              element={!authAgent ? <PageTransition><AgentLogin /></PageTransition> : <Navigate to="/" />}
            />
            <Route
              path="/signup"
              element={!authAgent ? <PageTransition><AgentSignup /></PageTransition> : <Navigate to="/" />}
            />
            <Route
              path="/realTs"
              element={authAgent ? <PageTransition><RealTsuggestion /></PageTransition> : <Navigate to="/login" />}
            />
            <Route path="/client/login" element={<PageTransition><ClientLogin /></PageTransition>} />
            <Route path="/client/dashboard" element={<PageTransition><ClientPortal /></PageTransition>} />
            <Route path="/claims" element={authAgent ? <PageTransition><ClaimsQueue /></PageTransition> : <Navigate to="/login" />} />
            <Route path="/calendar" element={authAgent ? <PageTransition><Scheduler /></PageTransition> : <Navigate to="/login" />} />
            <Route path="/home" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </div>
      <Toaster />
    </Layout>
  );
};

export default App;
