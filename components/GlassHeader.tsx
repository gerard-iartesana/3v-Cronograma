
import React from 'react';

interface GlassHeaderProps {
  title: string;
  underlineColor: string;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ title, underlineColor }) => {
  return (
    <div className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-gray-200 md:px-12 md:py-6">
      <div className="relative inline-block">
        <h1 className="text-2xl md:text-5xl font-bold tracking-tighter text-gray-700 mb-1">
          {title}
        </h1>
        <div
          className="h-[4px] w-full md:w-[150%] max-w-[400px]"
          style={{
            background: `linear-gradient(to right, ${underlineColor}, transparent)`,
            boxShadow: `0 4px 20px ${underlineColor}66`
          }}
        />
      </div>
    </div>
  );
};
