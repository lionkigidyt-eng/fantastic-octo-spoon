import React, { useEffect, useState } from 'react';
import {
  Crown,
  Flame,
  Gift,
  Gem,
  ShoppingBag,
  Sparkles,
  Trophy,
  X,
  Check,
  Clock,
  ShieldCheck,
  Zap,
  CheckCheck,
} from 'lucide-react';
import {
  CONSECUTIVE_DAYS_TIERS,
  DAILY_CUMULATIVE_TIERS,
  FIRST_RECHARGE_PACKS,
  GROWTH_FUND_MILESTONES,
  MALL_ITEMS,
  REALMS,
  RIVAL_WHALES,
  TOPUP_TIERS,
  TOTAL_CUMULATIVE_TIERS,
  VIP_TIERS,
} from '../../data/xianxiaData';
import { PlayerState, RechargeSubTab } from '../../types/game';
import { formatNum } from '../../utils/gameLogic';
import { ItemMiniIcon, MiniItemKind, RewardIconChip } from '../ItemMiniIcon';

interface PendingCheckout {
  title: string;
  yuan: number;
  baseJade: number;
  bonusJade: number;
  vipExp: number;
  extraDesc: string;
  onConfirm: (paymentLabel: string) => void;
}

interface RechargeCenterModalProps {
  player: PlayerState;
  initialTab: RechargeSubTab;
  onClose: () => void;
  onSimulateRecharge: (yuan: number, tierId?: string, paymentLabel?: string) => void;
  onClaimFirstRecharge: (yuan: number) => void;
  onClaimVipDaily: () => void;
  onBuyVipGift: (vipLevel: number) => void;
  onBuyCard: (kind: 'month' | 'permanent', paymentLabel?: string) => void;
  onClaimCardDaily: (kind: 'month' | 'permanent') => void;
  onBuySupremePrivilege: (id: 'exp_50' | 'auto_smelt' | 'boss_drop', costJade: number) => void;
  onClaimCumulative: (kind: 'daily' | 'total' | 'consecutive', key: number) => void;
  onClaimAllAvailable: () => void;
  onBuySpecialPack: (
    kind: 'flash' | 'value' | 'daily',
    packId: string,
    yuanCost: number,
    jadeCost: number,
    rewards: { jade?: number; gold?: number; stones?: number; compStones?: number; cultivation?: number; redGear?: boolean },
    paymentLabel?: string
  ) => void;
  onBuyGrowthFund: () => void;
  onClaimGrowthFund: (idx: number) => void;
  onBuyBattlePassPro: (paymentLabel?: string) => void;
  onClaimBattlePass: (level: number, track: 'free' | 'pro') => void;
  onBuyMallItem: (itemId: string, useBoundJade?: boolean) => void;
}

const SUB_TABS: { id: RechargeSubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'first_recharge', label: '首儲禮包', icon: <Gift className="w-3.5 h-3.5" /> },
  { id: 'topup', label: '首充雙倍', icon: <Gem className="w-3.5 h-3.5" /> },
  { id: 'vip', label: 'VIP1~15特權', icon: <Crown className="w-3.5 h-3.5" /> },
  { id: 'cards', label: '月卡/永久/至尊', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'cumulative', label: '累儲/連儲豪禮', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'flash_deals', label: '限時/超值/每日', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'fund_pass', label: '成長基金/戰令', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'mall', label: '仙玉/特權商城', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { id: 'tycoon_rank', label: '神豪排行榜', icon: <Trophy className="w-3.5 h-3.5" /> },
];

export const RechargeCenterModal: React.FC<RechargeCenterModalProps> = ({
  player,
  initialTab,
  onClose,
  onSimulateRecharge,
  onClaimFirstRecharge,
  onClaimVipDaily,
  onBuyVipGift,
  onBuyCard,
  onClaimCardDaily,
  onBuySupremePrivilege,
  onClaimCumulative,
  onClaimAllAvailable,
  onBuySpecialPack,
  onBuyGrowthFund,
  onClaimGrowthFund,
  onBuyBattlePassPro,
  onClaimBattlePass,
  onBuyMallItem,
}) => {
  const [tab, setTab] = useState<RechargeSubTab>(initialTab);
  const [selectedVip, setSelectedVip] = useState<number>(Math.max(1, player.recharge.vipLevel || 1));
  const [flashSeconds, setFlashSeconds] = useState(3542);
  const [instantPayMode, setInstantPayMode] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [payMethod, setPayMethod] = useState<
    'google_play' | '711_ibon' | 'family_port' | 'line_pay' | 'mycard' | 'telecom'
  >('google_play');
  const [mallCurrencyFilter, setMallCurrencyFilter] = useState<'jade' | 'bound'>('jade');

  const PAYMENT_METHODS = [
    { id: 'google_play' as const, label: 'Google Play', sub: 'Google Play 餘額/信用卡' },
    { id: '711_ibon' as const, label: '7-11 ibon', sub: '超商代碼繳費' },
    { id: 'family_port' as const, label: '全家 FamiPort', sub: '全家代碼繳費' },
    { id: 'line_pay' as const, label: 'LINE Pay', sub: '行動快速結帳' },
    { id: 'mycard' as const, label: 'MyCard', sub: '點數卡/會員扣點' },
    { id: 'telecom' as const, label: '電信帳單', sub: '中華/遠傳/台哥大' },
  ];

  const getPayLabel = (id: typeof payMethod) =>
    PAYMENT_METHODS.find((m) => m.id === id)?.label || 'Google Play';

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const id = setInterval(() => {
      setFlashSeconds((s) => (s > 1 ? s - 1 : 3600));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const rc = player.recharge;
  const nextVip = VIP_TIERS.find((v) => v.level === rc.vipLevel + 1);
  const curVipInfo = VIP_TIERS[selectedVip - 1] || VIP_TIERS[0];

  const hh = String(Math.floor(flashSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((flashSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(flashSeconds % 60).padStart(2, '0');

  const triggerPayment = (checkout: PendingCheckout) => {
    if (instantPayMode) {
      checkout.onConfirm(getPayLabel(payMethod));
    } else {
      setPendingCheckout(checkout);
    }
  };

  // Count total claimable rewards across cumulative/daily/vip/cards
  const claimableCount =
    FIRST_RECHARGE_PACKS.filter((p) => rc.totalRechargeYuan >= p.yuan && !rc.firstRechargeTierClaimed.includes(p.yuan)).length +
    DAILY_CUMULATIVE_TIERS.filter((t) => rc.dailyRechargeYuan >= t.yuan && !rc.dailyCumulativeClaimed.includes(t.yuan)).length +
    TOTAL_CUMULATIVE_TIERS.filter((t) => rc.totalRechargeYuan >= t.yuan && !rc.totalCumulativeClaimed.includes(t.yuan)).length +
    CONSECUTIVE_DAYS_TIERS.filter((t) => rc.totalRechargeYuan > 0 && rc.consecutiveDays >= t.day && !rc.consecutiveClaimedDays.includes(t.day)).length +
    (rc.vipLevel > 0 && !rc.vipDailyClaimedDay ? 1 : 0) +
    (rc.monthCardDays > 0 && !rc.monthCardClaimedToday ? 1 : 0) +
    (rc.permanentCard && !rc.permanentCardClaimedToday ? 1 : 0);

  const whaleRanking = [
    ...RIVAL_WHALES.map((r) => ({ ...r, isSelf: false })),
    {
      name: player.name,
      vip: rc.vipLevel,
      yuan: rc.totalRechargeYuan,
      power: 0,
      title: player.title,
      isSelf: true,
    },
  ].sort((a, b) => b.yuan - a.yuan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="xianxia-panel relative w-full max-w-5xl max-h-[88vh] rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-amber-500/40 bg-gradient-to-r from-[#450a0a]/95 via-[#3b0764]/95 to-[#450a0a]/95">
          <div className="flex items-center gap-3 min-w-0">
            <Crown className="w-6 h-6 text-amber-300 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold gold-text-gradient font-xianxia truncate">
              九霄聚寶閣 · 儲值特權中心
            </h2>
            <div className="hidden lg:flex items-center gap-3 ml-3 text-xs text-amber-200 font-num">
              <span>VIP{rc.vipLevel}</span>
              <span>·</span>
              <span>仙玉 {formatNum(player.jade)}</span>
              <span>·</span>
              <span>綁玉 {formatNum(player.boundJade)}</span>
              <span>·</span>
              <span>累計 ¥{rc.totalRechargeYuan}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {claimableCount > 0 && (
              <button
                type="button"
                onClick={onClaimAllAvailable}
                className="px-3 py-1.5 rounded-md xianxia-btn-gold text-xs font-bold flex items-center gap-1 whitespace-nowrap"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                一鍵全領 ({claimableCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setInstantPayMode((v) => !v)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${
                instantPayMode
                  ? 'bg-emerald-900/70 border-emerald-400 text-emerald-200'
                  : 'bg-black/40 border-amber-500/40 text-amber-200'
              }`}
              title="切換是否跳過結算彈窗直接秒儲"
            >
              {instantPayMode ? '極速秒儲：開' : '結算確認：開'}
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

        {/* VIP Progress Strip */}
        <div className="px-5 py-2.5 bg-[#19092b] border-b border-amber-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-red-600 text-white font-bold font-num">
              VIP {rc.vipLevel}
            </span>
            {nextVip ? (
              <span className="text-amber-100/90">
                再儲值 <strong className="text-amber-300 font-num">¥{Math.max(0, nextVip.reqYuan - rc.totalRechargeYuan)}</strong> 即可晉升 <strong className="text-amber-300">VIP{nextVip.level}【{nextVip.title}】</strong>（攻擊 +{nextVip.atkPctBonus}%）
              </span>
            ) : (
              <span className="text-amber-300 font-bold">已達全服至高 VIP15【鴻蒙主宰】！</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-purple-200 font-num">
              {rc.totalRechargeYuan} / {nextVip ? nextVip.reqYuan : 40000}
            </span>
            <div className="w-40 h-2.5 rounded-full bg-black/60 border border-amber-500/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-yellow-200 transition-all"
                style={{
                  width: `${
                    nextVip
                      ? Math.min(100, Math.round((rc.totalRechargeYuan / nextVip.reqYuan) * 100))
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#140724] border-b border-amber-500/30 overflow-x-auto">
          {SUB_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? 'xianxia-btn-crimson'
                    : 'bg-[#271142] text-amber-100/80 border border-amber-500/25 hover:border-amber-400/60'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. 首儲禮包 */}
          {tab === 'first_recharge' && (
            <div className="space-y-4">
              <div className="xianxia-card rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-red-950/80 via-purple-950/80 to-amber-950/60">
                <div>
                  <h3 className="text-lg font-bold gold-text-gradient font-xianxia">
                    開服鉅獻 · 三檔首儲豪禮大放送
                  </h3>
                  <p className="text-xs text-amber-100/80 mt-0.5">
                    任意儲值累計達標即可解鎖對應檔位，贈送絕版紅裝神兵、仙器與戰力飆升！
                  </p>
                </div>
                <span className="text-xs font-num text-amber-300">
                  目前累計儲值：¥{rc.totalRechargeYuan}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FIRST_RECHARGE_PACKS.map((pk) => {
                  const unlocked = rc.totalRechargeYuan >= pk.yuan;
                  const claimed = rc.firstRechargeTierClaimed.includes(pk.yuan);
                  return (
                    <div key={pk.yuan} className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-4">
                      <div>
                        <div className="text-xs text-rose-300 font-bold">{pk.tag}</div>
                        <h4 className="text-base font-bold text-amber-200 font-xianxia mt-1">
                          {pk.name}
                        </h4>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(pk.yuan === 6
                            ? [
                                { kind: 'red_gear' as MiniItemKind, label: '七星龍淵劍', count: '紅裝' },
                                { kind: 'comp_stones' as MiniItemKind, label: '進階丹', count: '×30' },
                                { kind: 'bound_jade' as MiniItemKind, label: '綁定仙玉', count: '×500' },
                                { kind: 'gold' as MiniItemKind, label: '金幣', count: '100萬' },
                                { kind: 'jade' as MiniItemKind, label: '仙玉', count: `×${pk.bonusJade}` },
                              ]
                            : pk.yuan === 30
                            ? [
                                { kind: 'wing' as MiniItemKind, label: '極品神翼', count: '直進2階' },
                                { kind: 'red_gear' as MiniItemKind, label: '紫微龍鱗甲', count: '紅裝' },
                                { kind: 'stones' as MiniItemKind, label: '強化石', count: '×120' },
                                { kind: 'jade' as MiniItemKind, label: '仙玉', count: `×${pk.bonusJade}` },
                              ]
                            : [
                                { kind: 'immortal_gear' as MiniItemKind, label: '九霄鴻蒙劍', count: '仙器' },
                                { kind: 'pet' as MiniItemKind, label: '絕版靈寵', count: '直進3階' },
                                { kind: 'comp_stones' as MiniItemKind, label: '進階丹', count: '×200' },
                                { kind: 'jade' as MiniItemKind, label: '仙玉', count: `×${pk.bonusJade}` },
                              ]
                          ).map((chip) => (
                            <RewardIconChip key={chip.label} {...chip} />
                          ))}
                        </div>
                      </div>

                      {claimed ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          已領取豪禮
                        </button>
                      ) : unlocked ? (
                        <button
                          type="button"
                          onClick={() => onClaimFirstRecharge(pk.yuan)}
                          className="w-full py-2.5 rounded-lg xianxia-btn-gold text-xs font-bold"
                        >
                          立即領取首儲禮包
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            triggerPayment({
                              title: pk.name,
                              yuan: pk.yuan,
                              baseJade: pk.yuan * 10,
                              bonusJade: pk.bonusJade,
                              vipExp: pk.yuan,
                              extraDesc: pk.rewards.join(' + '),
                              onConfirm: (payLabel) => onSimulateRecharge(pk.yuan, undefined, payLabel),
                            })
                          }
                          className="w-full py-2.5 rounded-lg xianxia-btn-crimson text-xs font-bold"
                        >
                          儲值 ¥{pk.yuan} 解鎖豪禮
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. 首充雙倍 · 仙玉儲值 */}
          {tab === 'topup' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-amber-300 font-xianxia">
                  儲值仙玉（每檔首次儲值享 200% 首充雙倍返利 + 尊貴 VIP 經驗）
                </h3>
                <span className="text-xs text-emerald-300">支援 結算預覽 / 一鍵秒儲</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {TOPUP_TIERS.map((tier) => {
                  const doubleAvailable = !rc.firstDoubleUsedIds.includes(tier.id);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() =>
                        triggerPayment({
                          title: `儲值 ${tier.jade} 仙玉`,
                          yuan: tier.yuan,
                          baseJade: tier.jade,
                          bonusJade: doubleAvailable ? tier.jade : 0,
                          vipExp: tier.yuan,
                          extraDesc: doubleAvailable ? '首次儲值觸發 200% 首充雙倍返利！' : '累計 VIP 經驗與累儲進度',
                          onConfirm: (payLabel) => onSimulateRecharge(tier.yuan, tier.id, payLabel),
                        })
                      }
                      className="xianxia-card rounded-xl p-4 text-left hover:border-amber-300 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${doubleAvailable ? 'text-rose-300' : 'text-cyan-300'}`}>
                          {doubleAvailable ? '首充雙倍!' : '超值直充'}
                        </span>
                        {tier.hot && (
                          <span className="text-[11px] text-amber-300 font-bold">熱銷推薦</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <ItemMiniIcon kind="jade" size="sm" />
                        <span className="text-2xl font-bold gold-text-gradient font-num">
                          {doubleAvailable ? tier.jade * 2 : tier.jade}
                        </span>
                        <span className="text-xs text-amber-100/80">仙玉</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <RewardIconChip kind="jade" label="基礎仙玉" count={`×${tier.jade}`} />
                        {doubleAvailable && <RewardIconChip kind="jade" label="雙倍贈送" count={`+${tier.jade}`} />}
                        <RewardIconChip kind="vip" label="VIP經驗" count={`+${tier.yuan}`} />
                      </div>
                      <div className="w-full py-2 rounded-md xianxia-btn-gold text-center text-sm font-bold font-num">
                        ¥ {tier.yuan} 元
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. VIP1 ~ VIP15 */}
          {tab === 'vip' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {VIP_TIERS.map((v) => {
                  const unlocked = rc.vipLevel >= v.level;
                  const active = selectedVip === v.level;
                  return (
                    <button
                      key={v.level}
                      type="button"
                      onClick={() => setSelectedVip(v.level)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold font-num transition-all ${
                        active
                          ? 'xianxia-btn-gold'
                          : unlocked
                          ? 'bg-red-900/70 border border-amber-400/60 text-amber-200'
                          : 'bg-[#200d38] border border-purple-500/30 text-purple-300/70'
                      }`}
                    >
                      VIP{v.level}
                    </button>
                  );
                })}
              </div>

              <div className="xianxia-card rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold gold-text-gradient font-xianxia">
                      VIP {curVipInfo.level} · 【{curVipInfo.title}】
                    </h3>
                    <span className="text-xs text-amber-200/85 font-num">
                      累計儲值 ¥{curVipInfo.reqYuan} 解鎖
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-black/35 rounded-lg p-2.5 border border-amber-500/20">
                      <div className="text-purple-200/75">專屬坐騎</div>
                      <div className="text-amber-300 font-bold mt-0.5">{curVipInfo.exclusiveMount}</div>
                    </div>
                    <div className="bg-black/35 rounded-lg p-2.5 border border-amber-500/20">
                      <div className="text-purple-200/75">專屬神裝</div>
                      <div className="text-rose-300 font-bold mt-0.5">{curVipInfo.exclusiveGear}</div>
                    </div>
                    <div className="bg-black/35 rounded-lg p-2.5 border border-amber-500/20">
                      <div className="text-purple-200/75">副本次數 / 經驗加成</div>
                      <div className="text-cyan-300 font-bold mt-0.5 font-num">
                        +{curVipInfo.extraDungeonEntries} 次 / +{curVipInfo.expPctBonus}% 經驗
                      </div>
                    </div>
                    <div className="bg-black/35 rounded-lg p-2.5 border border-amber-500/20">
                      <div className="text-purple-200/75">全屬性攻擊加成</div>
                      <div className="text-amber-300 font-bold mt-0.5 font-num">
                        +{curVipInfo.atkPctBonus}% 攻擊力
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-bold text-amber-200">VIP{curVipInfo.level} 尊享特權清單：</div>
                    {curVipInfo.privileges.map((priv) => (
                      <div key={priv} className="text-xs text-amber-50/90 flex items-center gap-2">
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{priv}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-5 flex flex-col justify-between gap-3 bg-black/30 rounded-xl p-4 border border-amber-500/30">
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-amber-300 font-xianxia">
                      VIP 每日福利 & 專屬優惠禮包
                    </div>
                    <p className="text-xs text-amber-100/80">
                      當前 VIP{rc.vipLevel} 每日可免費領取：
                      <span className="text-amber-300 font-bold">
                        {rc.vipLevel > 0 ? `${VIP_TIERS[rc.vipLevel - 1].dailyJade} 仙玉 + ${formatNum(VIP_TIERS[rc.vipLevel - 1].dailyGold)} 金幣` : '儲值 ¥6 激活 VIP1 即領每日仙玉！'}
                      </span>
                    </p>
                    <button
                      type="button"
                      disabled={rc.vipLevel === 0 || rc.vipDailyClaimedDay}
                      onClick={onClaimVipDaily}
                      className="w-full py-2 rounded-lg xianxia-btn-gold text-xs font-bold disabled:opacity-50"
                    >
                      {rc.vipDailyClaimedDay ? '今日 VIP 福利已領取' : '領取今日 VIP 福利'}
                    </button>
                  </div>

                  <div className="border-t border-amber-500/25 pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-300">VIP{curVipInfo.level} 專屬特權禮包</span>
                      <span className="line-through text-purple-300/60 font-num">原價 {curVipInfo.giftOrigCost} 仙玉</span>
                    </div>
                    <div className="text-xs text-amber-100/85">{curVipInfo.giftContents}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <RewardIconChip
                        kind={curVipInfo.level >= 9 ? 'immortal_gear' : 'red_gear'}
                        label={curVipInfo.exclusiveGear}
                      />
                      <RewardIconChip kind="gold" label="金幣" count={`+${formatNum(curVipInfo.level * 150000)}`} />
                      <RewardIconChip kind="stones" label="強化石" count={`×${curVipInfo.level * 35}`} />
                      <RewardIconChip kind="comp_stones" label="進階丹" count={`×${curVipInfo.level * 25}`} />
                    </div>
                    {rc.vipGiftsBought.includes(curVipInfo.level) ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
                      >
                        已購買 VIP{curVipInfo.level} 禮包
                      </button>
                    ) : rc.vipLevel < curVipInfo.level ? (
                      <button
                        type="button"
                        onClick={() => {
                          const need = Math.max(1, curVipInfo.reqYuan - rc.totalRechargeYuan);
                          triggerPayment({
                            title: `直升 VIP${curVipInfo.level}【${curVipInfo.title}】`,
                            yuan: need,
                            baseJade: need * 10,
                            bonusJade: 0,
                            vipExp: need,
                            extraDesc: `儲值差額 ¥${need} 立即解鎖 VIP${curVipInfo.level} 全部特權！`,
                            onConfirm: (payLabel) => onSimulateRecharge(need, undefined, payLabel),
                          });
                        }}
                        className="w-full py-2 rounded-lg xianxia-btn-crimson text-xs font-bold font-num"
                      >
                        補差額 ¥{Math.max(1, curVipInfo.reqYuan - rc.totalRechargeYuan)} 直升 VIP{curVipInfo.level}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={player.jade < curVipInfo.giftJadeCost}
                        onClick={() => onBuyVipGift(curVipInfo.level)}
                        className="w-full py-2 rounded-lg xianxia-btn-gold text-xs font-bold disabled:opacity-50 font-num"
                      >
                        {player.jade < curVipInfo.giftJadeCost
                          ? `仙玉不足（需 ${curVipInfo.giftJadeCost}）`
                          : `${curVipInfo.giftJadeCost} 仙玉超值搶購`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. 月卡、永久卡 & 至尊特權 */}
          {tab === 'cards' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="xianxia-card rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-cyan-300 font-xianxia">仙道月卡（30天）</h3>
                      <span className="text-xs font-num text-amber-300">
                        {rc.monthCardDays > 0 ? `剩餘 ${rc.monthCardDays} 天` : '未開通'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-100/85 mt-2 leading-relaxed">
                      購買立即領取，之後連續 30 天每日可再領超值靈玉與金幣！
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <RewardIconChip kind="jade" label="立得仙玉" count="×300" />
                      <RewardIconChip kind="vip" label="VIP經驗" count="+30" />
                      <RewardIconChip kind="bound_jade" label="每日綁玉" count="×200" />
                      <RewardIconChip kind="gold" label="每日金幣" count="5萬" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        triggerPayment({
                          title: '仙道月卡（30天）',
                          yuan: 30,
                          baseJade: 300,
                          bonusJade: 0,
                          vipExp: 30,
                          extraDesc: '獲得 30 天月卡資格，每日可領 200 綁玉 + 5萬金幣',
                          onConfirm: (payLabel) => onBuyCard('month', payLabel),
                        })
                      }
                      className="flex-1 py-2.5 rounded-lg xianxia-btn-crimson text-xs font-bold"
                    >
                      ¥30 開通 / 續費月卡
                    </button>
                    {rc.monthCardDays > 0 && (
                      <button
                        type="button"
                        disabled={rc.monthCardClaimedToday}
                        onClick={() => onClaimCardDaily('month')}
                        className="px-4 py-2.5 rounded-lg xianxia-btn-gold text-xs font-bold disabled:opacity-50"
                      >
                        {rc.monthCardClaimedToday ? '今日已領' : '每日領獎'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="xianxia-card rounded-xl p-5 flex flex-col justify-between gap-4 border-amber-400">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold gold-text-gradient font-xianxia">至尊永久終身卡</h3>
                      <span className="text-xs font-bold text-rose-300">
                        {rc.permanentCard ? '已永久激活' : '終身返利'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-100/85 mt-2 leading-relaxed">
                      終身激活九霄至尊特權，每日免費領海量真仙玉與進階丹！
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <RewardIconChip kind="jade" label="立得仙玉" count="×980" />
                      <RewardIconChip kind="vip" label="VIP經驗" count="+98" />
                      <RewardIconChip kind="jade" label="每日仙玉" count="×500" />
                      <RewardIconChip kind="comp_stones" label="每日進階丹" count="×10" />
                    </div>
                  </div>
                  {rc.permanentCard ? (
                    <button
                      type="button"
                      disabled={rc.permanentCardClaimedToday}
                      onClick={() => onClaimCardDaily('permanent')}
                      className="w-full py-2.5 rounded-lg xianxia-btn-gold text-xs font-bold disabled:opacity-50"
                    >
                      {rc.permanentCardClaimedToday ? '今日終身卡福利已領取' : '領取今日 500 仙玉 + 進階丹'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        triggerPayment({
                          title: '至尊永久終身卡',
                          yuan: 98,
                          baseJade: 980,
                          bonusJade: 0,
                          vipExp: 98,
                          extraDesc: '永久激活終身福利：每日領 500 仙玉 + 10 進階丹！',
                          onConfirm: (payLabel) => onBuyCard('permanent', payLabel),
                        })
                      }
                      className="w-full py-2.5 rounded-lg xianxia-btn-gold text-xs font-bold"
                    >
                      ¥98 開通至尊永久卡
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-amber-300 font-xianxia mb-3">
                  三大至尊特權卡（永久生效 · 打怪修仙事半功倍）
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {[
                    { id: 'exp_50' as const, name: '九霄經驗至尊權', desc: '打怪經驗永久額外 +50%，境界飛速暴漲', cost: 480 },
                    { id: 'auto_smelt' as const, name: '聚寶自動熔煉權', desc: '自動熔煉低階白綠裝，強化石收益大增', cost: 380 },
                    { id: 'boss_drop' as const, name: '神獸必掉至尊權', desc: '妖魔與 BOSS 掉寶率大幅提升，紅裝滾滾來', cost: 680 },
                  ].map((sp) => {
                    const owned = rc.supremePrivileges.includes(sp.id);
                    return (
                      <div key={sp.id} className="xianxia-card rounded-xl p-4 flex flex-col justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-amber-200 font-xianxia">{sp.name}</div>
                          <p className="text-xs text-amber-100/80 mt-1.5">{sp.desc}</p>
                        </div>
                        <button
                          type="button"
                          disabled={owned}
                          onClick={() => onBuySupremePrivilege(sp.id, sp.cost)}
                          className="w-full py-2 rounded-lg xianxia-btn-purple text-xs font-bold disabled:opacity-60 font-num"
                        >
                          {owned ? '已激活至尊特權' : `${sp.cost} 仙玉激活`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 5. 每日累儲 / 累計儲值 / 連續儲值 */}
          {tab === 'cumulative' && (
            <div className="space-y-6">
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-amber-300 font-xianxia">每日累儲豪禮</h3>
                  <span className="text-xs text-amber-100 font-num">今日已儲值：¥{rc.dailyRechargeYuan}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {DAILY_CUMULATIVE_TIERS.map((t) => {
                    const ok = rc.dailyRechargeYuan >= t.yuan;
                    const claimed = rc.dailyCumulativeClaimed.includes(t.yuan);
                    return (
                      <div key={t.yuan} className="xianxia-card rounded-lg p-3.5 flex flex-col justify-between gap-2.5">
                        <div>
                          <div className="text-xs font-bold text-rose-300 font-num">今日累儲 ¥{t.yuan} · {t.name}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <RewardIconChip kind="jade" label="仙玉" count={`×${t.jade}`} />
                            <RewardIconChip kind="stones" label="強化石" count={`×${t.stones}`} />
                            <RewardIconChip kind="comp_stones" label="進階丹" count={`×${t.compStones}`} />
                            <RewardIconChip kind="gold" label="金幣" count={formatNum(t.gold)} />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!ok || claimed}
                          onClick={() => onClaimCumulative('daily', t.yuan)}
                          className="w-full py-1.5 rounded xianxia-btn-gold text-xs font-bold disabled:opacity-45"
                        >
                          {claimed ? '已領取' : ok ? '領取獎勵' : '未達成'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-amber-300 font-xianxia">歷史累計儲值返利</h3>
                  <span className="text-xs text-amber-100 font-num">歷史累計：¥{rc.totalRechargeYuan}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {TOTAL_CUMULATIVE_TIERS.map((t) => {
                    const ok = rc.totalRechargeYuan >= t.yuan;
                    const claimed = rc.totalCumulativeClaimed.includes(t.yuan);
                    return (
                      <div key={t.yuan} className="xianxia-card rounded-lg p-3 flex flex-col justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-amber-300 font-num">累儲 ¥{t.yuan} · {t.name}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <RewardIconChip kind="jade" label="仙玉" count={`×${formatNum(t.jade)}`} />
                            <RewardIconChip kind="stones" label="石" count={`×${t.stones}`} />
                            <RewardIconChip kind="comp_stones" label="丹" count={`×${t.compStones}`} />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!ok || claimed}
                          onClick={() => onClaimCumulative('total', t.yuan)}
                          className="w-full py-1.5 rounded xianxia-btn-crimson text-xs font-bold disabled:opacity-45"
                        >
                          {claimed ? '已領取' : ok ? '立即領取' : '未達成'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-amber-300 font-xianxia">連續儲值天數獎勵</h3>
                  <span className="text-xs text-cyan-300 font-num">連續儲值：{rc.consecutiveDays} 天</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {CONSECUTIVE_DAYS_TIERS.map((t) => {
                    const ok = rc.totalRechargeYuan > 0 && rc.consecutiveDays >= t.day;
                    const claimed = rc.consecutiveClaimedDays.includes(t.day);
                    return (
                      <div key={t.day} className="xianxia-card rounded-lg p-3 flex flex-col justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-cyan-300">{t.label}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <RewardIconChip kind="jade" label="仙玉" count={`×${t.jade}`} />
                            <RewardIconChip kind="stones" label="強化石" count={`×${t.stones}`} />
                            <RewardIconChip kind="comp_stones" label="進階丹" count={`×${t.compStones}`} />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!ok || claimed}
                          onClick={() => onClaimCumulative('consecutive', t.day)}
                          className="w-full py-1.5 rounded xianxia-btn-purple text-xs font-bold disabled:opacity-45"
                        >
                          {claimed ? '已領取' : ok ? '領取' : '待解鎖'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* 6. 限時特惠 / 超值禮包 / 每日特惠 */}
          {tab === 'flash_deals' && (
            <div className="space-y-5">
              <div className="xianxia-card rounded-xl p-4 space-y-3 border-rose-500/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-rose-300 font-xianxia flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-300" />
                    限時特惠秒殺（1折瘋搶！）
                  </h3>
                  <span className="text-xs font-num text-amber-300">
                    剩餘時間：{hh}:{mm}:{ss}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'fl_1',
                      name: '限時·強化神石暴擊包',
                      desc: '強化石×100 · 50萬金幣',
                      yuan: 0,
                      jadeCost: 188,
                      rw: { stones: 100, jade: 0, gold: 500000 },
                      chips: [
                        { kind: 'stones' as MiniItemKind, label: '強化石', count: '×100' },
                        { kind: 'gold' as MiniItemKind, label: '金幣', count: '50萬' },
                      ],
                    },
                    {
                      id: 'fl_2',
                      name: '限時·神翼坐騎進階包',
                      desc: '進階丹×80 · 仙玉×500',
                      yuan: 18,
                      jadeCost: 0,
                      rw: { compStones: 80, jade: 500 },
                      chips: [
                        { kind: 'comp_stones' as MiniItemKind, label: '進階丹', count: '×80' },
                        { kind: 'jade' as MiniItemKind, label: '仙玉', count: '×500' },
                      ],
                    },
                    {
                      id: 'fl_3',
                      name: '限時·紅裝戰力飛躍包',
                      desc: '必出紅裝×1 · 強化石×150 · 進階丹×100',
                      yuan: 68,
                      jadeCost: 0,
                      rw: { redGear: true, stones: 150, compStones: 100, jade: 680 },
                      chips: [
                        { kind: 'red_gear' as MiniItemKind, label: '隨機紅裝', count: '×1' },
                        { kind: 'stones' as MiniItemKind, label: '強化石', count: '×150' },
                        { kind: 'comp_stones' as MiniItemKind, label: '進階丹', count: '×100' },
                        { kind: 'jade' as MiniItemKind, label: '仙玉', count: '×680' },
                      ],
                    },
                  ].map((pk) => {
                    const bought = rc.flashDealsBought.includes(pk.id);
                    return (
                      <div key={pk.id} className="bg-black/35 rounded-lg p-3.5 border border-amber-500/25 flex flex-col justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-amber-200">{pk.name}</div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {pk.chips.map((c) => (
                              <RewardIconChip key={c.label} {...c} />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={bought}
                          onClick={() => {
                            if (pk.yuan > 0) {
                              triggerPayment({
                                title: pk.name,
                                yuan: pk.yuan,
                                baseJade: pk.rw.jade || 0,
                                bonusJade: 0,
                                vipExp: pk.yuan,
                                extraDesc: pk.desc,
                                onConfirm: (payLabel) =>
                                  onBuySpecialPack('flash', pk.id, pk.yuan, pk.jadeCost, pk.rw, payLabel),
                              });
                            } else {
                              onBuySpecialPack('flash', pk.id, pk.yuan, pk.jadeCost, pk.rw);
                            }
                          }}
                          className="w-full py-2 rounded-md xianxia-btn-crimson text-xs font-bold disabled:opacity-50 font-num"
                        >
                          {bought ? '已限購領取' : pk.yuan > 0 ? `¥${pk.yuan} 秒殺搶購` : `${pk.jadeCost} 仙玉秒殺`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="xianxia-card rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-bold text-amber-300 font-xianxia">超值禮包（境界直衝）</h4>
                  {[
                    {
                      id: 'val_1',
                      name: '靈寵暴走超值禮包',
                      jadeCost: 260,
                      rw: { compStones: 60, stones: 60 },
                      chips: [
                        { kind: 'comp_stones' as MiniItemKind, label: '進階丹', count: '×60' },
                        { kind: 'stones' as MiniItemKind, label: '強化石', count: '×60' },
                      ],
                    },
                    {
                      id: 'val_2',
                      name: '渡劫破境修為大禮包',
                      jadeCost: 360,
                      rw: { cultivation: 15000, gold: 1500000 },
                      chips: [
                        { kind: 'cultivation' as MiniItemKind, label: '修為', count: '+1.5萬' },
                        { kind: 'gold' as MiniItemKind, label: '金幣', count: '150萬' },
                      ],
                    },
                    {
                      id: 'val_3',
                      name: '鴻蒙紅裝鑄造禮包',
                      jadeCost: 580,
                      rw: { redGear: true, stones: 120 },
                      chips: [
                        { kind: 'red_gear' as MiniItemKind, label: '極品紅裝', count: '×1' },
                        { kind: 'stones' as MiniItemKind, label: '強化石', count: '×120' },
                      ],
                    },
                  ].map((pk) => {
                    const bought = rc.valueBundlesBought.includes(pk.id);
                    return (
                      <div key={pk.id} className="flex items-center justify-between gap-3 bg-black/30 rounded-lg p-3 border border-amber-500/20">
                        <div className="space-y-1.5 min-w-0">
                          <div className="text-xs font-bold text-amber-200">{pk.name}</div>
                          <div className="flex flex-wrap gap-1">
                            {pk.chips.map((c) => (
                              <RewardIconChip key={c.label} {...c} />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={bought}
                          onClick={() => onBuySpecialPack('value', pk.id, 0, pk.jadeCost, pk.rw)}
                          className="px-3 py-1.5 rounded xianxia-btn-gold text-xs font-bold shrink-0 disabled:opacity-50 font-num"
                        >
                          {bought ? '已購買' : `${pk.jadeCost} 仙玉`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="xianxia-card rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-bold text-cyan-300 font-xianxia">每日特惠（1元 / 3元 / 6元）</h4>
                  {[
                    {
                      id: 'dy_1',
                      name: '1元每日特惠包',
                      desc: '仙玉×80 · 強化石×25 · 10萬金幣',
                      yuan: 1,
                      rw: { jade: 80, stones: 25, gold: 100000 },
                      chips: [
                        { kind: 'jade' as MiniItemKind, label: '仙玉', count: '×80' },
                        { kind: 'stones' as MiniItemKind, label: '強化石', count: '×25' },
                        { kind: 'gold' as MiniItemKind, label: '金幣', count: '10萬' },
                      ],
                    },
                    {
                      id: 'dy_3',
                      name: '3元每日特惠包',
                      desc: '仙玉×200 · 進階丹×30 · 30萬金幣',
                      yuan: 3,
                      rw: { jade: 200, compStones: 30, gold: 300000 },
                      chips: [
                        { kind: 'jade' as MiniItemKind, label: '仙玉', count: '×200' },
                        { kind: 'comp_stones' as MiniItemKind, label: '進階丹', count: '×30' },
                        { kind: 'gold' as MiniItemKind, label: '金幣', count: '30萬' },
                      ],
                    },
                    {
                      id: 'dy_6',
                      name: '6元每日奢華包',
                      desc: '仙玉×450 · 紅裝隨機箱 · 強化石×60',
                      yuan: 6,
                      rw: { jade: 450, redGear: true, stones: 60 },
                      chips: [
                        { kind: 'jade' as MiniItemKind, label: '仙玉', count: '×450' },
                        { kind: 'red_gear' as MiniItemKind, label: '紅裝箱', count: '×1' },
                        { kind: 'stones' as MiniItemKind, label: '強化石', count: '×60' },
                      ],
                    },
                  ].map((pk) => {
                    const bought = rc.dailySpecialsBought.includes(pk.id);
                    return (
                      <div key={pk.id} className="flex items-center justify-between gap-3 bg-black/30 rounded-lg p-3 border border-amber-500/20">
                        <div className="space-y-1.5 min-w-0">
                          <div className="text-xs font-bold text-cyan-200">{pk.name}</div>
                          <div className="flex flex-wrap gap-1">
                            {pk.chips.map((c) => (
                              <RewardIconChip key={c.label} {...c} />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={bought}
                          onClick={() =>
                            triggerPayment({
                              title: pk.name,
                              yuan: pk.yuan,
                              baseJade: pk.rw.jade || 0,
                              bonusJade: 0,
                              vipExp: pk.yuan,
                              extraDesc: pk.desc,
                              onConfirm: (payLabel) =>
                                onBuySpecialPack('daily', pk.id, pk.yuan, 0, pk.rw, payLabel),
                            })
                          }
                          className="px-3 py-1.5 rounded xianxia-btn-crimson text-xs font-bold shrink-0 disabled:opacity-50 font-num"
                        >
                          {bought ? '今日已買' : `¥${pk.yuan} 特惠`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 7. 成長基金 & 戰令通行證 */}
          {tab === 'fund_pass' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="xianxia-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold gold-text-gradient font-xianxia">九霄成長基金 (22倍返利!)</h3>
                    <p className="text-xs text-amber-100/80">花費 1,000 仙玉購買，突破境界共領 22,000 仙玉！</p>
                  </div>
                  <button
                    type="button"
                    disabled={rc.growthFundBought}
                    onClick={onBuyGrowthFund}
                    className="px-3.5 py-2 rounded-lg xianxia-btn-gold text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    {rc.growthFundBought ? '已購買基金' : '1,000 仙玉開通'}
                  </button>
                </div>
                <div className="space-y-2">
                  {GROWTH_FUND_MILESTONES.map((ms, idx) => {
                    const reached = player.realmIndex >= ms.realmIdx;
                    const claimed = rc.growthFundClaimedIndices.includes(idx);
                    return (
                      <div key={ms.label} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-amber-500/20 text-xs">
                        <div>
                          <span className="text-amber-200 font-bold">{ms.label}</span>
                          <span className="text-cyan-300 ml-2 font-num">+{ms.jade.toLocaleString()} 仙玉</span>
                        </div>
                        <button
                          type="button"
                          disabled={!rc.growthFundBought || !reached || claimed}
                          onClick={() => onClaimGrowthFund(idx)}
                          className="px-3 py-1 rounded xianxia-btn-crimson font-bold disabled:opacity-45"
                        >
                          {claimed ? '已領取' : reached ? '領取' : `需${REALMS[ms.realmIdx].shortName}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="xianxia-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-purple-200 font-xianxia">
                      九霄戰令通行證（當前 Lv.{rc.battlePassLevel}）
                    </h3>
                    <p className="text-xs text-amber-100/80">殺怪與挑戰副本自動升級戰令，解鎖至尊雙線獎勵！</p>
                  </div>
                  <button
                    type="button"
                    disabled={rc.battlePassPremium}
                    onClick={() =>
                      triggerPayment({
                        title: '至尊戰令通行證',
                        yuan: 68,
                        baseJade: 680,
                        bonusJade: 0,
                        vipExp: 68,
                        extraDesc: '永久解鎖至尊戰令獎勵線，領取大量仙玉！',
                        onConfirm: (payLabel) => onBuyBattlePassPro(payLabel),
                      })
                    }
                    className="px-3.5 py-2 rounded-lg xianxia-btn-purple text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    {rc.battlePassPremium ? '至尊戰令已激活' : '¥68 解鎖至尊戰令'}
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => {
                    const reached = rc.battlePassLevel >= lvl;
                    const freeClaimed = rc.battlePassClaimedFree.includes(lvl);
                    const proClaimed = rc.battlePassClaimedPro.includes(lvl);
                    return (
                      <div key={lvl} className="grid grid-cols-12 items-center gap-2 bg-black/30 rounded-lg p-2.5 border border-amber-500/20 text-xs">
                        <div className="col-span-2 font-bold text-amber-300 font-num">Lv.{lvl}</div>
                        <div className="col-span-5 flex items-center justify-between gap-1">
                          <span className="text-amber-100/80 truncate">免費: 強化石×{lvl * 8}</span>
                          <button
                            type="button"
                            disabled={!reached || freeClaimed}
                            onClick={() => onClaimBattlePass(lvl, 'free')}
                            className="px-2 py-1 rounded bg-amber-700/80 text-white font-bold disabled:opacity-40 shrink-0"
                          >
                            {freeClaimed ? '已領' : '領'}
                          </button>
                        </div>
                        <div className="col-span-5 flex items-center justify-between gap-1">
                          <span className="text-rose-300 truncate">至尊: 仙玉×{lvl * 150}</span>
                          <button
                            type="button"
                            disabled={!rc.battlePassPremium || !reached || proClaimed}
                            onClick={() => onClaimBattlePass(lvl, 'pro')}
                            className="px-2 py-1 rounded xianxia-btn-crimson font-bold disabled:opacity-40 shrink-0"
                          >
                            {proClaimed ? '已領' : '領'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 8. 仙玉商城 & 特權商城 & 綁玉專區 */}
          {tab === 'mall' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMallCurrencyFilter('jade')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold ${
                      mallCurrencyFilter === 'jade' ? 'xianxia-btn-gold' : 'bg-[#271142] text-amber-100/80'
                    }`}
                  >
                    仙玉 / VIP 特權商城
                  </button>
                  <button
                    type="button"
                    onClick={() => setMallCurrencyFilter('bound')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold ${
                      mallCurrencyFilter === 'bound' ? 'xianxia-btn-purple' : 'bg-[#271142] text-amber-100/80'
                    }`}
                  >
                    綁定仙玉專區
                  </button>
                </div>
                <span className="text-xs font-num text-cyan-300">
                  仙玉：{formatNum(player.jade)} · 綁玉：{formatNum(player.boundJade)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {MALL_ITEMS.map((item) => {
                  const vipOk = rc.vipLevel >= item.vipReq;
                  const useBound = mallCurrencyFilter === 'bound';
                  const canAfford = useBound ? player.boundJade >= item.price : player.jade >= item.price;
                  const boundAllowed = !useBound || item.vipReq === 0;
                  const mallKind: MiniItemKind =
                    item.rewardType === 'yinyang_token'
                      ? 'yinyang_token'
                      : item.rewardType === 'stones'
                      ? 'stones'
                      : item.rewardType === 'compStones'
                      ? 'comp_stones'
                      : item.rewardType === 'gold'
                      ? 'gold'
                      : item.rewardType === 'red_gear'
                      ? 'red_gear'
                      : item.rewardType === 'immortal_gear'
                      ? 'immortal_gear'
                      : 'cultivation';
                  return (
                    <div key={item.id} className="xianxia-card rounded-xl p-3.5 flex flex-col justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <ItemMiniIcon kind={mallKind} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-amber-200 truncate">{item.name}</span>
                            {item.vipReq > 0 && (
                              <span className="text-[11px] font-bold text-rose-300 font-num shrink-0">VIP{item.vipReq}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-100/75 mt-1 leading-snug">{item.desc}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!vipOk || !canAfford || !boundAllowed}
                        onClick={() => onBuyMallItem(item.id, useBound)}
                        className="w-full py-2 rounded-md xianxia-btn-gold text-xs font-bold disabled:opacity-45 font-num"
                      >
                        {!boundAllowed
                          ? '限真仙玉購買'
                          : !vipOk
                          ? `需 VIP${item.vipReq}`
                          : `${item.price} ${useBound ? '綁玉' : '仙玉'}購買`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. 神豪排行榜 */}
          {tab === 'tycoon_rank' && (
            <div className="space-y-3">
              <div className="xianxia-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold gold-text-gradient font-xianxia">全服神豪儲值排行榜</h3>
                  <p className="text-xs text-amber-100/80">榜上神豪皆享全服膜拜光環，衝榜登頂贏取【九霄神豪】稱號！</p>
                </div>
                <span className="text-sm font-bold text-amber-300 font-num">
                  我的儲值：¥{rc.totalRechargeYuan}
                </span>
              </div>
              <div className="space-y-2">
                {whaleRanking.map((row, i) => (
                  <div
                    key={`${row.name}_${i}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                      row.isSelf
                        ? 'bg-red-950/70 border-amber-400'
                        : 'bg-black/35 border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-num ${
                        i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-purple-900 text-amber-200'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-amber-100">
                          {row.name}
                          {row.isSelf && <span className="ml-2 text-xs text-rose-300">(我)</span>}
                        </div>
                        <div className="text-[11px] text-amber-300/85">
                          VIP{row.vip} · 【{row.title}】
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-num">
                      <div className="text-sm font-bold text-amber-300">¥ {row.yuan.toLocaleString()}</div>
                      <div className="text-[11px] text-purple-200/70">累計課金</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Realistic Payment Checkout Overlay (Google Play / 7-11 ibon / FamilyMart / LINE Pay / MyCard) */}
        {pendingCheckout && (
          <div className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4">
            <div className="xianxia-panel rounded-xl p-5 w-full max-w-lg space-y-3.5 max-h-[92%] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5">
                <h3 className="text-lg font-bold gold-text-gradient font-xianxia flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  九霄仙玉安全支付中心
                </h3>
                <button
                  type="button"
                  onClick={() => setPendingCheckout(null)}
                  className="text-amber-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="xianxia-card rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] text-purple-200/75 font-num">
                  <span>遊戲訂單編號</span>
                  <span>JX20261118-{String(pendingCheckout.yuan).padStart(4, '0')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200/80">購買項目</span>
                  <span className="font-bold text-amber-200">{pendingCheckout.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200/80">立即到帳</span>
                  <span className="font-bold text-cyan-300 font-num">
                    {pendingCheckout.baseJade + pendingCheckout.bonusJade} 仙玉
                    {pendingCheckout.bonusJade > 0 ? ` (含雙倍贈 ${pendingCheckout.bonusJade})` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200/80">VIP 經驗 / 實付金額</span>
                  <span className="font-bold text-rose-300 font-num">
                    +{pendingCheckout.vipExp} VIP · NT$ {Math.round(pendingCheckout.yuan * 4.5).toLocaleString()} (¥{pendingCheckout.yuan})
                  </span>
                </div>
                <div className="text-[11px] text-amber-100/75 pt-1 border-t border-amber-500/20">
                  {pendingCheckout.extraDesc}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-amber-200 font-bold">請選擇儲值支付管道（含小圖示）：</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const active = payMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`p-2 rounded-lg text-left border flex items-center gap-2 transition-all ${
                          active
                            ? 'xianxia-btn-gold ring-2 ring-amber-300'
                            : 'bg-black/45 border-amber-500/30 text-amber-100 hover:border-amber-400/60'
                        }`}
                      >
                        {/* Bespoke Small Graphic Payment Badge */}
                        <div className="w-8 h-8 shrink-0 rounded-md bg-white/95 flex items-center justify-center shadow">
                          {m.id === 'google_play' && (
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                              <polygon points="4,3 15,12 4,21" fill="#0ea5e9" />
                              <polygon points="4,3 19,10 15,12" fill="#22c55e" />
                              <polygon points="4,21 15,12 19,14" fill="#ef4444" />
                              <polygon points="15,12 19,10 21,12 19,14" fill="#f59e0b" />
                            </svg>
                          )}
                          {m.id === '711_ibon' && (
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                              <rect x="2" y="3" width="20" height="5" rx="1" fill="#ea580c" />
                              <rect x="2" y="9" width="20" height="6" rx="1" fill="#16a34a" />
                              <rect x="2" y="16" width="20" height="5" rx="1" fill="#dc2626" />
                              <text x="12" y="14" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#ffffff">7-11</text>
                            </svg>
                          )}
                          {m.id === 'family_port' && (
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                              <rect x="2" y="3" width="20" height="6" fill="#0284c7" />
                              <rect x="2" y="10" width="20" height="4" fill="#ffffff" />
                              <rect x="2" y="15" width="20" height="6" fill="#16a34a" />
                              <text x="12" y="14" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0f172a">FM</text>
                            </svg>
                          )}
                          {m.id === 'line_pay' && (
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                              <rect x="2" y="3" width="20" height="18" rx="4" fill="#06c755" />
                              <text x="12" y="14.5" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#ffffff">LINE</text>
                            </svg>
                          )}
                          {m.id === 'mycard' && (
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                              <rect x="2" y="4" width="20" height="16" rx="3" fill="#b91c1c" />
                              <circle cx="17" cy="12" r="4" fill="#fbbf24" />
                              <text x="8" y="14" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#ffffff">MC</text>
                            </svg>
                          )}
                          {m.id === 'telecom' && (
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                              <rect x="6" y="2" width="12" height="20" rx="2" fill="#1e293b" />
                              <rect x="8" y="5" width="8" height="11" fill="#38bdf8" />
                              <circle cx="12" cy="18.5" r="1.2" fill="#e2e8f0" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold truncate">{m.label}</div>
                          <div className={`text-[9px] truncate ${active ? 'text-amber-950/90' : 'text-purple-200/75'}`}>
                            {m.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Realistic Payment Gateway Details Preview */}
              {(payMethod === '711_ibon' || payMethod === 'family_port') && (
                <div className="rounded-lg bg-black/55 border border-emerald-400/40 p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300 font-bold">
                      {payMethod === '711_ibon' ? '7-ELEVEN ibon 繳費代碼' : '全家 FamiPort 繳費代碼'}
                    </span>
                    <span className="font-num font-bold text-amber-200">CVD-8839-2046-119</span>
                  </div>
                  <div className="text-[10px] text-amber-100/75">
                    點擊下方按鈕完成超商掃碼驗證，遊戲仙玉與禮包將即時發放！
                  </div>
                </div>
              )}

              {payMethod === 'google_play' && (
                <div className="rounded-lg bg-black/55 border border-cyan-400/40 p-2.5 text-xs flex items-center justify-between">
                  <span className="text-cyan-300 font-bold">Google Play 商店快速驗證</span>
                  <span className="text-[11px] text-amber-100/80">一指生物辨識 / 餘額扣款</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingCheckout(null)}
                  className="flex-1 py-2.5 rounded-lg bg-black/50 border border-amber-500/40 text-amber-200 text-xs font-bold"
                >
                  取消返回
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const label = getPayLabel(payMethod);
                    pendingCheckout.onConfirm(label);
                    setPendingCheckout(null);
                  }}
                  className="flex-[2] py-2.5 rounded-lg xianxia-btn-crimson text-sm font-bold font-num"
                >
                  {payMethod === '711_ibon' || payMethod === 'family_port'
                    ? `完成超商繳費 NT$${Math.round(pendingCheckout.yuan * 4.5).toLocaleString()}`
                    : `確認 ${getPayLabel(payMethod)} 支付 NT$${Math.round(pendingCheckout.yuan * 4.5).toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
