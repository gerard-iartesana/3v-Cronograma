
import React from 'react';

interface GlassHeaderProps {
  title: string;
  underlineColor: string;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ title, underlineColor }) => {
  return (
    <div className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-gray-200 md:px-12 md:py-6">
      <div className="relative inline-flex items-center gap-3">
        <h1 className="text-2xl md:text-5xl font-bold tracking-tighter text-[#111] mb-1">
          {title}
        </h1>
        <img src="/logo-symbol.png" alt="3V Symbol" className="h-6 md:h-10 w-auto object-contain mt-1" />
      </div>
    </div>
  );
};
