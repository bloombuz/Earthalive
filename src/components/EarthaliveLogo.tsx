import React from 'react';

interface EarthaliveLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto';
  showText?: boolean;
  className?: string;
}

export const EarthaliveLogo: React.FC<EarthaliveLogoProps> = ({
  size = 'md',
  variant = 'dark',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 32, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 40, text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 54, text: 'text-2xl', sub: 'text-[12px]' },
    xl: { icon: 72, text: 'text-3xl', sub: 'text-[14px]' },
  };

  const dim = sizeMap[size];
  const strokeColor = variant === 'light' ? '#FFFFFF' : '#092D26';
  const textColor = variant === 'light' ? 'text-white' : 'text-[#092D26]';
  const subColor = variant === 'light' ? 'text-emerald-100/70' : 'text-[#48635c]';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Exact vector representation of Earthalive circular tree logo from reference */}
      <svg
        width={dim.icon}
        height={dim.icon}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-300"
      >
        {/* Outer Circular arc with 'E' motif opening on right */}
        <path
          d="M 104 58 H 82"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 103 48 C 98 24 78 8 52 8 C 24 8 3 29 3 58 C 3 87 24 108 52 108 C 55 108 60 108 60 108"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 72 105 C 86 100 97 89 102 74"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Central Tree Trunk */}
        <path
          d="M 60 18 V 108"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Top pair of branches */}
        <path
          d="M 60 38 C 50 38 43 45 40 50"
          stroke={strokeColor}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M 60 38 C 70 38 77 45 80 50"
          stroke={strokeColor}
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Middle pair of branches */}
        <path
          d="M 60 56 C 45 56 34 68 30 74"
          stroke={strokeColor}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M 60 56 C 75 56 86 68 90 74"
          stroke={strokeColor}
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Bottom pair of branches */}
        <path
          d="M 60 76 C 47 76 38 88 35 94"
          stroke={strokeColor}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M 60 76 C 73 76 82 88 85 94"
          stroke={strokeColor}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-semibold tracking-[0.22em] uppercase leading-tight font-sans ${dim.text} ${textColor}`}
          >
            Earthalive
          </span>
          <span
            className={`tracking-[0.28em] font-medium uppercase leading-tight ${dim.sub} ${subColor}`}
          >
            Resort · Bangalore
          </span>
        </div>
      )}
    </div>
  );
};
