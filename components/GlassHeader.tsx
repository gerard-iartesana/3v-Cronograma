
import React from 'react';

interface GlassHeaderProps {
  title: string;
  underlineColor: string;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ title, underlineColor }) => {
  return (
    <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl px-6 py-4 border-b border-neutral-800 md:px-12 md:py-6">
      <div className="relative inline-flex items-center gap-3">
        <h1 className="text-2xl md:text-5xl font-bold tracking-tighter text-white mb-1">
          {title}
        </h1>
        <img src="/v-arrow.jpg" alt="Arrow" className="h-2.5 md:h-5 w-auto object-contain mt-1" />
      </div>
    </div>
  );
};
