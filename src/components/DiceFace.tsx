import React from 'react';

interface DiceFaceProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  onClick?: () => void;
}

export default function DiceFace({ value, size = 'md', active = false, onClick }: DiceFaceProps) {
  // Determine size classes
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-md p-1 border text-[6px]',
    md: 'w-12 h-12 rounded-xl p-1.5 border-2 text-[8px]',
    lg: 'w-16 h-16 rounded-2xl p-2.5 border-2 text-[10px]',
  };

  const containerStyle = `
    relative flex flex-col justify-between bg-white border-slate-300 shadow-xs text-slate-800 font-sans cursor-pointer select-none transition-all duration-200
    ${sizeClasses[size]}
    ${active ? 'ring-3 ring-amber-500 scale-105 border-amber-500 bg-amber-50/50' : 'hover:border-slate-400 hover:scale-[1.03] active:scale-95'}
  `;

  // Dot positions
  // Render grid style or custom absolute positioning
  const renderDots = () => {
    switch (value) {
      case 1:
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
          </div>
        );
      case 2:
        return (
          <div className="absolute inset-0 p-[15%] flex flex-col justify-between">
            <div className="flex justify-end">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-start">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="absolute inset-0 p-[15%] flex flex-col justify-between">
            <div className="flex justify-end">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-center -my-1">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-start">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="absolute inset-0 p-[15%] flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-between">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="absolute inset-0 p-[15%] flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-center">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-between">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="absolute inset-0 p-[15%] flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-between">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
            <div className="flex justify-between">
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
              <div className="w-[22%] h-[22%] rounded-full bg-slate-800" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={containerStyle} onClick={onClick}>
      {renderDots()}
    </div>
  );
}
