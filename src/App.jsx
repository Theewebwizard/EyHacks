import Navbar from './components/Navbar';
import { Routes, Route, Navigate } from 'react-router-dom';

import AgentHome from './pages/AgentHome';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import StatusPage from './pages/StatusPage';
import AgentSignup from './pages/AgentSignup';
import AgentLogin from './pages/AgentLogin';
import AgentDash from './pages/AgentDash';
import Sidebar from './components/Sidebar';
import RealTsuggestion from './pages/RealTsuggestion';
import ClientLogin from './pages/ClientLogin';
import ClientPortal from './pages/ClientPortal';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore.js';
import { useEffect } from 'react';

const App = () => {
  const { authAgent, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="bg-[url('/backimg5.jpg')]">
      <Navbar />
      {authAgent && <Sidebar />}
      <div className="w-full h-screen">
        <Routes>
          <Route
            path="/"
            element={authAgent ? <AgentDash /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={!authAgent ? <AgentLogin /> : <Navigate to="/" />}
          />

          <Route
            path="/signup"
            element={!authAgent ? <AgentSignup /> : <Navigate to="/" />}
          />
          <Route
            path="/realTs"
            element={authAgent ? <RealTsuggestion /> : <Navigate to="/login" />}
          />
          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client/dashboard" element={<ClientPortal />} />
          <Route path="/home" element={<Navigate to="/" />} />
        </Routes>
      </div>

      {/* <HomePage/>
        <LoginPage/>
        <StatusPage /> */}
      <Toaster />
    </div>
  );
};

export default App;
