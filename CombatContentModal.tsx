import React, { useState } from 'react';
import {
  Castle,
  Flame,
  Skull,
  Swords,
  Trophy,
  Users,
  X,
  Gift,
} from 'lucide-react';
import {
  ARENA_RIVALS,
  CLASSES,
  DUNGEONS,
  REALMS,
  VIP_TIERS,
  WORLD_BOSSES,
} from '../../data/xianxiaData';
import { ModalTab, PlayerState, WorldBossDef } from '../../types/game';
import { computePlayerStats, formatNum } from '../../utils/gameLogic';
import { TitleBadge } from '../TitleBadge';

interface CombatContentModalProps {
  player: PlayerState;
  activeTab: Extract<ModalTab, 'dungeons' | 'world_boss' | 'sect' | 'arena'>;
  bossCooldowns: Record<string, number>;
  onSwitchTab: (tab: Extract<ModalTab, 'dungeons' | 'world_boss' | 'sect' | 'arena'>) => void;
  onClose: () => void;
  onChallengeDungeon: (dungeonId: string) => void;
  onChallengeBoss: (boss: WorldBossDef) => void;
  onJoinOrCreateSect: (sectName: string) => void;
  onSectAction: (action: 'donate' | 'skill' | 'red_packet' | 'sect_war') => void;
  onChallengeArena: (rivalId: string) => void;
}

export const CombatContentModal: React.FC<CombatContentModalProps> = ({
  player,
  activeTab,
  bossCooldowns,
  onSwitchTab,
  onClose,
  onChallengeDungeon,
  onChallengeBoss,
  onJoinOrCreateSect,
  onSectAction,
  onChallengeArena,
}) => {
  const [sectInput, setSectInput] = useState('九霄凌雲閣');
  const stats = computePlayerStats(player);
  const vipExtra =
    player.recharge.vipLevel > 0
      ? VIP_TIERS[player.recharge.vipLevel - 1].extraDungeonEntries
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="xianxia-panel w-full max-w-4xl max-h-[88vh] rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/40 bg-gradient-to-r from-[#7f1d1d]/90 via-[#4c1d95]/90 to-[#1e1b4b]/90">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-bold gold-text-gradient font-xianxia">
              三界征戰 · 副本 / 世界 BOSS / 宗門 / 跨服競技
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
            { id: 'world_boss' as const, label: '世界 BOSS', icon: <Skull className="w-4 h-4" /> },
            { id: 'dungeons' as const, label: '材料副本', icon: <Castle className="w-4 h-4" /> },
            { id: 'sect' as const, label: '宗門 & 仙盟戰', icon: <Users className="w-4 h-4" /> },
            { id: 'arena' as const, label: '跨服競技場', icon: <Trophy className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSwitchTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'xianxia-btn-crimson'
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
          {/* 1. 世界 BOSS */}
          {activeTab === 'world_boss' && (
            <div className="space-y-4">
              <div className="xianxia-card rounded-xl p-3.5 flex items-center justify-between">
                <span className="text-xs text-amber-100/90">
                  討伐太古神獸 BOSS，必爆紅裝與仙器神兵！點擊討伐將立即在中央戰場現身交鋒！
                </span>
                <span className="text-xs font-num text-amber-300">
                  已擊殺 BOSS：{player.bossKills} 次
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORLD_BOSSES.map((boss) => {
                  const cd = bossCooldowns[boss.id] || 0;
                  return (
                    <div
                      key={boss.id}
                      className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-300">{boss.title}</span>
                          <span className="text-xs font-num text-amber-200/80">
                            氣血 {formatNum(boss.maxHp)}
                          </span>
                        </div>
                        <h3
                          className="text-xl font-bold font-xianxia mt-1"
                          style={{ color: boss.color }}
                        >
                          {boss.name}
                        </h3>
                        <p className="text-xs text-amber-100/80 mt-1.5">{boss.rewardsDesc}</p>
                      </div>

                      <button
                        type="button"
                        disabled={cd > 0}
                        onClick={() => onChallengeBoss(boss)}
                        className="w-full py-2.5 rounded-lg xianxia-btn-crimson text-xs font-bold disabled:opacity-50 font-num"
                      >
                        {cd > 0 ? `重生倒數 ${cd} 秒` : '立即前往討伐 BOSS'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. 副本 */}
          {activeTab === 'dungeons' && (
            <div className="space-y-4">
              <div className="text-xs text-amber-200 flex items-center justify-between">
                <span>每日免費挑戰次數隨 VIP 等級額外增加（當前 VIP{player.recharge.vipLevel} 額外 +{vipExtra} 次）</span>
                <span className="font-num text-cyan-300">我的戰力：{stats.combatPower.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DUNGEONS.map((dng) => {
                  const used = player.dungeonUsed[dng.id] || 0;
                  const maxEntries = dng.dailyLimit + vipExtra;
                  const remaining = Math.max(0, maxEntries - used);
                  return (
                    <div key={dng.id} className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold font-xianxia" style={{ color: dng.accent }}>
                            {dng.name}
                          </h3>
                          <span className="text-xs font-num text-amber-200">
                            剩餘 {remaining}/{maxEntries} 次
                          </span>
                        </div>
                        <p className="text-xs text-amber-100/80 mt-1">{dng.subtitle}</p>
                        <div className="text-xs text-amber-300 font-bold mt-2">{dng.rewardSummary}</div>
                      </div>
                      <button
                        type="button"
                        disabled={remaining <= 0}
                        onClick={() => onChallengeDungeon(dng.id)}
                        className="w-full py-2.5 rounded-lg xianxia-btn-gold text-xs font-bold disabled:opacity-45"
                      >
                        {remaining > 0 ? '一鍵掃蕩通關領獎' : '今日次數已用盡（升級 VIP 增加次數）'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. 宗門 & 仙盟戰 */}
          {activeTab === 'sect' && (
            <div className="space-y-4">
              {!player.sect.joined ? (
                <div className="xianxia-card rounded-xl p-6 space-y-4 max-w-xl mx-auto text-center">
                  <h3 className="text-xl font-bold gold-text-gradient font-xianxia">
                    開宗立派 · 或加入九霄名門
                  </h3>
                  <p className="text-xs text-amber-100/80">
                    加入宗門可修煉絕世宗門心法、領取宗門每日紅包，更能率領同門出戰【跨服仙盟戰】！
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={10}
                      value={sectInput}
                      onChange={(e) => setSectInput(e.target.value)}
                      className="flex-1 bg-[#11061e] border border-amber-500/50 rounded-md px-3 py-2 text-sm text-amber-100"
                      placeholder="輸入宗門名稱"
                    />
                    <button
                      type="button"
                      onClick={() => onJoinOrCreateSect(sectInput || '九霄凌雲閣')}
                      className="px-5 py-2 rounded-md xianxia-btn-gold text-xs font-bold"
                    >
                      立即創立 / 加入
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {['青雲劍宗', '太虛仙盟', '九幽魔教'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onJoinOrCreateSect(preset)}
                        className="px-3.5 py-1.5 rounded bg-purple-950/80 border border-amber-500/30 text-xs text-amber-200 hover:border-amber-300"
                      >
                        加入【{preset}】
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="xianxia-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-rose-300 font-bold">Lv.{player.sect.level} 至尊仙盟</div>
                      <h3 className="text-xl font-bold gold-text-gradient font-xianxia">
                        【{player.sect.name}】
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-num">
                      <span>宗門貢獻：<strong className="text-amber-300">{player.sect.contribution}</strong></span>
                      <span>心法等級：<strong className="text-cyan-300">Lv.{player.sect.skillLevel}</strong></span>
                      <span>仙盟戰績：<strong className="text-rose-300">{player.sect.warPoints}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-amber-200">宗門靈脈捐獻</h4>
                        <p className="text-xs text-amber-100/75 mt-1">捐獻 10,000 金幣換取 200 宗門貢獻與 10 強化神石</p>
                      </div>
                      <button
                        type="button"
                        disabled={player.gold < 10000}
                        onClick={() => onSectAction('donate')}
                        className="w-full py-2 rounded-lg xianxia-btn-gold text-xs font-bold disabled:opacity-45"
                      >
                        捐獻 10,000 金幣
                      </button>
                    </div>

                    <div className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-cyan-200">參悟宗門心法</h4>
                        <p className="text-xs text-amber-100/75 mt-1">消耗 150 貢獻提升心法，永久暴增氣血、攻擊與防禦！</p>
                      </div>
                      <button
                        type="button"
                        disabled={player.sect.contribution < 150}
                        onClick={() => onSectAction('skill')}
                        className="w-full py-2 rounded-lg xianxia-btn-purple text-xs font-bold disabled:opacity-45"
                      >
                        消耗 150 貢獻修煉
                      </button>
                    </div>

                    <div className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
                          <Gift className="w-4 h-4" />
                          宗門神豪紅包
                        </h4>
                        <p className="text-xs text-amber-100/75 mt-1">每日領取宗主發放的仙玉紅包與進階丹！</p>
                      </div>
                      <button
                        type="button"
                        disabled={player.sect.redEnvelopeClaimed}
                        onClick={() => onSectAction('red_packet')}
                        className="w-full py-2 rounded-lg xianxia-btn-crimson text-xs font-bold disabled:opacity-45"
                      >
                        {player.sect.redEnvelopeClaimed ? '今日紅包已領取' : '搶領宗門紅包 (+188 仙玉)'}
                      </button>
                    </div>

                    <div className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3 border-amber-400">
                      <div>
                        <h4 className="text-sm font-bold gold-text-gradient flex items-center gap-1.5">
                          <Swords className="w-4 h-4 text-amber-300" />
                          九霄仙盟爭霸戰
                        </h4>
                        <p className="text-xs text-amber-100/75 mt-1">率領宗門攻佔上古靈脈城池，贏取大量仙玉與戰績！</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSectAction('sect_war')}
                        className="w-full py-2 rounded-lg xianxia-btn-gold text-xs font-bold"
                      >
                        立即出戰仙盟戰！
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. 跨服競技場 */}
          {activeTab === 'arena' && (
            <div className="space-y-4">
              <div className="xianxia-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold gold-text-gradient font-xianxia">
                    九霄跨服天梯競技場 · 真實演武台對決
                  </h3>
                  <p className="text-xs text-amber-100/80">
                    進入競技場將傳送至【九霄跨服演武台】與他服強者真人切磋，戰勝後返回原地圖並獎勵大量仙玉與限定稱號！
                  </p>
                </div>
                <div className="text-right font-num text-xs">
                  <div className="text-amber-300 font-bold text-sm">當前排名：第 {player.arenaRank} 名</div>
                  <div className="text-cyan-300">戰力：{stats.combatPower.toLocaleString()} · 勝場：{player.arenaWins}</div>
                </div>
              </div>

              <div className="space-y-2.5">
                {ARENA_RIVALS.map((rv) => {
                  const canBeat = stats.combatPower >= rv.power * 0.85;
                  const rvCls = CLASSES.find((c) => c.id === rv.classId) || CLASSES[0];
                  const rvRealm = REALMS[rv.realmIndex] || REALMS[0];
                  return (
                    <div
                      key={rv.id}
                      className="xianxia-card rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="px-2.5 py-1 rounded bg-purple-950 border border-amber-500/40 text-xs font-bold text-amber-300 font-num shrink-0">
                          第 {rv.rank} 名
                        </span>
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-amber-400/50 shrink-0 bg-[#120722]">
                          <img
                            src={rvCls.portrait}
                            alt={rv.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-amber-100">
                              [VIP{rv.vip}] {rv.name}
                            </span>
                            <TitleBadge titleId={rv.titleId} size="sm" />
                          </div>
                          <div className="text-[11px] text-purple-200/85 font-num flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Lv.{rv.level} · {rvRealm.shortName}{rv.realmLayer}層 · {rvCls.name}</span>
                            <span className="text-amber-300 font-bold">戰力：{formatNum(rv.power)}</span>
                            <span className="text-emerald-300">氣血：{formatNum(rv.hp)}</span>
                            <span className="text-cyan-300">勝獎：+{rv.rewardJade}仙玉</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChallengeArena(rv.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold shrink-0 ${
                          canBeat ? 'xianxia-btn-gold' : 'xianxia-btn-crimson'
                        }`}
                      >
                        {canBeat ? '進入演武台對戰' : '越階切磋'}
                      </button>
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
