import React, { useEffect, useState } from 'react';
import { Sparkles, Swords, Dice5, Play, RotateCcw } from 'lucide-react';
import { CLASSES, TITLE_KEY_ART } from '../data/xianxiaData';
import { ClassId } from '../types/game';
import { useTransparentSprite } from '../utils/spriteKeying';

interface TitleScreenProps {
  hasSavedGame: boolean;
  savedSummary?: { name: string; realmName: string; power: number; vip: number };
  onStartNew: (name: string, classId: ClassId) => void;
  onContinue: () => void;
}

const RANDOM_NAMES = [
  '雲逍遙',
  '顧長生',
  '蘇婉兒',
  '林破軍',
  '墨九霄',
  '白子畫',
  '沈無雙',
  '冷寒霜',
];

const ClassFullBodyThumb: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const transparentSrc = useTransparentSprite(src);
  return (
    <img
      src={transparentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className="w-full h-full object-contain object-bottom drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]"
    />
  );
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedGame,
  savedSummary,
  onStartNew,
  onContinue,
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassId>('sword');
  const [charName, setCharName] = useState<string>('雲逍遙');
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  const activeClass = CLASSES.find((c) => c.id === selectedClass) || CLASSES[0];
  const activeFullBody = useTransparentSprite(activeClass.selectPortrait);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) {
        if (hasSavedGame) onContinue();
        else onStartNew(charName, selectedClass);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSavedGame, onContinue, onStartNew, charName, selectedClass]);

  const rollName = () => {
    const next = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setCharName(next);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0e0717] flex flex-col justify-between">
      {/* Animated Key Art Backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={TITLE_KEY_ART}
          alt="九霄仙途仙俠世界"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover animate-slow-pan opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0514] via-[#130824]/60 to-[#0b0514]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(10,4,20,0.9)_100%)]" />
      </div>

      {/* Top Bespoke SVG Title Lockup */}
      <header className="relative z-10 flex flex-col items-center pt-4 pb-1 px-4">
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 64 64"
            className="w-11 h-11 shrink-0 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sealGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="#7f1d1d" stroke="url(#sealGold)" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="22" fill="none" stroke="url(#sealGold)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M32 12 L37 28 L52 32 L37 36 L32 52 L27 36 L12 32 L27 28 Z" fill="url(#sealGold)" opacity="0.9" />
            <circle cx="32" cy="32" r="5" fill="#7f1d1d" stroke="#fef08a" strokeWidth="1.5" />
          </svg>

          <div className="text-center">
            <h1 className="font-calligraphy text-5xl sm:text-6xl tracking-[0.18em] gold-text-gradient drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)]">
              九霄仙途
            </h1>
            <p className="text-xs sm:text-sm tracking-[0.35em] text-amber-200/85 mt-0.5 font-xianxia">
              禦劍飛升 · 渡劫成聖 · 經典仙俠 MMORPG
            </p>
          </div>
        </div>
      </header>

      {/* Center Full-Body Character Selection Showcase */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Left: 4 Class Cards */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-amber-300 font-xianxia tracking-wider">
                一、選擇修仙宗門職業
              </span>
              <span className="text-xs text-purple-200/80">全身仙俠立繪</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              {CLASSES.map((cls) => {
                const isSelected = cls.id === selectedClass;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setSelectedClass(cls.id)}
                    className={`group relative text-left rounded-xl overflow-hidden transition-all duration-150 p-2 flex items-center gap-3 ${
                      isSelected
                        ? 'xianxia-panel ring-2 ring-amber-400 scale-[1.01]'
                        : 'bg-[#1a0c2e]/85 border border-amber-500/30 hover:border-amber-400/70'
                    }`}
                  >
                    <div className="relative w-14 h-20 shrink-0 rounded-lg overflow-hidden border border-amber-400/50 bg-gradient-to-b from-purple-950/90 to-[#140724] flex items-end justify-center p-0.5">
                      {!imgFailed[cls.id] ? (
                        <ClassFullBodyThumb src={cls.selectPortrait} alt={cls.name} />
                      ) : (
                        <Swords className="w-7 h-7 text-amber-300 m-auto" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-amber-200 font-xianxia truncate">
                        {cls.name}
                      </div>
                      <div className="text-xs text-rose-300 mt-0.5 truncate">
                        {cls.sectName} · {cls.weaponType}
                      </div>
                      <div className="text-[11px] text-purple-200/80 mt-0.5 truncate">
                        {cls.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: Dramatic Full-Body Character Pedestal */}
          <div className="lg:col-span-4 relative h-[340px] sm:h-[430px] flex flex-col items-center justify-end">
            {/* Glowing Xianxia Aura Behind Full-Body Character */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-2xl opacity-45 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${activeClass.primaryColor}, transparent 70%)`,
              }}
            />

            {/* Full-Body Character Art */}
            <div className="relative z-10 h-full w-full flex items-end justify-center pb-5">
              {!imgFailed[activeClass.id] ? (
                <img
                  key={activeClass.id}
                  src={activeFullBody}
                  alt={activeClass.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed((prev) => ({ ...prev, [activeClass.id]: true }))}
                  className="max-h-full max-w-full object-contain object-bottom animate-float-gentle drop-shadow-[0_14px_28px_rgba(0,0,0,0.9)]"
                />
              ) : (
                <div className="w-40 h-60 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-amber-300" />
                </div>
              )}
            </div>

            {/* Golden Bagua Pedestal Ring */}
            <div className="relative z-0 -mt-7 w-64 h-10 rounded-full border-2 border-amber-400/70 bg-gradient-to-r from-purple-950/80 via-amber-500/25 to-purple-950/80 shadow-[0_0_28px_rgba(251,191,36,0.45)] flex items-center justify-center">
              <span className="text-xs font-bold tracking-widest text-amber-200 font-xianxia">
                {activeClass.sectName} · {activeClass.name}
              </span>
            </div>
          </div>

          {/* Right: Class Details + Name Input + Primary CTA */}
          <div className="lg:col-span-4 xianxia-panel rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs text-rose-300 font-bold">
                {activeClass.sectName} · {activeClass.weaponType}
              </div>
              <h2 className="text-2xl font-bold gold-text-gradient font-xianxia">
                {activeClass.name}
              </h2>
              <p className="text-xs text-amber-100/85 leading-relaxed">
                {activeClass.description}
              </p>
            </div>

            <div className="xianxia-card rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-200 font-num">
                <span>氣血 {activeClass.baseHp.toLocaleString()}</span>
                <span>·</span>
                <span>攻擊 {activeClass.baseAtk}</span>
                <span>·</span>
                <span>防禦 {activeClass.baseDef}</span>
                <span>·</span>
                <span>暴擊 {Math.round(activeClass.critRate * 100)}%</span>
              </div>
              <div className="border-t border-amber-500/20 pt-2">
                <div className="text-[11px] text-purple-200/80 mb-1">宗門核心仙法：</div>
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-amber-300">
                  {activeClass.skills.map((s) => (
                    <span key={s.id} className="whitespace-nowrap">
                      【{s.name}】
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-amber-200/90 mb-1.5 font-medium">
                  道號命名
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    placeholder="輸入您的修仙道號"
                    className="flex-1 bg-[#11061e] border border-amber-500/50 rounded-md px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-300"
                  />
                  <button
                    type="button"
                    onClick={rollName}
                    title="隨機道號"
                    className="px-3 py-2 rounded-md xianxia-btn-purple text-xs font-medium flex items-center gap-1.5 shrink-0"
                  >
                    <Dice5 className="w-4 h-4" />
                    隨機
                  </button>
                </div>
              </div>

              {hasSavedGame && savedSummary ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={onContinue}
                    className="xianxia-btn-gold rounded-lg py-3 px-3 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    繼續（{savedSummary.name}）
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartNew(charName, selectedClass)}
                    className="xianxia-btn-crimson rounded-lg py-3 px-3 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重創角色開始
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartNew(charName, selectedClass)}
                  className="w-full xianxia-btn-crimson rounded-lg py-3.5 px-6 font-bold text-base tracking-widest flex items-center justify-center gap-2 font-xianxia"
                >
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  踏入九霄仙途
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 pb-2.5 pt-1 text-center text-xs text-amber-200/75 tracking-wide">
        WASD / 點擊移動 · 1~4 施放仙法 · 空白鍵 絕技 · 自動掛機修煉 · Esc 暫停
      </footer>
    </div>
  );
};
