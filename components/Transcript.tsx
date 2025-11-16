
import React, { useEffect, useRef } from 'react';
import type { TranscriptMessage } from '../types';

interface TranscriptProps {
  transcripts: TranscriptMessage[];
  currentInput: string;
  currentOutput: string;
}

const Transcript: React.FC<TranscriptProps> = ({ transcripts, currentInput, currentOutput }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentInput, currentOutput]);

  return (
    <div className="flex-grow bg-[#332a22] text-[#f5eeda] rounded-md p-4 my-2 overflow-y-auto h-80 min-h-[320px] shadow-inner transition-all duration-300">
      <div className="space-y-4">
        {transcripts.map((msg, index) => (
          <div key={index} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.speaker === 'user' ? 'bg-[#7a6250] text-white rounded-br-none' : 'bg-[#5b4636] text-white rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
         {currentInput && (
           <div className="flex justify-end">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-[#7a6250] text-white/70 rounded-br-none italic">
                  <p className="text-sm">{currentInput}...</p>
              </div>
            </div>
        )}
        {currentOutput && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-[#5b4636] text-white/70 rounded-bl-none italic">
                  <p className="text-sm">{currentOutput}...</p>
              </div>
            </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export default Transcript;
