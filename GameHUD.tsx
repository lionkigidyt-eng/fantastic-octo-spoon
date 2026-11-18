import React, { useState } from 'react';
import {
  Crown,
  Gem,
  Coins,
  Swords,
  Shield,
  Package,
  Flame,
  Users,
  Trophy,
  Gift,
  Clock,
  Sparkles,
  ShoppingBag,
  Skull,
  Castle,
  Volume2,
  VolumeX,
  Pause,
  MapPin,
  Zap,
  Bot,
  Send,
  ScrollText,
  Award,
} from 'lucide-react';
import {
  COMPANION_SYSTEMS,
  QUEST_CHAIN,
  REALMS,
  SCENES,
} from '../data/xianxiaData';
import {
  ArenaRivalDef,
  ChatMessage,
  ModalTab,
  PlayerState,
  RechargeSubTab,
} from '../types/game';
import { computePlayerStats, formatNum } from '../utils/gameLogic';
import { TitleBadge } from './TitleBadge';

interface GameHUDProps {
  player: PlayerState;
  hpRatio: number;
  mpRatio: number;
  skillCooldowns: Record<string, number>;
  treasureCooldown: number;
  activeBossHp: { name: string; hp: number; maxHp: number; title: string } | null;
  arenaHud: {
    rival: ArenaRivalDef;
    rivalHp: number;
    rivalMaxHp: number;
  } | null;
  chatMessages: ChatMessage[];
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleAutoBattle: () => void;
  onCastSkill: (idx: number) => void;
  onCastTreasure: () => void;
  onBreakthrough: () => void;
  onAcceptQuest: () => void;
  onClaimQuest: () => void;
  onSendChat: (text: string) => void;
  onOpenModal: (tab: ModalTab, rechargeTab?: RechargeSubTab) => void;
  onLeaveBoss: () => void;
  onLeaveArena: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  hpRatio,
  mpRatio,
  skillCooldowns,
  treasureCooldown,
  activeBossHp,
  arenaHud,
  chatMessages,
  muted,
  onToggleMute,
  onTogglePause,
  onToggleAutoBattle,
  onCastSkill,
  onCastTreasure,
  onBreakthrough,
  onAcceptQuest,
  onClaimQuest,
  onSendChat,
  onOpenModal,
  onLeaveBoss,
  onLeaveArena,
}) => {
  const [chatInput, setChatInput] = useState('');
  const stats = computePlayerStats(player);
  const realm = REALMS[player.realmIndex] || REALMS[0];
  const reqCult = realm.expPerLayer * player.realmLayer;
  const cultPct = Math.min(100, Math.round((player.cultivation / reqCult) * 100));
  const expPct = Math.min(100, Math.round((player.exp / Math.max(1, player.expToNext)) * 100));
  const canBreak =
    player.cultivation >= reqCult &&
    (player.realmIndex < REALMS.length - 1 || player.realmLayer < realm.maxLayer);
  const currentScene = SCENES.find((s) => s.id === player.sceneId) || SCENES[0];
  const currentQuest = QUEST_CHAIN[player.questIndex] || QUEST_CHAIN[QUEST_CHAIN.length - 1];
  const questAccepted = player.questAccepted ?? false;
  const questDone = questAccepted && currentQuest ? player.questProgress >= currentQuest.targetCount : false;
  const curTreasure =
    COMPANION_SYSTEMS.treasure.tiers[player.companions.treasure.tier - 1] ||
    COMPANION_SYSTEMS.treasure.tiers[0];

  const submitChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    onSendChat(trimmed);
    setChatInput('');
  };

  const rightActivities: {
    id: string;
    label: string;
    icon: React.ReactNode;
    accent: 'red' | 'gold' | 'purple';
    badge?: boolean;
    onClick: () => void;
  }[] = [
    {
      id: 'yinyang',
      label: '陰陽抽獎',
      icon: <Sparkles className="w-4 h-4 text-yellow-200" />,
      accent: 'gold',
      badge: (player.yinyangTokens || 0) > 0,
      onClick: () => onOpenModal('yinyang_gacha'),
    },
    {
      id: 'first',
      label: '首儲禮包',
      icon: <Gift className="w-4 h-4 text-amber-200" />,
      accent: 'red',
      badge: player.recharge.firstRechargeTierClaimed.length === 0,
      onClick: () => onOpenModal('recharge', 'first_recharge'),
    },
    {
      id: 'vip',
      label: 'VIP特權',
      icon: <Crown className="w-4 h-4 text-amber-300" />,
      accent: 'gold',
      badge: player.recharge.vipLevel > 0 && !player.recharge.vipDailyClaimedDay,
      onClick: () => onOpenModal('recharge', 'vip'),
    },
    {
      id: 'mall',
      label: '仙玉商城',
      icon: <ShoppingBag className="w-4 h-4 text-cyan-200" />,
      accent: 'purple',
      onClick: () => onOpenModal('recharge', 'mall'),
    },
    {
      id: 'flash',
      label: '限時特惠',
      icon: <Clock className="w-4 h-4 text-rose-200" />,
      accent: 'red',
      badge: player.recharge.flashDealsBought.length < 3,
      onClick: () => onOpenModal('recharge', 'flash_deals'),
    },
    {
      id: 'cumul',
      label: '累儲豪禮',
      icon: <Flame className="w-4 h-4 text-orange-200" />,
      accent: 'red',
      onClick: () => onOpenModal('recharge', 'cumulative'),
    },
    {
      id: 'cards',
      label: '月卡終身',
      icon: <Sparkles className="w-4 h-4 text-yellow-200" />,
      accent: 'gold',
      onClick: () => onOpenModal('recharge', 'cards'),
    },
    {
      id: 'fund',
      label: '成長基金',
      icon: <Gem className="w-4 h-4 text-cyan-200" />,
      accent: 'purple',
      onClick: () => onOpenModal('recharge', 'fund_pass'),
    },
    {
      id: 'rank',
      label: '神豪排行',
      icon: <Trophy className="w-4 h-4 text-amber-300" />,
      accent: 'gold',
      onClick: () => onOpenModal('recharge', 'tycoon_rank'),
    },
    {
      id: 'boss',
      label: '世界BOSS',
      icon: <Skull className="w-4 h-4 text-rose-300" />,
      accent: 'red',
      onClick: () => onOpenModal('world_boss'),
    },
    {
      id: 'dungeon',
      label: '材料副本',
      icon: <Castle className="w-4 h-4 text-purple-200" />,
      accent: 'purple',
      onClick: () => onOpenModal('dungeons'),
    },
    {
      id: 'arena',
      label: '跨服競技',
      icon: <Swords className="w-4 h-4 text-amber-200" />,
      accent: 'gold',
      onClick: () => onOpenModal('arena'),
    },
    {
      id: 'topup',
      label: '首充雙倍',
      icon: <Zap className="w-4 h-4 text-yellow-200" />,
      accent: 'red',
      onClick: () => onOpenModal('recharge', 'topup'),
    },
  ];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3.5">
      {/* ==================== TOP ROW ==================== */}
      <div className="flex items-start justify-between gap-3">
        {/* TOP-LEFT: Character Avatar, Level, Power, VIP, HP/MP, Cultivation & Breakthrough */}
        <div className="pointer-events-auto flex items-start gap-2.5">
          <div className="xianxia-panel rounded-xl p-2 flex items-center gap-2.5 shadow-xl">
            <button
              type="button"
              onClick={() => onOpenModal('character')}
              className="relative w-14 h-16 rounded-lg overflow-hidden border-2 border-amber-400 shrink-0 bg-gradient-to-b from-[#2f1252] to-[#120722] hover:brightness-110"
              title="查看角色與境界"
            >
              <img
                src={stats.cls.portrait}
                alt={player.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] text-amber-300 font-bold text-center font-num">
                Lv.{player.level}
              </span>
            </button>

            <div className="min-w-[160px] sm:min-w-[195px] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-amber-100 font-xianxia truncate max-w-[110px]">
                  {player.name}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenModal('recharge', 'vip')}
                  className="px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-amber-500 border border-yellow-200/70 text-[10px] font-bold text-white font-num shrink-0"
                >
                  VIP{player.recharge.vipLevel}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold" style={{ color: realm.auraColor }}>
                  {realm.shortName}{player.realmLayer}層
                </span>
                <span className="font-num font-bold text-amber-300">
                  戰力 {formatNum(stats.combatPower)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpenModal('titles')}
                className="w-full flex items-center justify-start hover:brightness-110 transition-transform active:scale-95"
                title="點擊更換修仙稱號"
              >
                <TitleBadge title={stats.equippedTitleDef} size="sm" />
              </button>

              {/* HP, MP, EXP & Cultivation Bars */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-black/75 border border-red-500/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-700 to-rose-400 transition-all duration-150"
                    style={{ width: `${Math.round(hpRatio * 100)}%` }}
                  />
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/75 border border-cyan-500/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-300 transition-all duration-150"
                    style={{ width: `${Math.round(mpRatio * 100)}%` }}
                  />
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-black/75 border border-emerald-500/45 overflow-hidden"
                  title={`等級經驗：${player.exp} / ${player.expToNext} (${expPct}%)`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-lime-300 transition-all duration-150"
                    style={{ width: `${expPct}%` }}
                  />
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-black/75 border border-amber-500/40 overflow-hidden"
                  title={`修為進度：${cultPct}%`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-amber-300 transition-all duration-150"
                    style={{ width: `${cultPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Breakthrough Button */}
          {canBreak && (
            <button
              type="button"
              onClick={onBreakthrough}
              className="xianxia-btn-gold rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5 animate-float-gentle shadow-lg"
            >
              <Zap className="w-4 h-4 text-red-700" />
              渡劫突破！
            </button>
          )}
        </div>

        {/* TOP-CENTER: Arena VS Duel Bar OR Active World Boss Health Bar */}
        {arenaHud ? (
          <div className="pointer-events-auto flex flex-col items-center xianxia-panel rounded-xl px-4 py-2 min-w-[280px] sm:min-w-[400px] border-amber-400">
            <div className="flex items-center justify-between w-full text-xs mb-1.5 gap-3">
              <span className="font-bold gold-text-gradient font-xianxia flex items-center gap-1">
                <Swords className="w-3.5 h-3.5 text-amber-300" />
                跨服演武台對決 · 第 {arenaHud.rival.rank} 名【{arenaHud.rival.name}】
              </span>
              <button
                type="button"
                onClick={onLeaveArena}
                className="text-[11px] text-rose-300 hover:underline font-bold shrink-0"
              >
                撤離演武台
              </button>
            </div>
            <div className="grid grid-cols-11 items-center gap-2 w-full">
              <div className="col-span-5">
                <div className="h-3 rounded-full bg-black/80 border border-emerald-400/60 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-lime-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, Math.round(hpRatio * 100))}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white font-num">
                    我方 {Math.round(hpRatio * 100)}%
                  </span>
                </div>
              </div>
              <div className="col-span-1 text-center text-xs font-bold text-amber-300 font-xianxia">VS</div>
              <div className="col-span-5">
                <div className="h-3 rounded-full bg-black/80 border border-rose-400/60 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-red-800 via-rose-500 to-amber-400 transition-all duration-150"
                    style={{
                      width: `${Math.max(0, Math.round((arenaHud.rivalHp / Math.max(1, arenaHud.rivalMaxHp)) * 100))}%`,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white font-num">
                    {formatNum(arenaHud.rivalHp)} / {formatNum(arenaHud.rivalMaxHp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          activeBossHp && (
            <div className="pointer-events-auto hidden md:flex flex-col items-center xianxia-panel rounded-xl px-5 py-2 min-w-[320px]">
              <div className="flex items-center justify-between w-full text-xs mb-1">
                <span className="font-bold text-rose-300 font-xianxia">
                  【世界 BOSS】{activeBossHp.name}
                </span>
                <button
                  type="button"
                  onClick={onLeaveBoss}
                  className="text-[11px] text-amber-300 hover:underline"
                >
                  撤離戰場
                </button>
              </div>
              <div className="w-full h-3.5 rounded-full bg-black/80 border border-rose-400/60 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-red-800 via-rose-500 to-amber-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.round((activeBossHp.hp / activeBossHp.maxHp) * 100))}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white font-num drop-shadow">
                  {activeBossHp.hp.toLocaleString()} / {activeBossHp.maxHp.toLocaleString()}
                </span>
              </div>
            </div>
          )
        )}

        {/* TOP-RIGHT: Jade, Gold, Prominent Recharge Button, Scene Switcher, Audio/Pause */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="xianxia-panel rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs font-num">
            <div className="flex items-center gap-1" title="仙玉">
              <Gem className="w-4 h-4 text-cyan-300" />
              <span className="font-bold text-cyan-200">{formatNum(player.jade)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1" title="綁定仙玉">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span className="font-bold text-purple-200">{formatNum(player.boundJade)}</span>
            </div>
            <div className="flex items-center gap-1" title="金幣">
              <Coins className="w-4 h-4 text-amber-300" />
              <span className="font-bold text-amber-200">{formatNum(player.gold)}</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenModal('recharge', 'topup')}
              className="xianxia-btn-crimson rounded-md px-3 py-1 font-bold text-xs flex items-center gap-1 whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              儲值
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1 rounded bg-black/40 border border-amber-500/30 text-amber-200 hover:border-amber-300"
              title={muted ? '開啟音效' : '靜音'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onTogglePause}
              className="p-1 rounded bg-black/40 border border-amber-500/30 text-amber-200 hover:border-amber-300"
              title="暫停 / 系統選單 (Esc)"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Static Current Region Label (Shows Arena Duel Stage when inside Arena) */}
          <div className="xianxia-panel rounded-lg px-3 py-1 flex items-center gap-1.5 text-[11px] text-amber-200/90">
            <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-bold font-xianxia">
              {arenaHud ? '九霄跨服演武台' : currentScene.name}
            </span>
            <span className="text-purple-200/75 hidden sm:inline">
              · {arenaHud ? '跨服 1v1 真人擂台對決中' : currentScene.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== MIDDLE LEFT & RIGHT OVERLAYS ==================== */}
      <div className="flex-1 flex items-center justify-between gap-4 my-2 min-h-0">
        {/* LEFT: Monster-Slaying Quest Tracker (Accept -> Hunt -> Level Up) + Interactive Chat */}
        <div className="hidden md:flex flex-col justify-between h-full py-3 gap-3 w-64">
          {currentQuest && (
            <div
              className={`pointer-events-auto xianxia-panel rounded-xl p-3 text-left transition-all ${
                questDone
                  ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)]'
                  : !questAccepted
                  ? 'ring-1 ring-cyan-400/70'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                <span className="flex items-center gap-1">
                  <ScrollText className="w-3.5 h-3.5" />
                  打怪升級任務
                </span>
                <span className="font-num">
                  {questAccepted
                    ? `${Math.min(player.questProgress, currentQuest.targetCount)} / ${currentQuest.targetCount}`
                    : '待接取'}
                </span>
              </div>
              <div className="text-xs font-bold text-amber-50 mt-1 leading-snug">
                {currentQuest.title}
              </div>
              <div className="text-[11px] text-emerald-300 font-num mt-1">
                獎勵：經驗 +{currentQuest.rewardExp.toLocaleString()} · 仙玉×{currentQuest.rewardJade}
              </div>

              {!questAccepted ? (
                <button
                  type="button"
                  onClick={onAcceptQuest}
                  className="mt-2 w-full py-1.5 rounded-lg xianxia-btn-gold text-xs font-bold"
                >
                  接取任務（打怪升級）
                </button>
              ) : questDone ? (
                <button
                  type="button"
                  onClick={onClaimQuest}
                  className="mt-2 w-full py-1.5 rounded-lg xianxia-btn-crimson text-xs font-bold animate-pulse"
                >
                  領取獎勵（經驗升級！）
                </button>
              ) : (
                <div className="mt-2 h-1.5 w-full rounded-full bg-black/70 border border-amber-500/35 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-200 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((player.questProgress / currentQuest.targetCount) * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Live Interactive World/Sect Chat */}
          <div className="pointer-events-auto xianxia-panel rounded-xl p-2.5 space-y-2 mt-auto">
            <div className="text-[11px] font-bold text-amber-300 border-b border-amber-500/25 pb-1">
              九霄傳音頻道
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto text-[11px] leading-snug pr-1">
              {chatMessages.slice(-6).map((msg) => (
                <div key={msg.id} className="break-words">
                  <span className={msg.channel === '傳聞' ? 'text-rose-400 font-bold' : msg.channel === '宗門' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    [{msg.channel}]
                  </span>{' '}
                  {msg.vip > 0 && <span className="text-yellow-300 font-num">[V{msg.vip}]</span>}
                  <span className="text-amber-100/95 font-medium">{msg.sender}：</span>
                  <span className="text-purple-100/85">{msg.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={submitChat} className="flex gap-1 pt-0.5">
              <input
                type="text"
                maxLength={36}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="世界傳音發言..."
                className="flex-1 min-w-0 bg-black/50 border border-amber-500/35 rounded px-2 py-1 text-[11px] text-amber-100 focus:outline-none focus:border-amber-300"
              />
              <button
                type="submit"
                className="px-2 py-1 rounded xianxia-btn-gold text-[10px] font-bold shrink-0 flex items-center"
                title="發送傳音"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Dense Classic Xianxia Activity & Recharge Icon Matrix */}
        <div className="pointer-events-auto ml-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-w-[235px]">
          {rightActivities.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              className={`relative rounded-lg p-1.5 flex flex-col items-center justify-center gap-0.5 text-center transition-transform active:scale-95 ${
                act.accent === 'red'
                  ? 'xianxia-btn-crimson'
                  : act.accent === 'gold'
                  ? 'xianxia-btn-gold'
                  : 'xianxia-btn-purple'
              }`}
            >
              {act.badge && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border border-yellow-200 text-[9px] font-bold text-white flex items-center justify-center">
                  !
                </span>
              )}
              {act.icon}
              <span className="text-[10px] font-bold leading-tight whitespace-nowrap">
                {act.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== BOTTOM DOCK ==================== */}
      <div className="flex flex-wrap items-end justify-between gap-2.5">
        <div className="pointer-events-auto xianxia-panel rounded-xl p-2 flex items-center gap-1.5 sm:gap-2">
          {stats.cls.skills.map((sk, idx) => {
            const cd = skillCooldowns[sk.id] || 0;
            const onCd = cd > 0.05;
            return (
              <button
                key={sk.id}
                type="button"
                onClick={() => onCastSkill(idx)}
                title={`${sk.name} (${sk.keyHint})：${sk.description}`}
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center overflow-hidden transition-transform active:scale-95 ${
                  sk.isUltimate
                    ? 'border-amber-300 bg-gradient-to-b from-red-900 to-purple-950'
                    : 'border-amber-500/60 bg-[#220e3a]'
                }`}
              >
                <span
                  className="text-[11px] font-bold font-xianxia leading-tight text-center px-0.5"
                  style={{ color: sk.color }}
                >
                  {sk.name.slice(0, 2)}
                </span>
                <span className="text-[9px] text-amber-200/80 font-num">{sk.keyHint}</span>
                {onCd && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-xs font-bold text-amber-200 font-num">
                    {cd.toFixed(1)}
                  </div>
                )}
              </button>
            );
          })}

          {/* Dedicated Manual Treasure Release Button (法寶主動技) */}
          <button
            type="button"
            onClick={onCastTreasure}
            title={`點擊釋放法寶【${curTreasure.name}】奧義：全屏傷害＋大量回血！快捷鍵 F`}
            className="relative h-11 sm:h-12 px-2.5 rounded-lg border-2 border-amber-300 bg-gradient-to-b from-amber-700/80 via-[#3b1564] to-[#1a082e] flex items-center gap-1.5 overflow-hidden transition-transform active:scale-95 shadow-[0_0_16px_rgba(251,191,36,0.4)]"
          >
            <svg viewBox="0 0 36 36" className="w-6 h-6 shrink-0">
              <circle cx="18" cy="18" r="14" fill={`${curTreasure.color}44`} stroke={curTreasure.color} strokeWidth="2" />
              <polygon points="18,6 28,12 28,24 18,30 8,24 8,12" fill="none" stroke="#fef08a" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="4" fill="#fde047" />
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[11px] font-bold text-amber-200 whitespace-nowrap font-xianxia">
                法寶奧義
              </div>
              <div className="text-[9px] text-cyan-200 font-num whitespace-nowrap">
                {(stats.equippedLimitedTreasureDef?.name || curTreasure.name).slice(0, 4)} [F]
              </div>
            </div>
            {treasureCooldown > 0.05 && (
              <div className="absolute inset-0 bg-black/78 flex items-center justify-center text-xs font-bold text-amber-200 font-num">
                {treasureCooldown.toFixed(1)}s
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleAutoBattle}
            className={`h-11 sm:h-12 px-3 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-0.5 border ${
              player.autoBattle
                ? 'xianxia-btn-gold'
                : 'bg-[#1a0a2e] border-purple-500/40 text-purple-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="text-[10px] whitespace-nowrap">{player.autoBattle ? '掛機中' : '手動'}</span>
          </button>
        </div>

        <div className="pointer-events-auto xianxia-panel rounded-xl p-1.5 flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
          {[
            { id: 'character' as const, label: '角色', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'titles' as const, label: '稱號', icon: <Award className="w-4 h-4 text-amber-300" /> },
            { id: 'fashion' as const, label: '時裝', icon: <Crown className="w-4 h-4 text-pink-300" /> },
            { id: 'equipment' as const, label: '裝備', icon: <Shield className="w-4 h-4" /> },
            { id: 'bag' as const, label: '背包', icon: <Package className="w-4 h-4" /> },
            { id: 'companions' as const, label: '靈寵法寶', icon: <Flame className="w-4 h-4" /> },
            { id: 'sect' as const, label: '宗門', icon: <Users className="w-4 h-4" /> },
            { id: 'arena' as const, label: '競技社交', icon: <Trophy className="w-4 h-4" /> },
          ].map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => onOpenModal(nav.id)}
              className="px-2.5 sm:px-3 py-2 rounded-lg bg-[#271142] hover:bg-[#3b1963] border border-amber-500/40 text-amber-100 flex flex-col items-center justify-center gap-0.5 min-w-[52px] transition-colors"
            >
              <span className="text-amber-300">{nav.icon}</span>
              <span className="text-[11px] font-bold whitespace-nowrap">{nav.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
