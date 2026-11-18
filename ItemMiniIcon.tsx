import React from 'react';
import { Rarity } from '../types/game';

export type MiniItemKind =
  | 'jade'
  | 'bound_jade'
  | 'gold'
  | 'stones'
  | 'comp_stones'
  | 'cultivation'
  | 'red_gear'
  | 'immortal_gear'
  | 'wing'
  | 'pet'
  | 'treasure'
  | 'artifact'
  | 'fashion'
  | 'yinyang_token'
  | 'vip'
  | 'privilege';

interface ItemMiniIconProps {
  kind: MiniItemKind;
  size?: 'xs' | 'sm' | 'md';
  colorOverride?: string;
}

export const ItemMiniIcon: React.FC<ItemMiniIconProps> = ({
  kind,
  size = 'sm',
  colorOverride,
}) => {
  const boxCls =
    size === 'xs'
      ? 'w-5 h-5 rounded'
      : size === 'md'
      ? 'w-9 h-9 rounded-lg'
      : 'w-7 h-7 rounded-md';
  const svgCls =
    size === 'xs' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-6 h-6' : 'w-4.5 h-4.5';

  const bgMap: Record<MiniItemKind, string> = {
    jade: 'border-cyan-400/65 bg-cyan-950/80',
    bound_jade: 'border-purple-400/65 bg-purple-950/80',
    gold: 'border-amber-400/65 bg-amber-950/80',
    stones: 'border-orange-400/65 bg-orange-950/80',
    comp_stones: 'border-emerald-400/65 bg-emerald-950/80',
    cultivation: 'border-rose-400/65 bg-rose-950/80',
    red_gear: 'border-red-400/80 bg-red-950/85',
    immortal_gear: 'border-yellow-300/85 bg-amber-950/85',
    wing: 'border-sky-300/75 bg-indigo-950/85',
    pet: 'border-fuchsia-400/75 bg-purple-950/85',
    treasure: 'border-amber-300/80 bg-[#1e1035]',
    artifact: 'border-amber-300/80 bg-[#270e2e]',
    fashion: 'border-pink-400/75 bg-fuchsia-950/80',
    yinyang_token: 'border-slate-200/85 bg-gradient-to-br from-slate-900 to-amber-900',
    vip: 'border-yellow-400/80 bg-red-950/80',
    privilege: 'border-amber-300/80 bg-purple-950/85',
  };

  return (
    <div
      className={`${boxCls} shrink-0 border flex items-center justify-center shadow-inner ${bgMap[kind]}`}
      style={colorOverride ? { borderColor: colorOverride } : undefined}
    >
      <svg viewBox="0 0 24 24" className={svgCls}>
        {kind === 'jade' && (
          <g>
            <polygon points="12,2 20,9 12,22 4,9" fill="#22d3ee" stroke="#cffafe" strokeWidth="1.3" />
            <polygon points="12,2 16,9 12,22 8,9" fill="#67e8f9" opacity="0.55" />
          </g>
        )}
        {kind === 'bound_jade' && (
          <g>
            <polygon points="12,2 20,9 12,22 4,9" fill="#c084fc" stroke="#f3e8ff" strokeWidth="1.3" />
            <circle cx="12" cy="10" r="2.2" fill="#fef08a" />
          </g>
        )}
        {kind === 'gold' && (
          <g>
            <path d="M3 14 Q12 20 21 14 L18 9 L6 9 Z" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.3" />
            <ellipse cx="12" cy="9" rx="5.5" ry="2.8" fill="#fde047" />
          </g>
        )}
        {kind === 'stones' && (
          <g>
            <polygon points="12,3 20,8 18,19 6,20 4,10" fill="#fb923c" stroke="#ffedd5" strokeWidth="1.3" />
            <polygon points="12,6 16,10 14,16 9,16 8,11" fill="#ef4444" />
          </g>
        )}
        {kind === 'comp_stones' && (
          <g>
            <circle cx="12" cy="12" r="8" fill="#10b981" stroke="#d1fae5" strokeWidth="1.4" />
            <ellipse cx="9.5" cy="9.5" rx="2.5" ry="1.5" fill="#ecfdf5" opacity="0.75" />
          </g>
        )}
        {kind === 'cultivation' && (
          <g>
            <circle cx="12" cy="12" r="8" fill="#e11d48" stroke="#fecdd3" strokeWidth="1.4" />
            <path d="M12 6 Q16 11 12 17 Q8 11 12 6 Z" fill="#fde047" />
          </g>
        )}
        {(kind === 'red_gear' || kind === 'immortal_gear') && (
          <g>
            <path
              d="M17 3 L20 6 L10 16 L7 13 Z"
              fill={kind === 'immortal_gear' ? '#fde047' : '#ef4444'}
              stroke="#fef9c3"
              strokeWidth="1.2"
            />
            <path d="M6 12 L12 18 M4 20 L8 16" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {kind === 'wing' && (
          <g fill="#38bdf8" stroke="#fef08a" strokeWidth="1.1">
            <path d="M12 14 Q5 5 2 8 Q5 14 4 18 Q8 17 12 15 Z" />
            <path d="M12 14 Q19 5 22 8 Q19 14 20 18 Q16 17 12 15 Z" />
            <circle cx="12" cy="15" r="2" fill="#fde047" />
          </g>
        )}
        {kind === 'pet' && (
          <g fill={colorOverride || '#f472b6'} stroke="#fef08a" strokeWidth="1.2">
            <path d="M6 10 L4 4 L10 8 Z" />
            <path d="M18 10 L20 4 L14 8 Z" />
            <circle cx="12" cy="13" r="6" />
            <circle cx="9.8" cy="12.5" r="1" fill="#1e1b4b" stroke="none" />
            <circle cx="14.2" cy="12.5" r="1" fill="#1e1b4b" stroke="none" />
          </g>
        )}
        {kind === 'treasure' && (
          <g>
            <circle cx="12" cy="12" r="8" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="1.6" />
            <path d="M12 4 A8 8 0 0 1 12 20 A4 4 0 0 1 12 12 A4 4 0 0 0 12 4 Z" fill="#f8fafc" />
            <circle cx="12" cy="8" r="1.4" fill="#0f172a" />
            <circle cx="12" cy="16" r="1.4" fill="#f8fafc" />
          </g>
        )}
        {kind === 'artifact' && (
          <g>
            <path d="M12 2 L15 7 L14 16 L12 19 L10 16 L9 7 Z" fill={colorOverride || '#fde047'} stroke="#fff" strokeWidth="1" />
            <rect x="7" y="16" width="10" height="2.2" fill="#f59e0b" />
            <rect x="11" y="18" width="2" height="4" fill="#b45309" />
          </g>
        )}
        {kind === 'fashion' && (
          <g>
            <path
              d="M8 4 L12 6 L16 4 L20 8 L17 11 L16 10 L17 20 L7 20 L8 10 L7 11 L4 8 Z"
              fill={colorOverride || '#ec4899'}
              stroke="#fef08a"
              strokeWidth="1.2"
            />
            <path d="M10 6 L12 10 L14 6" fill="none" stroke="#fef08a" strokeWidth="1.2" />
          </g>
        )}
        {kind === 'yinyang_token' && (
          <g>
            <circle cx="12" cy="12" r="9" fill="#0f172a" stroke="#fde047" strokeWidth="1.5" />
            <path d="M12 3 A9 9 0 0 1 12 21 A4.5 4.5 0 0 1 12 12 A4.5 4.5 0 0 0 12 3 Z" fill="#f8fafc" />
            <circle cx="12" cy="7.5" r="1.6" fill="#0f172a" />
            <circle cx="12" cy="16.5" r="1.6" fill="#f8fafc" />
          </g>
        )}
        {(kind === 'vip' || kind === 'privilege') && (
          <g>
            <path d="M3 18 L5 8 L9 12 L12 5 L15 12 L19 8 L21 18 Z" fill="#fbbf24" stroke="#fef9c3" strokeWidth="1.2" />
          </g>
        )}
      </svg>
    </div>
  );
};

export interface PackIconReward {
  kind: MiniItemKind;
  label: string;
  count?: string;
  rarity?: Rarity;
}

export const RewardIconChip: React.FC<PackIconReward> = ({ kind, label, count }) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/45 border border-amber-500/25 text-[11px] leading-none">
      <ItemMiniIcon kind={kind} size="xs" />
      <span className="text-amber-100/95 font-medium truncate max-w-[115px]">{label}</span>
      {count && <span className="text-amber-300 font-bold font-num shrink-0">{count}</span>}
    </div>
  );
};
