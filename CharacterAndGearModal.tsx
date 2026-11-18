import React, { useState } from 'react';
import {
  Sparkles,
  Swords,
  Shield,
  Package,
  Flame,
  ArrowUpCircle,
  X,
  Zap,
  Wind,
  Award,
} from 'lucide-react';
import {
  COMPANION_SYSTEMS,
  EQUIP_SLOT_LABELS,
  FASHION_CATALOG,
  LIMITED_SKINS,
  RARITY_CONFIG,
  REALMS,
  TITLE_CATALOG,
} from '../../data/xianxiaData';
import {
  CompanionCategory,
  EquipSlot,
  ModalTab,
  PlayerState,
  RechargeSubTab,
} from '../../types/game';
import { computePlayerStats, formatNum, getItemPower } from '../../utils/gameLogic';
import { EquipIcon } from '../EquipIcon';
import { ItemMiniIcon } from '../ItemMiniIcon';
import { TitleBadge } from '../TitleBadge';

const CompanionVisualEmblem: React.FC<{ category: CompanionCategory; color: string; tier: number }> = ({
  category,
  color,
  tier,
}) => {
  return (
    <div
      className="relative w-24 h-24 shrink-0 rounded-xl border border-amber-400/50 bg-gradient-to-b from-[#230e3d] to-[#10051c] flex items-center justify-center overflow-hidden shadow-inner"
      style={{ boxShadow: `0 0 22px ${color}33` }}
    >
      <svg viewBox="0 0 80 80" className="w-20 h-20 drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]">
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.65" />
        {category === 'pet' && (
          <g fill={color} stroke="#fef08a" strokeWidth="1.5">
            <path d="M22 30 L18 14 L32 24 Z" />
            <path d="M58 30 L62 14 L48 24 Z" />
            <circle cx="40" cy="42" r="16" />
            <path d="M24 46 Q10 38 14 26 Q22 32 27 40 Z" opacity="0.85" />
            <path d="M56 46 Q70 38 66 26 Q58 32 53 40 Z" opacity="0.85" />
            <circle cx="34" cy="40" r="2.2" fill="#1e1b4b" stroke="none" />
            <circle cx="46" cy="40" r="2.2" fill="#1e1b4b" stroke="none" />
          </g>
        )}
        {category === 'mount' && (
          <g fill={color} stroke="#fef08a" strokeWidth="1.5">
            <path d="M16 54 Q26 36 40 38 Q56 40 66 24 Q60 44 48 52 Q32 60 16 54 Z" />
            <path d="M22 46 Q14 30 24 22 Q30 32 34 40 Z" opacity="0.85" />
            <circle cx="52" cy="34" r="3" fill="#fff" stroke="none" />
          </g>
        )}
        {category === 'wing' && (
          <g fill={color} stroke="#fef08a" strokeWidth="1.3">
            <path d="M38 42 Q20 14 8 22 Q16 36 10 48 Q24 48 36 46 Z" />
            <path d="M42 42 Q60 14 72 22 Q64 36 70 48 Q56 48 44 46 Z" />
            <circle cx="40" cy="44" r="5" fill="#fef08a" />
          </g>
        )}
        {category === 'treasure' && (
          <g fill="none" stroke={color} strokeWidth="2.2">
            <circle cx="40" cy="40" r="20" fill={`${color}33`} />
            <polygon points="40,14 58,28 58,52 40,66 22,52 22,28" stroke="#fef08a" strokeWidth="1.4" />
            <path d="M40 24 A8 8 0 0 1 40 40 A8 8 0 0 0 40 56 A16 16 0 0 0 40 24 Z" fill={color} stroke="none" />
            <circle cx="40" cy="32" r="2.5" fill="#140724" stroke="none" />
            <circle cx="40" cy="48" r="2.5" fill="#fef08a" stroke="none" />
          </g>
        )}
        {category === 'artifact' && (
          <g stroke="#fef08a" strokeWidth="1.5">
            <path d="M40 10 L47 26 L44 54 L40 62 L36 54 L33 26 Z" fill={color} />
            <path d="M28 50 L52 50 L49 55 L31 55 Z" fill="#fbbf24" />
            <rect x="38" y="55" width="4" height="12" fill="#b45309" />
            <circle cx="40" cy="34" r="4" fill="#fef08a" />
          </g>
        )}
      </svg>
      <span className="absolute bottom-1 right-1.5 text-[10px] font-bold font-num text-amber-300 bg-black/70 px-1 rounded">
        {tier}階
      </span>
    </div>
  );
};

interface CharacterAndGearModalProps {
  player: PlayerState;
  activeTab: Extract<ModalTab, 'character' | 'titles' | 'equipment' | 'bag' | 'companions' | 'fashion'>;
  onSwitchTab: (tab: Extract<ModalTab, 'character' | 'titles' | 'equipment' | 'bag' | 'companions' | 'fashion'>) => void;
  onClose: () => void;
  onBreakthrough: () => void;
  onMeditate: () => void;
  onEnhanceSlot: (slot: EquipSlot) => void;
  onEnhanceAll: () => void;
  onAutoEquipBest: () => void;
  onEquipFromBag: (uid: string) => void;
  onSmeltBag: (onlyLowRarity: boolean) => void;
  onUpgradeCompanion: (cat: CompanionCategory, times?: number) => void;
  onUnlockOrEquipFashion: (fashionId: string) => void;
  onEquipLimitedSkin: (category: 'pet' | 'treasure' | 'artifact', skinId: string | null) => void;
  onOpenYinyangGacha: () => void;
  onEquipTitle: (titleId: string) => void;
  onJumpToActivity: (tab: ModalTab, rechargeTab?: RechargeSubTab) => void;
}

export const CharacterAndGearModal: React.FC<CharacterAndGearModalProps> = ({
  player,
  activeTab,
  onSwitchTab,
  onClose,
  onBreakthrough,
  onMeditate,
  onEnhanceSlot,
  onEnhanceAll,
  onAutoEquipBest,
  onEquipFromBag,
  onSmeltBag,
  onUpgradeCompanion,
  onUnlockOrEquipFashion,
  onEquipLimitedSkin,
  onOpenYinyangGacha,
  onEquipTitle,
  onJumpToActivity,
}) => {
  const [compCat, setCompCat] = useState<CompanionCategory>('pet');
  const stats = computePlayerStats(player);
  const realm = REALMS[player.realmIndex] || REALMS[0];
  const nextRealm = REALMS[player.realmIndex + 1];
  const reqCult = realm.expPerLayer * player.realmLayer;
  const canBreak =
    player.cultivation >= reqCult &&
    (player.realmIndex < REALMS.length - 1 || player.realmLayer < realm.maxLayer);

  const compSys = COMPANION_SYSTEMS[compCat];
  const compState = player.companions[compCat];
  const curCompTier = compSys.tiers[compState.tier - 1] || compSys.tiers[0];
  const nextCompTier = compSys.tiers[compState.tier] || null;
  const upgradeStoneCost = compState.tier * 3 + Math.floor(compState.level / 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="xianxia-panel w-full max-w-4xl max-h-[88vh] rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/40 bg-gradient-to-r from-[#2e1065]/90 via-[#4c1d95]/85 to-[#7f1d1d]/85">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-bold gold-text-gradient font-xianxia">
              仙途修煉 · 裝備與神獸系統
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md bg-red-950/80 border border-amber-400/50 text-amber-200 hover:bg-red-800"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#140724] border-b border-amber-500/30 overflow-x-auto">
          {[
            { id: 'character' as const, label: '角色境界', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'titles' as const, label: `修仙稱號 (${(player.unlockedTitles || ['title_walker']).length}/${TITLE_CATALOG.length})`, icon: <Award className="w-4 h-4 text-amber-300" /> },
            { id: 'fashion' as const, label: '百變時裝', icon: <Sparkles className="w-4 h-4 text-pink-300" /> },
            { id: 'equipment' as const, label: '神裝強化', icon: <Shield className="w-4 h-4" /> },
            { id: 'bag' as const, label: `仙途背包 (${player.bag.length})`, icon: <Package className="w-4 h-4" /> },
            { id: 'companions' as const, label: '靈寵/坐騎/神翼/法寶/神器', icon: <Flame className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSwitchTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'xianxia-btn-gold'
                  : 'bg-[#271142] text-amber-100/80 border border-amber-500/25 hover:border-amber-400/60'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. 角色與境界突破 */}
          {activeTab === 'character' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Full-Body Showcase & Stats */}
              <div className="md:col-span-5 xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 bg-[#180a2a]">
                    <img
                      src={stats.cls.portrait}
                      alt={player.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-rose-300 font-bold">
                      {stats.cls.name} · VIP{player.recharge.vipLevel}
                    </div>
                    <h3 className="text-xl font-bold gold-text-gradient font-xianxia truncate">
                      {player.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <TitleBadge title={stats.equippedTitleDef} size="sm" />
                      <button
                        type="button"
                        onClick={() => onSwitchTab('titles')}
                        className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-400/50 text-[10px] font-bold text-amber-200 hover:bg-amber-900"
                      >
                        更換稱號
                      </button>
                    </div>
                    <div className="text-[11px] text-pink-300 font-bold mt-1">
                      時裝：{stats.equippedFashionDef.name}
                    </div>
                  </div>
                </div>

                <div className="bg-black/35 rounded-lg p-2.5 border border-amber-500/25 text-center">
                  <div className="text-[11px] text-purple-200/75">綜合總戰力</div>
                  <div className="text-2xl font-bold gold-text-gradient font-num">
                    {stats.combatPower.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-num">
                  <div className="bg-black/30 rounded p-2 border border-amber-500/15">
                    <span className="text-purple-200/75">氣血：</span>
                    <span className="text-emerald-300 font-bold">{formatNum(stats.hp)}</span>
                  </div>
                  <div className="bg-black/30 rounded p-2 border border-amber-500/15">
                    <span className="text-purple-200/75">攻擊：</span>
                    <span className="text-rose-300 font-bold">{formatNum(stats.atk)}</span>
                  </div>
                  <div className="bg-black/30 rounded p-2 border border-amber-500/15">
                    <span className="text-purple-200/75">防禦：</span>
                    <span className="text-cyan-300 font-bold">{formatNum(stats.def)}</span>
                  </div>
                  <div className="bg-black/30 rounded p-2 border border-amber-500/15">
                    <span className="text-purple-200/75">暴擊：</span>
                    <span className="text-amber-300 font-bold">{Math.round(stats.critRate * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Right Realm Tribulation */}
              <div className="md:col-span-7 xianxia-card rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-amber-300 font-xianxia">
                      修仙境界 · 渡劫飛升大道
                    </h3>
                    <span className="text-xs text-amber-200 font-num font-bold">
                      主角 Lv.{player.level} · 經驗 {player.exp}/{player.expToNext}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {REALMS.map((r) => {
                      const passed = player.realmIndex > r.index;
                      const current = player.realmIndex === r.index;
                      return (
                        <span
                          key={r.index}
                          className={`px-2.5 py-1 rounded text-xs font-bold ${
                            current
                              ? 'xianxia-btn-crimson'
                              : passed
                              ? 'bg-amber-600/35 border border-amber-400/50 text-amber-200'
                              : 'bg-black/40 border border-purple-500/20 text-purple-300/60'
                          }`}
                        >
                          {r.shortName}
                        </span>
                      );
                    })}
                  </div>

                  <div className="bg-black/35 rounded-lg p-4 border border-amber-500/30 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-amber-200 font-xianxia">
                        當前境界：{realm.name} · 第 {player.realmLayer} 層
                      </span>
                      <span className="text-xs text-cyan-300 font-num">
                        修為 {formatNum(player.cultivation)} / {formatNum(reqCult)}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-black/70 border border-amber-500/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-yellow-200 transition-all"
                        style={{ width: `${Math.min(100, Math.round((player.cultivation / reqCult) * 100))}%` }}
                      />
                    </div>
                    <div className="text-xs text-amber-100/80">
                      {player.realmLayer < realm.maxLayer
                        ? `突破後晉升【${realm.name} 第 ${player.realmLayer + 1} 層】，氣血與攻擊大幅暴漲！`
                        : nextRealm
                        ? `圓滿渡劫【${nextRealm.tribulationName}】，即將引動九霄神雷飛升晉入【${nextRealm.name}】！`
                        : '已登臨九霄飛升大道之巔！'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={onMeditate}
                    className="py-3 rounded-lg xianxia-btn-purple font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
                  >
                    <Wind className="w-4 h-4" />
                    聚靈打坐 (+修為)
                  </button>
                  <button
                    type="button"
                    disabled={!canBreak}
                    onClick={onBreakthrough}
                    className="py-3 rounded-lg xianxia-btn-gold font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-45"
                  >
                    <Zap className="w-4 h-4" />
                    {canBreak ? '引動天劫 · 突破境界！' : '修為尚未圓滿'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. 裝備強化 */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-amber-200 font-num">
                  強化神石：<strong className="text-cyan-300">{player.spiritStones}</strong> · 金幣：<strong className="text-amber-300">{formatNum(player.gold)}</strong>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onEnhanceAll}
                    className="px-3.5 py-2 rounded-lg xianxia-btn-crimson text-xs font-bold"
                  >
                    一鍵全身強化
                  </button>
                  <button
                    type="button"
                    onClick={onAutoEquipBest}
                    className="px-3.5 py-2 rounded-lg xianxia-btn-gold text-xs font-bold"
                  >
                    一鍵換裝最強神裝
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(Object.keys(EQUIP_SLOT_LABELS) as EquipSlot[]).map((slot) => {
                  const item = player.equipped[slot];
                  const rarity = item ? RARITY_CONFIG[item.rarity] : null;
                  const enhCostStones = item ? (item.enhanceLevel + 1) * 3 : 0;
                  const enhCostGold = item ? (item.enhanceLevel + 1) * 3000 : 0;
                  return (
                    <div key={slot} className="xianxia-card rounded-xl p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item ? (
                          <EquipIcon
                            slot={slot}
                            rarity={item.rarity}
                            enhanceLevel={item.enhanceLevel}
                            size="md"
                          />
                        ) : (
                          <div className="w-12 h-12 shrink-0 rounded-lg border border-dashed border-amber-500/35 bg-black/35 flex items-center justify-center text-[11px] text-purple-300/60">
                            {EQUIP_SLOT_LABELS[slot]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-purple-200/75">{EQUIP_SLOT_LABELS[slot]}</div>
                          {item && rarity ? (
                            <>
                              <div className="text-sm font-bold truncate" style={{ color: rarity.color }}>
                                {item.name} {item.enhanceLevel > 0 ? `+${item.enhanceLevel}` : ''}
                              </div>
                              <div className="text-[11px] text-amber-100/80 font-num mt-0.5">
                                戰力 {getItemPower(item).toLocaleString()} · 攻+{Math.round(item.atk * (1 + item.enhanceLevel * 0.12))} · 血+{Math.round(item.hp * (1 + item.enhanceLevel * 0.12))}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-purple-300/60 mt-1">尚未穿戴裝備</div>
                          )}
                        </div>
                      </div>

                      {item && (
                        <button
                          type="button"
                          disabled={
                            item.enhanceLevel >= 20 ||
                            player.spiritStones < enhCostStones ||
                            player.gold < enhCostGold
                          }
                          onClick={() => onEnhanceSlot(slot)}
                          className="px-3 py-2 rounded-lg xianxia-btn-crimson text-xs font-bold shrink-0 disabled:opacity-45 font-num"
                        >
                          {item.enhanceLevel >= 20 ? '已滿級' : `強化 (${enhCostStones}石)`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. 背包 */}
          {activeTab === 'bag' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-amber-200">
                  背包容量：{player.bag.length} / 60 · 熔煉多餘裝備可換取大量金幣與強化神石！
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onAutoEquipBest}
                    className="px-3.5 py-1.5 rounded-md xianxia-btn-gold text-xs font-bold"
                  >
                    一鍵穿戴神裝
                  </button>
                  <button
                    type="button"
                    onClick={() => onSmeltBag(true)}
                    className="px-3.5 py-1.5 rounded-md xianxia-btn-crimson text-xs font-bold"
                  >
                    一鍵熔煉低階裝備
                  </button>
                </div>
              </div>

              {player.bag.length === 0 ? (
                <div className="xianxia-card rounded-xl p-10 text-center text-sm text-purple-200/75">
                  背包空空如也，快去戰場斬殺妖魔與世界 BOSS 爆神裝吧！
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {player.bag.map((item) => {
                    const rCfg = RARITY_CONFIG[item.rarity];
                    const curPower = getItemPower(player.equipped[item.slot]);
                    const newPower = getItemPower(item);
                    const better = newPower > curPower;
                    return (
                      <div
                        key={item.uid}
                        className="rounded-xl p-3 flex flex-col justify-between gap-2.5 border"
                        style={{ backgroundColor: rCfg.bg, borderColor: rCfg.border }}
                      >
                        <div className="flex items-center gap-2.5">
                          <EquipIcon
                            slot={item.slot}
                            rarity={item.rarity}
                            enhanceLevel={item.enhanceLevel}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between text-xs gap-1">
                              <span className="font-bold truncate" style={{ color: rCfg.color }}>
                                [{rCfg.label}] {item.name}
                              </span>
                              {better && <span className="text-emerald-300 font-bold shrink-0">↑戰力</span>}
                            </div>
                            <div className="text-[11px] text-amber-50/85 font-num mt-0.5">
                              {EQUIP_SLOT_LABELS[item.slot]} · 戰力 {newPower.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEquipFromBag(item.uid)}
                          className="w-full py-1.5 rounded xianxia-btn-gold text-xs font-bold"
                        >
                          穿戴裝備
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. 五大養成系統 */}
          {activeTab === 'companions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(COMPANION_SYSTEMS) as CompanionCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCompCat(cat)}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-bold ${
                        compCat === cat
                          ? 'xianxia-btn-crimson'
                          : 'bg-[#271142] text-amber-100/80 border border-amber-500/25'
                      }`}
                    >
                      {COMPANION_SYSTEMS[cat].label}（{player.companions[cat].tier}階）
                    </button>
                  ))}
                </div>
                <div className="text-xs font-num text-cyan-300">
                  擁有進階丹：<strong>{player.companionStones}</strong>
                </div>
              </div>

              <div className="xianxia-card rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-6 flex flex-col justify-between gap-4 bg-black/35 rounded-xl p-4 border border-amber-500/30">
                  <div className="flex items-start gap-3.5">
                    <CompanionVisualEmblem category={compCat} color={curCompTier.color} tier={compState.tier} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-rose-300 font-bold">
                        {compSys.label} · 第 {compState.tier} 階 Lv.{compState.level}/10
                      </div>
                      <h3
                        className="text-2xl font-bold font-xianxia mt-0.5 truncate"
                        style={{ color: curCompTier.color }}
                      >
                        {curCompTier.name}
                      </h3>
                      <p className="text-xs text-amber-100/80 mt-1">{curCompTier.desc}</p>
                    </div>
                  </div>

                  {/* Active Combat Skill Banner */}
                  <div className="rounded-lg bg-gradient-to-r from-purple-950/90 via-[#2a1046] to-amber-950/60 border border-amber-400/40 px-3 py-2">
                    <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-yellow-300" />
                      實戰仙法特效
                    </div>
                    <div className="text-xs text-amber-100 mt-0.5">{curCompTier.combatSkill}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-num">
                    <div className="bg-black/40 p-2 rounded border border-amber-500/20">
                      <div className="text-purple-200/70">攻擊加成</div>
                      <div className="text-rose-300 font-bold">
                        +{Math.round(curCompTier.atkBonus * (1 + (compState.level - 1) * 0.18)).toLocaleString()}
                      </div>
                      {nextCompTier && (
                        <div className="text-[10px] text-emerald-300/90 mt-0.5">
                          下階 +{nextCompTier.atkBonus.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-amber-500/20">
                      <div className="text-purple-200/70">氣血加成</div>
                      <div className="text-emerald-300 font-bold">
                        +{Math.round(curCompTier.hpBonus * (1 + (compState.level - 1) * 0.18)).toLocaleString()}
                      </div>
                      {nextCompTier && (
                        <div className="text-[10px] text-emerald-300/90 mt-0.5">
                          下階 +{nextCompTier.hpBonus.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-amber-500/20">
                      <div className="text-purple-200/70">防禦加成</div>
                      <div className="text-cyan-300 font-bold">
                        +{Math.round(curCompTier.defBonus * (1 + (compState.level - 1) * 0.18)).toLocaleString()}
                      </div>
                      {nextCompTier && (
                        <div className="text-[10px] text-emerald-300/90 mt-0.5">
                          下階 +{nextCompTier.defBonus.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-6 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-amber-300">幻化進階路線（實時顯現在主戰場上並參與戰鬥！）</div>
                    <div className="grid grid-cols-2 gap-2">
                      {compSys.tiers.map((t) => (
                        <div
                          key={t.tier}
                          className={`px-3 py-2 rounded-lg border text-xs ${
                            compState.tier >= t.tier
                              ? 'bg-purple-950/60 border-amber-400/60 text-amber-100'
                              : 'bg-black/30 border-purple-500/20 text-purple-300/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-num font-bold">{t.tier}階</span>
                            <span style={{ color: t.color }} className="font-bold">{t.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {nextCompTier ? (
                      <div className="text-xs text-cyan-300 pt-1">
                        升至 Lv.10 自動幻化進階為【{nextCompTier.name}】！
                      </div>
                    ) : (
                      <div className="text-xs text-amber-300 pt-1">
                        已修煉至最高鴻蒙階位，威能冠絕九霄！
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={player.companionStones < upgradeStoneCost}
                      onClick={() => onUpgradeCompanion(compCat, 1)}
                      className="py-3 rounded-lg xianxia-btn-gold text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-45 font-num"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      培養 1次 ({upgradeStoneCost})
                    </button>
                    <button
                      type="button"
                      disabled={player.companionStones < upgradeStoneCost}
                      onClick={() => onUpgradeCompanion(compCat, 5)}
                      className="py-3 rounded-lg xianxia-btn-purple text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-45 font-num"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      五連培養
                    </button>
                    <button
                      type="button"
                      disabled={player.companionStones < upgradeStoneCost}
                      onClick={() => onUpgradeCompanion(compCat, 10)}
                      className="py-3 rounded-lg xianxia-btn-crimson text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-45 font-num"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      十連突破
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme-Limited Skin Switcher for Pet / Treasure / Artifact */}
              {(compCat === 'pet' || compCat === 'treasure' || compCat === 'artifact') && (
                <div className="xianxia-card rounded-xl p-4 space-y-3 border-amber-400/45">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-amber-300 font-xianxia">
                      【陰陽限定幻化外觀】— 抽到即可啟用專屬戰場造型與高額屬性加成
                    </h4>
                    <button
                      type="button"
                      onClick={onOpenYinyangGacha}
                      className="px-3 py-1 rounded xianxia-btn-purple text-[11px] font-bold"
                    >
                      前往陰陽抽獎獲取
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LIMITED_SKINS.filter((s) => s.category === compCat).map((sk) => {
                      const unlocked = (player.unlockedLimitedSkins || []).includes(sk.id);
                      const isEquipped =
                        (compCat === 'pet' && player.equippedLimitedPet === sk.id) ||
                        (compCat === 'treasure' && player.equippedLimitedTreasure === sk.id) ||
                        (compCat === 'artifact' && player.equippedLimitedArtifact === sk.id);
                      return (
                        <div
                          key={sk.id}
                          className="rounded-lg bg-black/45 border p-3 flex items-center justify-between gap-3"
                          style={{ borderColor: RARITY_CONFIG[sk.rarity].border }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ItemMiniIcon
                              kind={compCat === 'pet' ? 'pet' : compCat === 'treasure' ? 'treasure' : 'artifact'}
                              size="md"
                              colorOverride={sk.primaryColor}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate" style={{ color: RARITY_CONFIG[sk.rarity].color }}>
                                {sk.name}
                              </div>
                              <div className="text-[10px] text-amber-100/80 truncate">{sk.combatEffectDesc}</div>
                              <div className="text-[10px] text-emerald-300 font-num mt-0.5">
                                攻+{sk.atkBonus} · 血+{sk.hpBonus}
                              </div>
                            </div>
                          </div>
                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => onEquipLimitedSkin(compCat, isEquipped ? null : sk.id)}
                              className={`px-3 py-1.5 rounded text-xs font-bold shrink-0 ${
                                isEquipped ? 'xianxia-btn-crimson' : 'xianxia-btn-gold'
                              }`}
                            >
                              {isEquipped ? '卸下幻化' : '立即幻化'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onOpenYinyangGacha}
                              className="px-3 py-1.5 rounded bg-purple-950/80 border border-purple-400/40 text-purple-200 text-xs font-bold shrink-0"
                            >
                              抽獎解鎖
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. 百變時裝系統 */}
          {activeTab === 'fashion' && (
            <div className="space-y-4">
              <div className="xianxia-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#1e1b4b]/90 via-[#3b0764]/90 to-[#450a0a]/90">
                <div>
                  <h3 className="text-base font-bold gold-text-gradient font-xianxia">
                    百變仙俠時裝 · 戰場外觀即時幻化
                  </h3>
                  <p className="text-xs text-amber-100/80 mt-0.5">
                    解鎖時裝即永久享有 35% 收集屬性，穿戴時更可獲得 100% 全額屬性與專屬太極/烈焰戰場光環！
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenYinyangGacha}
                  className="px-3.5 py-2 rounded-lg xianxia-btn-gold text-xs font-bold flex items-center gap-1.5"
                >
                  <ItemMiniIcon kind="yinyang_token" size="xs" />
                  抽取陰陽限定時裝
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {FASHION_CATALOG.map((f) => {
                  const unlocked = (player.unlockedFashions || ['fash_qingyun']).includes(f.id);
                  const equipped = stats.equippedFashionDef.id === f.id;
                  const rCfg = RARITY_CONFIG[f.rarity];
                  return (
                    <div
                      key={f.id}
                      className={`xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3 border ${
                        equipped ? 'ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.35)]' : ''
                      }`}
                      style={{ borderColor: rCfg.border }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Stylized Fashion Preview SVG */}
                        <div className="w-16 h-20 shrink-0 rounded-lg bg-[#120722] border border-amber-400/45 flex items-center justify-center relative overflow-hidden">
                          {f.auraType === 'yinyang' || f.auraType === 'chaos' ? (
                            <div className="absolute inset-1 rounded-full border border-dashed border-slate-200/45" />
                          ) : null}
                          <svg viewBox="0 0 60 72" className="w-12 h-14">
                            <defs>
                              <linearGradient id={`fg_${f.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={f.primaryColor} />
                                <stop offset="100%" stopColor={f.secondaryColor} />
                              </linearGradient>
                            </defs>
                            <circle cx="30" cy="14" r="7" fill="#fde68a" />
                            <path d="M18 24 L42 24 L48 64 L12 64 Z" fill={`url(#fg_${f.id})`} stroke={f.trimColor} strokeWidth="2" />
                            <rect x="17" y="24" width="26" height="5" fill={f.trimColor} />
                            <path d="M24 29 L30 40 L36 29" fill="none" stroke={f.trimColor} strokeWidth="1.5" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-bold truncate" style={{ color: rCfg.color }}>
                              {f.name}
                            </span>
                            {equipped && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 font-bold shrink-0">
                                穿戴中
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-purple-200/80 mt-0.5">{f.subtitle}</div>
                          <div className="text-[11px] text-amber-100/90 font-num mt-1.5 space-y-0.5">
                            <div>攻 +{f.atkBonus} · 氣血 +{f.hpBonus.toLocaleString()}</div>
                            <div>防 +{f.defBonus} · 暴擊 +{Math.round(f.critBonus * 100)}%</div>
                          </div>
                        </div>
                      </div>

                      {unlocked ? (
                        <button
                          type="button"
                          disabled={equipped}
                          onClick={() => onUnlockOrEquipFashion(f.id)}
                          className={`w-full py-2 rounded-lg text-xs font-bold ${
                            equipped
                              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                              : 'xianxia-btn-gold'
                          }`}
                        >
                          {equipped ? '正在穿戴此時裝' : '立即穿戴幻化'}
                        </button>
                      ) : f.unlockJadeCost ? (
                        <button
                          type="button"
                          onClick={() => onUnlockOrEquipFashion(f.id)}
                          className="w-full py-2 rounded-lg xianxia-btn-crimson text-xs font-bold font-num"
                        >
                          {f.unlockJadeCost} 仙玉解鎖並穿戴
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenYinyangGacha}
                          className="w-full py-2 rounded-lg xianxia-btn-purple text-xs font-bold"
                        >
                          {f.unlockMethod}（前往抽獎）
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. 修仙稱號閣 */}
          {activeTab === 'titles' && (
            <div className="space-y-4">
              <div className="xianxia-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#2e1065]/90 via-[#4c1d95]/85 to-[#7f1d1d]/85">
                <div>
                  <h3 className="text-base font-bold gold-text-gradient font-xianxia">
                    九霄榮耀稱號 · 活動限定收集與戰力加持
                  </h3>
                  <p className="text-xs text-amber-100/80 mt-0.5">
                    絕大多數稱號皆須透過「世界BOSS、跨服競技、副本試煉、陰陽轉盤、仙盟戰、首儲累儲」等活動獲取！
                    已解鎖稱號永久保留 <strong className="text-amber-300">40%</strong> 圖鑑屬性，佩戴後提升至 <strong className="text-emerald-300">100%</strong> 並展示於角色頭頂！
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-amber-200/80">當前佩戴中</span>
                  <TitleBadge title={stats.equippedTitleDef} size="md" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {TITLE_CATALOG.map((tDef) => {
                  const unlocked = (player.unlockedTitles || ['title_walker']).includes(tDef.id);
                  const equipped = stats.equippedTitleDef.id === tDef.id;
                  const rCfg = RARITY_CONFIG[tDef.rarity];
                  return (
                    <div
                      key={tDef.id}
                      className={`xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3 border ${
                        equipped ? 'ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.35)]' : ''
                      }`}
                      style={{ borderColor: rCfg.border }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded border"
                              style={{ color: rCfg.color, borderColor: rCfg.border, backgroundColor: rCfg.bg }}
                            >
                              {rCfg.label} · {tDef.activityCategory}
                            </span>
                            {equipped && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 font-bold">
                                佩戴中
                              </span>
                            )}
                          </div>
                          <div className="pt-1">
                            <TitleBadge title={tDef} size="md" />
                          </div>
                          <p className="text-xs text-amber-100/85 leading-snug pt-0.5">
                            {tDef.unlockRequirement}
                          </p>
                        </div>

                        <div className="text-right text-[11px] font-num shrink-0 bg-black/35 rounded-lg p-2 border border-amber-500/20">
                          <div className="text-rose-300 font-bold">攻 +{tDef.atkBonus.toLocaleString()}</div>
                          <div className="text-emerald-300">血 +{tDef.hpBonus.toLocaleString()}</div>
                          <div className="text-cyan-300">防 +{tDef.defBonus.toLocaleString()}</div>
                          {tDef.critBonus > 0 && (
                            <div className="text-amber-300">暴擊 +{Math.round(tDef.critBonus * 100)}%</div>
                          )}
                        </div>
                      </div>

                      {unlocked ? (
                        <button
                          type="button"
                          disabled={equipped}
                          onClick={() => onEquipTitle(tDef.id)}
                          className={`w-full py-2 rounded-lg text-xs font-bold ${
                            equipped
                              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                              : 'xianxia-btn-gold'
                          }`}
                        >
                          {equipped ? '正在展示此稱號' : '立即換戴此稱號'}
                        </button>
                      ) : tDef.redirectTab ? (
                        <button
                          type="button"
                          onClick={() => onJumpToActivity(tDef.redirectTab!, tDef.redirectRechargeTab)}
                          className="w-full py-2 rounded-lg xianxia-btn-purple text-xs font-bold"
                        >
                          前往【{tDef.activityCategory}】獲取
                        </button>
                      ) : (
                        <div className="w-full py-2 rounded-lg bg-black/40 border border-purple-500/25 text-center text-xs text-purple-300/75 font-bold">
                          尚未解鎖
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
