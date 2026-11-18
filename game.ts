export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED';

export type ClassId = 'sword' | 'mage' | 'demon' | 'martial';

export type SceneId =
  | 'immortal_mountain'
  | 'sect_hall'
  | 'heaven_palace'
  | 'mystic_realm'
  | 'dragon_vein';

export type EquipSlot = 'weapon' | 'helm' | 'armor' | 'necklace' | 'ring' | 'boots';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'immortal';

export type CompanionCategory = 'pet' | 'mount' | 'wing' | 'treasure' | 'artifact';

export type ModalTab =
  | null
  | 'recharge'
  | 'character'
  | 'titles'
  | 'equipment'
  | 'bag'
  | 'companions'
  | 'fashion'
  | 'yinyang_gacha'
  | 'dungeons'
  | 'world_boss'
  | 'sect'
  | 'arena';

export type RechargeSubTab =
  | 'first_recharge'
  | 'topup'
  | 'vip'
  | 'cards'
  | 'cumulative'
  | 'flash_deals'
  | 'fund_pass'
  | 'mall'
  | 'tycoon_rank';

export interface SkillDef {
  id: string;
  name: string;
  keyHint: string;
  description: string;
  multiplier: number;
  cooldown: number; // seconds
  aoeRadius: number;
  mpCost: number;
  color: string;
  isUltimate?: boolean;
  style: 'slash' | 'lotus' | 'lightning' | 'meteor' | 'dragon';
}

export interface ClassDef {
  id: ClassId;
  name: string;
  title: string;
  sectName: string;
  portrait: string;
  selectPortrait: string;
  weaponType: string;
  primaryColor: string;
  secondaryColor: string;
  description: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  critRate: number;
  skills: SkillDef[];
}

export interface RealmDef {
  index: number;
  name: string;
  shortName: string;
  maxLayer: number;
  expPerLayer: number;
  hpBonus: number;
  atkBonus: number;
  defBonus: number;
  auraColor: string;
  tribulationName: string;
}

export interface SceneDef {
  id: SceneId;
  name: string;
  subtitle: string;
  unlockRealmIndex: number;
  skyTop: string;
  skyBottom: string;
  mountainFar: string;
  mountainNear: string;
  groundColor: string;
  accentColor: string;
  monsters: {
    name: string;
    levelMin: number;
    levelMax: number;
    hp: number;
    atk: number;
    color: string;
    expReward: number;
    goldReward: number;
    cultivationReward: number;
    shape: 'spirit' | 'beast' | 'golem' | 'demon' | 'dragonling';
  }[];
}

export interface EquipItem {
  uid: string;
  name: string;
  slot: EquipSlot;
  rarity: Rarity;
  levelReq: number;
  atk: number;
  hp: number;
  def: number;
  enhanceLevel: number;
}

export interface CompanionTier {
  tier: number;
  name: string;
  color: string;
  atkBonus: number;
  hpBonus: number;
  defBonus: number;
  desc: string;
  combatSkill: string;
}

export interface CompanionState {
  tier: number; // 1..6
  level: number;
  exp: number;
}

export interface VipTierDef {
  level: number;
  reqYuan: number;
  title: string;
  exclusiveMount: string;
  extraDungeonEntries: number;
  exclusiveGear: string;
  dailyJade: number;
  dailyGold: number;
  atkPctBonus: number;
  expPctBonus: number;
  privileges: string[];
  giftJadeCost: number;
  giftOrigCost: number;
  giftContents: string;
}

export interface WorldBossDef {
  id: string;
  name: string;
  title: string;
  sceneId: SceneId;
  level: number;
  maxHp: number;
  atk: number;
  color: string;
  respawnSeconds: number;
  rewardsDesc: string;
}

export interface DungeonDef {
  id: string;
  name: string;
  subtitle: string;
  type: 'exp' | 'gold' | 'enhance' | 'wing';
  recPower: number;
  dailyLimit: number;
  rewardSummary: string;
  accent: string;
}

export interface QuestState {
  id: number;
  title: string;
  targetType: 'kill' | 'realm' | 'enhance' | 'boss' | 'companion' | 'recharge';
  targetCount: number;
  progress: number;
  rewardJade: number;
  rewardGold: number;
  rewardExp: number;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  channel: '世界' | '宗門' | '系統' | '傳聞';
  sender: string;
  vip: number;
  text: string;
  timestamp: string;
}

export interface SectMember {
  name: string;
  role: '宗主' | '副宗主' | '長老' | '核心弟子' | '內門弟子';
  power: number;
  vip: number;
  contribution: number;
}

export interface RechargeState {
  vipLevel: number; // 0..15
  vipExp: number; // cumulative Yuan
  dailyRechargeYuan: number;
  totalRechargeYuan: number;
  consecutiveDays: number;
  firstRechargeTierClaimed: number[]; // [6, 30, 98]
  firstDoubleUsedIds: string[];
  dailyCumulativeClaimed: number[];
  totalCumulativeClaimed: number[];
  consecutiveClaimedDays: number[];
  vipDailyClaimedDay: boolean;
  vipGiftsBought: number[];
  monthCardDays: number;
  monthCardClaimedToday: boolean;
  permanentCard: boolean;
  permanentCardClaimedToday: boolean;
  supremePrivileges: ('exp_50' | 'auto_smelt' | 'boss_drop')[];
  growthFundBought: boolean;
  growthFundClaimedIndices: number[];
  battlePassPremium: boolean;
  battlePassLevel: number;
  battlePassExp: number;
  battlePassClaimedFree: number[];
  battlePassClaimedPro: number[];
  flashDealsBought: string[];
  valueBundlesBought: string[];
  dailySpecialsBought: string[];
}

export interface FashionDef {
  id: string;
  name: string;
  subtitle: string;
  theme: 'classic' | 'yinyang' | 'immortal';
  rarity: Rarity;
  primaryColor: string;
  secondaryColor: string;
  trimColor: string;
  auraType: 'none' | 'flame' | 'lotus' | 'yinyang' | 'chaos';
  hpBonus: number;
  atkBonus: number;
  defBonus: number;
  critBonus: number;
  unlockMethod: string;
  unlockJadeCost?: number;
}

export interface LimitedSkinDef {
  id: string;
  category: 'pet' | 'treasure' | 'artifact';
  name: string;
  subtitle: string;
  theme: 'yinyang';
  rarity: Rarity;
  primaryColor: string;
  secondaryColor: string;
  atkBonus: number;
  hpBonus: number;
  defBonus: number;
  combatEffectDesc: string;
}

export type TitleCrestStyle =
  | 'imperial'
  | 'flame'
  | 'star'
  | 'phoenix'
  | 'lotus'
  | 'sword'
  | 'jade'
  | 'shadow';

export interface TitleDef {
  id: string;
  name: string;
  rarity: Rarity;
  crestStyle: TitleCrestStyle;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  hpBonus: number;
  atkBonus: number;
  defBonus: number;
  critBonus: number;
  activityCategory: string;
  unlockRequirement: string;
  redirectTab?: ModalTab;
  redirectRechargeTab?: RechargeSubTab;
}

export interface ArenaRivalDef {
  id: string;
  name: string;
  rank: number;
  level: number;
  realmIndex: number;
  realmLayer: number;
  power: number;
  hp: number;
  atk: number;
  def: number;
  classId: ClassId;
  vip: number;
  titleId: string;
  fashionId: string;
  mountTier: number;
  wingTier: number;
  petTier: number;
  rewardJade: number;
  rewardCompStones: number;
}

export interface YinyangPoolEntry {
  id: string;
  name: string;
  rarity: Rarity;
  weight: number;
  type: 'fashion' | 'limited_skin' | 'red_gear' | 'immortal_gear' | 'stones' | 'comp_stones' | 'jade' | 'cultivation';
  refId?: string;
  amount?: number;
  tag: string;
}

export interface PlayerState {
  name: string;
  classId: ClassId;
  level: number;
  exp: number;
  expToNext: number;
  realmIndex: number; // 0 = 凡人 .. 8 = 飛升
  realmLayer: number; // 1..9
  cultivation: number; // 修為
  jade: number; // 仙玉
  boundJade: number; // 綁定仙玉
  gold: number; // 金幣
  spiritStones: number; // 靈石/強化石
  companionStones: number; // 進階丹
  yinyangTokens: number; // 陰陽乾坤令
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  sceneId: SceneId;
  autoBattle: boolean;
  equipped: Record<EquipSlot, EquipItem | null>;
  bag: EquipItem[];
  companions: Record<CompanionCategory, CompanionState>;
  unlockedFashions: string[];
  equippedFashion: string | null;
  unlockedLimitedSkins: string[];
  equippedLimitedPet: string | null;
  equippedLimitedTreasure: string | null;
  equippedLimitedArtifact: string | null;
  yinyangPity: number;
  yinyangTotalPulls: number;
  yinyangMilestonesClaimed: number[];
  title: string;
  equippedTitleId: string;
  unlockedTitles: string[];
  killsTotal: number;
  bossKills: number;
  dungeonUsed: Record<string, number>;
  arenaRank: number;
  arenaWins: number;
  sect: {
    joined: boolean;
    name: string;
    level: number;
    contribution: number;
    skillLevel: number;
    redEnvelopeClaimed: boolean;
    warPoints: number;
  };
  questIndex: number;
  questProgress: number;
  questAccepted: boolean;
  recharge: RechargeState;
}
