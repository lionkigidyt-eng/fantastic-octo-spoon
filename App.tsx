import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { BattleCanvas, CombatEventPayload } from './components/BattleCanvas';
import { GameHUD } from './components/GameHUD';
import { TitleScreen } from './components/TitleScreen';
import { TribulationEvent, TribulationOverlay } from './components/TribulationOverlay';
import { CharacterAndGearModal } from './components/modals/CharacterAndGearModal';
import { CombatContentModal } from './components/modals/CombatContentModal';
import {
  PurchaseReceipt,
  PurchaseRewardModal,
  RewardEntry,
} from './components/modals/PurchaseRewardModal';
import { RechargeCenterModal } from './components/modals/RechargeCenterModal';
import { YinYangGachaModal } from './components/modals/YinYangGachaModal';
import {
  ARENA_RIVALS,
  CONSECUTIVE_DAYS_TIERS,
  DAILY_CUMULATIVE_TIERS,
  DUNGEONS,
  FASHION_CATALOG,
  FIRST_RECHARGE_PACKS,
  GROWTH_FUND_MILESTONES,
  LIMITED_SKINS,
  MALL_ITEMS,
  QUEST_CHAIN,
  REALMS,
  SCENES,
  SIMULATED_CHAT_LINES,
  TITLE_CATALOG,
  TOPUP_TIERS,
  TOTAL_CUMULATIVE_TIERS,
  VIP_TIERS,
  YINYANG_GACHA_POOL,
  YINYANG_MILESTONES,
} from './data/xianxiaData';
import {
  ArenaRivalDef,
  ChatMessage,
  ClassId,
  CompanionCategory,
  EquipItem,
  EquipSlot,
  GamePhase,
  ModalTab,
  PlayerState,
  RechargeSubTab,
  WorldBossDef,
} from './types/game';
import { xianxiaAudio } from './utils/audio';
import {
  computePlayerStats,
  createInitialPlayer,
  generateEquipItem,
  getItemPower,
  getVipLevelForYuan,
} from './utils/gameLogic';

const SAVE_KEY = 'jiuxiao_xian_tu_save_v1';

function applyExpGain(exp: number, level: number, expToNext: number, gainedExp: number) {
  let nextExp = exp + gainedExp;
  let nextLevel = level;
  let nextExpToNext = expToNext;
  while (nextExp >= nextExpToNext) {
    nextExp -= nextExpToNext;
    nextLevel += 1;
    nextExpToNext = Math.round(nextExpToNext * 1.24 + 80);
  }
  return { exp: nextExp, level: nextLevel, expToNext: nextExpToNext };
}

function makeOrderNo() {
  return `JX20261118-${String(Math.floor(100000 + Math.random() * 899999))}`;
}

function normalizeLoadedPlayer(parsed: PlayerState): PlayerState {
  return {
    ...parsed,
    questAccepted: parsed.questAccepted ?? false,
    yinyangTokens: parsed.yinyangTokens ?? 5,
    unlockedFashions: parsed.unlockedFashions ?? ['fash_qingyun'],
    equippedFashion: parsed.equippedFashion !== undefined ? parsed.equippedFashion : 'fash_qingyun',
    unlockedLimitedSkins: parsed.unlockedLimitedSkins ?? [],
    equippedLimitedPet: parsed.equippedLimitedPet ?? null,
    equippedLimitedTreasure: parsed.equippedLimitedTreasure ?? null,
    equippedLimitedArtifact: parsed.equippedLimitedArtifact ?? null,
    yinyangPity: parsed.yinyangPity ?? 0,
    yinyangTotalPulls: parsed.yinyangTotalPulls ?? 0,
    yinyangMilestonesClaimed: parsed.yinyangMilestonesClaimed ?? [],
    equippedTitleId: parsed.equippedTitleId || 'title_walker',
    unlockedTitles:
      parsed.unlockedTitles && parsed.unlockedTitles.length > 0
        ? parsed.unlockedTitles
        : ['title_walker'],
  };
}

function unlockTitlesCheck(nextPlayer: PlayerState): {
  updated: PlayerState;
  newlyUnlockedNames: string[];
} {
  const owned = new Set(nextPlayer.unlockedTitles || ['title_walker']);
  owned.add('title_walker');
  const newlyUnlockedIds: string[] = [];

  const grant = (id: string, cond: boolean) => {
    if (cond && !owned.has(id)) {
      owned.add(id);
      newlyUnlockedIds.push(id);
    }
  };

  const totalDungeons = Object.values(nextPlayer.dungeonUsed || {}).reduce(
    (s, n) => s + (n || 0),
    0
  );
  grant('title_dungeon_ace', totalDungeons >= 2);
  grant('title_boss_slayer', nextPlayer.bossKills >= 1);
  grant('title_boss_master', nextPlayer.bossKills >= 3);
  grant('title_sect_hero', nextPlayer.sect.warPoints > 0);
  grant('title_first_topup', nextPlayer.recharge.firstRechargeTierClaimed.length > 0);
  grant('title_arena_rising', nextPlayer.arenaWins >= 1);
  grant(
    'title_vip5',
    nextPlayer.recharge.vipLevel >= 5 || nextPlayer.recharge.totalRechargeYuan >= 198
  );
  grant('title_arena_god', nextPlayer.arenaRank <= 15 || nextPlayer.arenaWins >= 3);
  grant(
    'title_yinyang',
    nextPlayer.yinyangTotalPulls >= 10 ||
      nextPlayer.unlockedLimitedSkins.length > 0 ||
      nextPlayer.unlockedFashions.some(
        (f) => f === 'fash_yin_moon' || f === 'fash_yang_sun' || f === 'fash_taiji_chaos'
      )
  );
  grant('title_realm_ascend', nextPlayer.realmIndex >= 4);
  grant(
    'title_tycoon',
    nextPlayer.recharge.vipLevel >= 10 || nextPlayer.recharge.totalRechargeYuan >= 648
  );
  grant('title_arena_king', nextPlayer.arenaRank === 1);

  if (newlyUnlockedIds.length === 0) {
    return { updated: nextPlayer, newlyUnlockedNames: [] };
  }

  const newlyUnlockedNames = newlyUnlockedIds.map(
    (id) => TITLE_CATALOG.find((t) => t.id === id)?.name || id
  );
  return {
    updated: {
      ...nextPlayer,
      unlockedTitles: Array.from(owned),
    },
    newlyUnlockedNames,
  };
}

function loadSavedPlayer(): PlayerState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerState;
    if (!parsed || !parsed.name || !parsed.classId) return null;
    return normalizeLoadedPlayer(parsed);
  } catch {
    return null;
  }
}

export default function App() {
  const [savedPlayer, setSavedPlayer] = useState<PlayerState | null>(() => loadSavedPlayer());
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [player, setPlayer] = useState<PlayerState>(() => savedPlayer || createInitialPlayer('雲逍遙', 'sword'));

  const [modalTab, setModalTab] = useState<ModalTab>(null);
  const [rechargeSubTab, setRechargeSubTab] = useState<RechargeSubTab>('first_recharge');

  const [hpRatio, setHpRatio] = useState(1);
  const [mpRatio, setMpRatio] = useState(1);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [treasureCooldown, setTreasureCooldown] = useState(0);
  const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseReceipt | null>(null);
  const [activeBoss, setActiveBoss] = useState<WorldBossDef | null>(null);
  const [activeBossHp, setActiveBossHp] = useState<{
    name: string;
    hp: number;
    maxHp: number;
    title: string;
  } | null>(null);
  const [activeArenaRival, setActiveArenaRival] = useState<ArenaRivalDef | null>(null);
  const [arenaHud, setArenaHud] = useState<{
    rival: ArenaRivalDef;
    rivalHp: number;
    rivalMaxHp: number;
  } | null>(null);
  const [bossCooldowns, setBossCooldowns] = useState<Record<string, number>>({});
  const [tribulationTriggerCount, setTribulationTriggerCount] = useState(0);
  const [tribulationEvent, setTribulationEvent] = useState<TribulationEvent | null>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    SIMULATED_CHAT_LINES.slice(0, 4).map((l, idx) => ({
      ...l,
      id: `init_${idx}`,
      timestamp: '剛剛',
    }))
  );

  const skillTriggerRef = useRef<((skillIndex: number) => void) | null>(null);
  const treasureTriggerRef = useRef<(() => void) | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const tribulationTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  const pushChat = useCallback((channel: ChatMessage['channel'], sender: string, vip: number, text: string) => {
    setChatMessages((prev) => [
      ...prev.slice(-18),
      {
        id: `c_${Date.now()}_${Math.random()}`,
        channel,
        sender,
        vip,
        text,
        timestamp: '剛剛',
      },
    ]);
  }, []);

  // Save periodically while playing
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(player));
        setSavedPlayer(player);
      } catch {
        // ignore quota errors
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [phase, player]);

  // Simulated world chat & boss respawn timers
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const chatId = window.setInterval(() => {
      const sample = SIMULATED_CHAT_LINES[Math.floor(Math.random() * SIMULATED_CHAT_LINES.length)];
      pushChat(sample.channel, sample.sender, sample.vip, sample.text);
    }, 11000);

    const bossCdId = window.setInterval(() => {
      setBossCooldowns((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        for (const k of Object.keys(prev)) {
          if (prev[k] > 1) {
            next[k] = prev[k] - 1;
            changed = true;
          } else if (prev[k] === 1) {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      window.clearInterval(chatId);
      window.clearInterval(bossCdId);
    };
  }, [phase, pushChat]);

  // Esc key to pause/close modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalTab) {
        setModalTab(null);
      } else if (phase === 'PLAYING') {
        setPhase('PAUSED');
      } else if (phase === 'PAUSED') {
        setPhase('PLAYING');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalTab, phase]);

  const handleStartNew = (name: string, classId: ClassId) => {
    const fresh = createInitialPlayer(name, classId);
    setPlayer(fresh);
    setActiveBoss(null);
    setModalTab(null);
    setPhase('PLAYING');
    localStorage.setItem(SAVE_KEY, JSON.stringify(fresh));
    setSavedPlayer(fresh);
    showToast(`歡迎道友【${fresh.name}】踏入九霄仙途！`);
  };

  const handleContinue = () => {
    if (savedPlayer) {
      setPlayer(savedPlayer);
    }
    setActiveBoss(null);
    setModalTab(null);
    setPhase('PLAYING');
  };

  const handleCombatTick = useCallback(
    (payload: CombatEventPayload) => {
      setHpRatio(payload.playerHpRatio);
      setMpRatio(payload.playerMpRatio);
      setSkillCooldowns(payload.skillCooldowns);
      setTreasureCooldown(payload.treasureCooldown);
      setActiveBossHp(payload.activeBossHp || null);
      setArenaHud(payload.arenaHud || null);

      if (payload.bossKilled) {
        const killedBoss = payload.bossKilled;
        setActiveBoss(null);
        setBossCooldowns((prev) => ({ ...prev, [killedBoss.id]: killedBoss.respawnSeconds }));
        xianxiaAudio.playBreakthrough();
        showToast(`恭喜斬殺世界 BOSS【${killedBoss.name}】！獲得仙玉×200 與極品神裝！`);
        pushChat('傳聞', '系統公告', 0, `恭賀【${player.name}】力戰群雄，成功斬殺世界 BOSS【${killedBoss.name}】！`);
      }

      if (
        payload.expGained === 0 &&
        payload.cultivationGained === 0 &&
        payload.goldGained === 0 &&
        payload.kills === 0 &&
        payload.itemsDropped.length === 0 &&
        !payload.bossKilled
      ) {
        return;
      }

      setPlayer((prev) => {
        const leveled = applyExpGain(prev.exp, prev.level, prev.expToNext, payload.expGained);

        const bonusJade = payload.bossKilled ? 200 : 0;
        const bonusStones = payload.bossKilled ? 15 : 0;

        let bag = [...prev.bag, ...payload.itemsDropped];
        let extraGold = 0;
        let extraStones = 0;
        if (bag.length > 52) {
          const kept = bag.filter((it) => it.rarity !== 'common' && it.rarity !== 'uncommon');
          const smelted = bag.length - kept.length;
          extraGold += smelted * 600;
          extraStones += smelted * 2;
          bag = kept.slice(-55);
        }

        const q = QUEST_CHAIN[prev.questIndex];
        let questProgress = prev.questProgress;
        if (q && prev.questAccepted) {
          if (q.targetType === 'kill') questProgress += payload.kills;
          if (q.targetType === 'boss' && payload.bossKilled) questProgress += 1;
        }

        let bpExp = prev.recharge.battlePassExp + payload.kills * 12 + (payload.bossKilled ? 80 : 0);
        let bpLevel = prev.recharge.battlePassLevel;
        while (bpExp >= 100 && bpLevel < 20) {
          bpExp -= 100;
          bpLevel += 1;
        }

        const rawNext: PlayerState = {
          ...prev,
          level: leveled.level,
          exp: leveled.exp,
          expToNext: leveled.expToNext,
          cultivation: prev.cultivation + payload.cultivationGained,
          gold: prev.gold + payload.goldGained + extraGold,
          jade: prev.jade + bonusJade,
          spiritStones: prev.spiritStones + bonusStones + extraStones,
          killsTotal: prev.killsTotal + payload.kills,
          bossKills: prev.bossKills + (payload.bossKilled ? 1 : 0),
          bag,
          questProgress,
          recharge: {
            ...prev.recharge,
            battlePassLevel: bpLevel,
            battlePassExp: bpExp,
          },
        };
        const checked = unlockTitlesCheck(rawNext);
        if (checked.newlyUnlockedNames.length > 0) {
          showToast(`解鎖活動稱號【${checked.newlyUnlockedNames.join('、')}】！快去稱號閣配戴！`);
        }
        return checked.updated;
      });
    },
    [player.name, pushChat, showToast]
  );

  // ==================== GAMEPLAY & CULTIVATION HANDLERS ====================
  const handleBreakthrough = () => {
    const realm = REALMS[player.realmIndex] || REALMS[0];
    const reqCult = realm.expPerLayer * player.realmLayer;
    if (player.cultivation < reqCult) {
      showToast('修為不足，請繼續打怪或聚靈打坐累積修為！');
      return;
    }

    const isMajorRealm = player.realmLayer >= realm.maxLayer && player.realmIndex < REALMS.length - 1;
    const nextLayer = isMajorRealm ? 1 : Math.min(realm.maxLayer, player.realmLayer + 1);
    const nextRealmIdx = isMajorRealm ? player.realmIndex + 1 : player.realmIndex;
    const nextRealm = REALMS[nextRealmIdx];

    xianxiaAudio.playBreakthrough();
    setTribulationTriggerCount((c) => c + 1);

    // Full-screen CSS/SVG Heavenly Tribulation Lightning Animation
    setTribulationEvent({
      id: Date.now(),
      realmName: nextRealm.name,
      layer: nextLayer,
      tribulationName: nextRealm.tribulationName,
      isMajorRealm,
    });
    if (tribulationTimerRef.current) window.clearTimeout(tribulationTimerRef.current);
    tribulationTimerRef.current = window.setTimeout(() => {
      setTribulationEvent(null);
    }, 2450);

    setPlayer((prev) => {
      const autoScene = [...SCENES]
        .reverse()
        .find((s) => s.unlockRealmIndex <= nextRealmIdx);

      if (isMajorRealm) {
        showToast(`渡劫成功！晉升至【${nextRealm.name}】！`);
        pushChat('傳聞', '系統公告', 0, `天降神雷！【${prev.name}】成功渡過${nextRealm.tribulationName}，踏入【${nextRealm.name}】！`);
      } else {
        showToast(`境界突破至【${nextRealm.name} 第 ${nextLayer} 層】！`);
      }

      return unlockTitlesCheck({
        ...prev,
        cultivation: prev.cultivation - reqCult,
        realmIndex: nextRealmIdx,
        realmLayer: nextLayer,
        sceneId: !activeBoss && autoScene ? autoScene.id : prev.sceneId,
      }).updated;
    });
  };

  const handleMeditate = () => {
    const gain = 60 + player.realmIndex * 180 + player.level * 15;
    xianxiaAudio.playLootPickup();
    setPlayer((prev) => ({
      ...prev,
      cultivation: prev.cultivation + gain,
    }));
    showToast(`聚靈打坐周天運轉，修為 +${gain.toLocaleString()}！`);
  };

  const handleEnhanceSlot = (slot: EquipSlot) => {
    const item = player.equipped[slot];
    if (!item || item.enhanceLevel >= 20) return;
    const costStones = (item.enhanceLevel + 1) * 3;
    const costGold = (item.enhanceLevel + 1) * 3000;
    if (player.spiritStones < costStones || player.gold < costGold) {
      showToast('強化神石或金幣不足！');
      return;
    }
    xianxiaAudio.playLootPickup();
    setPlayer((prev) => {
      const target = prev.equipped[slot];
      if (!target) return prev;
      const updated = { ...target, enhanceLevel: target.enhanceLevel + 1 };
      const q = QUEST_CHAIN[prev.questIndex];
      const qProg = q && q.targetType === 'enhance' ? prev.questProgress + 1 : prev.questProgress;
      return {
        ...prev,
        spiritStones: prev.spiritStones - costStones,
        gold: prev.gold - costGold,
        equipped: { ...prev.equipped, [slot]: updated },
        questProgress: qProg,
      };
    });
    showToast(`【${item.name}】強化至 +${item.enhanceLevel + 1}！`);
  };

  const handleEnhanceAll = () => {
    setPlayer((prev) => {
      let stones = prev.spiritStones;
      let gold = prev.gold;
      const nextEq = { ...prev.equipped };
      let upgraded = 0;

      (Object.keys(nextEq) as EquipSlot[]).forEach((slot) => {
        const it = nextEq[slot];
        if (!it || it.enhanceLevel >= 20) return;
        const cStones = (it.enhanceLevel + 1) * 3;
        const cGold = (it.enhanceLevel + 1) * 3000;
        if (stones >= cStones && gold >= cGold) {
          stones -= cStones;
          gold -= cGold;
          nextEq[slot] = { ...it, enhanceLevel: it.enhanceLevel + 1 };
          upgraded += 1;
        }
      });

      if (upgraded === 0) {
        showToast('強化神石或金幣不足，無法強化更多裝備！');
        return prev;
      }

      xianxiaAudio.playBreakthrough();
      const q = QUEST_CHAIN[prev.questIndex];
      const qProg = q && q.targetType === 'enhance' ? prev.questProgress + upgraded : prev.questProgress;
      showToast(`一鍵強化全身 ${upgraded} 件裝備，戰力暴漲！`);
      return {
        ...prev,
        spiritStones: stones,
        gold,
        equipped: nextEq,
        questProgress: qProg,
      };
    });
  };

  const handleAutoEquipBest = () => {
    setPlayer((prev) => {
      const nextEquipped = { ...prev.equipped };
      const nextBag: typeof prev.bag = [];
      let swapped = 0;

      for (const item of prev.bag) {
        const cur = nextEquipped[item.slot];
        if (getItemPower(item) > getItemPower(cur)) {
          if (cur) nextBag.push({ ...cur, enhanceLevel: 0 });
          nextEquipped[item.slot] = { ...item, enhanceLevel: cur ? cur.enhanceLevel : 0 };
          swapped += 1;
        } else {
          nextBag.push(item);
        }
      }
      if (swapped > 0) {
        xianxiaAudio.playLootPickup();
        showToast(`已一鍵換裝 ${swapped} 件更強神裝，戰力暴漲！`);
      } else {
        showToast('身上已是當前最強神裝！');
      }
      return { ...prev, equipped: nextEquipped, bag: nextBag };
    });
  };

  const handleEquipFromBag = (uid: string) => {
    setPlayer((prev) => {
      const idx = prev.bag.findIndex((i) => i.uid === uid);
      if (idx === -1) return prev;
      const item = prev.bag[idx];
      const cur = prev.equipped[item.slot];
      const nextBag = [...prev.bag];
      nextBag.splice(idx, 1);
      if (cur) nextBag.push(cur);
      xianxiaAudio.playLootPickup();
      return {
        ...prev,
        equipped: { ...prev.equipped, [item.slot]: item },
        bag: nextBag,
      };
    });
  };

  const handleSmeltBag = (onlyLowRarity: boolean) => {
    setPlayer((prev) => {
      const keep: typeof prev.bag = [];
      let count = 0;
      for (const it of prev.bag) {
        const isLow = it.rarity === 'common' || it.rarity === 'uncommon' || it.rarity === 'rare';
        if (onlyLowRarity && !isLow) {
          keep.push(it);
        } else {
          count += 1;
        }
      }
      if (count === 0) {
        showToast('背包中沒有可熔煉的低階裝備！');
        return prev;
      }
      xianxiaAudio.playLootPickup();
      showToast(`熔煉 ${count} 件裝備，獲得 ${count * 800} 金幣與 ${count * 3} 強化神石！`);
      return {
        ...prev,
        bag: keep,
        gold: prev.gold + count * 800,
        spiritStones: prev.spiritStones + count * 3,
      };
    });
  };

  const handleUpgradeCompanion = (cat: CompanionCategory, times = 1) => {
    setPlayer((prev) => {
      let stones = prev.companionStones;
      let st = { ...prev.companions[cat] };
      let upgraded = 0;

      for (let i = 0; i < times; i++) {
        const cost = st.tier * 3 + Math.floor(st.level / 2);
        if (stones < cost) break;
        stones -= cost;
        st.level += 1;
        if (st.level > 10 && st.tier < 6) {
          st.tier += 1;
          st.level = 1;
        }
        upgraded += 1;
      }

      if (upgraded === 0) {
        showToast('進階丹不足，可前往仙玉商城或副本獲取！');
        return prev;
      }

      xianxiaAudio.playSkillBurst(upgraded > 1);
      const q = QUEST_CHAIN[prev.questIndex];
      const qProg = q && q.targetType === 'companion' ? prev.questProgress + upgraded : prev.questProgress;
      showToast(`培養成功 ${upgraded} 次！已提升至 ${st.tier} 階 Lv.${st.level}！`);
      return {
        ...prev,
        companionStones: stones,
        companions: { ...prev.companions, [cat]: st },
        questProgress: qProg,
      };
    });
  };

  const handleAcceptQuest = () => {
    const q = QUEST_CHAIN[player.questIndex] || QUEST_CHAIN[QUEST_CHAIN.length - 1];
    xianxiaAudio.playLootPickup();
    setPlayer((prev) => ({
      ...prev,
      questAccepted: true,
      questProgress: 0,
    }));
    showToast(`已接取任務【${q.title}】，快去擊殺目標妖魔吧！`);
  };

  const handleClaimQuest = () => {
    const q = QUEST_CHAIN[player.questIndex] || QUEST_CHAIN[QUEST_CHAIN.length - 1];
    if (!q || !player.questAccepted || player.questProgress < q.targetCount) return;
    xianxiaAudio.playRechargeChime();
    const previewLevel = applyExpGain(player.exp, player.level, player.expToNext, q.rewardExp);
    setPlayer((prev) => {
      const res = applyExpGain(prev.exp, prev.level, prev.expToNext, q.rewardExp);
      const hasNext = prev.questIndex + 1 < QUEST_CHAIN.length;
      return {
        ...prev,
        jade: prev.jade + q.rewardJade,
        gold: prev.gold + q.rewardGold,
        level: res.level,
        exp: res.exp,
        expToNext: res.expToNext,
        questIndex: hasNext ? prev.questIndex + 1 : prev.questIndex,
        questAccepted: false,
        questProgress: 0,
      };
    });
    if (previewLevel.level > player.level) {
      showToast(`任務完成！經驗 +${q.rewardExp.toLocaleString()}，主角升至 Lv.${previewLevel.level}！`);
    } else {
      showToast(`任務完成！獲得經驗 +${q.rewardExp.toLocaleString()}、仙玉×${q.rewardJade}！`);
    }
  };

  // ==================== RECHARGE / VIP / MALL HANDLERS ====================
  const applySimulatedPayment = (
    yuan: number,
    tierId?: string,
    paymentLabel = 'Google Play',
    skipReceipt = false
  ) => {
    xianxiaAudio.playRechargeChime();
    const isDouble = tierId ? !player.recharge.firstDoubleUsedIds.includes(tierId) : false;
    const topupDef = tierId ? TOPUP_TIERS.find((t) => t.id === tierId) : null;
    const baseJade = topupDef ? topupDef.jade : yuan * 10;
    const jadeEarned = isDouble ? baseJade * 2 : baseJade;

    const newTotalYuan = player.recharge.totalRechargeYuan + yuan;
    const newVip = getVipLevelForYuan(newTotalYuan);
    const vipUp = newVip > player.recharge.vipLevel;
    const newTitle = vipUp && newVip > 0 ? VIP_TIERS[newVip - 1].title : player.title;

    setPlayer((prev) => {
      const prevDouble = tierId ? !prev.recharge.firstDoubleUsedIds.includes(tierId) : false;
      const prevEarned = prevDouble ? baseJade * 2 : baseJade;
      const totalY = prev.recharge.totalRechargeYuan + yuan;
      const dailyY = prev.recharge.dailyRechargeYuan + yuan;
      const nextVip = getVipLevelForYuan(totalY);
      const didVipUp = nextVip > prev.recharge.vipLevel;
      const nextTitle = didVipUp && nextVip > 0 ? VIP_TIERS[nextVip - 1].title : prev.title;

      if (didVipUp) {
        pushChat('傳聞', '系統公告', nextVip, `恭賀神豪【${prev.name}】晉升 VIP${nextVip}【${nextTitle}】，仙氣震懾九霄！`);
      }

      return unlockTitlesCheck({
        ...prev,
        jade: prev.jade + prevEarned,
        title: nextTitle,
        recharge: {
          ...prev.recharge,
          vipLevel: nextVip,
          vipExp: totalY,
          dailyRechargeYuan: dailyY,
          totalRechargeYuan: totalY,
          firstDoubleUsedIds:
            tierId && prevDouble
              ? [...prev.recharge.firstDoubleUsedIds, tierId]
              : prev.recharge.firstDoubleUsedIds,
        },
      }).updated;
    });

    if (!skipReceipt) {
      const rewards: RewardEntry[] = [
        {
          label: isDouble ? '仙玉（首充雙倍）' : '仙玉',
          amountText: `+${jadeEarned.toLocaleString()}`,
          kind: 'jade',
        },
        { label: 'VIP 經驗', amountText: `+${yuan}`, kind: 'vip' },
      ];
      if (vipUp) {
        rewards.push({ label: `晉升 VIP${newVip}`, amountText: `【${newTitle}】`, kind: 'privilege' });
      }
      setPurchaseReceipt({
        title: tierId ? `儲值 ¥${yuan} 仙玉檔位` : `儲值 ¥${yuan} 仙玉`,
        paymentLabel,
        orderNo: makeOrderNo(),
        rewards,
      });
    }
    showToast(`儲值成功 ¥${yuan}（${paymentLabel}）！仙玉與 VIP 經驗已即時到帳！`);
  };

  const handleClaimFirstRecharge = (yuan: number) => {
    const pack = FIRST_RECHARGE_PACKS.find((p) => p.yuan === yuan);
    if (!pack || player.recharge.firstRechargeTierClaimed.includes(yuan)) return;
    xianxiaAudio.playBreakthrough();
    const gear =
      yuan === 98
        ? generateEquipItem(player.level + 5, 'immortal', 'weapon')
        : yuan === 30
        ? generateEquipItem(player.level + 3, 'mythic', 'armor')
        : generateEquipItem(player.level + 2, 'mythic', 'weapon');

    setPlayer((prev) => {
      const nextComp = { ...prev.companions };
      if (yuan === 30) nextComp.wing = { ...nextComp.wing, tier: Math.max(nextComp.wing.tier, 2) };
      if (yuan === 98) nextComp.pet = { ...nextComp.pet, tier: Math.max(nextComp.pet.tier, 3) };

      return unlockTitlesCheck({
        ...prev,
        jade: prev.jade + pack.bonusJade,
        boundJade: prev.boundJade + (yuan === 6 ? 500 : 0),
        gold: prev.gold + (yuan === 6 ? 1000000 : 0),
        spiritStones: prev.spiritStones + 120,
        companionStones: prev.companionStones + (yuan === 98 ? 200 : 40),
        bag: [gear, ...prev.bag],
        companions: nextComp,
        recharge: {
          ...prev.recharge,
          firstRechargeTierClaimed: [...prev.recharge.firstRechargeTierClaimed, yuan],
        },
      }).updated;
    });

    const rewards: RewardEntry[] = [
      { label: gear.name, amountText: '絕版神裝 ×1', kind: 'gear', gear },
      { label: '仙玉', amountText: `+${pack.bonusJade.toLocaleString()}`, kind: 'jade' },
      { label: '強化神石', amountText: '+120', kind: 'stones' },
      { label: '仙途進階丹', amountText: `+${yuan === 98 ? 200 : 40}`, kind: 'comp_stones' },
    ];
    if (yuan === 6) {
      rewards.push({ label: '綁定仙玉', amountText: '+500', kind: 'bound_jade' });
      rewards.push({ label: '仙界金幣', amountText: '+1,000,000', kind: 'gold' });
    }
    if (yuan === 30) {
      rewards.push({ label: '極品神翼', amountText: '直升 2 階', kind: 'privilege' });
    }
    if (yuan === 98) {
      rewards.push({ label: '絕版靈寵', amountText: '直升 3 階', kind: 'privilege' });
    }
    setPurchaseReceipt({
      title: pack.name,
      paymentLabel: '首儲豪禮領取',
      orderNo: makeOrderNo(),
      rewards,
    });
    showToast(`已領取【${pack.name}】，絕版神裝已放入背包！`);
  };

  const handleClaimVipDaily = () => {
    if (player.recharge.vipLevel === 0 || player.recharge.vipDailyClaimedDay) return;
    const vInfo = VIP_TIERS[player.recharge.vipLevel - 1];
    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade + vInfo.dailyJade,
      gold: prev.gold + vInfo.dailyGold,
      recharge: { ...prev.recharge, vipDailyClaimedDay: true },
    }));
    setPurchaseReceipt({
      title: `VIP${player.recharge.vipLevel} 每日免費福利`,
      paymentLabel: 'VIP 尊貴特權',
      orderNo: makeOrderNo(),
      rewards: [
        { label: '仙玉', amountText: `+${vInfo.dailyJade.toLocaleString()}`, kind: 'jade' },
        { label: '仙界金幣', amountText: `+${vInfo.dailyGold.toLocaleString()}`, kind: 'gold' },
      ],
    });
    showToast(`領取 VIP${player.recharge.vipLevel} 每日福利：仙玉×${vInfo.dailyJade}！`);
  };

  const handleBuyVipGift = (vipLevel: number) => {
    const vInfo = VIP_TIERS[vipLevel - 1];
    if (!vInfo || player.recharge.vipLevel < vipLevel || player.jade < vInfo.giftJadeCost) return;
    xianxiaAudio.playRechargeChime();
    const gear = generateEquipItem(
      player.level + 2,
      vipLevel >= 9 ? 'immortal' : vipLevel >= 4 ? 'mythic' : 'legendary'
    );
    const goldAmt = vipLevel * 150000;
    const stoneAmt = vipLevel * 35;
    const compAmt = vipLevel * 25;

    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade - vInfo.giftJadeCost,
      gold: prev.gold + goldAmt,
      spiritStones: prev.spiritStones + stoneAmt,
      companionStones: prev.companionStones + compAmt,
      bag: [gear, ...prev.bag],
      recharge: {
        ...prev.recharge,
        vipGiftsBought: [...prev.recharge.vipGiftsBought, vipLevel],
      },
    }));
    setPurchaseReceipt({
      title: `VIP${vipLevel} 專屬特權禮包`,
      paymentLabel: '仙玉購買',
      orderNo: makeOrderNo(),
      rewards: [
        { label: gear.name, amountText: '專屬神裝 ×1', kind: 'gear', gear },
        { label: '仙界金幣', amountText: `+${goldAmt.toLocaleString()}`, kind: 'gold' },
        { label: '強化神石', amountText: `+${stoneAmt}`, kind: 'stones' },
        { label: '仙途進階丹', amountText: `+${compAmt}`, kind: 'comp_stones' },
      ],
    });
    showToast(`成功搶購 VIP${vipLevel} 專屬特權禮包！`);
  };

  const handleBuyCard = (kind: 'month' | 'permanent', paymentLabel = 'Google Play') => {
    const yuan = kind === 'month' ? 30 : 98;
    applySimulatedPayment(yuan, undefined, paymentLabel, true);
    setPlayer((prev) => ({
      ...prev,
      recharge: {
        ...prev.recharge,
        monthCardDays: kind === 'month' ? prev.recharge.monthCardDays + 30 : prev.recharge.monthCardDays,
        permanentCard: kind === 'permanent' ? true : prev.recharge.permanentCard,
      },
    }));
    setPurchaseReceipt({
      title: kind === 'month' ? '仙道月卡（30天）' : '至尊永久終身卡',
      paymentLabel,
      orderNo: makeOrderNo(),
      rewards: [
        { label: '仙玉', amountText: `+${yuan * 10}`, kind: 'jade' },
        { label: 'VIP 經驗', amountText: `+${yuan}`, kind: 'vip' },
        {
          label: kind === 'month' ? '30天月卡特權' : '永久終身卡特權',
          amountText: kind === 'month' ? '每日 200綁玉+5萬金幣' : '每日 500仙玉+10丹',
          kind: 'privilege',
        },
      ],
    });
  };

  const handleClaimCardDaily = (kind: 'month' | 'permanent') => {
    xianxiaAudio.playRechargeChime();
    if (kind === 'month') {
      setPlayer((prev) => ({
        ...prev,
        boundJade: prev.boundJade + 200,
        gold: prev.gold + 50000,
        recharge: { ...prev.recharge, monthCardClaimedToday: true },
      }));
      setPurchaseReceipt({
        title: '仙道月卡每日福利',
        paymentLabel: '月卡特權領取',
        orderNo: makeOrderNo(),
        rewards: [
          { label: '綁定仙玉', amountText: '+200', kind: 'bound_jade' },
          { label: '仙界金幣', amountText: '+50,000', kind: 'gold' },
        ],
      });
      showToast('已領取月卡每日獎勵：200 綁玉 + 5萬金幣！');
    } else {
      setPlayer((prev) => ({
        ...prev,
        jade: prev.jade + 500,
        companionStones: prev.companionStones + 10,
        recharge: { ...prev.recharge, permanentCardClaimedToday: true },
      }));
      setPurchaseReceipt({
        title: '至尊永久卡每日福利',
        paymentLabel: '終身卡特權領取',
        orderNo: makeOrderNo(),
        rewards: [
          { label: '仙玉', amountText: '+500', kind: 'jade' },
          { label: '仙途進階丹', amountText: '+10', kind: 'comp_stones' },
        ],
      });
      showToast('已領取至尊永久卡每日獎勵：500 仙玉 + 10 進階丹！');
    }
  };

  const handleBuySupremePrivilege = (
    id: 'exp_50' | 'auto_smelt' | 'boss_drop',
    costJade: number
  ) => {
    if (player.jade < costJade || player.recharge.supremePrivileges.includes(id)) {
      showToast('仙玉不足！');
      return;
    }
    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade - costJade,
      recharge: {
        ...prev.recharge,
        supremePrivileges: [...prev.recharge.supremePrivileges, id],
      },
    }));
    const privName =
      id === 'exp_50' ? '九霄經驗至尊權' : id === 'auto_smelt' ? '聚寶自動熔煉權' : '神獸必掉至尊權';
    setPurchaseReceipt({
      title: privName,
      paymentLabel: '仙玉激活特權',
      orderNo: makeOrderNo(),
      rewards: [{ label: privName, amountText: '永久生效', kind: 'privilege' }],
    });
    showToast('已永久激活至尊特權！');
  };

  const handleClaimCumulative = (kind: 'daily' | 'total' | 'consecutive', key: number) => {
    xianxiaAudio.playRechargeChime();
    let title = '累儲豪禮';
    const rewards: RewardEntry[] = [];

    if (kind === 'daily') {
      const t = DAILY_CUMULATIVE_TIERS.find((x) => x.yuan === key);
      if (!t) return;
      title = `每日累儲 ¥${t.yuan} · ${t.name}`;
      rewards.push(
        { label: '仙玉', amountText: `+${t.jade}`, kind: 'jade' },
        { label: '仙界金幣', amountText: `+${t.gold.toLocaleString()}`, kind: 'gold' },
        { label: '強化神石', amountText: `+${t.stones}`, kind: 'stones' },
        { label: '進階丹', amountText: `+${t.compStones}`, kind: 'comp_stones' }
      );
      setPlayer((prev) => ({
        ...prev,
        jade: prev.jade + t.jade,
        gold: prev.gold + t.gold,
        spiritStones: prev.spiritStones + t.stones,
        companionStones: prev.companionStones + t.compStones,
        recharge: {
          ...prev.recharge,
          dailyCumulativeClaimed: [...prev.recharge.dailyCumulativeClaimed, key],
        },
      }));
    } else if (kind === 'total') {
      const t = TOTAL_CUMULATIVE_TIERS.find((x) => x.yuan === key);
      if (!t) return;
      title = `累計儲值 ¥${t.yuan} · ${t.name}`;
      rewards.push(
        { label: '仙玉', amountText: `+${t.jade.toLocaleString()}`, kind: 'jade' },
        { label: '仙界金幣', amountText: `+${t.gold.toLocaleString()}`, kind: 'gold' },
        { label: '強化神石', amountText: `+${t.stones}`, kind: 'stones' },
        { label: '進階丹', amountText: `+${t.compStones}`, kind: 'comp_stones' }
      );
      setPlayer((prev) => ({
        ...prev,
        jade: prev.jade + t.jade,
        gold: prev.gold + t.gold,
        spiritStones: prev.spiritStones + t.stones,
        companionStones: prev.companionStones + t.compStones,
        recharge: {
          ...prev.recharge,
          totalCumulativeClaimed: [...prev.recharge.totalCumulativeClaimed, key],
        },
      }));
    } else {
      const t = CONSECUTIVE_DAYS_TIERS.find((x) => x.day === key);
      if (!t) return;
      title = t.label;
      rewards.push(
        { label: '仙玉', amountText: `+${t.jade.toLocaleString()}`, kind: 'jade' },
        { label: '強化神石', amountText: `+${t.stones}`, kind: 'stones' },
        { label: '進階丹', amountText: `+${t.compStones}`, kind: 'comp_stones' }
      );
      setPlayer((prev) => ({
        ...prev,
        jade: prev.jade + t.jade,
        spiritStones: prev.spiritStones + t.stones,
        companionStones: prev.companionStones + t.compStones,
        recharge: {
          ...prev.recharge,
          consecutiveClaimedDays: [...prev.recharge.consecutiveClaimedDays, key],
        },
      }));
    }

    setPurchaseReceipt({
      title,
      paymentLabel: '累儲活動領獎',
      orderNo: makeOrderNo(),
      rewards,
    });
    showToast('累儲豪禮已發放至帳戶！');
  };

  const handleClaimAllAvailable = () => {
    xianxiaAudio.playBreakthrough();
    const rc = player.recharge;
    let jadeAdd = 0;
    let boundJadeAdd = 0;
    let goldAdd = 0;
    let stonesAdd = 0;
    let compAdd = 0;
    const generatedGears: EquipItem[] = [];

    const firstClaimed = [...rc.firstRechargeTierClaimed];
    FIRST_RECHARGE_PACKS.forEach((pk) => {
      if (rc.totalRechargeYuan >= pk.yuan && !firstClaimed.includes(pk.yuan)) {
        firstClaimed.push(pk.yuan);
        jadeAdd += pk.bonusJade;
        if (pk.yuan === 6) {
          boundJadeAdd += 500;
          goldAdd += 1000000;
        }
        stonesAdd += 120;
        compAdd += pk.yuan === 98 ? 200 : 40;
        generatedGears.push(generateEquipItem(player.level + 3, pk.yuan === 98 ? 'immortal' : 'mythic', 'weapon'));
      }
    });

    const dailyClaimed = [...rc.dailyCumulativeClaimed];
    DAILY_CUMULATIVE_TIERS.forEach((t) => {
      if (rc.dailyRechargeYuan >= t.yuan && !dailyClaimed.includes(t.yuan)) {
        dailyClaimed.push(t.yuan);
        jadeAdd += t.jade;
        goldAdd += t.gold;
        stonesAdd += t.stones;
        compAdd += t.compStones;
      }
    });

    const totalClaimed = [...rc.totalCumulativeClaimed];
    TOTAL_CUMULATIVE_TIERS.forEach((t) => {
      if (rc.totalRechargeYuan >= t.yuan && !totalClaimed.includes(t.yuan)) {
        totalClaimed.push(t.yuan);
        jadeAdd += t.jade;
        goldAdd += t.gold;
        stonesAdd += t.stones;
        compAdd += t.compStones;
      }
    });

    const consecClaimed = [...rc.consecutiveClaimedDays];
    CONSECUTIVE_DAYS_TIERS.forEach((t) => {
      if (rc.totalRechargeYuan > 0 && rc.consecutiveDays >= t.day && !consecClaimed.includes(t.day)) {
        consecClaimed.push(t.day);
        jadeAdd += t.jade;
        stonesAdd += t.stones;
        compAdd += t.compStones;
      }
    });

    let vipDailyClaimed = rc.vipDailyClaimedDay;
    if (rc.vipLevel > 0 && !vipDailyClaimed) {
      vipDailyClaimed = true;
      jadeAdd += VIP_TIERS[rc.vipLevel - 1].dailyJade;
      goldAdd += VIP_TIERS[rc.vipLevel - 1].dailyGold;
    }

    let monthClaimed = rc.monthCardClaimedToday;
    if (rc.monthCardDays > 0 && !monthClaimed) {
      monthClaimed = true;
      boundJadeAdd += 200;
      goldAdd += 50000;
    }

    let permClaimed = rc.permanentCardClaimedToday;
    if (rc.permanentCard && !permClaimed) {
      permClaimed = true;
      jadeAdd += 500;
      compAdd += 10;
    }

    setPlayer((prev) => {
      const nextComp = { ...prev.companions };
      if (firstClaimed.includes(30) && !prev.recharge.firstRechargeTierClaimed.includes(30)) {
        nextComp.wing = { ...nextComp.wing, tier: Math.max(nextComp.wing.tier, 2) };
      }
      if (firstClaimed.includes(98) && !prev.recharge.firstRechargeTierClaimed.includes(98)) {
        nextComp.pet = { ...nextComp.pet, tier: Math.max(nextComp.pet.tier, 3) };
      }
      return unlockTitlesCheck({
        ...prev,
        jade: prev.jade + jadeAdd,
        boundJade: prev.boundJade + boundJadeAdd,
        gold: prev.gold + goldAdd,
        spiritStones: prev.spiritStones + stonesAdd,
        companionStones: prev.companionStones + compAdd,
        bag: [...generatedGears, ...prev.bag],
        companions: nextComp,
        recharge: {
          ...prev.recharge,
          firstRechargeTierClaimed: firstClaimed,
          dailyCumulativeClaimed: dailyClaimed,
          totalCumulativeClaimed: totalClaimed,
          consecutiveClaimedDays: consecClaimed,
          vipDailyClaimedDay: vipDailyClaimed,
          monthCardClaimedToday: monthClaimed,
          permanentCardClaimedToday: permClaimed,
        },
      }).updated;
    });

    const receiptRewards: RewardEntry[] = [];
    generatedGears.forEach((g) => receiptRewards.push({ label: g.name, amountText: '絕版神裝 ×1', kind: 'gear', gear: g }));
    if (jadeAdd > 0) receiptRewards.push({ label: '仙玉', amountText: `+${jadeAdd.toLocaleString()}`, kind: 'jade' });
    if (boundJadeAdd > 0) receiptRewards.push({ label: '綁定仙玉', amountText: `+${boundJadeAdd.toLocaleString()}`, kind: 'bound_jade' });
    if (goldAdd > 0) receiptRewards.push({ label: '仙界金幣', amountText: `+${goldAdd.toLocaleString()}`, kind: 'gold' });
    if (stonesAdd > 0) receiptRewards.push({ label: '強化神石', amountText: `+${stonesAdd}`, kind: 'stones' });
    if (compAdd > 0) receiptRewards.push({ label: '仙途進階丹', amountText: `+${compAdd}`, kind: 'comp_stones' });

    if (receiptRewards.length > 0) {
      setPurchaseReceipt({
        title: '一鍵全領 · 所有待領豪禮',
        paymentLabel: '福利自動結算',
        orderNo: makeOrderNo(),
        rewards: receiptRewards,
      });
    }
    showToast(`一鍵領取成功！共獲得 仙玉×${jadeAdd.toLocaleString()}、強化石×${stonesAdd}、進階丹×${compAdd}！`);
  };

  const handleBuySpecialPack = (
    kind: 'flash' | 'value' | 'daily',
    packId: string,
    yuanCost: number,
    jadeCost: number,
    rewards: { jade?: number; gold?: number; stones?: number; compStones?: number; cultivation?: number; redGear?: boolean },
    paymentLabel = '仙玉購買'
  ) => {
    if (jadeCost > 0 && player.jade < jadeCost) {
      showToast('仙玉不足，請先儲值仙玉！');
      return;
    }
    if (yuanCost > 0) {
      applySimulatedPayment(yuanCost, undefined, paymentLabel, true);
    } else {
      xianxiaAudio.playRechargeChime();
    }
    const gear = rewards.redGear ? generateEquipItem(player.level + 2, 'mythic') : null;
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade - jadeCost + (rewards.jade || 0),
      gold: prev.gold + (rewards.gold || 0),
      spiritStones: prev.spiritStones + (rewards.stones || 0),
      companionStones: prev.companionStones + (rewards.compStones || 0),
      cultivation: prev.cultivation + (rewards.cultivation || 0),
      bag: gear ? [gear, ...prev.bag] : prev.bag,
      recharge: {
        ...prev.recharge,
        flashDealsBought: kind === 'flash' ? [...prev.recharge.flashDealsBought, packId] : prev.recharge.flashDealsBought,
        valueBundlesBought: kind === 'value' ? [...prev.recharge.valueBundlesBought, packId] : prev.recharge.valueBundlesBought,
        dailySpecialsBought: kind === 'daily' ? [...prev.recharge.dailySpecialsBought, packId] : prev.recharge.dailySpecialsBought,
      },
    }));

    const receiptRewards: RewardEntry[] = [];
    if (gear) receiptRewards.push({ label: gear.name, amountText: '極品紅裝 ×1', kind: 'gear', gear });
    const totalJade = (yuanCost > 0 ? yuanCost * 10 : 0) + (rewards.jade || 0);
    if (totalJade > 0) receiptRewards.push({ label: '仙玉', amountText: `+${totalJade.toLocaleString()}`, kind: 'jade' });
    if (yuanCost > 0) receiptRewards.push({ label: 'VIP 經驗', amountText: `+${yuanCost}`, kind: 'vip' });
    if (rewards.stones) receiptRewards.push({ label: '強化神石', amountText: `+${rewards.stones}`, kind: 'stones' });
    if (rewards.compStones) receiptRewards.push({ label: '仙途進階丹', amountText: `+${rewards.compStones}`, kind: 'comp_stones' });
    if (rewards.gold) receiptRewards.push({ label: '仙界金幣', amountText: `+${rewards.gold.toLocaleString()}`, kind: 'gold' });
    if (rewards.cultivation) receiptRewards.push({ label: '修為靈氣', amountText: `+${rewards.cultivation.toLocaleString()}`, kind: 'cultivation' });

    setPurchaseReceipt({
      title: kind === 'flash' ? '限時特惠秒殺禮包' : kind === 'value' ? '超值境界禮包' : '每日特惠禮包',
      paymentLabel: yuanCost > 0 ? paymentLabel : '仙玉直購',
      orderNo: makeOrderNo(),
      rewards: receiptRewards,
    });
    showToast('特惠禮包購買成功，神裝資源已到帳！');
  };

  const handleBuyGrowthFund = () => {
    if (player.jade < 1000) {
      showToast('仙玉不足 1,000，請先儲值！');
      return;
    }
    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade - 1000,
      recharge: { ...prev.recharge, growthFundBought: true },
    }));
    setPurchaseReceipt({
      title: '九霄成長基金 (22倍返利)',
      paymentLabel: '仙玉購買',
      orderNo: makeOrderNo(),
      rewards: [{ label: '成長基金資格', amountText: '突破境界共返 22,000 仙玉', kind: 'privilege' }],
    });
    showToast('成功開通九霄成長基金！突破境界領 22 倍仙玉返利！');
  };

  const handleClaimGrowthFund = (idx: number) => {
    const ms = GROWTH_FUND_MILESTONES[idx];
    if (!ms) return;
    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade + ms.jade,
      recharge: {
        ...prev.recharge,
        growthFundClaimedIndices: [...prev.recharge.growthFundClaimedIndices, idx],
      },
    }));
    setPurchaseReceipt({
      title: `成長基金 · ${ms.label}`,
      paymentLabel: '基金里程碑返利',
      orderNo: makeOrderNo(),
      rewards: [{ label: '仙玉', amountText: `+${ms.jade.toLocaleString()}`, kind: 'jade' }],
    });
    showToast(`領取成長基金返利 +${ms.jade.toLocaleString()} 仙玉！`);
  };

  const handleBuyBattlePassPro = (paymentLabel = 'Google Play') => {
    applySimulatedPayment(68, undefined, paymentLabel, true);
    setPlayer((prev) => ({
      ...prev,
      recharge: { ...prev.recharge, battlePassPremium: true },
    }));
    setPurchaseReceipt({
      title: '至尊戰令通行證',
      paymentLabel,
      orderNo: makeOrderNo(),
      rewards: [
        { label: '仙玉', amountText: '+680', kind: 'jade' },
        { label: 'VIP 經驗', amountText: '+68', kind: 'vip' },
        { label: '至尊戰令獎勵線', amountText: '永久解鎖', kind: 'privilege' },
      ],
    });
    showToast('已解鎖【至尊戰令通行證】！');
  };

  const handleClaimBattlePass = (level: number, track: 'free' | 'pro') => {
    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      spiritStones: track === 'free' ? prev.spiritStones + level * 8 : prev.spiritStones,
      jade: track === 'pro' ? prev.jade + level * 150 : prev.jade,
      recharge: {
        ...prev.recharge,
        battlePassClaimedFree:
          track === 'free' ? [...prev.recharge.battlePassClaimedFree, level] : prev.recharge.battlePassClaimedFree,
        battlePassClaimedPro:
          track === 'pro' ? [...prev.recharge.battlePassClaimedPro, level] : prev.recharge.battlePassClaimedPro,
      },
    }));
    setPurchaseReceipt({
      title: `戰令 Lv.${level}（${track === 'pro' ? '至尊線' : '免費線'}）`,
      paymentLabel: '戰令獎勵領取',
      orderNo: makeOrderNo(),
      rewards: [
        track === 'free'
          ? { label: '強化神石', amountText: `+${level * 8}`, kind: 'stones' }
          : { label: '仙玉', amountText: `+${level * 150}`, kind: 'jade' },
      ],
    });
    showToast(`已領取 Lv.${level} 戰令獎勵！`);
  };

  const handleBuyMallItem = (itemId: string, useBoundJade = false) => {
    const item = MALL_ITEMS.find((m) => m.id === itemId);
    if (!item || player.recharge.vipLevel < item.vipReq) return;
    if (useBoundJade) {
      if (player.boundJade < item.price || item.vipReq > 0) return;
    } else if (player.jade < item.price) {
      return;
    }

    xianxiaAudio.playRechargeChime();
    const gear =
      item.rewardType === 'red_gear'
        ? generateEquipItem(player.level + 3, 'mythic')
        : item.rewardType === 'immortal_gear'
        ? generateEquipItem(player.level + 5, 'immortal')
        : null;

    setPlayer((prev) => ({
      ...prev,
      jade: useBoundJade ? prev.jade : prev.jade - item.price,
      boundJade: useBoundJade ? prev.boundJade - item.price : prev.boundJade,
      spiritStones:
        item.rewardType === 'stones'
          ? prev.spiritStones + item.amount
          : item.rewardType === 'cultivation_big'
          ? prev.spiritStones + 50
          : prev.spiritStones,
      companionStones: item.rewardType === 'compStones' ? prev.companionStones + item.amount : prev.companionStones,
      yinyangTokens:
        item.rewardType === 'yinyang_token' ? prev.yinyangTokens + item.amount : prev.yinyangTokens,
      gold: item.rewardType === 'gold' ? prev.gold + item.amount : prev.gold,
      cultivation:
        item.rewardType === 'cultivation' || item.rewardType === 'cultivation_big'
          ? prev.cultivation + item.amount
          : prev.cultivation,
      bag: gear ? [gear, ...prev.bag] : prev.bag,
    }));

    const receiptRewards: RewardEntry[] = [];
    if (gear) {
      receiptRewards.push({ label: gear.name, amountText: '極品神裝 ×1', kind: 'gear', gear });
    } else if (item.rewardType === 'stones') {
      receiptRewards.push({ label: '強化神石', amountText: `+${item.amount}`, kind: 'stones' });
    } else if (item.rewardType === 'compStones') {
      receiptRewards.push({ label: '仙途進階丹', amountText: `+${item.amount}`, kind: 'comp_stones' });
    } else if (item.rewardType === 'yinyang_token') {
      receiptRewards.push({ label: '陰陽乾坤令', amountText: `+${item.amount}`, kind: 'yinyang_token', highlight: true });
    } else if (item.rewardType === 'gold') {
      receiptRewards.push({ label: '仙界金幣', amountText: `+${item.amount.toLocaleString()}`, kind: 'gold' });
    } else if (item.rewardType === 'cultivation') {
      receiptRewards.push({ label: '修為靈氣', amountText: `+${item.amount.toLocaleString()}`, kind: 'cultivation' });
    } else if (item.rewardType === 'cultivation_big') {
      receiptRewards.push({ label: '修為靈氣', amountText: `+${item.amount.toLocaleString()}`, kind: 'cultivation' });
      receiptRewards.push({ label: '強化神石', amountText: '+50', kind: 'stones' });
    }

    setPurchaseReceipt({
      title: item.name,
      paymentLabel: useBoundJade ? '綁定仙玉商城' : '仙玉特權商城',
      orderNo: makeOrderNo(),
      rewards: receiptRewards,
    });
    showToast(`購買【${item.name}】成功！`);
  };

  // ==================== FASHION & YIN-YANG GACHA HANDLERS ====================
  const handleUnlockOrEquipFashion = (fashionId: string) => {
    const def = FASHION_CATALOG.find((f) => f.id === fashionId);
    if (!def) return;
    const isUnlocked = player.unlockedFashions.includes(fashionId);
    if (isUnlocked) {
      xianxiaAudio.playLootPickup();
      setPlayer((prev) => ({ ...prev, equippedFashion: fashionId }));
      showToast(`已換穿時裝【${def.name}】！`);
      return;
    }

    if (!def.unlockJadeCost) {
      showToast(`【${def.name}】需透過陰陽限定抽獎獲得！`);
      return;
    }

    if (player.jade < def.unlockJadeCost) {
      showToast(`仙玉不足 ${def.unlockJadeCost.toLocaleString()}，無法解鎖【${def.name}】！`);
      return;
    }

    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade - (def.unlockJadeCost || 0),
      unlockedFashions: [...prev.unlockedFashions, fashionId],
      equippedFashion: fashionId,
    }));
    setPurchaseReceipt({
      title: `解鎖時裝 · ${def.name}`,
      paymentLabel: '百變衣櫥兌換',
      orderNo: makeOrderNo(),
      rewards: [{ label: def.name, amountText: '永久解鎖並穿戴', kind: 'fashion', highlight: true }],
    });
    showToast(`解鎖並穿戴【${def.name}】！`);
  };

  const handleEquipLimitedSkin = (
    category: 'pet' | 'treasure' | 'artifact',
    skinId: string | null
  ) => {
    if (skinId && !player.unlockedLimitedSkins.includes(skinId)) {
      showToast('尚未解鎖此陰陽限定幻化外觀，請前往陰陽限定抽獎抽取！');
      return;
    }
    xianxiaAudio.playLootPickup();
    setPlayer((prev) => ({
      ...prev,
      equippedLimitedPet: category === 'pet' ? skinId : prev.equippedLimitedPet,
      equippedLimitedTreasure: category === 'treasure' ? skinId : prev.equippedLimitedTreasure,
      equippedLimitedArtifact: category === 'artifact' ? skinId : prev.equippedLimitedArtifact,
    }));
    if (skinId) {
      const sk = LIMITED_SKINS.find((s) => s.id === skinId);
      showToast(`已切換幻化外觀【${sk?.name || '限定神兵'}】！`);
    } else {
      showToast('已切換回預設進階外觀！');
    }
  };

  const handleYinyangPull = (count: 1 | 10): RewardEntry[] | null => {
    const useTokens = player.yinyangTokens >= count;
    const jadeCost = count === 10 ? 1480 : 160;
    if (!useTokens && player.jade < jadeCost) {
      showToast(`陰陽乾坤令不足 ${count} 枚且仙玉不足 ${jadeCost}！`);
      return null;
    }

    xianxiaAudio.playSkillBurst(true);

    let pity = player.yinyangPity;
    let jadeGain = 0;
    let stonesGain = 0;
    let compStonesGain = 0;
    let cultGain = 0;
    const newGears: EquipItem[] = [];
    const unlockedFashionSet = new Set(player.unlockedFashions);
    const unlockedSkinSet = new Set(player.unlockedLimitedSkins);
    let autoEquipFashion = player.equippedFashion;
    let autoEquipPet = player.equippedLimitedPet;
    let autoEquipTre = player.equippedLimitedTreasure;
    let autoEquipArt = player.equippedLimitedArtifact;

    const totalWeight = YINYANG_GACHA_POOL.reduce((s, e) => s + e.weight, 0);
    const limitedPool = YINYANG_GACHA_POOL.filter(
      (e) => e.type === 'fashion' || e.type === 'limited_skin'
    );

    const pickEntry = (forceLimited: boolean) => {
      if (forceLimited && limitedPool.length > 0) {
        const lw = limitedPool.reduce((s, e) => s + e.weight, 0);
        let r = Math.random() * lw;
        for (const item of limitedPool) {
          r -= item.weight;
          if (r <= 0) return item;
        }
        return limitedPool[0];
      }
      let r = Math.random() * totalWeight;
      for (const item of YINYANG_GACHA_POOL) {
        r -= item.weight;
        if (r <= 0) return item;
      }
      return YINYANG_GACHA_POOL[YINYANG_GACHA_POOL.length - 1];
    };

    const rewards: RewardEntry[] = [];
    for (let i = 0; i < count; i++) {
      const hitPity = pity + 1 >= 50;
      const entry = pickEntry(hitPity);

      if (entry.type === 'fashion' && entry.refId) {
        pity = 0;
        if (unlockedFashionSet.has(entry.refId)) {
          jadeGain += 600;
          compStonesGain += 40;
          rewards.push({
            label: `${entry.name}（重複轉化）`,
            amountText: '+600仙玉 +40進階丹',
            kind: 'fashion',
            highlight: true,
          });
        } else {
          unlockedFashionSet.add(entry.refId);
          autoEquipFashion = entry.refId;
          rewards.push({
            label: entry.name,
            amountText: '限定時裝 · 永久解鎖',
            kind: 'fashion',
            highlight: true,
          });
          pushChat('傳聞', player.name, player.recharge.vipLevel, `氣運逆天！在陰陽轉盤抽中【${entry.name}】！`);
        }
      } else if (entry.type === 'limited_skin' && entry.refId) {
        pity = 0;
        const sk = LIMITED_SKINS.find((s) => s.id === entry.refId);
        const skKind: RewardEntry['kind'] =
          sk?.category === 'pet' ? 'pet' : sk?.category === 'treasure' ? 'treasure' : 'artifact';
        if (unlockedSkinSet.has(entry.refId)) {
          jadeGain += 600;
          compStonesGain += 40;
          rewards.push({
            label: `${entry.name}（重複轉化）`,
            amountText: '+600仙玉 +40進階丹',
            kind: skKind,
            highlight: true,
          });
        } else {
          unlockedSkinSet.add(entry.refId);
          if (sk?.category === 'pet') autoEquipPet = entry.refId;
          if (sk?.category === 'treasure') autoEquipTre = entry.refId;
          if (sk?.category === 'artifact') autoEquipArt = entry.refId;
          rewards.push({
            label: entry.name,
            amountText: '限定幻化 · 永久解鎖',
            kind: skKind,
            highlight: true,
          });
          pushChat('傳聞', player.name, player.recharge.vipLevel, `仙光沖霄！在陰陽轉盤獲得【${entry.name}】！`);
        }
      } else {
        pity += 1;
        if (entry.type === 'immortal_gear') {
          const g = generateEquipItem(player.level + 5, 'immortal');
          newGears.push(g);
          rewards.push({ label: g.name, amountText: '太古仙器 ×1', kind: 'gear', gear: g, highlight: true });
        } else if (entry.type === 'red_gear') {
          const g = generateEquipItem(player.level + 3, 'mythic');
          newGears.push(g);
          rewards.push({ label: g.name, amountText: '極品紅裝 ×1', kind: 'gear', gear: g });
        } else if (entry.type === 'jade') {
          const amt = entry.amount || 488;
          jadeGain += amt;
          rewards.push({ label: '聚寶仙玉', amountText: `+${amt}`, kind: 'jade' });
        } else if (entry.type === 'comp_stones') {
          const amt = entry.amount || 45;
          compStonesGain += amt;
          rewards.push({ label: '仙途進階丹', amountText: `+${amt}`, kind: 'comp_stones' });
        } else if (entry.type === 'cultivation') {
          const amt = entry.amount || 6000;
          cultGain += amt;
          rewards.push({ label: '太極破境靈丹', amountText: `+${amt.toLocaleString()}修為`, kind: 'cultivation' });
        } else {
          const amt = entry.amount || 60;
          stonesGain += amt;
          rewards.push({ label: '強化神石', amountText: `+${amt}`, kind: 'stones' });
        }
      }
    }

    setPlayer((prev) =>
      unlockTitlesCheck({
        ...prev,
        yinyangTokens: useTokens ? prev.yinyangTokens - count : prev.yinyangTokens,
        jade: (useTokens ? prev.jade : prev.jade - jadeCost) + jadeGain,
        spiritStones: prev.spiritStones + stonesGain,
        companionStones: prev.companionStones + compStonesGain,
        cultivation: prev.cultivation + cultGain,
        bag: [...newGears, ...prev.bag],
        unlockedFashions: Array.from(unlockedFashionSet),
        equippedFashion: autoEquipFashion,
        unlockedLimitedSkins: Array.from(unlockedSkinSet),
        equippedLimitedPet: autoEquipPet,
        equippedLimitedTreasure: autoEquipTre,
        equippedLimitedArtifact: autoEquipArt,
        yinyangPity: pity,
        yinyangTotalPulls: prev.yinyangTotalPulls + count,
      }).updated
    );

    return rewards;
  };

  const handleClaimYinyangMilestone = (pullsReq: number) => {
    const ms = YINYANG_MILESTONES.find((m) => m.pulls === pullsReq);
    if (
      !ms ||
      player.yinyangTotalPulls < ms.pulls ||
      player.yinyangMilestonesClaimed.includes(ms.pulls)
    ) {
      return;
    }
    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade + ms.jade,
      yinyangTokens: prev.yinyangTokens + ms.tokens,
      companionStones: prev.companionStones + ms.compStones,
      yinyangMilestonesClaimed: [...prev.yinyangMilestonesClaimed, ms.pulls],
    }));
    setPurchaseReceipt({
      title: `陰陽乾坤轉盤 · ${ms.label}`,
      paymentLabel: '累抽里程碑獎勵',
      orderNo: makeOrderNo(),
      rewards: [
        { label: '仙玉', amountText: `+${ms.jade.toLocaleString()}`, kind: 'jade' },
        { label: '陰陽乾坤令', amountText: `+${ms.tokens}`, kind: 'yinyang_token', highlight: true },
        { label: '仙途進階丹', amountText: `+${ms.compStones}`, kind: 'comp_stones' },
      ],
    });
    showToast(`已領取陰陽轉盤【${ms.label}】里程碑豪禮！`);
  };

  const handleBuyYinyangTokens = (qty: number, jadeCost: number) => {
    if (player.jade < jadeCost) {
      showToast(`仙玉不足 ${jadeCost.toLocaleString()}，請前往儲值！`);
      return;
    }
    xianxiaAudio.playRechargeChime();
    setPlayer((prev) => ({
      ...prev,
      jade: prev.jade - jadeCost,
      yinyangTokens: prev.yinyangTokens + qty,
    }));
    setPurchaseReceipt({
      title: `購買陰陽乾坤令 ×${qty}`,
      paymentLabel: '仙玉直購令牌',
      orderNo: makeOrderNo(),
      rewards: [{ label: '陰陽乾坤令', amountText: `+${qty}`, kind: 'yinyang_token', highlight: true }],
    });
    showToast(`已購得陰陽乾坤令 ×${qty}！`);
  };

  const handleExportSaveJson = () => {
    try {
      const json = JSON.stringify(player, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jiuxiao_xiantu_${player.name}_save.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('存檔 JSON 檔案已匯出！');
    } catch {
      showToast('存檔匯出失敗');
    }
  };

  const handleImportSaveJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '')) as PlayerState;
        if (!parsed || !parsed.name || !parsed.classId || !parsed.equipped) {
          showToast('無效的存檔檔案格式');
          return;
        }
        const normalized = normalizeLoadedPlayer(parsed);
        localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
        setPlayer(normalized);
        setSavedPlayer(normalized);
        setPhase('PLAYING');
        showToast(`已成功載入道友【${normalized.name}】的存檔進度！`);
      } catch {
        showToast('存檔解析失敗，請確認檔案為有效的 JSON 存檔');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ==================== COMBAT CONTENT HANDLERS ====================
  const handleChallengeDungeon = (dungeonId: string) => {
    const dng = DUNGEONS.find((d) => d.id === dungeonId);
    if (!dng) return;
    xianxiaAudio.playBreakthrough();
    setPlayer((prev) => {
      const used = prev.dungeonUsed[dungeonId] || 0;
      const leveled =
        dng.type === 'exp'
          ? applyExpGain(prev.exp, prev.level, prev.expToNext, 8500)
          : { exp: prev.exp, level: prev.level, expToNext: prev.expToNext };
      return unlockTitlesCheck({
        ...prev,
        level: leveled.level,
        exp: leveled.exp,
        expToNext: leveled.expToNext,
        cultivation: dng.type === 'exp' ? prev.cultivation + 1200 : prev.cultivation,
        gold: dng.type === 'gold' ? prev.gold + 180000 : prev.gold,
        boundJade: prev.boundJade + (dng.type === 'exp' ? 80 : 60),
        jade: dng.type === 'wing' ? prev.jade + 120 : prev.jade,
        spiritStones: dng.type === 'enhance' ? prev.spiritStones + 60 : prev.spiritStones,
        companionStones: dng.type === 'wing' ? prev.companionStones + 45 : prev.companionStones,
        bag:
          dng.type === 'enhance'
            ? [generateEquipItem(prev.level + 2, 'mythic'), ...prev.bag]
            : prev.bag,
        dungeonUsed: { ...prev.dungeonUsed, [dungeonId]: used + 1 },
      }).updated;
    });
    showToast(`通關【${dng.name}】，獎勵已全部收入囊中！`);
  };

  const handleChallengeBoss = (boss: WorldBossDef) => {
    setActiveArenaRival(null);
    setArenaHud(null);
    setPlayer((prev) => ({ ...prev, sceneId: boss.sceneId }));
    setActiveBoss(boss);
    setModalTab(null);
    xianxiaAudio.playSkillBurst(true);
    showToast(`傳送至戰場討伐世界 BOSS【${boss.name}】！`);
  };

  const handleJoinOrCreateSect = (sectName: string) => {
    xianxiaAudio.playBreakthrough();
    setPlayer((prev) => ({
      ...prev,
      sect: {
        ...prev.sect,
        joined: true,
        name: sectName,
        contribution: prev.sect.contribution + 300,
      },
    }));
    pushChat('宗門', sectName, 0, `歡迎【${player.name}】加入本宗門，共謀九霄霸業！`);
    showToast(`已成功加入宗門【${sectName}】，贈送見面禮 300 貢獻！`);
  };

  const handleSectAction = (action: 'donate' | 'skill' | 'red_packet' | 'sect_war') => {
    if (action === 'donate') {
      if (player.gold < 10000) return;
      xianxiaAudio.playLootPickup();
      setPlayer((prev) => ({
        ...prev,
        gold: prev.gold - 10000,
        spiritStones: prev.spiritStones + 10,
        sect: { ...prev.sect, contribution: prev.sect.contribution + 200 },
      }));
      showToast('捐獻成功！獲得 200 宗門貢獻與 10 強化神石！');
    } else if (action === 'skill') {
      if (player.sect.contribution < 150) return;
      xianxiaAudio.playBreakthrough();
      setPlayer((prev) => ({
        ...prev,
        sect: {
          ...prev.sect,
          contribution: prev.sect.contribution - 150,
          skillLevel: prev.sect.skillLevel + 1,
        },
      }));
      showToast('宗門心法進階！全屬性永久提升！');
    } else if (action === 'red_packet') {
      if (player.sect.redEnvelopeClaimed) return;
      xianxiaAudio.playRechargeChime();
      setPlayer((prev) => ({
        ...prev,
        jade: prev.jade + 188,
        companionStones: prev.companionStones + 10,
        sect: { ...prev.sect, redEnvelopeClaimed: true },
      }));
      showToast('手氣絕佳！搶得宗門紅包 188 仙玉 + 10 進階丹！');
    } else if (action === 'sect_war') {
      xianxiaAudio.playSkillBurst(true);
      const pts = 250 + Math.floor(Math.random() * 150);
      setPlayer((prev) =>
        unlockTitlesCheck({
          ...prev,
          jade: prev.jade + 260,
          gold: prev.gold + 150000,
          sect: { ...prev.sect, warPoints: prev.sect.warPoints + pts },
        }).updated
      );
      pushChat('宗門', player.name, player.recharge.vipLevel, `在九霄仙盟戰中大殺四方，為宗門奪得 ${pts} 戰績！`);
      showToast(`仙盟戰大捷！為宗門贏得 ${pts} 戰績，獲得 260 仙玉！`);
    }
  };

  const handleEquipTitle = (titleId: string) => {
    const def = TITLE_CATALOG.find((t) => t.id === titleId);
    if (!def) return;
    if (!player.unlockedTitles.includes(titleId)) {
      showToast(`稱號【${def.name}】尚未解鎖：${def.unlockRequirement}`);
      return;
    }
    xianxiaAudio.playLootPickup();
    setPlayer((prev) => ({
      ...prev,
      equippedTitleId: titleId,
      title: def.name,
    }));
    showToast(`已換戴仙道稱號【${def.name}】！戰力再攀高峰！`);
  };

  const handleChallengeArena = (rivalId: string) => {
    const rival = ARENA_RIVALS.find((r) => r.id === rivalId);
    if (!rival) return;
    setActiveBoss(null);
    setActiveArenaRival(rival);
    setArenaHud({ rival, rivalHp: rival.hp, rivalMaxHp: rival.hp });
    setModalTab(null);
    xianxiaAudio.playSkillBurst(true);
    showToast(`進入【九霄跨服演武台】，迎戰第 ${rival.rank} 名【${rival.name}】！`);
  };

  const handleArenaComplete = useCallback(
    (won: boolean, rival: ArenaRivalDef) => {
      setActiveArenaRival(null);
      setArenaHud(null);
      if (won) {
        xianxiaAudio.playBreakthrough();
        setPlayer((prev) => {
          const nextState: PlayerState = {
            ...prev,
            arenaRank: Math.min(prev.arenaRank, rival.rank),
            arenaWins: prev.arenaWins + 1,
            jade: prev.jade + rival.rewardJade,
            companionStones: prev.companionStones + rival.rewardCompStones,
          };
          const checked = unlockTitlesCheck(nextState);
          const rewards: RewardEntry[] = [
            { label: '仙玉', amountText: `+${rival.rewardJade.toLocaleString()}`, kind: 'jade', highlight: true },
            { label: '仙途進階丹', amountText: `+${rival.rewardCompStones}`, kind: 'comp_stones' },
            { label: '跨服排名躍升', amountText: `第 ${nextState.arenaRank} 名`, kind: 'privilege' },
          ];
          if (checked.newlyUnlockedNames.length > 0) {
            rewards.push({
              label: '解鎖活動稱號',
              amountText: `【${checked.newlyUnlockedNames.join('、')}】`,
              kind: 'privilege',
              highlight: true,
            });
          }
          setPurchaseReceipt({
            title: `演武台大捷 · 擊敗 ${rival.name}`,
            paymentLabel: '跨服競技結算',
            orderNo: makeOrderNo(),
            rewards,
          });
          return checked.updated;
        });
        if (rival.rank <= 15) {
          pushChat('傳聞', '系統公告', 0, `演武捷報！【${player.name}】在跨服競技場正面擊敗【${rival.name}】，晉升第 ${Math.min(player.arenaRank, rival.rank)} 名！`);
        }
        showToast(`演武大勝【${rival.name}】！已返回原修煉地圖並領取仙玉×${rival.rewardJade}！`);
      } else {
        xianxiaAudio.playSwordSlash(true);
        setPlayer((prev) => ({ ...prev, gold: prev.gold + 15000 }));
        showToast(`切磋惜敗於【${rival.name}】，已返回原地圖並獲鍛體金幣 +15,000！`);
      }
    },
    [player.arenaRank, player.name, pushChat, showToast]
  );

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    xianxiaAudio.setMuted(next);
  };

  // ==================== RENDER ====================
  if (phase === 'TITLE_MENU') {
    const savedSummary = savedPlayer
      ? {
          name: savedPlayer.name,
          realmName: REALMS[savedPlayer.realmIndex]?.name || '凡人境',
          power: computePlayerStats(savedPlayer).combatPower,
          vip: savedPlayer.recharge.vipLevel,
        }
      : undefined;
    return (
      <TitleScreen
        hasSavedGame={Boolean(savedPlayer)}
        savedSummary={savedSummary}
        onStartNew={handleStartNew}
        onContinue={handleContinue}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0e0717]">
      {/* 60fps Isolated 2D Xianxia Battleground */}
      <BattleCanvas
        player={player}
        paused={phase === 'PAUSED'}
        activeBoss={activeBoss}
        activeArenaRival={activeArenaRival}
        skillTriggerRef={skillTriggerRef}
        treasureTriggerRef={treasureTriggerRef}
        tribulationTriggerCount={tribulationTriggerCount}
        onCombatTick={handleCombatTick}
        onArenaComplete={handleArenaComplete}
      />

      {/* Full-Screen Heavenly Tribulation Lightning Overlay */}
      <TribulationOverlay event={tribulationEvent} />

      {/* Classic 2015-2020 Xianxia MMORPG HUD */}
      <GameHUD
        player={player}
        hpRatio={hpRatio}
        mpRatio={mpRatio}
        skillCooldowns={skillCooldowns}
        treasureCooldown={treasureCooldown}
        activeBossHp={activeBossHp}
        arenaHud={arenaHud}
        chatMessages={chatMessages}
        muted={muted}
        onToggleMute={handleToggleMute}
        onTogglePause={() => setPhase((p) => (p === 'PAUSED' ? 'PLAYING' : 'PAUSED'))}
        onToggleAutoBattle={() =>
          setPlayer((prev) => ({ ...prev, autoBattle: !prev.autoBattle }))
        }
        onCastSkill={(idx) => skillTriggerRef.current?.(idx)}
        onCastTreasure={() => treasureTriggerRef.current?.()}
        onBreakthrough={handleBreakthrough}
        onAcceptQuest={handleAcceptQuest}
        onClaimQuest={handleClaimQuest}
        onSendChat={(text) => pushChat('世界', player.name, player.recharge.vipLevel, text)}
        onOpenModal={(tab, rTab) => {
          setModalTab(tab);
          if (rTab) setRechargeSubTab(rTab);
        }}
        onLeaveBoss={() => setActiveBoss(null)}
        onLeaveArena={() => {
          setActiveArenaRival(null);
          setArenaHud(null);
          showToast('已撤離演武台，返回原修煉地圖！');
        }}
      />

      {/* Top Center Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="xianxia-panel rounded-full px-6 py-2 text-xs sm:text-sm font-bold text-amber-200 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.45)] whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}

      {/* Recharge, VIP1-15, Mall & Events Center */}
      {modalTab === 'recharge' && (
        <RechargeCenterModal
          player={player}
          initialTab={rechargeSubTab}
          onClose={() => setModalTab(null)}
          onSimulateRecharge={applySimulatedPayment}
          onClaimFirstRecharge={handleClaimFirstRecharge}
          onClaimVipDaily={handleClaimVipDaily}
          onBuyVipGift={handleBuyVipGift}
          onBuyCard={handleBuyCard}
          onClaimCardDaily={handleClaimCardDaily}
          onBuySupremePrivilege={handleBuySupremePrivilege}
          onClaimCumulative={handleClaimCumulative}
          onClaimAllAvailable={handleClaimAllAvailable}
          onBuySpecialPack={handleBuySpecialPack}
          onBuyGrowthFund={handleBuyGrowthFund}
          onClaimGrowthFund={handleClaimGrowthFund}
          onBuyBattlePassPro={handleBuyBattlePassPro}
          onClaimBattlePass={handleClaimBattlePass}
          onBuyMallItem={handleBuyMallItem}
        />
      )}

      {/* Character, Titles, Realm Breakthrough, Equipment, Bag, Fashion & 5 Companion Systems */}
      {(modalTab === 'character' ||
        modalTab === 'titles' ||
        modalTab === 'equipment' ||
        modalTab === 'bag' ||
        modalTab === 'companions' ||
        modalTab === 'fashion') && (
        <CharacterAndGearModal
          player={player}
          activeTab={modalTab}
          onSwitchTab={(t) => setModalTab(t)}
          onClose={() => setModalTab(null)}
          onBreakthrough={handleBreakthrough}
          onMeditate={handleMeditate}
          onEnhanceSlot={handleEnhanceSlot}
          onEnhanceAll={handleEnhanceAll}
          onAutoEquipBest={handleAutoEquipBest}
          onEquipFromBag={handleEquipFromBag}
          onSmeltBag={handleSmeltBag}
          onUpgradeCompanion={handleUpgradeCompanion}
          onUnlockOrEquipFashion={handleUnlockOrEquipFashion}
          onEquipLimitedSkin={handleEquipLimitedSkin}
          onOpenYinyangGacha={() => setModalTab('yinyang_gacha')}
          onEquipTitle={handleEquipTitle}
          onJumpToActivity={(tab, rTab) => {
            setModalTab(tab);
            if (rTab) setRechargeSubTab(rTab);
          }}
        />
      )}

      {/* Yin-Yang Limited Theme Gacha Wheel */}
      {modalTab === 'yinyang_gacha' && (
        <YinYangGachaModal
          player={player}
          onClose={() => setModalTab(null)}
          onPull={handleYinyangPull}
          onClaimMilestone={handleClaimYinyangMilestone}
          onBuyTokens={handleBuyYinyangTokens}
          onOpenFashionTab={() => setModalTab('fashion')}
        />
      )}

      {/* Dungeons, World Boss, Sect & Guild War, Cross-Server Arena */}
      {(modalTab === 'dungeons' ||
        modalTab === 'world_boss' ||
        modalTab === 'sect' ||
        modalTab === 'arena') && (
        <CombatContentModal
          player={player}
          activeTab={modalTab}
          bossCooldowns={bossCooldowns}
          onSwitchTab={(t) => setModalTab(t)}
          onClose={() => setModalTab(null)}
          onChallengeDungeon={handleChallengeDungeon}
          onChallengeBoss={handleChallengeBoss}
          onJoinOrCreateSect={handleJoinOrCreateSect}
          onSectAction={handleSectAction}
          onChallengeArena={handleChallengeArena}
        />
      )}

      {/* Celebratory Purchase / Claim Reward Modal */}
      <PurchaseRewardModal
        receipt={purchaseReceipt}
        onClose={() => setPurchaseReceipt(null)}
      />

      {/* Pause Modal */}
      {phase === 'PAUSED' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
          <div className="xianxia-panel rounded-xl p-6 w-full max-w-sm text-center space-y-4">
            <h2 className="text-2xl font-bold gold-text-gradient font-xianxia">仙途暫歇</h2>
            <p className="text-xs text-amber-100/80">
              道號：{player.name} · 戰力：{computePlayerStats(player).combatPower.toLocaleString()}
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPhase('PLAYING')}
                className="w-full py-2.5 rounded-lg xianxia-btn-gold text-sm font-bold"
              >
                繼續修煉
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
                  setSavedPlayer(player);
                  showToast('修仙進度已手動存檔！');
                  setPhase('PLAYING');
                }}
                className="w-full py-2.5 rounded-lg xianxia-btn-purple text-sm font-bold"
              >
                儲存仙途進度
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportSaveJson}
                  className="py-2 rounded-lg border border-amber-500/45 bg-amber-950/35 text-xs font-bold text-amber-200 hover:bg-amber-900/45"
                >
                  匯出存檔 (.json)
                </button>
                <label className="py-2 rounded-lg border border-cyan-500/45 bg-cyan-950/35 text-xs font-bold text-cyan-200 hover:bg-cyan-900/45 cursor-pointer flex items-center justify-center">
                  匯入存檔 (.json)
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportSaveJson}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
                  setSavedPlayer(player);
                  setPhase('TITLE_MENU');
                }}
                className="w-full py-2.5 rounded-lg xianxia-btn-crimson text-sm font-bold"
              >
                返回主選單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
