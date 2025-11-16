
import React from 'react';

interface StatusIndicatorProps {
  message: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ message }) => {
  return (
    <div className="text-center bg-[#5b4636] text-amber-100 py-1 px-4 rounded-t-md">
      <p className="text-sm font-medium tracking-wide truncate">{message}</p>
    </div>
  );
};

export default StatusIndicator;
