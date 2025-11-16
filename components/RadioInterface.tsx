import React from 'react';
import type { TranscriptMessage } from '../types';
import ControlButton from './ControlButton';
import StatusIndicator from './StatusIndicator';
import Transcript from './Transcript';
import { SpeakerGrilleIcon, AntennaIcon } from './icons';

interface RadioInterfaceProps {
  isActive: boolean;
  statusMessage: string;
  transcripts: TranscriptMessage[];
  currentInput: string;
  currentOutput: string;
  onToggle: () => void;
}

const RadioInterface: React.FC<RadioInterfaceProps> = ({
  isActive,
  statusMessage,
  transcripts,
  currentInput,
  currentOutput,
  onToggle,
}) => {
  return (
    <div className="relative w-full max-w-2xl mx-auto bg-[#c0a080] rounded-2xl shadow-2xl p-6 border-4 border-[#5b4636] transform transition-all duration-500 hover:shadow-3xl" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.4)' }}>
      <AntennaIcon />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Panel: Speaker & Controls */}
        <div className="md:col-span-1 flex flex-col items-center justify-between bg-[#a5896f] p-4 rounded-lg border-2 border-[#5b4636]">
          <h1 className="text-2xl font-bold text-center text-[#4a3728] tracking-wider mb-4" style={{ fontFamily: "'Georgia', serif" }}>
            Kindly
          </h1>
          <div className="text-[#4a3728] my-4">
            <SpeakerGrilleIcon isActive={isActive} />
          </div>
          <ControlButton isActive={isActive} onToggle={onToggle} />
        </div>

        {/* Right Panel: Display */}
        <div className="md:col-span-2 bg-[#e3dcd2] rounded-lg border-2 border-[#5b4636] p-4 flex flex-col" style={{ boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)' }}>
          <StatusIndicator message={statusMessage} />
          <Transcript 
            transcripts={transcripts}
            currentInput={currentInput}
            currentOutput={currentOutput}
          />
        </div>
      </div>
    </div>
  );
};

export default RadioInterface;