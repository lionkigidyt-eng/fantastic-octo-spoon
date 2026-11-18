import {
  CLASSES,
  COMPANION_SYSTEMS,
  EQUIP_SLOT_LABELS,
  FASHION_CATALOG,
  LIMITED_SKINS,
  RARITY_CONFIG,
  REALMS,
  TITLE_CATALOG,
  VIP_TIERS,
} from '../data/xianxiaData';
import {
  ClassId,
  CompanionCategory,
  EquipItem,
  EquipSlot,
  PlayerState,
  Rarity,
} from '../types/game';

const SLOT_PREFIXES: Record<Rarity, string[]> = {
  common: ['凡鐵', '粗布', '青石'],
  uncommon: ['靈溪', '翠竹', '玄木'],
  rare: ['青雲', '流霜', '破風'],
  epic: ['紫霄', '星辰', '天罡'],
  legendary: ['焚天', '太虛', '金龍'],
  mythic: ['誅仙', '軒轅', '修羅'],
  immortal: ['鴻蒙', '混沌', '九霄'],
};

const SLOT_BASE_NAMES: Record<EquipSlot, string[]> = {
  weapon: ['長劍', '仙刃', '寶戟', '靈杖'],
  helm: ['道冠', '仙盔', '戰冠'],
  armor: ['法袍', '龍鱗甲', '戰衣'],
  necklace: ['玉佩', '靈鏈', '仙珠'],
  ring: ['道戒', '寶環', '靈戒'],
  boots: ['踏雲履', '仙靴', '追風靴'],
};

let uidCounter = 1;

export function generateEquipItem(
  level: number,
  forcedRarity?: Rarity,
  forcedSlot?: EquipSlot
): EquipItem {
  const slots: EquipSlot[] = ['weapon', 'helm', 'armor', 'necklace', 'ring', 'boots'];
  const slot = forcedSlot || slots[Math.floor(Math.random() * slots.length)];

  let rarity: Rarity = forcedRarity || 'common';
  if (!forcedRarity) {
    const r = Math.random();
    if (r < 0.015) rarity = 'immortal';
    else if (r < 0.055) rarity = 'mythic';
    else if (r < 0.14) rarity = 'legendary';
    else if (r < 0.30) rarity = 'epic';
    else if (r < 0.55) rarity = 'rare';
    else if (r < 0.8) rarity = 'uncommon';
    else rarity = 'common';
  }

  const mult = RARITY_CONFIG[rarity].mult;
  const scale = (1 + level * 0.14) * mult;

  const prefixes = SLOT_PREFIXES[rarity];
  const baseNames = SLOT_BASE_NAMES[slot];
  const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]}·${
    baseNames[Math.floor(Math.random() * baseNames.length)]
  }`;

  const atk =
    slot === 'weapon' || slot === 'ring' || slot === 'necklace'
      ? Math.round(32 * scale * (slot === 'weapon' ? 1.7 : 1))
      : Math.round(10 * scale);
  const hp =
    slot === 'armor' || slot === 'helm' || slot === 'boots'
      ? Math.round(240 * scale * (slot === 'armor' ? 1.5 : 1))
      : Math.round(80 * scale);
  const def = Math.round(14 * scale * (slot === 'armor' || slot === 'helm' ? 1.5 : 0.8));

  return {
    uid: `eq_${Date.now()}_${uidCounter++}`,
    name,
    slot,
    rarity,
    levelReq: Math.max(1, level),
    atk,
    hp,
    def,
    enhanceLevel: 0,
  };
}

export function getItemPower(item: EquipItem | null): number {
  if (!item) return 0;
  const enhMult = 1 + item.enhanceLevel * 0.12;
  const atk = Math.round(item.atk * enhMult);
  const hp = Math.round(item.hp * enhMult);
  const def = Math.round(item.def * enhMult);
  return atk * 4 + def * 3 + Math.round(hp * 0.45);
}

export function computePlayerStats(player: PlayerState) {
  const cls = CLASSES.find((c) => c.id === player.classId) || CLASSES[0];
  const realm = REALMS[player.realmIndex] || REALMS[0];
  const vipInfo =
    player.recharge.vipLevel > 0 ? VIP_TIERS[player.recharge.vipLevel - 1] : null;

  let hp = cls.baseHp + player.level * 140 + realm.hpBonus + (player.realmLayer - 1) * Math.round(realm.hpBonus * 0.12 + 90);
  let atk = cls.baseAtk + player.level * 18 + realm.atkBonus + (player.realmLayer - 1) * Math.round(realm.atkBonus * 0.12 + 12);
  let def = cls.baseDef + player.level * 8 + realm.defBonus + (player.realmLayer - 1) * Math.round(realm.defBonus * 0.12 + 6);

  // Equipped gear
  (Object.keys(player.equipped) as EquipSlot[]).forEach((slot) => {
    const item = player.equipped[slot];
    if (item) {
      const enhMult = 1 + item.enhanceLevel * 0.12;
      atk += Math.round(item.atk * enhMult);
      hp += Math.round(item.hp * enhMult);
      def += Math.round(item.def * enhMult);
    }
  });

  // 5 Companion systems
  (Object.keys(player.companions) as CompanionCategory[]).forEach((cat) => {
    const st = player.companions[cat];
    const tiers = COMPANION_SYSTEMS[cat].tiers;
    const tDef = tiers[Math.min(tiers.length - 1, Math.max(0, st.tier - 1))];
    const lvlScale = 1 + (st.level - 1) * 0.18;
    atk += Math.round(tDef.atkBonus * lvlScale);
    hp += Math.round(tDef.hpBonus * lvlScale);
    def += Math.round(tDef.defBonus * lvlScale);
  });

  // Sect skill bonus
  if (player.sect.joined) {
    const sLvl = player.sect.skillLevel;
    atk += sLvl * 65;
    hp += sLvl * 520;
    def += sLvl * 35;
  }

  // Fashion collection & equipped bonus
  const unlockedFashions = player.unlockedFashions || ['fash_qingyun'];
  const equippedFashionDef =
    FASHION_CATALOG.find((f) => f.id === player.equippedFashion) ||
    FASHION_CATALOG.find((f) => unlockedFashions.includes(f.id)) ||
    FASHION_CATALOG[0];
  let fashionCritBonus = 0;
  unlockedFashions.forEach((fid) => {
    const f = FASHION_CATALOG.find((x) => x.id === fid);
    if (!f) return;
    const isEquipped = f.id === equippedFashionDef.id;
    const weight = isEquipped ? 1 : 0.35;
    atk += Math.round(f.atkBonus * weight);
    hp += Math.round(f.hpBonus * weight);
    def += Math.round(f.defBonus * weight);
    fashionCritBonus += f.critBonus * (isEquipped ? 1 : 0.3);
  });

  // Theme-limited Pet / Treasure / Artifact skins
  const unlockedLimitedSkins = player.unlockedLimitedSkins || [];
  const equippedLimitedPetDef =
    LIMITED_SKINS.find((s) => s.id === player.equippedLimitedPet && s.category === 'pet') || null;
  const equippedLimitedTreasureDef =
    LIMITED_SKINS.find((s) => s.id === player.equippedLimitedTreasure && s.category === 'treasure') || null;
  const equippedLimitedArtifactDef =
    LIMITED_SKINS.find((s) => s.id === player.equippedLimitedArtifact && s.category === 'artifact') || null;

  unlockedLimitedSkins.forEach((sid) => {
    const sk = LIMITED_SKINS.find((x) => x.id === sid);
    if (!sk) return;
    const isEq =
      sk.id === equippedLimitedPetDef?.id ||
      sk.id === equippedLimitedTreasureDef?.id ||
      sk.id === equippedLimitedArtifactDef?.id;
    const weight = isEq ? 1.25 : 0.6;
    atk += Math.round(sk.atkBonus * weight);
    hp += Math.round(sk.hpBonus * weight);
    def += Math.round(sk.defBonus * weight);
  });

  // Activity Title collection & equipped bonus
  const unlockedTitles = player.unlockedTitles || ['title_walker'];
  const equippedTitleDef =
    TITLE_CATALOG.find(
      (t) => t.id === player.equippedTitleId || t.name === player.title
    ) || TITLE_CATALOG[0];
  let titleCritBonus = 0;
  unlockedTitles.forEach((tid) => {
    const tDef = TITLE_CATALOG.find((x) => x.id === tid);
    if (!tDef) return;
    const isEquipped = tDef.id === equippedTitleDef.id;
    const weight = isEquipped ? 1 : 0.4;
    atk += Math.round(tDef.atkBonus * weight);
    hp += Math.round(tDef.hpBonus * weight);
    def += Math.round(tDef.defBonus * weight);
    titleCritBonus += tDef.critBonus * (isEquipped ? 1 : 0.35);
  });

  // VIP % boost
  if (vipInfo) {
    const mult = 1 + vipInfo.atkPctBonus / 100;
    atk = Math.round(atk * mult);
    hp = Math.round(hp * (1 + vipInfo.atkPctBonus / 140));
    def = Math.round(def * (1 + vipInfo.atkPctBonus / 150));
  }

  const critRate = Math.min(
    0.85,
    cls.critRate +
      fashionCritBonus +
      titleCritBonus +
      player.recharge.vipLevel * 0.015 +
      (player.companions.pet.tier - 1) * 0.03 +
      (equippedLimitedPetDef ? 0.05 : 0)
  );
  const combatPower = Math.round(
    atk * 4.5 + def * 3.2 + hp * 0.55 + player.realmIndex * 2200 + player.recharge.vipLevel * 1500
  );

  return {
    hp,
    atk,
    def,
    critRate,
    combatPower,
    realm,
    cls,
    vipInfo,
    equippedFashionDef,
    equippedTitleDef,
    equippedLimitedPetDef,
    equippedLimitedTreasureDef,
    equippedLimitedArtifactDef,
    expMult:
      1 +
      (vipInfo ? vipInfo.expPctBonus / 100 : 0) +
      (player.recharge.supremePrivileges.includes('exp_50') ? 0.5 : 0),
  };
}

export function createInitialPlayer(name: string, classId: ClassId): PlayerState {
  const starterWeapon = generateEquipItem(1, 'uncommon', 'weapon');
  starterWeapon.name = '青雲·入門仙劍';
  const starterArmor = generateEquipItem(1, 'common', 'armor');
  starterArmor.name = '青雲·道徒法袍';

  const base: PlayerState = {
    name: name.trim() || '雲逍遙',
    classId,
    level: 1,
    exp: 0,
    expToNext: 150,
    realmIndex: 0,
    realmLayer: 1,
    cultivation: 0,
    jade: 380,
    boundJade: 500,
    gold: 25000,
    spiritStones: 25,
    companionStones: 15,
    yinyangTokens: 5,
    hp: 2500,
    maxHp: 2500,
    mp: 300,
    maxMp: 300,
    sceneId: 'immortal_mountain',
    autoBattle: true,
    equipped: {
      weapon: starterWeapon,
      helm: null,
      armor: starterArmor,
      necklace: null,
      ring: null,
      boots: null,
    },
    bag: [
      generateEquipItem(2, 'rare', 'ring'),
      generateEquipItem(2, 'uncommon', 'helm'),
    ],
    companions: {
      pet: { tier: 1, level: 1, exp: 0 },
      mount: { tier: 1, level: 1, exp: 0 },
      wing: { tier: 1, level: 1, exp: 0 },
      treasure: { tier: 1, level: 1, exp: 0 },
      artifact: { tier: 1, level: 1, exp: 0 },
    },
    unlockedFashions: ['fash_qingyun'],
    equippedFashion: 'fash_qingyun',
    unlockedLimitedSkins: [],
    equippedLimitedPet: null,
    equippedLimitedTreasure: null,
    equippedLimitedArtifact: null,
    yinyangPity: 0,
    yinyangTotalPulls: 0,
    yinyangMilestonesClaimed: [],
    title: '九霄行者',
    equippedTitleId: 'title_walker',
    unlockedTitles: ['title_walker'],
    killsTotal: 0,
    bossKills: 0,
    dungeonUsed: {},
    arenaRank: 99,
    arenaWins: 0,
    sect: {
      joined: false,
      name: '未加入宗門',
      level: 1,
      contribution: 0,
      skillLevel: 0,
      redEnvelopeClaimed: false,
      warPoints: 0,
    },
    questIndex: 0,
    questProgress: 0,
    questAccepted: false,
    recharge: {
      vipLevel: 0,
      vipExp: 0,
      dailyRechargeYuan: 0,
      totalRechargeYuan: 0,
      consecutiveDays: 1,
      firstRechargeTierClaimed: [],
      firstDoubleUsedIds: [],
      dailyCumulativeClaimed: [],
      totalCumulativeClaimed: [],
      consecutiveClaimedDays: [],
      vipDailyClaimedDay: false,
      vipGiftsBought: [],
      monthCardDays: 0,
      monthCardClaimedToday: false,
      permanentCard: false,
      permanentCardClaimedToday: false,
      supremePrivileges: [],
      growthFundBought: false,
      growthFundClaimedIndices: [],
      battlePassPremium: false,
      battlePassLevel: 1,
      battlePassExp: 0,
      battlePassClaimedFree: [],
      battlePassClaimedPro: [],
      flashDealsBought: [],
      valueBundlesBought: [],
      dailySpecialsBought: [],
    },
  };

  const stats = computePlayerStats(base);
  base.maxHp = stats.hp;
  base.hp = stats.hp;
  return base;
}

export function getVipLevelForYuan(totalYuan: number): number {
  let lvl = 0;
  for (const tier of VIP_TIERS) {
    if (totalYuan >= tier.reqYuan) {
      lvl = tier.level;
    }
  }
  return lvl;
}

export function formatNum(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}億`;
  if (n >= 100000) return `${(n / 10000).toFixed(1)}萬`;
  return Math.floor(n).toLocaleString('en-US');
}

export function slotLabel(slot: EquipSlot): string {
  return EQUIP_SLOT_LABELS[slot];
}
