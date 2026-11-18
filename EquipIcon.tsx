import React from 'react';
import { RARITY_CONFIG } from '../data/xianxiaData';
import { EquipSlot, Rarity } from '../types/game';

interface EquipIconProps {
  slot: EquipSlot;
  rarity: Rarity;
  enhanceLevel?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const EquipIcon: React.FC<EquipIconProps> = ({
  slot,
  rarity,
  enhanceLevel = 0,
  size = 'md',
}) => {
  const cfg = RARITY_CONFIG[rarity];
  const dims =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';

  return (
    <div
      className={`relative ${dims} shrink-0 rounded-lg border-2 flex items-center justify-center overflow-hidden shadow-md`}
      style={{
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        boxShadow: `0 0 14px ${cfg.color}40`,
      }}
    >
      {/* Subtle radial sheen */}
      <div
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${cfg.color}, transparent 70%)`,
        }}
      />

      <svg viewBox="0 0 48 48" className="relative z-10 w-[82%] h-[82%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
        {slot === 'weapon' && (
          <g>
            <path
              d="M36 6 L40 10 L19 31 L14 26 Z"
              fill={cfg.color}
              stroke="#fef9c3"
              strokeWidth="1.5"
            />
            <path d="M12 24 L21 33 L19 36 L9 26 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
            <path d="M13 32 L8 37 L11 40 L16 35 Z" fill="#92400e" />
            <circle cx="8.5" cy="39.5" r="2.2" fill="#fde047" />
          </g>
        )}
        {slot === 'helm' && (
          <g>
            <path
              d="M10 30 C10 17, 17 12, 24 12 C31 12, 38 17, 38 30 L35 35 L29 31 L24 34 L19 31 L13 35 Z"
              fill={cfg.color}
              stroke="#fef08a"
              strokeWidth="1.6"
            />
            <path d="M24 7 L27 14 L24 18 L21 14 Z" fill="#fde047" />
            <circle cx="24" cy="24" r="3" fill="#fef9c3" />
          </g>
        )}
        {slot === 'armor' && (
          <g>
            <path
              d="M15 11 L20 14 L28 14 L33 11 L40 18 L36 24 L33 22 L33 38 L15 38 L15 22 L12 24 L8 18 Z"
              fill={cfg.color}
              stroke="#fef08a"
              strokeWidth="1.6"
            />
            <path d="M18 22 L30 22 L28 28 L20 28 Z" fill="#fbbf24" opacity="0.9" />
            <line x1="24" y1="14" x2="24" y2="37" stroke="#fef9c3" strokeWidth="1.2" />
          </g>
        )}
        {slot === 'necklace' && (
          <g>
            <path
              d="M12 14 C12 27, 18 32, 24 32 C30 32, 36 27, 36 14"
              fill="none"
              stroke="#fde047"
              strokeWidth="2.4"
              strokeDasharray="3 1.5"
            />
            <polygon
              points="24,25 30,32 24,41 18,32"
              fill={cfg.color}
              stroke="#fef9c3"
              strokeWidth="1.5"
            />
            <circle cx="24" cy="33" r="2.2" fill="#ffffff" />
          </g>
        )}
        {slot === 'ring' && (
          <g>
            <ellipse
              cx="24"
              cy="27"
              rx="11"
              ry="9"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="4.2"
            />
            <ellipse
              cx="24"
              cy="27"
              rx="11"
              ry="9"
              fill="none"
              stroke="#fef08a"
              strokeWidth="1"
            />
            <polygon
              points="24,10 30,16 24,21 18,16"
              fill={cfg.color}
              stroke="#ffffff"
              strokeWidth="1.4"
            />
          </g>
        )}
        {slot === 'boots' && (
          <g>
            <path
              d="M15 12 L25 12 L25 28 L37 31 L37 37 L13 37 L13 24 Z"
              fill={cfg.color}
              stroke="#fef08a"
              strokeWidth="1.6"
            />
            <path d="M12 20 Q7 17 9 13 Q13 15 15 18" fill="#fef9c3" />
            <rect x="13" y="34" width="24" height="3.5" fill="#fbbf24" />
          </g>
        )}
      </svg>

      {enhanceLevel > 0 && (
        <span className="absolute top-0.5 right-0.5 z-20 px-1 rounded bg-black/80 border border-amber-400/60 text-[9px] font-bold text-amber-300 font-num leading-tight">
          +{enhanceLevel}
        </span>
      )}
    </div>
  );
};
