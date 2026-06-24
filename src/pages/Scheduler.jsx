import React from 'react';

const Scheduler = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-[rgba(0,0,0,0.6)] font-dmsans text-white p-10 pt-[7rem] pl-[8rem]">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent mb-6">
        Task Timeline / Scheduler
      </h1>
      <p className="text-xl text-gray-300 mb-8">
        Check your upcoming assigned calls, priority deadlines, or scheduled follow-ups for the day.
      </p>
      
      <div className="bg-[rgba(0,0,0,0.8)] p-6 rounded-2xl h-full border border-gray-700">
        {/* Placeholder for Calendar Grid */}
        <div className="w-full h-full flex flex-col justify-center items-center opacity-50">
          <img src="/database.png" alt="database" className="size-32 mb-4 opacity-70" />
          <p className="text-lg">Scheduler Integration Coming Soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
