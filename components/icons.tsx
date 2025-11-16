import React from 'react';

export const PowerIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
  </svg>
);

export const MicrophoneIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);


export const SpeakerGrilleIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <div className="relative w-32 h-32 rounded-full bg-[#4a3728] overflow-hidden shadow-inner">
      <div className={`absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 rounded-full bg-amber-400 animate-pulse"></div>
        <div className="absolute inset-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <div className="absolute inset-0 grid grid-cols-4 gap-1 p-3 transform -rotate-45">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="w-full h-full bg-[#a5896f] rounded-full opacity-50"></div>
        ))}
      </div>
    </div>
  );

export const AntennaIcon: React.FC = () => (
    <div className="absolute top-0 right-10 -mt-24 h-28 w-1.5 bg-gray-400 rounded-t-full transform -rotate-12 origin-bottom-right" style={{ filter: 'drop-shadow(2px -2px 2px rgba(0,0,0,0.3))' }}>
      <div className="h-full w-full bg-gradient-to-b from-gray-300 via-gray-500 to-gray-400 rounded-t-full">
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-gray-500 rounded-full border-2 border-gray-400"></div>
      </div>
    </div>
);
