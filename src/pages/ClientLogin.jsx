import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const ClientLogin = () => {
  const [claimID, setClaimID] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!claimID) {
      toast.error('Please enter a Claim ID');
      return;
    }
    
    setIsLoading(true);
    try {
      // Reuse the existing search endpoint to verify if the claim exists
      const response = await axiosInstance.get(`/claims/search/${claimID}`);
      if (response.data) {
        toast.success('Login successful');
        // Simple client-side auth for demo purposes: store the claim ID
        localStorage.setItem('clientClaimID', claimID);
        navigate('/client/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid Claim ID or Claim not found');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center font-dmsans">
      <div className="bg-[rgba(0,0,0,0.8)] p-10 rounded-2xl shadow-xl w-96 flex flex-col items-center">
        <h2 className="text-3xl font-extrabold text-white mb-2">Client Portal</h2>
        <p className="text-gray-400 mb-8 text-center">Enter your Unique Claim ID to view your status</p>
        
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <input
            type="text"
            placeholder="e.g. CLM-1000"
            value={claimID}
            onChange={(e) => setClaimID(e.target.value)}
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 w-full uppercase"
          />
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-green-500 hover:to-blue-500 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientLogin;
