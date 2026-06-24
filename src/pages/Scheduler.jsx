import React from 'react';

const Scheduler = () => {
  return (
    <div className="flex flex-col min-h-screen w-full font-dmsans text-white pt-[6rem] px-4 md:px-10 pb-10">
      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent mb-2 drop-shadow-[0_0_10px_rgba(20,184,166,0.3)]">
        Task Timeline / Scheduler
      </h1>
      <p className="text-lg text-gray-300 mb-8">
        Check your upcoming assigned calls, priority deadlines, or scheduled follow-ups for the day.
      </p>
      
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl h-[33rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col justify-center items-center">
        <div className="w-full h-full flex flex-col justify-center items-center opacity-50">
          <img src="/database.png" alt="database" className="size-32 mb-4 opacity-70 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <p className="text-lg italic font-medium tracking-wide">Scheduler Integration Coming Soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
