import React from 'react';

interface MaleSilhouetteAvatarProps {
  className?: string;
  iconClassName?: string;
}

export const MaleSilhouetteAvatar: React.FC<MaleSilhouetteAvatarProps> = ({ 
  className = "w-full h-full",
  iconClassName = "w-[72%] h-[72%] text-[#0f1f4b]"
}) => {
  return (
    <div className={`w-full h-full bg-gradient-to-b from-blue-50 via-slate-100 to-indigo-100/70 flex items-center justify-center overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={iconClassName}
        aria-hidden="true"
      >
        {/* Plain neutral head without facial features */}
        <circle cx="12" cy="8" r="4.2" />
        {/* Neutral masculine shoulders & bust */}
        <path d="M4.5 20.5c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5v0.5h-15v-0.5z" />
      </svg>
    </div>
  );
};
