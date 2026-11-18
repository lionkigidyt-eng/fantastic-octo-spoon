import React from 'react';

export interface TribulationEvent {
  id: number;
  realmName: string;
  layer: number;
  tribulationName: string;
  isMajorRealm: boolean;
}

interface TribulationOverlayProps {
  event: TribulationEvent | null;
}

const BOLTS = [
  { left: '14%', delay: '0ms', width: 90, color: '#a855f7' },
  { left: '30%', delay: '120ms', width: 110, color: '#fde047' },
  { left: '50%', delay: '40ms', width: 150, color: '#ffffff' },
  { left: '68%', delay: '190ms', width: 115, color: '#c084fc' },
  { left: '84%', delay: '85ms', width: 95, color: '#38bdf8' },
  { left: '41%', delay: '320ms', width: 130, color: '#fde047' },
  { left: '59%', delay: '390ms', width: 120, color: '#e879f9' },
];

export const TribulationOverlay: React.FC<TribulationOverlayProps> = ({ event }) => {
  if (!event) return null;

  return (
    <div
      key={event.id}
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden animate-tribulation-shake"
    >
      {/* 1. Storm darkening & blinding lightning sky flash */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a021c]/90 via-[#1f073d]/65 to-transparent animate-tribulation-flash" />
      <div
        className="absolute inset-0 animate-tribulation-flash"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(254, 240, 138, 0.72) 0%, rgba(168, 85, 247, 0.4) 38%, rgba(10, 2, 24, 0.88) 80%)',
        }}
      />

      {/* 2. Rotating Daoist Thunder Vortex in the sky */}
      <svg
        viewBox="0 0 400 400"
        className="absolute left-1/2 top-[45%] w-[640px] h-[640px] animate-vortex-spin"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="vortexGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#9333ea" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="190" fill="url(#vortexGrad)" />
        <circle cx="200" cy="200" r="160" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="14 10" />
        <circle cx="200" cy="200" r="120" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="6 8" />
        <polygon
          points="200,32 345,284 55,284"
          fill="none"
          stroke="#fde047"
          strokeWidth="2"
          opacity="0.7"
        />
        <polygon
          points="200,368 55,116 345,116"
          fill="none"
          stroke="#e879f9"
          strokeWidth="2"
          opacity="0.7"
        />
      </svg>

      {/* 3. Jagged Heavenly Lightning Bolts */}
      {BOLTS.map((b, i) => (
        <svg
          key={i}
          viewBox="0 0 120 720"
          preserveAspectRatio="none"
          className="absolute top-0 h-[85vh] -translate-x-1/2 animate-tribulation-bolt"
          style={{
            left: b.left,
            width: `${b.width}px`,
            animationDelay: b.delay,
            filter: `drop-shadow(0 0 18px ${b.color}) drop-shadow(0 0 38px #ffffff)`,
          }}
          aria-hidden="true"
        >
          <polyline
            points="60,0 38,110 78,195 30,310 86,415 44,540 65,690"
            fill="none"
            stroke={b.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <polyline
            points="60,0 38,110 78,195 30,310 86,415 44,540 65,690"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Branching Fork */}
          <polyline
            points="78,195 108,270 92,340"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            opacity="0.8"
          />
          <polyline
            points="30,310 8,390 22,465"
            fill="none"
            stroke={b.color}
            strokeWidth="3"
            opacity="0.75"
          />
        </svg>
      ))}

      {/* 4. Expanding Shockwave Rings */}
      <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-4 border-amber-300 shadow-[0_0_50px_rgba(253,224,71,0.9)] animate-tribulation-shockwave" />
      <div
        className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full border-4 border-purple-400 shadow-[0_0_40px_rgba(192,132,252,0.9)] animate-tribulation-shockwave"
        style={{ animationDelay: '180ms' }}
      />

      {/* 5. Center Calligraphy Tribulation Proclamation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 animate-tribulation-banner">
        <div className="px-10 py-6 rounded-2xl bg-gradient-to-b from-[#2b0945]/90 via-[#450a0a]/90 to-[#140622]/90 border-2 border-amber-300 shadow-[0_0_60px_rgba(250,204,21,0.65)] text-center space-y-2">
          <div className="text-xs sm:text-sm tracking-[0.45em] text-purple-200 font-bold">
            九霄神雷降世 · {event.tribulationName}
          </div>
          <h2 className="font-calligraphy text-4xl sm:text-6xl gold-text-gradient drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)]">
            {event.isMajorRealm ? `飛升晉入【${event.realmName}】` : `突破【${event.realmName} ${event.layer}層】`}
          </h2>
          <div className="text-xs sm:text-sm text-amber-200 font-bold tracking-widest">
            天劫洗髓 · 氣血神威暴漲 · 傲視三界！
          </div>
        </div>
      </div>
    </div>
  );
};
