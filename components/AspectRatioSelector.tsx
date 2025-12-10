import React from 'react';
import { AspectRatio } from '../types';

interface AspectRatioSelectorProps {
  selected: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
  disabled: boolean;
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selected, onChange, disabled }) => {
  const ratios = [
    { value: AspectRatio.PORTRAIT_9_16, label: '9:16', icon: '📱' },
    { value: AspectRatio.PORTRAIT_3_4, label: '3:4', icon: '🖼️' },
    { value: AspectRatio.SQUARE_1_1, label: '1:1', icon: '🟦' },
    { value: AspectRatio.LANDSCAPE_16_9, label: '16:9', icon: '💻' },
  ];

  return (
    <div className="flex space-x-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-full shadow-sm border border-white/60">
      {ratios.map((ratio) => (
        <button
          key={ratio.value}
          onClick={() => onChange(ratio.value)}
          disabled={disabled}
          className={`
            relative px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1
            ${selected === ratio.value 
              ? 'bg-gradient-to-r from-rose-300 to-pink-300 text-white shadow-md transform scale-105' 
              : 'text-slate-500 hover:bg-white/80'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span>{ratio.icon}</span>
          <span>{ratio.label}</span>
        </button>
      ))}
    </div>
  );
};