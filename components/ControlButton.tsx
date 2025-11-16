
import React from 'react';
import { PowerIcon, MicrophoneIcon } from './icons';

interface ControlButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

const ControlButton: React.FC<ControlButtonProps> = ({ isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-[#a5896f] focus:ring-[#f5eeda]
        ${isActive 
          ? 'bg-gradient-to-br from-red-500 to-red-800 shadow-lg' 
          : 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-md hover:shadow-lg'
        }
        border-4 border-[#5b4636]
      `}
      aria-label={isActive ? "Stop Conversation" : "Start Conversation"}
    >
      <div className="absolute inset-0 bg-black/10 rounded-full"></div>
      <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
      <div className="text-[#4a3728] drop-shadow-lg">
        {isActive ? <PowerIcon /> : <MicrophoneIcon />}
      </div>
    </button>
  );
};

export default ControlButton;
