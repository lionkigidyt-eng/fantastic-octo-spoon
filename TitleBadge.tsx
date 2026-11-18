import React from 'react';
import { TITLE_CATALOG } from '../data/xianxiaData';
import { TitleDef } from '../types/game';

interface TitleBadgeProps {
  title?: TitleDef;
  titleId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 'h-7 px-3 min-w-[104px]', text: 'text-[11px]', wing: 'w-4 h-5', gem: 'w-2 h-2' },
  md: { box: 'h-9 px-4 min-w-[136px]', text: 'text-xs', wing: 'w-5 h-6', gem: 'w-2.5 h-2.5' },
  lg: { box: 'h-12 px-6 min-w-[178px]', text: 'text-sm sm:text-base', wing: 'w-7 h-8', gem: 'w-3 h-3' },
};

export const TitleBadge: React.FC<TitleBadgeProps> = ({
  title,
  titleId,
  size = 'md',
  className = '',
}) => {
  const def =
    title ||
    TITLE_CATALOG.find((t) => t.id === titleId || t.name === titleId) ||
    TITLE_CATALOG[0];
  const s = SIZE_MAP[size];

  const isImperial = def.crestStyle === 'imperial' || def.crestStyle === 'phoenix';
  const isFlame = def.crestStyle === 'flame';
  const isStar = def.crestStyle === 'star';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${s.box} ${className}`}
      style={{
        filter: `drop-shadow(0 2px 6px ${def.primaryColor}66)`,
      }}
    >
      {/* Left Wing / Flame Crest SVG */}
      <svg
        viewBox="0 0 28 32"
        className={`${s.wing} -mr-1.5 shrink-0`}
        aria-hidden="true"
      >
        {isStar ? (
          <path
            d="M26 8 L10 3 L2 14 L10 18 L4 26 L26 24 Z"
            fill={def.primaryColor}
            stroke={def.secondaryColor}
            strokeWidth="1.5"
          />
        ) : isFlame ? (
          <path
            d="M26 24 Q10 26 2 16 Q12 14 6 6 Q18 10 26 6 Z"
            fill={def.primaryColor}
            stroke="#fef08a"
            strokeWidth="1.4"
          />
        ) : (
          <>
            <path
              d="M26 10 Q12 1 2 6 Q8 14 4 21 Q14 25 26 22 Z"
              fill={def.primaryColor}
              stroke="#fef08a"
              strokeWidth="1.4"
            />
            <path
              d="M24 14 Q14 11 8 15 Q14 19 24 19 Z"
              fill={def.secondaryColor}
              opacity="0.85"
            />
          </>
        )}
      </svg>

      {/* Ornate Core Banner Plate */}
      <div
        className="relative flex items-center justify-center px-2.5 py-0.5 rounded-md border overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${def.secondaryColor}f2 0%, #140724f5 55%, ${def.primaryColor}88 100%)`,
          borderColor: def.primaryColor,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.38), 0 0 10px ${def.primaryColor}55`,
        }}
      >
        {/* Top Jewel Crown Highlight */}
        {isImperial && (
          <span
            className="absolute -top-1 left-1/2 -translate-x-1/2 rotate-45 border border-yellow-100"
            style={{
              width: size === 'sm' ? 6 : 8,
              height: size === 'sm' ? 6 : 8,
              backgroundColor: '#fef08a',
            }}
          />
        )}
        {/* Shimmer Gloss */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, transparent 100%)',
          }}
        />
        <span
          className={`relative z-10 font-bold tracking-wider font-xianxia whitespace-nowrap ${s.text}`}
          style={{
            color: def.textColor,
            textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.75)',
          }}
        >
          {def.name}
        </span>
      </div>

      {/* Right Wing / Flame Crest SVG */}
      <svg
        viewBox="0 0 28 32"
        className={`${s.wing} -ml-1.5 shrink-0 scale-x-[-1]`}
        aria-hidden="true"
      >
        {isStar ? (
          <path
            d="M26 8 L10 3 L2 14 L10 18 L4 26 L26 24 Z"
            fill={def.primaryColor}
            stroke={def.secondaryColor}
            strokeWidth="1.5"
          />
        ) : isFlame ? (
          <path
            d="M26 24 Q10 26 2 16 Q12 14 6 6 Q18 10 26 6 Z"
            fill={def.primaryColor}
            stroke="#fef08a"
            strokeWidth="1.4"
          />
        ) : (
          <>
            <path
              d="M26 10 Q12 1 2 6 Q8 14 4 21 Q14 25 26 22 Z"
              fill={def.primaryColor}
              stroke="#fef08a"
              strokeWidth="1.4"
            />
            <path
              d="M24 14 Q14 11 8 15 Q14 19 24 19 Z"
              fill={def.secondaryColor}
              opacity="0.85"
            />
          </>
        )}
      </svg>
    </div>
  );
};
