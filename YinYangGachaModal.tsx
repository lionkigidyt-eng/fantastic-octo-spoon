import React, { useState } from 'react';
import { Crown, Flame, Gift, Sparkles, X, Zap } from 'lucide-react';
import {
  FASHION_CATALOG,
  LIMITED_SKINS,
  RARITY_CONFIG,
  YINYANG_GACHA_POOL,
  YINYANG_MILESTONES,
} from '../../data/xianxiaData';
import { PlayerState } from '../../types/game';
import { formatNum } from '../../utils/gameLogic';
import { EquipIcon } from '../EquipIcon';
import { ItemMiniIcon, MiniItemKind, RewardIconChip } from '../ItemMiniIcon';
import { RewardEntry } from './PurchaseRewardModal';

interface YinYangGachaModalProps {
  player: PlayerState;
  onClose: () => void;
  onPull: (count: 1 | 10) => RewardEntry[] | null;
  onClaimMilestone: (pullsReq: number) => void;
  onBuyTokens: (qty: number, jadeCost: number) => void;
  onOpenFashionTab: () => void;
}

const mapPoolKind = (type: (typeof YINYANG_GACHA_POOL)[number]['type'], refId?: string): MiniItemKind => {
  if (type === 'fashion') return 'fashion';
  if (type === 'limited_skin') {
    const sk = LIMITED_SKINS.find((s) => s.id === refId);
    if (sk?.category === 'pet') return 'pet';
    if (sk?.category === 'treasure') return 'treasure';
    return 'artifact';
  }
  if (type === 'immortal_gear') return 'immortal_gear';
  if (type === 'red_gear') return 'red_gear';
  if (type === 'jade') return 'jade';
  if (type === 'comp_stones') return 'comp_stones';
  if (type === 'cultivation') return 'cultivation';
  return 'stones';
};

export const YinYangGachaModal: React.FC<YinYangGachaModalProps> = ({
  player,
  onClose,
  onPull,
  onClaimMilestone,
  onBuyTokens,
  onOpenFashionTab,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [pullResults, setPullResults] = useState<RewardEntry[] | null>(null);

  const pityRemains = Math.max(1, 50 - player.yinyangPity);
  const pityPct = Math.min(100, Math.round((player.yinyangPity / 50) * 100));

  const featuredFashions = FASHION_CATALOG.filter((f) => f.theme === 'yinyang');
  const featuredSkins = LIMITED_SKINS;

  const handleTriggerPull = (count: 1 | 10) => {
    if (spinning) return;
    const res = onPull(count);
    if (!res) return;
    setSpinning(true);
    setTimeout(() => {
      setSpinning(false);
      setPullResults(res);
    }, 480);
  };

  const singleCostText = player.yinyangTokens >= 1 ? '消耗 1 陰陽令' : '消耗 160 仙玉';
  const tenCostText = player.yinyangTokens >= 10 ? '消耗 10 陰陽令' : '消耗 1,480 仙玉';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="xianxia-panel relative w-full max-w-5xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden border-2 border-amber-400/70">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-amber-500/40 bg-gradient-to-r from-[#0f172a] via-[#3b0764] to-[#450a0a]">
          <div className="flex items-center gap-3">
            <ItemMiniIcon kind="yinyang_token" size="sm" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold gold-text-gradient font-xianxia">
                陰陽乾坤轉盤 · 主題限定抽獎
              </h2>
              <p className="text-[11px] text-amber-200/80">
                限定時裝 · 太極靈寵 · 陰陽法器 — 50抽必出陰陽神品限定！
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-amber-400/40 text-xs font-num">
              <ItemMiniIcon kind="yinyang_token" size="xs" />
              <span className="text-slate-200">陰陽令</span>
              <strong className="text-amber-300">{player.yinyangTokens}</strong>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-cyan-400/40 text-xs font-num">
              <ItemMiniIcon kind="jade" size="xs" />
              <strong className="text-cyan-200">{formatNum(player.jade)}</strong>
            </div>
            <button
              type="button"
              onClick={onOpenFashionTab}
              className="px-2.5 py-1.5 rounded-md xianxia-btn-purple text-xs font-bold"
            >
              查看時裝圖鑑
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md bg-red-950/80 border border-amber-400/50 text-amber-200 hover:bg-red-800"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Interactive Taiji Gacha Altar & Pull Actions */}
            <div className="lg:col-span-5 xianxia-card rounded-2xl p-5 flex flex-col items-center justify-between gap-4 bg-gradient-to-b from-[#0f172a]/95 via-[#1e0b36]/95 to-[#2c0918]/95">
              <div className="w-full flex items-center justify-between text-xs font-num">
                <span className="text-cyan-300 font-bold">累計抽獎：{player.yinyangTotalPulls} 次</span>
                <span className="text-amber-300 font-bold">保底倒數：{pityRemains} 抽</span>
              </div>

              {/* Rotating Taiji Bagua Wheel */}
              <div className="relative w-52 h-52 flex items-center justify-center my-1">
                <div
                  className={`absolute inset-0 rounded-full border-2 border-dashed border-amber-400/60 transition-transform ${
                    spinning ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: spinning ? '0.45s' : '16s' }}
                />
                <svg
                  viewBox="0 0 160 160"
                  className={`w-44 h-44 drop-shadow-[0_0_24px_rgba(251,191,36,0.45)] ${
                    spinning ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: spinning ? '0.35s' : undefined }}
                >
                  <circle cx="80" cy="80" r="74" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                  <circle cx="80" cy="80" r="64" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="6 4" />
                  {/* Taiji Circle */}
                  <circle cx="80" cy="80" r="52" fill="#0f172a" stroke="#fde047" strokeWidth="2.5" />
                  <path
                    d="M80 28 A52 52 0 0 1 80 132 A26 26 0 0 1 80 80 A26 26 0 0 0 80 28 Z"
                    fill="#f8fafc"
                  />
                  <circle cx="80" cy="54" r="8.5" fill="#0f172a" />
                  <circle cx="80" cy="106" r="8.5" fill="#f8fafc" />
                </svg>
                <div className="absolute -bottom-1 px-3 py-0.5 rounded-full bg-black/85 border border-amber-400/70 text-[11px] font-bold text-amber-300">
                  陰陽兩儀 · 乾坤顯聖
                </div>
              </div>

              {/* Pity Progress Bar */}
              <div className="w-full space-y-1.5">
                <div className="flex justify-between text-[11px] text-amber-100/85 font-num">
                  <span>陰陽神品保底進度</span>
                  <span>{player.yinyangPity} / 50</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-black/75 border border-amber-500/45 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-slate-200 via-amber-400 to-rose-500 transition-all"
                    style={{ width: `${pityPct}%` }}
                  />
                </div>
              </div>

              {/* Pull Buttons */}
              <div className="w-full grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => handleTriggerPull(1)}
                  className="py-3 px-2 rounded-xl xianxia-btn-purple flex flex-col items-center gap-0.5 disabled:opacity-50"
                >
                  <span className="text-sm font-bold font-xianxia">單抽天機</span>
                  <span className="text-[11px] text-amber-200 font-num">{singleCostText}</span>
                </button>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => handleTriggerPull(10)}
                  className="py-3 px-2 rounded-xl xianxia-btn-gold flex flex-col items-center gap-0.5 disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.45)]"
                >
                  <span className="text-sm font-bold font-xianxia">十連乾坤 (92折)</span>
                  <span className="text-[11px] font-num">{tenCostText}</span>
                </button>
              </div>

              {/* Quick Token Topup */}
              <div className="w-full flex items-center justify-between gap-2 pt-1 border-t border-amber-500/25">
                <span className="text-[11px] text-purple-200/80">急需抽獎令？</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onBuyTokens(1, 150)}
                    className="px-2.5 py-1 rounded bg-black/50 border border-amber-400/40 text-[11px] text-amber-200 hover:border-amber-300 font-num"
                  >
                    150仙玉買1令
                  </button>
                  <button
                    type="button"
                    onClick={() => onBuyTokens(5, 680)}
                    className="px-2.5 py-1 rounded xianxia-btn-crimson text-[11px] font-bold font-num"
                  >
                    680仙玉買5令
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Headline Limited Fashions, Pets, Artifacts & Milestones */}
            <div className="lg:col-span-7 space-y-4">
              {/* Featured Theme Rewards */}
              <div className="xianxia-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300 font-xianxia flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-yellow-300" />
                    本期陰陽主題限定大獎（抽到重複自動返還 600 仙玉 + 40 進階丹）
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {featuredFashions.map((f) => {
                    const owned = player.unlockedFashions.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        className="rounded-lg p-2.5 bg-black/45 border flex items-center gap-2.5"
                        style={{ borderColor: RARITY_CONFIG[f.rarity].border }}
                      >
                        <ItemMiniIcon kind="fashion" size="md" colorOverride={f.primaryColor} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate" style={{ color: RARITY_CONFIG[f.rarity].color }}>
                              {f.name}
                            </span>
                            <span className={`text-[10px] px-1.5 rounded ${owned ? 'bg-emerald-900/80 text-emerald-300' : 'bg-amber-900/70 text-amber-200'}`}>
                              {owned ? '已擁有' : '限定時裝'}
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-100/75 font-num mt-0.5">
                            攻+{f.atkBonus} · 血+{f.hpBonus} · 暴+{Math.round(f.critBonus * 100)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {featuredSkins.map((sk) => {
                    const owned = player.unlockedLimitedSkins.includes(sk.id);
                    const kind: MiniItemKind =
                      sk.category === 'pet' ? 'pet' : sk.category === 'treasure' ? 'treasure' : 'artifact';
                    const typeTag =
                      sk.category === 'pet' ? '限定靈寵' : '限定法器';
                    return (
                      <div
                        key={sk.id}
                        className="rounded-lg p-2.5 bg-black/45 border flex items-center gap-2.5"
                        style={{ borderColor: RARITY_CONFIG[sk.rarity].border }}
                      >
                        <ItemMiniIcon kind={kind} size="md" colorOverride={sk.primaryColor} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate" style={{ color: RARITY_CONFIG[sk.rarity].color }}>
                              {sk.name}
                            </span>
                            <span className={`text-[10px] px-1.5 rounded ${owned ? 'bg-emerald-900/80 text-emerald-300' : 'bg-purple-900/75 text-purple-200'}`}>
                              {owned ? '已擁有' : typeTag}
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-100/75 font-num mt-0.5">
                            攻+{sk.atkBonus} · 血+{sk.hpBonus} · {sk.subtitle}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cumulative Pull Milestones */}
              <div className="xianxia-card rounded-xl p-4 space-y-2.5">
                <h3 className="text-sm font-bold text-cyan-300 font-xianxia flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-300" />
                  陰陽累抽階段豪禮
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {YINYANG_MILESTONES.map((ms) => {
                    const ok = player.yinyangTotalPulls >= ms.pulls;
                    const claimed = player.yinyangMilestonesClaimed.includes(ms.pulls);
                    return (
                      <div
                        key={ms.pulls}
                        className="rounded-lg bg-black/40 border border-amber-500/25 p-2.5 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-200">{ms.label}</span>
                          <span className="font-num text-[11px] text-cyan-300">
                            {Math.min(player.yinyangTotalPulls, ms.pulls)}/{ms.pulls}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <RewardIconChip kind="jade" label="仙玉" count={`×${ms.jade}`} />
                          <RewardIconChip kind="yinyang_token" label="陰陽令" count={`×${ms.tokens}`} />
                          <RewardIconChip kind="comp_stones" label="進階丹" count={`×${ms.compStones}`} />
                        </div>
                        <button
                          type="button"
                          disabled={!ok || claimed}
                          onClick={() => onClaimMilestone(ms.pulls)}
                          className="w-full py-1.5 rounded xianxia-btn-gold text-xs font-bold disabled:opacity-45"
                        >
                          {claimed ? '已領取' : ok ? '立即領取累抽獎勵' : '抽數未達成'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full Gacha Pool Preview with Icons */}
              <div className="xianxia-card rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  獎池內容一覽（皆含實物小圖標標示）
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {YINYANG_GACHA_POOL.map((entry) => (
                    <div
                      key={entry.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/45 border text-[11px]"
                      style={{ borderColor: RARITY_CONFIG[entry.rarity].border }}
                    >
                      <ItemMiniIcon kind={mapPoolKind(entry.type, entry.refId)} size="xs" />
                      <span style={{ color: RARITY_CONFIG[entry.rarity].color }} className="font-bold">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pull Result Overlay */}
        {pullResults && (
          <div className="absolute inset-0 z-30 bg-black/88 flex items-center justify-center p-4">
            <div className="xianxia-panel w-full max-w-2xl rounded-2xl p-5 space-y-4 border-2 border-amber-300 shadow-[0_0_55px_rgba(251,191,36,0.5)]">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-amber-400/60 text-xs font-bold text-amber-300">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  陰陽乾坤顯聖 · 抽獎結算
                </div>
                <h3 className="text-2xl font-bold gold-text-gradient font-xianxia">
                  恭喜道友獲得以下乾坤寶物
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-[48vh] overflow-y-auto p-1">
                {pullResults.map((rw, idx) => (
                  <div
                    key={`${rw.label}_${idx}`}
                    className={`rounded-xl p-2.5 flex flex-col items-center text-center gap-1.5 border ${
                      rw.highlight
                        ? 'bg-gradient-to-b from-amber-950/90 via-purple-950/90 to-black border-yellow-300 ring-2 ring-amber-400/70'
                        : 'bg-black/60 border-amber-500/35'
                    }`}
                  >
                    {rw.kind === 'gear' && rw.gear ? (
                      <EquipIcon slot={rw.gear.slot} rarity={rw.gear.rarity} size="md" />
                    ) : (
                      <ItemMiniIcon kind={rw.kind === 'gear' ? 'red_gear' : rw.kind} size="md" />
                    )}
                    <div className="text-[11px] font-bold text-amber-100 leading-tight line-clamp-2">
                      {rw.label}
                    </div>
                    <div className="text-[10px] font-bold text-amber-300 font-num">
                      {rw.amountText}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPullResults(null)}
                  className="flex-1 py-2.5 rounded-xl xianxia-btn-purple text-xs font-bold"
                >
                  確認收下
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPullResults(null);
                    handleTriggerPull(pullResults.length > 1 ? 10 : 1);
                  }}
                  className="flex-1 py-2.5 rounded-xl xianxia-btn-gold text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  再抽 {pullResults.length > 1 ? '十連' : '一次'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
