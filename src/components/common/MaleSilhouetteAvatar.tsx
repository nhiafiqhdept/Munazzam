import React from 'react';

interface MaleSilhouetteAvatarProps {
  className?: string;
}

export const MaleSilhouetteAvatar: React.FC<MaleSilhouetteAvatarProps> = ({ 
  className = "w-full h-full" 
}) => {
  return (
    <div className={`w-full h-full bg-blue-50/90 flex items-center justify-center overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-3/4 h-3/4 text-[#1e3a8a]"
        aria-hidden="true"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
};
