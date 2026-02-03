
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface GlassHeaderProps {
  title: string;
  underlineColor: string;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ title, underlineColor }) => {
  return (
    <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-xl px-6 py-4 md:px-12 md:py-6 border-b border-gray-100">
      <div className="relative inline-flex items-center gap-3">
        <h1 className="text-2xl md:text-5xl font-bold tracking-tighter text-gray-900 mb-1">
          {title}
        </h1>
        <ChevronDown className="text-gray-200 mt-1 md:mt-2" size={28} strokeWidth={3} />
      </div>
    </div>
  );
};
