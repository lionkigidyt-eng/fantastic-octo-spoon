import React, { useEffect, useRef } from 'react';
import {
  CLASSES,
  COMPANION_SYSTEMS,
  FASHION_CATALOG,
  RARITY_CONFIG,
  REALMS,
  SCENES,
  TITLE_CATALOG,
} from '../data/xianxiaData';
import {
  ArenaRivalDef,
  EquipItem,
  PlayerState,
  Rarity,
  SkillDef,
  TitleDef,
  WorldBossDef,
} from '../types/game';
import { xianxiaAudio } from '../utils/audio';
import { computePlayerStats, generateEquipItem } from '../utils/gameLogic';

export interface CombatEventPayload {
  expGained: number;
  cultivationGained: number;
  goldGained: number;
  kills: number;
  bossKilled?: WorldBossDef;
  itemsDropped: EquipItem[];
  playerHpRatio: number;
  playerMpRatio: number;
  skillCooldowns: Record<string, number>;
  treasureCooldown: number;
  activeBossHp?: { name: string; hp: number; maxHp: number; title: string } | null;
  arenaHud?: {
    rival: ArenaRivalDef;
    rivalHp: number;
    rivalMaxHp: number;
  } | null;
}

interface ArenaOpponentEntity {
  rival: ArenaRivalDef;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  facing: number;
  attackCd: number;
  skillCd: number;
  skillRot: number;
  animTimer: number;
  flashTimer: number;
  hitScale: number;
  bob: number;
  finishedTimer: number;
  wonState: boolean | null;
  callbackFired: boolean;
}

interface MonsterEntity {
  id: number;
  name: string;
  level: number;
  isElite: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  atk: number;
  color: string;
  radius: number;
  shape: 'spirit' | 'beast' | 'golem' | 'demon' | 'dragonling';
  isBoss: boolean;
  bossDef?: WorldBossDef;
  attackTimer: number;
  windupTimer: number;
  flashTimer: number;
  hitScale: number;
  expReward: number;
  goldReward: number;
  cultivationReward: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  glow?: boolean;
}

interface SkillVfx {
  style: SkillDef['style'] | 'petBolt' | 'treasurePulse' | 'artifactBeam' | 'treasureBurst';
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

interface LootDrop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  kind: 'gold' | 'item';
  goldAmount?: number;
  item?: EquipItem;
  color: string;
  label: string;
}

interface BattleCanvasProps {
  player: PlayerState;
  paused: boolean;
  activeBoss: WorldBossDef | null;
  activeArenaRival: ArenaRivalDef | null;
  skillTriggerRef: React.MutableRefObject<((skillIndex: number) => void) | null>;
  treasureTriggerRef: React.MutableRefObject<(() => void) | null>;
  tribulationTriggerCount: number;
  onCombatTick: (payload: CombatEventPayload) => void;
  onArenaComplete: (won: boolean, rival: ArenaRivalDef) => void;
}

function getLevelDamageFactor(heroLevel: number, targetLevel: number): number {
  const gap = targetLevel - (heroLevel + 3);
  if (gap <= 0) return 1;
  return Math.max(0.18, 1 - gap * 0.055);
}

function getIncomingDamageFactor(heroLevel: number, attackerLevel: number): number {
  const gap = attackerLevel - (heroLevel + 3);
  if (gap <= 0) return 1;
  return Math.min(2.6, 1 + gap * 0.065);
}

function drawCanvasTitleCrest(
  ctx: CanvasRenderingContext2D,
  tDef: TitleDef,
  cx: number,
  cy: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  const w = 104;
  const h = 23;
  const hw = w / 2;
  const hh = h / 2;

  // Outer wings / flames / star spikes by crestStyle
  ctx.fillStyle = tDef.primaryColor;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.3;

  if (tDef.crestStyle === 'imperial' || tDef.crestStyle === 'phoenix') {
    // Winged filigree + top crown crest
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(dir * (hw - 8), -4);
      ctx.lineTo(dir * (hw + 14), -11);
      ctx.lineTo(dir * (hw + 10), 0);
      ctx.lineTo(dir * (hw + 15), 6);
      ctx.lineTo(dir * (hw - 6), 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    // Top crown gem
    ctx.beginPath();
    ctx.moveTo(-10, -hh);
    ctx.lineTo(0, -hh - 8);
    ctx.lineTo(10, -hh);
    ctx.closePath();
    ctx.fillStyle = '#fde047';
    ctx.fill();
  } else if (tDef.crestStyle === 'flame' || tDef.crestStyle === 'shadow') {
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(dir * (hw - 6), -6);
      ctx.quadraticCurveTo(dir * (hw + 14), -12, dir * (hw + 6), 1);
      ctx.lineTo(dir * (hw + 12), 8);
      ctx.lineTo(dir * (hw - 6), 6);
      ctx.closePath();
      ctx.fill();
    });
  } else if (tDef.crestStyle === 'star' || tDef.crestStyle === 'sword') {
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(dir * (hw - 4), -5);
      ctx.lineTo(dir * (hw + 16), 0);
      ctx.lineTo(dir * (hw - 4), 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  } else {
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.ellipse(dir * (hw + 3), 0, 8, 5, dir * -0.25, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Ornate Ribbon Plaque
  const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  grad.addColorStop(0, tDef.secondaryColor);
  grad.addColorStop(0.5, tDef.primaryColor);
  grad.addColorStop(1, tDef.secondaryColor);

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-hw + 8, -hh);
  ctx.lineTo(hw - 8, -hh);
  ctx.lineTo(hw, 0);
  ctx.lineTo(hw - 8, hh);
  ctx.lineTo(-hw + 8, hh);
  ctx.lineTo(-hw, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top & Bottom Gold Jewel Dots
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0, -hh, 2.5, 0, Math.PI * 2);
  ctx.arc(0, hh, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Crisp Traditional Chinese Title Text
  ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
  ctx.lineWidth = 3;
  ctx.strokeText(tDef.name, 0, 0.5);
  ctx.fillStyle = tDef.textColor;
  ctx.fillText(tDef.name, 0, 0.5);

  ctx.restore();
}

export const BattleCanvas: React.FC<BattleCanvasProps> = ({
  player,
  paused,
  activeBoss,
  activeArenaRival,
  skillTriggerRef,
  treasureTriggerRef,
  tribulationTriggerCount,
  onCombatTick,
  onArenaComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef(player);
  const pausedRef = useRef(paused);
  const activeBossRef = useRef<WorldBossDef | null>(activeBoss);
  const activeArenaRef = useRef<ArenaRivalDef | null>(activeArenaRival);
  const onTickRef = useRef(onCombatTick);
  const onArenaCompleteRef = useRef(onArenaComplete);
  const lastTribulationRef = useRef(tribulationTriggerCount);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    activeBossRef.current = activeBoss;
  }, [activeBoss]);

  useEffect(() => {
    activeArenaRef.current = activeArenaRival;
  }, [activeArenaRival]);

  useEffect(() => {
    onTickRef.current = onCombatTick;
  }, [onCombatTick]);

  useEffect(() => {
    onArenaCompleteRef.current = onArenaComplete;
  }, [onArenaComplete]);

  const simRef = useRef({
    heroX: 380,
    heroY: 380,
    heroFacing: 1,
    heroBob: 0,
    heroAttackAnim: 0,
    heroHp: 2500,
    heroMp: 300,
    basicAttackCd: 0,
    treasureSkillCd: 0,
    petAttackTimer: 1.2,
    treasureTimer: 3.2,
    artifactTimer: 2.5,
    skillCooldowns: {} as Record<string, number>,
    monsters: [] as MonsterEntity[],
    arenaOpponent: null as ArenaOpponentEntity | null,
    lastArenaRivalId: null as string | null,
    particles: [] as Particle[],
    vfxs: [] as SkillVfx[],
    floats: [] as FloatingText[],
    loots: [] as LootDrop[],
    ambientMotes: Array.from({ length: 34 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.015,
      vy: -0.012 - Math.random() * 0.025,
      size: 1.5 + Math.random() * 2.8,
      alpha: 0.25 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
    })) as AmbientMote[],
    nextEntityId: 1,
    shakeTime: 0,
    shakeMag: 0,
    hitstopTimer: 0,
    tribulationFlash: 0,
    spawnTimer: 0,
    lastBossId: null as string | null,
    lastSceneId: player.sceneId,
    heldKeys: new Set<string>(),
    moveTarget: null as { x: number; y: number } | null,
    // Accumulators flushed to React every 180ms
    accExp: 0,
    accCult: 0,
    accGold: 0,
    accKills: 0,
    accBossKilled: undefined as WorldBossDef | undefined,
    accItems: [] as EquipItem[],
    flushTimer: 0,
  });

  // Trigger tribulation lightning burst when player breaks through realm
  useEffect(() => {
    if (tribulationTriggerCount !== lastTribulationRef.current) {
      lastTribulationRef.current = tribulationTriggerCount;
      const sim = simRef.current;
      sim.tribulationFlash = 1.0;
      sim.shakeTime = 0.45;
      sim.shakeMag = 10;
      sim.vfxs.push({
        style: 'lightning',
        x: sim.heroX,
        y: sim.heroY,
        tx: sim.heroX,
        ty: sim.heroY,
        color: '#fde047',
        radius: 190,
        life: 0.9,
        maxLife: 0.9,
      });
      sim.floats.push({
        x: sim.heroX,
        y: sim.heroY - 85,
        vy: -45,
        text: '境界突破 · 天劫降臨！',
        color: '#fde047',
        size: 22,
        life: 1.6,
        maxLife: 1.6,
      });
    }
  }, [tribulationTriggerCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sim = simRef.current;
      if (sim.heroX === 380 && sim.heroY === 380) {
        sim.heroX = window.innerWidth * 0.36;
        sim.heroY = window.innerHeight * 0.62;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speed = 130
    ) => {
      const sim = simRef.current;
      if (sim.particles.length > 260) return;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.8) * speed;
        sim.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 20,
          radius: 2 + Math.random() * 3.5,
          color,
          life: 0.35 + Math.random() * 0.35,
          maxLife: 0.7,
          glow: true,
        });
      }
    };

    const castSkill = (skillIdx: number) => {
      const p = playerRef.current;
      const stats = computePlayerStats(p);
      const skill = stats.cls.skills[skillIdx];
      if (!skill) return;
      const sim = simRef.current;
      if ((sim.skillCooldowns[skill.id] || 0) > 0) return;

      sim.skillCooldowns[skill.id] = skill.cooldown;
      sim.heroMp = Math.max(0, sim.heroMp - skill.mpCost);
      sim.heroAttackAnim = 0.35;

      // Find nearest enemy (or Arena opponent) for target point
      let tx = sim.heroX + sim.heroFacing * 150;
      let ty = sim.heroY;
      if (sim.arenaOpponent && sim.arenaOpponent.hp > 0) {
        tx = sim.arenaOpponent.x;
        ty = sim.arenaOpponent.y;
      } else {
        let bestDist = Infinity;
        for (const m of sim.monsters) {
          const d = Math.hypot(m.x - sim.heroX, m.y - sim.heroY);
          if (d < bestDist) {
            bestDist = d;
            tx = m.x;
            ty = m.y;
          }
        }
      }
      sim.heroFacing = tx >= sim.heroX ? 1 : -1;

      sim.vfxs.push({
        style: skill.style,
        x: sim.heroX,
        y: sim.heroY,
        tx,
        ty,
        color: skill.color,
        radius: skill.aoeRadius,
        life: skill.isUltimate ? 0.85 : 0.55,
        maxLife: skill.isUltimate ? 0.85 : 0.55,
      });

      xianxiaAudio.playSkillBurst(Boolean(skill.isUltimate));
      if (skill.isUltimate) {
        sim.shakeTime = 0.32;
        sim.shakeMag = 9;
        sim.hitstopTimer = 0.045;
      } else {
        sim.shakeTime = 0.14;
        sim.shakeMag = 4;
      }

      // Apply damage to Arena Opponent or PVE enemies
      const cx = skill.isUltimate ? (sim.heroX + tx) * 0.5 : tx;
      const cy = skill.isUltimate ? (sim.heroY + ty) * 0.5 : ty;

      if (sim.arenaOpponent && sim.arenaOpponent.hp > 0) {
        const opp = sim.arenaOpponent;
        const d = Math.hypot(opp.x - cx, opp.y - cy);
        if (d <= skill.aoeRadius + 46) {
          const isCrit = Math.random() < stats.critRate || skill.style === 'lightning';
          const critMult = isCrit ? 1.75 : 1.0;
          const rawAtk = Math.max(20, stats.atk * skill.multiplier * critMult - opp.rival.def * 0.35);
          const dmg = Math.max(
            10,
            Math.round(rawAtk * getLevelDamageFactor(p.level, opp.rival.level) * (0.94 + Math.random() * 0.12))
          );
          opp.hp = Math.max(0, opp.hp - dmg);
          opp.flashTimer = 0.12;
          opp.hitScale = 1.18;
          spawnParticles(opp.x, opp.y - 24, skill.color, isCrit ? 12 : 7, 160);
          sim.floats.push({
            x: opp.x + (Math.random() - 0.5) * 24,
            y: opp.y - 82,
            vy: isCrit ? -68 : -50,
            text: isCrit ? `暴擊 ${dmg.toLocaleString()}` : `${dmg.toLocaleString()}`,
            color: isCrit ? '#fde047' : '#ffffff',
            size: isCrit ? 20 : 15,
            life: 0.9,
            maxLife: 0.9,
          });
        }
      } else {
        for (const m of sim.monsters) {
          const d = Math.hypot(m.x - cx, m.y - cy);
          if (d <= skill.aoeRadius + m.radius) {
            const isCrit = Math.random() < stats.critRate || skill.style === 'lightning';
            const critMult = isCrit ? 1.75 : 1.0;
            const supFactor = getLevelDamageFactor(p.level, m.level);
            const dmg = Math.max(
              1,
              Math.round(stats.atk * skill.multiplier * critMult * supFactor * (0.94 + Math.random() * 0.12))
            );
            m.hp -= dmg;
            m.flashTimer = 0.12;
            m.hitScale = 1.2;
            spawnParticles(m.x, m.y - 20, skill.color, isCrit ? 10 : 6, 150);
            sim.floats.push({
              x: m.x + (Math.random() - 0.5) * 28,
              y: m.y - m.radius - 16,
              vy: isCrit ? -70 : -50,
              text:
                supFactor < 0.75
                  ? `壓制 ${dmg.toLocaleString()}`
                  : isCrit
                  ? `暴擊 ${dmg.toLocaleString()}`
                  : `${dmg.toLocaleString()}`,
              color: isCrit ? '#fde047' : supFactor < 0.75 ? '#fda4af' : '#ffffff',
              size: isCrit ? 20 : 14,
              life: 0.9,
              maxLife: 0.9,
            });
          }
        }
      }

      // Lifesteal for Demon/Martial skill 4
      if (skillIdx === 3 && (p.classId === 'demon' || p.classId === 'martial')) {
        const heal = Math.round(stats.hp * 0.12);
        sim.heroHp = Math.min(stats.hp, sim.heroHp + heal);
        sim.floats.push({
          x: sim.heroX,
          y: sim.heroY - 60,
          vy: -40,
          text: `+${heal} 氣血`,
          color: '#4ade80',
          size: 14,
          life: 0.9,
          maxLife: 0.9,
        });
      }
    };

    skillTriggerRef.current = castSkill;

    const castTreasureSkill = () => {
      const sim = simRef.current;
      if (sim.treasureSkillCd > 0) return;
      const p = playerRef.current;
      const stats = computePlayerStats(p);
      const tresTier = p.companions.treasure.tier;
      const tresDef =
        COMPANION_SYSTEMS.treasure.tiers[tresTier - 1] || COMPANION_SYSTEMS.treasure.tiers[0];
      const limitedTre = stats.equippedLimitedTreasureDef;
      const activeTreName = limitedTre ? limitedTre.name : tresDef.name;
      const activeTreColor = limitedTre ? limitedTre.primaryColor : tresDef.color;

      sim.treasureSkillCd = 10;
      sim.shakeTime = 0.36;
      sim.shakeMag = 8;
      sim.hitstopTimer = 0.04;
      xianxiaAudio.playSkillBurst(true);

      // Instant heal + MP restore
      const healPct = (limitedTre ? 0.28 : 0.2) + tresTier * 0.05;
      const healAmt = Math.max(50, Math.round(stats.hp * healPct));
      sim.heroHp = Math.min(stats.hp, sim.heroHp + healAmt);
      sim.heroMp = Math.min(p.maxMp, sim.heroMp + 40 + tresTier * 8);

      // Grand full-arena Treasure Burst animation
      sim.vfxs.push({
        style: 'treasureBurst',
        x: sim.heroX,
        y: sim.heroY - 20,
        tx: sim.heroX,
        ty: sim.heroY - 20,
        color: activeTreColor,
        radius: 360,
        life: 1.15,
        maxLife: 1.15,
      });

      sim.floats.push({
        x: sim.heroX,
        y: sim.heroY - 110,
        vy: -32,
        text: `【法寶奧義 · ${activeTreName}】`,
        color: '#fde047',
        size: 20,
        life: 1.35,
        maxLife: 1.35,
      });
      sim.floats.push({
        x: sim.heroX,
        y: sim.heroY - 82,
        vy: -40,
        text: `法寶回天 +${healAmt.toLocaleString()} 氣血`,
        color: '#4ade80',
        size: 14,
        life: 1.1,
        maxLife: 1.1,
      });

      const dmgMult = 2.2 + (tresTier - 1) * 0.9;
      if (sim.arenaOpponent && sim.arenaOpponent.hp > 0) {
        const opp = sim.arenaOpponent;
        const dmg = Math.max(
          10,
          Math.round(stats.atk * dmgMult * getLevelDamageFactor(p.level, opp.rival.level))
        );
        opp.hp = Math.max(0, opp.hp - dmg);
        opp.flashTimer = 0.16;
        opp.hitScale = 1.22;
        spawnParticles(opp.x, opp.y - 24, activeTreColor, 14, 180);
        sim.floats.push({
          x: opp.x,
          y: opp.y - 84,
          vy: -60,
          text: `法寶鎮殺 ${dmg.toLocaleString()}`,
          color: activeTreColor,
          size: 17,
          life: 1.0,
          maxLife: 1.0,
        });
      } else {
        for (const m of sim.monsters) {
          const dmg = Math.max(
            1,
            Math.round(
              stats.atk *
                dmgMult *
                getLevelDamageFactor(p.level, m.level) *
                (0.95 + Math.random() * 0.1)
            )
          );
          m.hp -= dmg;
          m.flashTimer = 0.16;
          m.hitScale = 1.24;
          const dx = m.x - sim.heroX;
          const dy = m.y - sim.heroY;
          const dist = Math.max(1, Math.hypot(dx, dy));
          m.x += (dx / dist) * 28;
          m.y += (dy / dist) * 14;
          spawnParticles(m.x, m.y - 20, activeTreColor, 12, 180);
          sim.floats.push({
            x: m.x + (Math.random() - 0.5) * 20,
            y: m.y - m.radius - 18,
            vy: -60,
            text: `法寶鎮殺 ${dmg.toLocaleString()}`,
            color: activeTreColor,
            size: 17,
            life: 1.0,
            maxLife: 1.0,
          });
        }
      }
    };

    treasureTriggerRef.current = castTreasureSkill;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toLowerCase();
      simRef.current.heldKeys.add(key);
      if (key === '1') castSkill(0);
      else if (key === '2') castSkill(1);
      else if (key === '3') castSkill(2);
      else if (key === '4') castSkill(3);
      else if (key === 'f') castTreasureSkill();
      else if (e.code === 'Space') {
        e.preventDefault();
        castSkill(4);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      simRef.current.heldKeys.delete(e.key.toLowerCase());
    };

    const handleBlur = () => {
      simRef.current.heldKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    let lastTime = performance.now();
    let rafId = 0;

    const spawnRegularMonster = (w: number, h: number) => {
      const p = playerRef.current;
      const scene = SCENES.find((s) => s.id === p.sceneId) || SCENES[0];
      const tpl = scene.monsters[Math.floor(Math.random() * scene.monsters.length)];
      const sim = simRef.current;
      const side = Math.random() < 0.72 ? 1 : -1;
      const x = Math.max(120, Math.min(w - 140, w * 0.55 + side * (160 + Math.random() * (w * 0.28))));
      const y = Math.max(h * 0.44, Math.min(h * 0.78, h * (0.48 + Math.random() * 0.26)));

      const isElite = Math.random() < 0.2;
      const baseLevel =
        tpl.levelMin + Math.floor(Math.random() * (tpl.levelMax - tpl.levelMin + 1));
      const level = isElite ? baseLevel + 3 : baseLevel;
      const hpCurve = Math.pow(1.06, Math.max(0, level - tpl.levelMin));
      const atkCurve = Math.pow(1.045, Math.max(0, level - tpl.levelMin));
      const hpMult = hpCurve * (isElite ? 2.15 : 1);
      const atkMult = atkCurve * (isElite ? 1.45 : 1);
      const rewardMult = hpCurve * (isElite ? 1.85 : 1);

      sim.monsters.push({
        id: sim.nextEntityId++,
        name: tpl.name,
        level,
        isElite,
        x,
        y,
        vx: 0,
        vy: 0,
        hp: Math.round(tpl.hp * hpMult),
        maxHp: Math.round(tpl.hp * hpMult),
        atk: Math.round(tpl.atk * atkMult),
        color: tpl.color,
        radius: isElite ? 34 : 27,
        shape: tpl.shape,
        isBoss: false,
        attackTimer: 1.3 + Math.random(),
        windupTimer: 0,
        flashTimer: 0,
        hitScale: 1,
        expReward: Math.round(tpl.expReward * rewardMult),
        goldReward: Math.round(tpl.goldReward * rewardMult),
        cultivationReward: Math.round(tpl.cultivationReward * rewardMult),
      });
    };

    const spawnWorldBoss = (boss: WorldBossDef, w: number, h: number) => {
      const sim = simRef.current;
      sim.monsters = [
        {
          id: sim.nextEntityId++,
          name: boss.name,
          level: boss.level,
          isElite: false,
          x: w * 0.66,
          y: h * 0.58,
          vx: 0,
          vy: 0,
          hp: boss.maxHp,
          maxHp: boss.maxHp,
          atk: boss.atk,
          color: boss.color,
          radius: 52,
          shape: 'dragonling',
          isBoss: true,
          bossDef: boss,
          attackTimer: 2.0,
          windupTimer: 0,
          flashTimer: 0,
          hitScale: 1,
          expReward: Math.round(boss.maxHp * 0.08),
          goldReward: Math.round(boss.maxHp * 0.25),
          cultivationReward: Math.round(boss.maxHp * 0.04),
        },
      ];
      sim.floats.push({
        x: w * 0.5,
        y: h * 0.3,
        vy: -25,
        text: `Lv.${boss.level} 世界 BOSS【${boss.name}】降臨戰場！`,
        color: '#ef4444',
        size: 24,
        life: 2.0,
        maxLife: 2.0,
      });
    };

    const dropLootForMonster = (m: MonsterEntity) => {
      const sim = simRef.current;
      const p = playerRef.current;
      const coinCount = m.isBoss ? 10 : 3;
      for (let i = 0; i < coinCount; i++) {
        sim.loots.push({
          id: sim.nextEntityId++,
          x: m.x,
          y: m.y,
          vx: (Math.random() - 0.5) * 140,
          vy: -80 - Math.random() * 80,
          age: 0,
          kind: 'gold',
          goldAmount: Math.round(m.goldReward / coinCount),
          color: '#fbbf24',
          label: '金幣',
        });
      }

      const dropChance = m.isBoss ? 1.0 : p.recharge.supremePrivileges.includes('boss_drop') ? 0.58 : 0.42;
      if (Math.random() < dropChance) {
        const dropCount = m.isBoss ? 3 : 1;
        for (let d = 0; d < dropCount; d++) {
          let forcedRarity: Rarity | undefined;
          if (m.isBoss) {
            forcedRarity = d === 0 ? (Math.random() < 0.35 ? 'immortal' : 'mythic') : 'legendary';
          }
          const item = generateEquipItem(p.level + (m.isBoss ? 3 : 0), forcedRarity);
          sim.loots.push({
            id: sim.nextEntityId++,
            x: m.x + (Math.random() - 0.5) * 40,
            y: m.y,
            vx: (Math.random() - 0.5) * 150,
            vy: -110 - Math.random() * 60,
            age: 0,
            kind: 'item',
            item,
            color: RARITY_CONFIG[item.rarity].color,
            label: item.name,
          });
        }
      }
    };

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const w = window.innerWidth;
      const h = window.innerHeight;

      const sim = simRef.current;
      const p = playerRef.current;
      const stats = computePlayerStats(p);
      const scene = SCENES.find((s) => s.id === p.sceneId) || SCENES[0];

      // Arena mode sync (enter arena -> clear monsters + spawn rival; exit -> restore map monsters)
      const arenaTarget = activeArenaRef.current;
      if (arenaTarget && sim.lastArenaRivalId !== arenaTarget.id) {
        sim.lastArenaRivalId = arenaTarget.id;
        sim.monsters = [];
        sim.loots = [];
        sim.vfxs = [];
        sim.heroX = w * 0.28;
        sim.heroY = h * 0.62;
        sim.heroFacing = 1;
        sim.heroHp = stats.hp;
        sim.heroMp = p.maxMp;
        sim.arenaOpponent = {
          rival: arenaTarget,
          hp: arenaTarget.hp,
          maxHp: arenaTarget.hp,
          x: w * 0.72,
          y: h * 0.62,
          facing: -1,
          attackCd: 1.0,
          skillCd: 2.2,
          skillRot: 0,
          animTimer: 0,
          flashTimer: 0,
          hitScale: 1,
          bob: 0,
          finishedTimer: -1,
          wonState: null,
          callbackFired: false,
        };
        sim.floats.push({
          x: w * 0.5,
          y: h * 0.3,
          vy: -22,
          text: `【跨服演武台 · 決戰第 ${arenaTarget.rank} 名 ${arenaTarget.name}！】`,
          color: '#fde047',
          size: 22,
          life: 1.8,
          maxLife: 1.8,
        });
      } else if (!arenaTarget && sim.lastArenaRivalId !== null) {
        sim.lastArenaRivalId = null;
        sim.arenaOpponent = null;
        sim.heroHp = stats.hp;
        sim.monsters = [];
        for (let i = 0; i < 4; i++) {
          spawnRegularMonster(w, h);
        }
        sim.floats.push({
          x: w * 0.5,
          y: h * 0.34,
          vy: -24,
          text: `返回【${scene.name}】，妖魔已重新湧現！`,
          color: '#38bdf8',
          size: 18,
          life: 1.5,
          maxLife: 1.5,
        });
      }

      // Scene changed: clear regular monsters
      if (sim.lastSceneId !== p.sceneId) {
        sim.lastSceneId = p.sceneId;
        if (!activeBossRef.current && !sim.arenaOpponent) {
          sim.monsters = [];
        }
      }

      // World boss state sync
      const bossTarget = activeBossRef.current;
      if (!sim.arenaOpponent) {
        if (bossTarget && sim.lastBossId !== bossTarget.id) {
          sim.lastBossId = bossTarget.id;
          spawnWorldBoss(bossTarget, w, h);
        } else if (!bossTarget && sim.lastBossId !== null) {
          sim.lastBossId = null;
          sim.monsters = [];
        }
      }

      if (sim.heroHp > stats.hp) sim.heroHp = stats.hp;
      if (!sim.arenaOpponent && sim.heroHp <= 0) {
        sim.heroHp = stats.hp;
        sim.floats.push({
          x: sim.heroX,
          y: sim.heroY - 82,
          vy: -36,
          text: '【重傷調息 · 靈力重聚】',
          color: '#f87171',
          size: 16,
          life: 1.2,
          maxLife: 1.2,
        });
      }

      if (!pausedRef.current) {
        // Hitstop pause
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer -= dt;
        } else {
          // Cooldowns & regeneration
          sim.basicAttackCd = Math.max(0, sim.basicAttackCd - dt);
          sim.treasureSkillCd = Math.max(0, sim.treasureSkillCd - dt);
          sim.heroAttackAnim = Math.max(0, sim.heroAttackAnim - dt);
          sim.tribulationFlash = Math.max(0, sim.tribulationFlash - dt * 1.1);
          sim.shakeTime = Math.max(0, sim.shakeTime - dt);
          if (!sim.arenaOpponent || sim.arenaOpponent.finishedTimer < 0) {
            sim.heroHp = Math.min(stats.hp, sim.heroHp + stats.hp * (sim.arenaOpponent ? 0.012 : 0.03) * dt);
            sim.heroMp = Math.min(p.maxMp, sim.heroMp + 22 * dt);
          }
          sim.heroBob += dt * 3.4;

          for (const k of Object.keys(sim.skillCooldowns)) {
            sim.skillCooldowns[k] = Math.max(0, sim.skillCooldowns[k] - dt);
          }

          // Spawn monsters only when NOT in Boss and NOT in Arena
          if (!bossTarget && !sim.arenaOpponent && sim.monsters.length < 4) {
            sim.spawnTimer -= dt;
            if (sim.spawnTimer <= 0) {
              spawnRegularMonster(w, h);
              sim.spawnTimer = 0.75;
            }
          }

          const duelActive = Boolean(sim.arenaOpponent && sim.arenaOpponent.finishedTimer < 0);

          // Hero movement: manual keys take priority over auto-battle
          let moveX = 0;
          let moveY = 0;
          if (sim.heldKeys.has('w') || sim.heldKeys.has('arrowup')) moveY -= 1;
          if (sim.heldKeys.has('s') || sim.heldKeys.has('arrowdown')) moveY += 1;
          if (sim.heldKeys.has('a') || sim.heldKeys.has('arrowleft')) moveX -= 1;
          if (sim.heldKeys.has('d') || sim.heldKeys.has('arrowright')) moveX += 1;

          const heroSpeed = 230 + p.companions.mount.tier * 18;
          if (moveX !== 0 || moveY !== 0) {
            sim.moveTarget = null;
            const len = Math.hypot(moveX, moveY);
            sim.heroX += (moveX / len) * heroSpeed * dt;
            sim.heroY += (moveY / len) * heroSpeed * dt;
            if (moveX !== 0) sim.heroFacing = moveX > 0 ? 1 : -1;
          } else if (sim.moveTarget) {
            const dx = sim.moveTarget.x - sim.heroX;
            const dy = sim.moveTarget.y - sim.heroY;
            const dist = Math.hypot(dx, dy);
            if (dist < 10) {
              sim.moveTarget = null;
            } else {
              sim.heroX += (dx / dist) * heroSpeed * dt;
              sim.heroY += (dy / dist) * heroSpeed * dt;
              sim.heroFacing = dx >= 0 ? 1 : -1;
            }
          } else if (duelActive && sim.arenaOpponent && p.autoBattle) {
            const opp = sim.arenaOpponent;
            const dx = opp.x - sim.heroX;
            const dy = opp.y - sim.heroY;
            const dist = Math.hypot(dx, dy);
            const stopDist = 96;
            if (dist > stopDist) {
              sim.heroX += (dx / dist) * heroSpeed * dt;
              sim.heroY += (dy / dist) * heroSpeed * dt;
              sim.heroFacing = dx >= 0 ? 1 : -1;
            } else {
              sim.heroFacing = dx >= 0 ? 1 : -1;
              let castAny = false;
              for (let sIdx = 4; sIdx >= 0; sIdx--) {
                const sk = stats.cls.skills[sIdx];
                if ((sim.skillCooldowns[sk.id] || 0) <= 0 && sim.heroMp >= sk.mpCost) {
                  castSkill(sIdx);
                  castAny = true;
                  break;
                }
              }
              if (!castAny && sim.basicAttackCd <= 0) {
                sim.basicAttackCd = 0.56;
                sim.heroAttackAnim = 0.22;
                const isCrit = Math.random() < stats.critRate;
                const rawAtk = Math.max(15, stats.atk * (isCrit ? 1.7 : 1.0) - opp.rival.def * 0.35);
                const dmg = Math.max(
                  8,
                  Math.round(rawAtk * getLevelDamageFactor(p.level, opp.rival.level) * (0.92 + Math.random() * 0.16))
                );
                opp.hp = Math.max(0, opp.hp - dmg);
                opp.flashTimer = 0.1;
                opp.hitScale = 1.15;
                xianxiaAudio.playSwordSlash(isCrit);
                spawnParticles(opp.x, opp.y - 20, stats.cls.primaryColor, isCrit ? 8 : 4, 120);
                sim.vfxs.push({
                  style: 'slash',
                  x: sim.heroX,
                  y: sim.heroY,
                  tx: opp.x,
                  ty: opp.y,
                  color: stats.cls.primaryColor,
                  radius: 62,
                  life: 0.24,
                  maxLife: 0.24,
                });
                sim.floats.push({
                  x: opp.x + (Math.random() - 0.5) * 20,
                  y: opp.y - 78,
                  vy: -50,
                  text: isCrit ? `暴擊 ${dmg.toLocaleString()}` : `${dmg.toLocaleString()}`,
                  color: isCrit ? '#fde047' : '#f8fafc',
                  size: isCrit ? 18 : 14,
                  life: 0.75,
                  maxLife: 0.75,
                });
              }
            }
          } else if (!sim.arenaOpponent && p.autoBattle && sim.monsters.length > 0) {
            // Find closest monster
            let closest = sim.monsters[0];
            let bestD = Infinity;
            for (const m of sim.monsters) {
              const d = Math.hypot(m.x - sim.heroX, m.y - sim.heroY);
              if (d < bestD) {
                bestD = d;
                closest = m;
              }
            }
            const stopDist = closest.radius + 78;
            if (bestD > stopDist) {
              const dx = closest.x - sim.heroX;
              const dy = closest.y - sim.heroY;
              sim.heroX += (dx / bestD) * heroSpeed * dt;
              sim.heroY += (dy / bestD) * heroSpeed * dt;
              sim.heroFacing = dx >= 0 ? 1 : -1;
            } else {
              sim.heroFacing = closest.x >= sim.heroX ? 1 : -1;
              let castAny = false;
              for (let sIdx = 4; sIdx >= 0; sIdx--) {
                const sk = stats.cls.skills[sIdx];
                if ((sim.skillCooldowns[sk.id] || 0) <= 0 && sim.heroMp >= sk.mpCost) {
                  castSkill(sIdx);
                  castAny = true;
                  break;
                }
              }
              if (!castAny && sim.basicAttackCd <= 0) {
                sim.basicAttackCd = 0.58;
                sim.heroAttackAnim = 0.22;
                const isCrit = Math.random() < stats.critRate;
                const supFactor = getLevelDamageFactor(p.level, closest.level);
                const dmg = Math.max(
                  1,
                  Math.round(stats.atk * (isCrit ? 1.7 : 1.0) * supFactor * (0.92 + Math.random() * 0.16))
                );
                closest.hp -= dmg;
                closest.flashTimer = 0.1;
                closest.hitScale = 1.15;
                xianxiaAudio.playSwordSlash(isCrit);
                spawnParticles(closest.x, closest.y - 16, stats.cls.primaryColor, isCrit ? 7 : 4, 110);
                sim.vfxs.push({
                  style: 'slash',
                  x: sim.heroX,
                  y: sim.heroY,
                  tx: closest.x,
                  ty: closest.y,
                  color: stats.cls.primaryColor,
                  radius: 58,
                  life: 0.24,
                  maxLife: 0.24,
                });
                sim.floats.push({
                  x: closest.x + (Math.random() - 0.5) * 20,
                  y: closest.y - closest.radius - 10,
                  vy: -50,
                  text:
                    supFactor < 0.75
                      ? `壓制 ${dmg.toLocaleString()}`
                      : isCrit
                      ? `暴擊 ${dmg.toLocaleString()}`
                      : `${dmg.toLocaleString()}`,
                  color: isCrit ? '#fde047' : supFactor < 0.75 ? '#fda4af' : '#f8fafc',
                  size: isCrit ? 18 : 14,
                  life: 0.75,
                  maxLife: 0.75,
                });
              }
            }
          }

          // Clamp hero inside playable arena floor
          sim.heroX = Math.max(90, Math.min(w - 90, sim.heroX));
          sim.heroY = Math.max(h * 0.42, Math.min(h * 0.80, sim.heroY));

          // === Active Companion Combat Loop (靈寵 / 法寶 / 神器) ===
          const tSecLoop = now * 0.001;
          // 1) 靈寵 (Pet) periodic spirit bolt attack
          sim.petAttackTimer -= dt;
          if (sim.petAttackTimer <= 0 && (sim.monsters.length > 0 || duelActive)) {
            sim.petAttackTimer = 1.8;
            const petTier = p.companions.pet.tier;
            const petTierDef = COMPANION_SYSTEMS.pet.tiers[petTier - 1] || COMPANION_SYSTEMS.pet.tiers[0];
            const petScale = [0.45, 0.65, 0.85, 1.1, 1.4, 1.85][petTier - 1] || 0.45;
            const petOriginX = sim.heroX + Math.cos(tSecLoop * 2.2) * 58;
            const petOriginY = sim.heroY - 58 + Math.sin(tSecLoop * 3.1) * 9;

            if (duelActive && sim.arenaOpponent) {
              const opp = sim.arenaOpponent;
              const petDmg = Math.max(
                5,
                Math.round(stats.atk * petScale * getLevelDamageFactor(p.level, opp.rival.level))
              );
              opp.hp = Math.max(0, opp.hp - petDmg);
              opp.flashTimer = 0.08;
              opp.hitScale = 1.12;
              spawnParticles(opp.x, opp.y - 20, petTierDef.color, 5, 110);
              sim.vfxs.push({
                style: 'petBolt',
                x: petOriginX,
                y: petOriginY,
                tx: opp.x,
                ty: opp.y - 20,
                color: petTierDef.color,
                radius: 16 + petTier * 2,
                life: 0.28,
                maxLife: 0.28,
              });
              sim.floats.push({
                x: opp.x + (Math.random() - 0.5) * 18,
                y: opp.y - 76,
                vy: -44,
                text: `靈寵 ${petDmg.toLocaleString()}`,
                color: petTierDef.color,
                size: 13,
                life: 0.72,
                maxLife: 0.72,
              });
            } else if (sim.monsters.length > 0) {
              let petTarget = sim.monsters[0];
              let bestPetDist = Infinity;
              for (const m of sim.monsters) {
                const d = Math.hypot(m.x - sim.heroX, m.y - sim.heroY);
                if (d < bestPetDist) {
                  bestPetDist = d;
                  petTarget = m;
                }
              }
              const petDmg = Math.max(
                1,
                Math.round(
                  stats.atk *
                    petScale *
                    getLevelDamageFactor(p.level, petTarget.level) *
                    (0.95 + Math.random() * 0.1)
                )
              );
              petTarget.hp -= petDmg;
              petTarget.flashTimer = 0.08;
              petTarget.hitScale = 1.12;
              spawnParticles(petTarget.x, petTarget.y - 16, petTierDef.color, 5, 110);
              sim.vfxs.push({
                style: 'petBolt',
                x: petOriginX,
                y: petOriginY,
                tx: petTarget.x,
                ty: petTarget.y - 18,
                color: petTierDef.color,
                radius: 16 + petTier * 2,
                life: 0.28,
                maxLife: 0.28,
              });
              sim.floats.push({
                x: petTarget.x + (Math.random() - 0.5) * 18,
                y: petTarget.y - petTarget.radius - 18,
                vy: -44,
                text: `靈寵 ${petDmg.toLocaleString()}`,
                color: petTierDef.color,
                size: 13,
                life: 0.72,
                maxLife: 0.72,
              });
            }
          }

          // 2) 法寶 (Treasure) periodic protective heal + Bagua pulse
          sim.treasureTimer -= dt;
          if (sim.treasureTimer <= 0 && (!sim.arenaOpponent || duelActive)) {
            sim.treasureTimer = 4.0;
            const tresTier = p.companions.treasure.tier;
            const tresTierDef =
              COMPANION_SYSTEMS.treasure.tiers[tresTier - 1] || COMPANION_SYSTEMS.treasure.tiers[0];
            const healPct = [0.04, 0.06, 0.08, 0.1, 0.12, 0.16][tresTier - 1] || 0.04;
            const healAmt = Math.max(10, Math.round(stats.hp * healPct));
            sim.heroHp = Math.min(stats.hp, sim.heroHp + healAmt);
            if (tresTier >= 4) {
              sim.heroMp = Math.min(p.maxMp, sim.heroMp + 20);
            }
            sim.vfxs.push({
              style: 'treasurePulse',
              x: sim.heroX,
              y: sim.heroY - 12,
              tx: sim.heroX,
              ty: sim.heroY - 12,
              color: tresTierDef.color,
              radius: 115 + tresTier * 18,
              life: 0.55,
              maxLife: 0.55,
            });
            sim.floats.push({
              x: sim.heroX,
              y: sim.heroY - 76,
              vy: -38,
              text: `法寶護主 +${healAmt.toLocaleString()}`,
              color: '#4ade80',
              size: 13,
              life: 0.9,
              maxLife: 0.9,
            });
            if (tresTier >= 2) {
              const pulseRadius = 115 + tresTier * 18;
              if (duelActive && sim.arenaOpponent) {
                const opp = sim.arenaOpponent;
                if (Math.hypot(opp.x - sim.heroX, opp.y - sim.heroY) <= pulseRadius + 38) {
                  const pulseDmg = Math.round(
                    stats.atk * (0.4 + tresTier * 0.15) * getLevelDamageFactor(p.level, opp.rival.level)
                  );
                  opp.hp = Math.max(0, opp.hp - pulseDmg);
                  opp.flashTimer = 0.08;
                  sim.floats.push({
                    x: opp.x,
                    y: opp.y - 68,
                    vy: -40,
                    text: `法寶震傷 ${pulseDmg.toLocaleString()}`,
                    color: tresTierDef.color,
                    size: 12,
                    life: 0.65,
                    maxLife: 0.65,
                  });
                }
              } else {
                for (const m of sim.monsters) {
                  if (Math.hypot(m.x - sim.heroX, m.y - sim.heroY) <= pulseRadius + m.radius) {
                    const pulseDmg = Math.round(
                      stats.atk * (0.4 + tresTier * 0.15) * getLevelDamageFactor(p.level, m.level)
                    );
                    m.hp -= pulseDmg;
                    m.flashTimer = 0.08;
                    sim.floats.push({
                      x: m.x,
                      y: m.y - m.radius - 10,
                      vy: -40,
                      text: `法寶震傷 ${pulseDmg.toLocaleString()}`,
                      color: tresTierDef.color,
                      size: 12,
                      life: 0.65,
                      maxLife: 0.65,
                    });
                  }
                }
              }
            }
          }

          // 3) 神器 (Artifact) periodic divine strike
          sim.artifactTimer -= dt;
          if (sim.artifactTimer <= 0 && (sim.monsters.length > 0 || duelActive)) {
            const artTier = p.companions.artifact.tier;
            sim.artifactTimer = Math.max(2.9, 3.6 - artTier * 0.1);
            const artTierDef =
              COMPANION_SYSTEMS.artifact.tiers[artTier - 1] || COMPANION_SYSTEMS.artifact.tiers[0];
            const artScale = [0.8, 1.05, 1.35, 1.7, 2.15, 2.8][artTier - 1] || 0.8;

            if (duelActive && sim.arenaOpponent) {
              const opp = sim.arenaOpponent;
              const artDmg = Math.max(
                8,
                Math.round(stats.atk * artScale * getLevelDamageFactor(p.level, opp.rival.level))
              );
              opp.hp = Math.max(0, opp.hp - artDmg);
              opp.flashTimer = 0.12;
              opp.hitScale = 1.18;
              spawnParticles(opp.x, opp.y - 20, artTierDef.color, 9, 150);
              sim.vfxs.push({
                style: 'artifactBeam',
                x: sim.heroX - sim.heroFacing * 32,
                y: sim.heroY - 72,
                tx: opp.x,
                ty: opp.y,
                color: artTierDef.color,
                radius: 56 + artTier * 8,
                life: 0.42,
                maxLife: 0.42,
              });
              sim.floats.push({
                x: opp.x,
                y: opp.y - 86,
                vy: -56,
                text: `神器天罰 ${artDmg.toLocaleString()}`,
                color: '#fde047',
                size: 15,
                life: 0.85,
                maxLife: 0.85,
              });
            } else if (sim.monsters.length > 0) {
              const artTarget = sim.monsters[Math.floor(Math.random() * sim.monsters.length)];
              const artDmg = Math.max(
                1,
                Math.round(stats.atk * artScale * getLevelDamageFactor(p.level, artTarget.level))
              );
              artTarget.hp -= artDmg;
              artTarget.flashTimer = 0.12;
              artTarget.hitScale = 1.18;
              spawnParticles(artTarget.x, artTarget.y - 20, artTierDef.color, 9, 150);
              sim.vfxs.push({
                style: 'artifactBeam',
                x: sim.heroX - sim.heroFacing * 32,
                y: sim.heroY - 72,
                tx: artTarget.x,
                ty: artTarget.y,
                color: artTierDef.color,
                radius: 56 + artTier * 8,
                life: 0.42,
                maxLife: 0.42,
              });
              sim.floats.push({
                x: artTarget.x,
                y: artTarget.y - artTarget.radius - 26,
                vy: -56,
                text: `神器天罰 ${artDmg.toLocaleString()}`,
                color: '#fde047',
                size: 15,
                life: 0.85,
                maxLife: 0.85,
              });
            }
          }

          // Update Ambient Scene Motes
          for (const mote of sim.ambientMotes) {
            mote.x += (mote.vx + Math.sin(tSecLoop + mote.phase) * 0.005) * dt;
            mote.y += mote.vy * dt;
            if (mote.y < -0.05) {
              mote.y = 1.04;
              mote.x = Math.random();
            }
            if (mote.x < -0.05) mote.x = 1.04;
            if (mote.x > 1.05) mote.x = -0.04;
          }

          const wingMitigation = Math.min(0.35, 0.05 + (p.companions.wing.tier - 1) * 0.05);

          // === ARENA OPPONENT AI COMBAT ===
          if (sim.arenaOpponent) {
            const opp = sim.arenaOpponent;
            opp.bob += dt * 3.6;
            opp.flashTimer = Math.max(0, opp.flashTimer - dt);
            opp.animTimer = Math.max(0, opp.animTimer - dt);
            opp.hitScale += (1 - opp.hitScale) * Math.min(1, dt * 14);

            if (opp.finishedTimer >= 0) {
              opp.finishedTimer -= dt;
              if (opp.finishedTimer <= 0 && !opp.callbackFired) {
                opp.callbackFired = true;
                onArenaCompleteRef.current(Boolean(opp.wonState), opp.rival);
              }
            } else if (opp.hp <= 0) {
              opp.hp = 0;
              opp.finishedTimer = 1.15;
              opp.wonState = true;
              sim.shakeTime = 0.35;
              sim.shakeMag = 8;
              xianxiaAudio.playBreakthrough();
              spawnParticles(opp.x, opp.y - 24, '#fde047', 28, 200);
              sim.floats.push({
                x: w * 0.5,
                y: h * 0.34,
                vy: -24,
                text: `【演武大捷 · 擊敗 ${opp.rival.name}！】`,
                color: '#fde047',
                size: 24,
                life: 1.5,
                maxLife: 1.5,
              });
            } else if (sim.heroHp <= 0) {
              sim.heroHp = 0;
              opp.finishedTimer = 1.15;
              opp.wonState = false;
              sim.shakeTime = 0.25;
              sim.shakeMag = 6;
              sim.floats.push({
                x: w * 0.5,
                y: h * 0.34,
                vy: -20,
                text: `【惜敗於 ${opp.rival.name} · 靜養再戰】`,
                color: '#fb7185',
                size: 22,
                life: 1.5,
                maxLife: 1.5,
              });
            } else {
              // Active 1v1 combat AI
              const oppCls = CLASSES.find((c) => c.id === opp.rival.classId) || CLASSES[0];
              const dx = sim.heroX - opp.x;
              const dy = sim.heroY - opp.y;
              const dist = Math.hypot(dx, dy);
              opp.facing = dx >= 0 ? 1 : -1;
              const oppSpeed = 195 + opp.rival.mountTier * 15;

              if (dist > 96) {
                opp.x += (dx / dist) * oppSpeed * dt;
                opp.y += (dy / dist) * oppSpeed * dt;
              } else {
                opp.attackCd -= dt;
                opp.skillCd -= dt;

                if (opp.skillCd <= 0) {
                  opp.skillCd = 3.0;
                  opp.animTimer = 0.32;
                  const sk = oppCls.skills[opp.skillRot % oppCls.skills.length];
                  opp.skillRot += 1;
                  sim.vfxs.push({
                    style: sk.style,
                    x: opp.x,
                    y: opp.y,
                    tx: sim.heroX,
                    ty: sim.heroY,
                    color: sk.color,
                    radius: Math.min(165, sk.aoeRadius),
                    life: 0.55,
                    maxLife: 0.55,
                  });
                  const rawIncoming =
                    opp.rival.atk * sk.multiplier * 0.82 * getIncomingDamageFactor(p.level, opp.rival.level);
                  const dmg = Math.max(
                    12,
                    Math.round((rawIncoming - stats.def * 0.42) * (1 - wingMitigation))
                  );
                  sim.heroHp = Math.max(0, sim.heroHp - dmg);
                  spawnParticles(sim.heroX, sim.heroY - 22, sk.color, 9, 140);
                  sim.floats.push({
                    x: sim.heroX + (Math.random() - 0.5) * 18,
                    y: sim.heroY - 68,
                    vy: -48,
                    text: `${sk.name} -${dmg.toLocaleString()}`,
                    color: '#fb7185',
                    size: 15,
                    life: 0.85,
                    maxLife: 0.85,
                  });
                } else if (opp.attackCd <= 0) {
                  opp.attackCd = 0.95;
                  opp.animTimer = 0.22;
                  const rawIncoming =
                    opp.rival.atk * getIncomingDamageFactor(p.level, opp.rival.level);
                  const dmg = Math.max(
                    8,
                    Math.round((rawIncoming - stats.def * 0.42) * (1 - wingMitigation))
                  );
                  sim.heroHp = Math.max(0, sim.heroHp - dmg);
                  sim.vfxs.push({
                    style: 'slash',
                    x: opp.x,
                    y: opp.y,
                    tx: sim.heroX,
                    ty: sim.heroY,
                    color: oppCls.primaryColor,
                    radius: 54,
                    life: 0.22,
                    maxLife: 0.22,
                  });
                  sim.floats.push({
                    x: sim.heroX,
                    y: sim.heroY - 52,
                    vy: -40,
                    text: `-${dmg.toLocaleString()}`,
                    color: '#fb7185',
                    size: 14,
                    life: 0.72,
                    maxLife: 0.72,
                  });
                }
              }
              opp.x = Math.max(100, Math.min(w - 100, opp.x));
              opp.y = Math.max(h * 0.42, Math.min(h * 0.8, opp.y));
            }
          }

          // Update Monsters
          const aliveMonsters: MonsterEntity[] = [];
          for (const m of sim.monsters) {
            m.flashTimer = Math.max(0, m.flashTimer - dt);
            m.hitScale += (1 - m.hitScale) * Math.min(1, dt * 14);

            if (m.hp <= 0) {
              sim.accKills += 1;
              sim.accExp += Math.round(m.expReward * stats.expMult);
              sim.accCult += m.cultivationReward;
              if (m.isBoss && m.bossDef) {
                sim.accBossKilled = m.bossDef;
              }
              dropLootForMonster(m);
              spawnParticles(m.x, m.y - 12, m.color, m.isBoss ? 30 : 12, 180);
              continue;
            }

            const dx = sim.heroX - m.x;
            const dy = sim.heroY - m.y;
            const dist = Math.hypot(dx, dy);
            const attackReach = m.radius + 72;

            if (dist > attackReach) {
              const mSpeed = m.isBoss ? 88 : 98;
              m.x += (dx / dist) * mSpeed * dt;
              m.y += (dy / dist) * mSpeed * dt;
            } else {
              if (m.windupTimer > 0) {
                m.windupTimer -= dt;
                if (m.windupTimer <= 0) {
                  const incScale = getIncomingDamageFactor(p.level, m.level);
                  const rawDmg = Math.max(
                    8,
                    Math.round((m.atk * incScale - stats.def * 0.45) * (1 - wingMitigation))
                  );
                  sim.heroHp = Math.max(0, sim.heroHp - rawDmg);
                  if (m.isBoss) {
                    sim.shakeTime = 0.16;
                    sim.shakeMag = 5;
                  }
                  sim.floats.push({
                    x: sim.heroX,
                    y: sim.heroY - 52,
                    vy: -42,
                    text: `-${rawDmg.toLocaleString()}`,
                    color: '#fb7185',
                    size: 13,
                    life: 0.7,
                    maxLife: 0.7,
                  });
                }
              } else {
                m.attackTimer -= dt;
                if (m.attackTimer <= 0) {
                  m.windupTimer = m.isBoss ? 0.65 : 0.42;
                  m.attackTimer = m.isBoss ? 1.8 : 2.05;
                }
              }
            }
            aliveMonsters.push(m);
          }
          sim.monsters = aliveMonsters;

          // Update Loot Drops (bounce then magnet to hero)
          const remainingLoots: LootDrop[] = [];
          for (const l of sim.loots) {
            l.age += dt;
            if (l.age < 0.55) {
              l.x += l.vx * dt;
              l.y += l.vy * dt;
              l.vy += 320 * dt;
              if (l.age > 0.35) l.vy *= 0.7;
              remainingLoots.push(l);
            } else {
              const dx = sim.heroX - l.x;
              const dy = sim.heroY - l.y;
              const d = Math.hypot(dx, dy);
              if (d < 28) {
                xianxiaAudio.playLootPickup();
                if (l.kind === 'gold' && l.goldAmount) {
                  sim.accGold += l.goldAmount;
                } else if (l.kind === 'item' && l.item) {
                  sim.accItems.push(l.item);
                  sim.floats.push({
                    x: sim.heroX,
                    y: sim.heroY - 72,
                    vy: -36,
                    text: `獲得【${l.item.name}】`,
                    color: l.color,
                    size: 13,
                    life: 1.1,
                    maxLife: 1.1,
                  });
                }
              } else {
                const pull = 460 + l.age * 180;
                l.x += (dx / d) * pull * dt;
                l.y += (dy / d) * pull * dt;
                remainingLoots.push(l);
              }
            }
          }
          sim.loots = remainingLoots;

          // Update particles, vfxs, floats
          sim.particles = sim.particles.filter((pt) => {
            pt.life -= dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            return pt.life > 0;
          });

          sim.vfxs = sim.vfxs.filter((v) => {
            v.life -= dt;
            return v.life > 0;
          });

          sim.floats = sim.floats.filter((f) => {
            f.life -= dt;
            f.y += f.vy * dt;
            return f.life > 0;
          });
        }
      }

      // Flush combat events to React at ~5Hz (smooth HUD, zero per-frame React overhead)
      sim.flushTimer += dt;
      if (sim.flushTimer >= 0.18) {
        sim.flushTimer = 0;
        const bossEntity = sim.monsters.find((m) => m.isBoss);
        onTickRef.current({
          expGained: sim.accExp,
          cultivationGained: sim.accCult,
          goldGained: sim.accGold,
          kills: sim.accKills,
          bossKilled: sim.accBossKilled,
          itemsDropped: sim.accItems,
          playerHpRatio: Math.max(0, Math.min(1, sim.heroHp / stats.hp)),
          playerMpRatio: Math.max(0, Math.min(1, sim.heroMp / p.maxMp)),
          skillCooldowns: { ...sim.skillCooldowns },
          treasureCooldown: sim.treasureSkillCd,
          activeBossHp: bossEntity
            ? {
                name: bossEntity.name,
                hp: Math.max(0, bossEntity.hp),
                maxHp: bossEntity.maxHp,
                title: bossEntity.bossDef?.title || '',
              }
            : null,
          arenaHud: sim.arenaOpponent
            ? {
                rival: sim.arenaOpponent.rival,
                rivalHp: Math.max(0, sim.arenaOpponent.hp),
                rivalMaxHp: sim.arenaOpponent.maxHp,
              }
            : null,
        });
        sim.accExp = 0;
        sim.accCult = 0;
        sim.accGold = 0;
        sim.accKills = 0;
        sim.accBossKilled = undefined;
        sim.accItems = [];
      }

      // ==================== RENDERING ====================
      ctx.save();
      if (sim.shakeTime > 0) {
        const sx = (Math.random() - 0.5) * sim.shakeMag * 2;
        const sy = (Math.random() - 0.5) * sim.shakeMag * 2;
        ctx.translate(sx, sy);
      }

      const tSec = now * 0.001;
      const inArena = Boolean(sim.arenaOpponent);

      if (inArena) {
        // ==================== 跨服演武台 (ARENA COLISEUM BACKDROP) ====================
        const arenaSky = ctx.createLinearGradient(0, 0, 0, h);
        arenaSky.addColorStop(0, '#1a0624');
        arenaSky.addColorStop(0.45, '#4c0519');
        arenaSky.addColorStop(1, '#1e0b05');
        ctx.fillStyle = arenaSky;
        ctx.fillRect(0, 0, w, h);

        // Imperial Duel Halo & Golden Moon
        const sunX = w * 0.5;
        const sunY = h * 0.22;
        const halo = ctx.createRadialGradient(sunX, sunY, 16, sunX, sunY, 260);
        halo.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
        halo.addColorStop(0.4, 'rgba(239, 68, 68, 0.28)');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(254, 240, 138, 0.88)';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
        ctx.fill();

        // Distant Coliseum Tiered Arches
        ctx.fillStyle = '#28071b';
        ctx.fillRect(0, h * 0.34, w, h * 0.14);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
        for (let a = 0; a < 9; a++) {
          const ax = w * (0.06 + a * 0.11);
          ctx.beginPath();
          ctx.arc(ax, h * 0.42, 22, Math.PI, 0);
          ctx.fill();
        }

        // Twin Carved Dragon-Banner Pillars framing the Arena
        [w * 0.09, w * 0.91].forEach((px, idx) => {
          const colG = ctx.createLinearGradient(px - 22, 0, px + 22, 0);
          colG.addColorStop(0, '#451a03');
          colG.addColorStop(0.5, '#f59e0b');
          colG.addColorStop(1, '#451a03');
          ctx.fillStyle = colG;
          ctx.fillRect(px - 20, h * 0.12, 40, h * 0.36);
          // Dragon Spiral Rings
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.5;
          for (let r = 0; r < 6; r++) {
            ctx.beginPath();
            ctx.ellipse(px, h * (0.16 + r * 0.05), 24, 6, idx === 0 ? 0.25 : -0.25, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Hanging Crimson War Banner
          const bDir = idx === 0 ? 1 : -1;
          ctx.fillStyle = '#b91c1c';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(px + bDir * 22, h * 0.16);
          ctx.lineTo(px + bDir * 56, h * 0.16);
          ctx.lineTo(px + bDir * 52, h * 0.36 + Math.sin(tSec * 3 + idx) * 4);
          ctx.lineTo(px + bDir * 39, h * 0.32);
          ctx.lineTo(px + bDir * 22, h * 0.36);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        // Floating Golden Martial Embers
        for (const mote of sim.ambientMotes) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, mote.alpha + 0.18);
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(mote.x * w, mote.y * h, mote.size * 1.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Coliseum Martial Floor + Glowing Golden Bagua Duel Circle
        const groundY = h * 0.43;
        const fGrad = ctx.createLinearGradient(0, groundY, 0, h);
        fGrad.addColorStop(0, '#3b0722');
        fGrad.addColorStop(0.28, '#291019');
        fGrad.addColorStop(1, '#09030c');
        ctx.fillStyle = fGrad;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Duel Platform Stone Pedestal
        const cx = w * 0.5;
        const cy = h * 0.63;
        ctx.save();
        ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.78)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.min(w * 0.38, 390), 108, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.min(w * 0.28, 280), 76, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating Bagua Duel Runes on Floor
        ctx.translate(cx, cy);
        ctx.scale(1, 0.34);
        ctx.rotate(tSec * 0.35);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI) / 4;
          const rx = Math.cos(ang) * 210;
          const ry = Math.sin(ang) * 210;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      } else {
        // 1. Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, scene.skyTop);
        skyGrad.addColorStop(0.55, scene.skyBottom);
        skyGrad.addColorStop(1, scene.groundColor);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Celestial Sun / Moon & Aura Halo
        const sunX = w * 0.52;
        const sunY = h * 0.24;
        const haloGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 210);
        haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.52)');
        haloGrad.addColorStop(0.35, `${scene.accentColor}44`);
        haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 210, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(254, 249, 195, 0.85)';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
        ctx.fill();

        // 3. Distant Floating Xianxia Peaks & Scene-Specific Landmarks
        ctx.fillStyle = scene.mountainFar;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        const peaks = [0.08, 0.22, 0.38, 0.52, 0.68, 0.84, 0.96];
        peaks.forEach((px, idx) => {
          const peakH = idx % 2 === 0 ? h * 0.22 : h * 0.30;
          ctx.lineTo(w * px, peakH);
          ctx.lineTo(w * (px + 0.09), h * 0.48);
        });
        ctx.lineTo(w, h * 0.5);
        ctx.closePath();
        ctx.fill();

        // Scene-specific Distant Architectural & Natural Landmarks
        if (scene.id === 'immortal_mountain') {
          // Flying white spirit cranes
          for (let cr = 0; cr < 4; cr++) {
            const cx = ((w * 0.15 + tSec * (26 + cr * 6) + cr * 190) % (w + 160)) - 80;
            const cy = h * (0.14 + (cr % 2) * 0.06) + Math.sin(tSec * 3 + cr) * 8;
            ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy + Math.sin(tSec * 8 + cr) * 4);
            ctx.quadraticCurveTo(cx - 4, cy - 5, cx, cy);
            ctx.quadraticCurveTo(cx + 4, cy - 5, cx + 10, cy + Math.sin(tSec * 8 + cr) * 4);
            ctx.stroke();
          }
          // Floating Immortal Isles with Tiered Pagoda & Cascading Waterfalls
          [0.18, 0.80].forEach((ix, i) => {
            const floatY = h * (0.21 + i * 0.05) + Math.sin(tSec * 0.8 + i) * 7;
            const cx = w * ix;
            const wfGrad = ctx.createLinearGradient(cx, floatY + 12, cx, h * 0.46);
            wfGrad.addColorStop(0, 'rgba(186, 230, 253, 0.75)');
            wfGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
            ctx.fillStyle = wfGrad;
            ctx.fillRect(cx - 7, floatY + 12, 14, h * 0.46 - floatY);

            ctx.fillStyle = scene.mountainNear;
            ctx.beginPath();
            ctx.moveTo(cx - 64, floatY);
            ctx.lineTo(cx + 64, floatY);
            ctx.lineTo(cx + 24, floatY + 50);
            ctx.lineTo(cx - 12, floatY + 66);
            ctx.lineTo(cx - 42, floatY + 38);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#d97706';
            ctx.fillRect(cx - 15, floatY - 16, 30, 16);
            ctx.fillRect(cx - 10, floatY - 30, 20, 14);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 4, floatY - 11, 8, 8);
            ctx.beginPath();
            ctx.moveTo(cx - 24, floatY - 16);
            ctx.lineTo(cx, floatY - 26);
            ctx.lineTo(cx + 24, floatY - 16);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx - 18, floatY - 30);
            ctx.lineTo(cx, floatY - 43);
            ctx.lineTo(cx + 18, floatY - 30);
            ctx.closePath();
            ctx.fill();
          });
        } else if (scene.id === 'sect_hall') {
          [
            { x: w * 0.2, y: h * 0.34, ang: -0.18, s: 1.0 },
            { x: w * 0.44, y: h * 0.27, ang: 0.08, s: 1.25 },
            { x: w * 0.78, y: h * 0.31, ang: 0.22, s: 1.1 },
          ].forEach((sw) => {
            ctx.save();
            ctx.translate(sw.x, sw.y);
            ctx.rotate(sw.ang);
            ctx.fillStyle = '#475569';
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-7 * sw.s, 70 * sw.s);
            ctx.lineTo(-9 * sw.s, -45 * sw.s);
            ctx.lineTo(0, -68 * sw.s);
            ctx.lineTo(9 * sw.s, -45 * sw.s);
            ctx.lineTo(7 * sw.s, 70 * sw.s);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-20 * sw.s, -52 * sw.s, 40 * sw.s, 6 * sw.s);
            ctx.restore();
          });
          for (let ln = 0; ln < 5; ln++) {
            const lx = w * (0.14 + ln * 0.18);
            const ly = h * 0.23 + Math.sin(tSec * 1.4 + ln) * 8;
            ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
            ctx.beginPath();
            ctx.arc(lx, ly, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(lx, ly, 7, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(lx - 4, ly - 11, 8, 2);
            ctx.fillRect(lx - 4, ly + 9, 8, 2);
          }
        } else if (scene.id === 'heaven_palace') {
          const px = w * 0.5;
          const py = h * 0.42;
          ctx.fillStyle = '#451a03';
          ctx.fillRect(px - 150, py - 46, 300, 46);
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(px - 185, py - 44);
          ctx.lineTo(px, py - 88);
          ctx.lineTo(px + 185, py - 44);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
          for (let d = -2; d <= 2; d++) {
            ctx.fillRect(px + d * 48 - 10, py - 32, 20, 32);
          }
          [w * 0.08, w * 0.92].forEach((colX) => {
            const colGrad = ctx.createLinearGradient(colX - 18, 0, colX + 18, 0);
            colGrad.addColorStop(0, '#78350f');
            colGrad.addColorStop(0.5, '#fbbf24');
            colGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = colGrad;
            ctx.fillRect(colX - 16, h * 0.14, 32, h * 0.34);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2.5;
            for (let s = 0; s < 5; s++) {
              ctx.beginPath();
              ctx.ellipse(colX, h * (0.19 + s * 0.055), 18, 5, 0.25, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
        } else if (scene.id === 'mystic_realm') {
          ctx.save();
          ctx.translate(w * 0.52, h * 0.24);
          ctx.rotate(tSec * 0.4);
          for (let ring = 1; ring <= 3; ring++) {
            ctx.strokeStyle = `rgba(192, 132, 252, ${0.42 - ring * 0.09})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([14, 10]);
            ctx.beginPath();
            ctx.ellipse(0, 0, ring * 58, ring * 26, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          [0.16, 0.31, 0.72, 0.86].forEach((cxRatio, i) => {
            const cx = w * cxRatio;
            const cy = h * (0.26 + (i % 2) * 0.08) + Math.sin(tSec * 1.6 + i) * 10;
            ctx.fillStyle = 'rgba(168, 85, 247, 0.75)';
            ctx.strokeStyle = '#e9d5ff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 28);
            ctx.lineTo(cx + 13, cy);
            ctx.lineTo(cx, cy + 28);
            ctx.lineTo(cx - 13, cy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        } else if (scene.id === 'dragon_vein') {
          [0.24, 0.68].forEach((vxRatio, i) => {
            const vx = w * vxRatio;
            const pulse = 0.6 + Math.sin(tSec * 3 + i) * 0.25;
            ctx.strokeStyle = `rgba(249, 115, 22, ${pulse})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(vx, h * 0.29);
            ctx.lineTo(vx - 12, h * 0.36);
            ctx.lineTo(vx + 10, h * 0.43);
            ctx.stroke();
          });
        }

        // Near Mountains
        ctx.fillStyle = scene.mountainNear;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.56);
        ctx.lineTo(w * 0.14, h * 0.35);
        ctx.lineTo(w * 0.31, h * 0.46);
        ctx.lineTo(w * 0.49, h * 0.37);
        ctx.lineTo(w * 0.67, h * 0.47);
        ctx.lineTo(w * 0.85, h * 0.33);
        ctx.lineTo(w, h * 0.48);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Drifting Sea of Clouds
        for (let c = 0; c < 5; c++) {
          const cx = ((w * 0.25 * c + tSec * (12 + c * 4)) % (w + 300)) - 150;
          const cy = h * (0.38 + (c % 3) * 0.04);
          const cloudGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140);
          cloudGrad.addColorStop(0, 'rgba(255, 243, 214, 0.14)');
          cloudGrad.addColorStop(1, 'rgba(255, 243, 214, 0)');
          ctx.fillStyle = cloudGrad;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 160, 34, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ambient Scene Motes
        for (const mote of sim.ambientMotes) {
          ctx.save();
          ctx.globalAlpha = mote.alpha;
          ctx.fillStyle = scene.accentColor;
          ctx.beginPath();
          ctx.arc(mote.x * w, mote.y * h, mote.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Arena Ground Platform with Sacred Rune Grid
        const groundY = h * 0.43;
        const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
        gGrad.addColorStop(0, scene.mountainNear);
        gGrad.addColorStop(0.25, scene.groundColor);
        gGrad.addColorStop(1, '#090412');
        ctx.fillStyle = gGrad;
        ctx.fillRect(0, groundY, w, h - groundY);

        ctx.strokeStyle = `${scene.accentColor}30`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const y = groundY + (i / 6) * (h - groundY);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.62, 260, 72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.62, 180, 48, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Dragon Vein Glowing Floor Cracks
        if (scene.id === 'dragon_vein') {
          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 + Math.sin(tSec * 2.8) * 0.15})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(w * 0.15, h * 0.72);
          ctx.lineTo(w * 0.36, h * 0.63);
          ctx.lineTo(w * 0.54, h * 0.69);
          ctx.lineTo(w * 0.82, h * 0.56);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4. Loot Drops on Ground
      for (const l of sim.loots) {
        ctx.save();
        // Vertical rarity light beam
        const beamGrad = ctx.createLinearGradient(l.x, l.y - 68, l.x, l.y);
        beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
        beamGrad.addColorStop(1, `${l.color}aa`);
        ctx.fillStyle = beamGrad;
        ctx.fillRect(l.x - 4, l.y - 68, 8, 68);

        ctx.fillStyle = l.color;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.kind === 'item' ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();

        if (l.kind === 'item') {
          ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = l.color;
          ctx.fillText(l.label, l.x, l.y + 18);
        }
        ctx.restore();
      }

      // 5. Render Entities Sorted by Y Depth
      const renderables: Array<{ y: number; draw: () => void }> = [];

      // Monsters (Detailed Xianxia Monster Silhouettes)
      for (const m of sim.monsters) {
        renderables.push({
          y: m.y,
          draw: () => {
            ctx.save();
            ctx.translate(m.x, m.y);
            ctx.scale(m.hitScale, m.hitScale);

            const facing = sim.heroX >= m.x ? 1 : -1;
            const r = m.radius;
            const bob = Math.sin(tSec * 4.2 + m.id) * 4;
            const isFlash = m.flashTimer > 0;
            const mainCol = isFlash ? '#ffffff' : m.color;
            const darkStroke = m.isBoss ? '#fde047' : m.isElite ? '#fbbf24' : '#0f0720';

            // Windup telegraph ring
            if (m.windupTimer > 0) {
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
              ctx.lineWidth = 2.8;
              ctx.beginPath();
              ctx.ellipse(0, 8, r * 1.5, r * 0.56, 0, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Boss / Elite Sacred Floor Sigil
            if (m.isBoss) {
              ctx.save();
              ctx.translate(0, 10);
              ctx.scale(1, 0.38);
              ctx.rotate(tSec * 1.1);
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
              ctx.stroke();
              ctx.strokeStyle = `${m.color}aa`;
              ctx.beginPath();
              for (let k = 0; k < 6; k++) {
                const a = (k * Math.PI) / 3;
                const px = Math.cos(a) * r * 1.38;
                const py = Math.sin(a) * r * 1.38;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.stroke();
              ctx.restore();
            } else if (m.isElite) {
              ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.ellipse(0, 10, r * 1.2, r * 0.44, 0, 0, Math.PI * 2);
              ctx.stroke();
            }

            // Ground Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.48)';
            ctx.beginPath();
            ctx.ellipse(0, 12, r * 0.95, r * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.scale(facing, 1);

            if (m.shape === 'dragonling') {
              // Majestic Dragon / Ancient Boss Silhouette
              const flap = Math.sin(tSec * 6 + m.id) * 0.22;
              // Flapping Draconic Wings
              [-1, 1].forEach((dir) => {
                ctx.save();
                ctx.translate(dir * r * 0.25, -r * 0.95 + bob);
                ctx.scale(dir, 1);
                ctx.rotate(flap);
                ctx.fillStyle = isFlash ? '#fff' : `${m.color}cc`;
                ctx.strokeStyle = darkStroke;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(r * 1.15, -r * 0.85);
                ctx.lineTo(r * 0.95, -r * 0.1);
                ctx.lineTo(r * 1.25, r * 0.25);
                ctx.lineTo(r * 0.35, r * 0.45);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              });
              // Coiled Dragon Tail
              ctx.strokeStyle = mainCol;
              ctx.lineWidth = m.isBoss ? 10 : 6;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(-r * 0.3, 0 + bob * 0.3);
              ctx.quadraticCurveTo(-r * 1.05, -6, -r * 1.25, -r * 0.55 + Math.sin(tSec * 5) * 6);
              ctx.stroke();
              // Scaled Armored Torso & Head
              const bGrad = ctx.createLinearGradient(0, -r * 1.5 + bob, 0, 10);
              bGrad.addColorStop(0, isFlash ? '#ffffff' : '#fef08a');
              bGrad.addColorStop(0.35, mainCol);
              bGrad.addColorStop(1, '#1e1b4b');
              ctx.fillStyle = bGrad;
              ctx.strokeStyle = darkStroke;
              ctx.lineWidth = m.isBoss ? 2.8 : 2;
              ctx.beginPath();
              ctx.moveTo(-r * 0.52, 8 + bob * 0.2);
              ctx.quadraticCurveTo(-r * 0.65, -r * 0.8 + bob, 0, -r * 1.48 + bob);
              ctx.quadraticCurveTo(r * 0.65, -r * 0.8 + bob, r * 0.52, 8 + bob * 0.2);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              // Dragon Antler Horns
              ctx.strokeStyle = '#fde047';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(-r * 0.22, -r * 1.35 + bob);
              ctx.lineTo(-r * 0.52, -r * 1.85 + bob);
              ctx.moveTo(r * 0.22, -r * 1.35 + bob);
              ctx.lineTo(r * 0.52, -r * 1.85 + bob);
              ctx.stroke();
              // Glowing Eyes
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(-r * 0.18, -r * 1.06 + bob, m.isBoss ? 4.5 : 3.2, 0, Math.PI * 2);
              ctx.arc(r * 0.22, -r * 1.06 + bob, m.isBoss ? 4.5 : 3.2, 0, Math.PI * 2);
              ctx.fill();
            } else if (m.shape === 'demon') {
              // Bat-winged Horned Fiend
              const wingAngle = Math.sin(tSec * 7 + m.id) * 0.2;
              [-1, 1].forEach((dir) => {
                ctx.save();
                ctx.translate(dir * r * 0.3, -r * 0.85 + bob);
                ctx.scale(dir, 1);
                ctx.rotate(wingAngle);
                ctx.fillStyle = isFlash ? '#fff' : '#4c0519';
                ctx.strokeStyle = darkStroke;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(r * 0.95, -r * 0.6);
                ctx.quadraticCurveTo(r * 0.7, 0, r * 0.95, r * 0.35);
                ctx.lineTo(0, r * 0.25);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              });
              // Armored Demon Body
              const dGrad = ctx.createLinearGradient(0, -r * 1.35 + bob, 0, 8);
              dGrad.addColorStop(0, mainCol);
              dGrad.addColorStop(1, '#1e0620');
              ctx.fillStyle = dGrad;
              ctx.strokeStyle = darkStroke;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(-r * 0.65, -r * 0.95 + bob);
              ctx.lineTo(r * 0.65, -r * 0.95 + bob);
              ctx.lineTo(r * 0.42, 8 + bob * 0.3);
              ctx.lineTo(-r * 0.42, 8 + bob * 0.3);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              // Head + Curved Horns
              ctx.beginPath();
              ctx.arc(0, -r * 1.15 + bob, r * 0.42, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.strokeStyle = '#fde047';
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.moveTo(-r * 0.25, -r * 1.45 + bob);
              ctx.quadraticCurveTo(-r * 0.62, -r * 1.75 + bob, -r * 0.42, -r * 1.98 + bob);
              ctx.moveTo(r * 0.25, -r * 1.45 + bob);
              ctx.quadraticCurveTo(r * 0.62, -r * 1.75 + bob, r * 0.42, -r * 1.98 + bob);
              ctx.stroke();
              // Crimson Eyes + Third Eye
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(-r * 0.16, -r * 1.15 + bob, 2.8, 0, Math.PI * 2);
              ctx.arc(r * 0.18, -r * 1.15 + bob, 2.8, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(0, -r * 1.32 + bob, 2.6, 0, Math.PI * 2);
              ctx.fill();
            } else if (m.shape === 'golem') {
              // Heavy Armored Stone/Metal Guardian
              const gGrad = ctx.createLinearGradient(0, -r * 1.45 + bob, 0, 8);
              gGrad.addColorStop(0, mainCol);
              gGrad.addColorStop(1, '#1e293b');
              ctx.fillStyle = gGrad;
              ctx.strokeStyle = darkStroke;
              ctx.lineWidth = 2.2;
              // Pauldrons
              ctx.beginPath();
              ctx.roundRect(-r * 0.96, -r * 1.18 + bob, r * 0.48, r * 0.62, 6);
              ctx.roundRect(r * 0.48, -r * 1.18 + bob, r * 0.48, r * 0.62, 6);
              ctx.fill();
              ctx.stroke();
              // Main Torso
              ctx.beginPath();
              ctx.roundRect(-r * 0.68, -r * 1.32 + bob, r * 1.36, r * 1.35, 8);
              ctx.fill();
              ctx.stroke();
              // Horned Helmet Crest
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.moveTo(-r * 0.24, -r * 1.32 + bob);
              ctx.lineTo(0, -r * 1.66 + bob);
              ctx.lineTo(r * 0.24, -r * 1.32 + bob);
              ctx.closePath();
              ctx.fill();
              // Glowing Chest Rune Core & Visor Eyes
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(0, -r * 0.56 + bob, r * 0.22, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(-r * 0.34, -r * 1.08 + bob, r * 0.26, 4.5);
              ctx.fillRect(r * 0.08, -r * 1.08 + bob, r * 0.26, 4.5);
            } else if (m.shape === 'spirit') {
              // Ethereal Floating Spirit Wisp + Orbiting Runes
              const sGrad = ctx.createRadialGradient(0, -r * 0.85 + bob, 4, 0, -r * 0.85 + bob, r);
              sGrad.addColorStop(0, '#fef9c3');
              sGrad.addColorStop(0.55, mainCol);
              sGrad.addColorStop(1, 'rgba(15, 23, 42, 0.75)');
              ctx.fillStyle = sGrad;
              ctx.strokeStyle = darkStroke;
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.moveTo(0, -r * 1.55 + bob);
              ctx.quadraticCurveTo(r * 0.9, -r * 1.05 + bob, r * 0.55, -r * 0.1 + bob);
              ctx.lineTo(r * 0.25, 6 + bob * 0.3);
              ctx.lineTo(0, -r * 0.25 + bob);
              ctx.lineTo(-r * 0.25, 6 + bob * 0.3);
              ctx.lineTo(-r * 0.55, -r * 0.1 + bob);
              ctx.quadraticCurveTo(-r * 0.9, -r * 1.05 + bob, 0, -r * 1.55 + bob);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              // Orbiting Spirit Orbs
              for (let o = 0; o < 3; o++) {
                const ang = tSec * 3.2 + (o * Math.PI * 2) / 3;
                const ox = Math.cos(ang) * r * 0.92;
                const oy = -r * 0.85 + Math.sin(ang) * r * 0.34 + bob;
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.arc(ox, oy, 3.2, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(-r * 0.18, -r * 0.98 + bob, 3.2, 0, Math.PI * 2);
              ctx.arc(r * 0.18, -r * 0.98 + bob, 3.2, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Ferocious Demon Beast (Ears, Fangs, Mane, Spirit Tail)
              ctx.strokeStyle = mainCol;
              ctx.lineWidth = 5;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(-r * 0.55, -r * 0.25 + bob);
              ctx.quadraticCurveTo(-r * 1.15, -r * 0.5, -r * 1.05, -r * 1.05 + Math.sin(tSec * 6 + m.id) * 6);
              ctx.stroke();

              const bGrad = ctx.createLinearGradient(0, -r * 1.35 + bob, 0, 8);
              bGrad.addColorStop(0, mainCol);
              bGrad.addColorStop(1, '#1e1b4b');
              ctx.fillStyle = bGrad;
              ctx.strokeStyle = darkStroke;
              ctx.lineWidth = 2;
              // Pointed Beast Ears
              ctx.beginPath();
              ctx.moveTo(-r * 0.45, -r * 1.05 + bob);
              ctx.lineTo(-r * 0.65, -r * 1.68 + bob);
              ctx.lineTo(-r * 0.12, -r * 1.25 + bob);
              ctx.moveTo(r * 0.45, -r * 1.05 + bob);
              ctx.lineTo(r * 0.65, -r * 1.68 + bob);
              ctx.lineTo(r * 0.12, -r * 1.25 + bob);
              ctx.fill();
              ctx.stroke();
              // Beast Torso/Head
              ctx.beginPath();
              ctx.ellipse(0, -r * 0.72 + bob, r * 0.8, r * 0.72, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              // Glowing Eyes & White Fangs
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(-r * 0.22, -r * 0.88 + bob, 3.3, 0, Math.PI * 2);
              ctx.arc(r * 0.24, -r * 0.88 + bob, 3.3, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.moveTo(-r * 0.18, -r * 0.52 + bob);
              ctx.lineTo(-r * 0.1, -r * 0.34 + bob);
              ctx.lineTo(-r * 0.02, -r * 0.52 + bob);
              ctx.moveTo(r * 0.06, -r * 0.52 + bob);
              ctx.lineTo(r * 0.14, -r * 0.34 + bob);
              ctx.lineTo(r * 0.22, -r * 0.52 + bob);
              ctx.fill();
            }

            ctx.restore(); // unflip facing

            // Overhead Level + Name + HP Bar
            const barW = m.isBoss ? 128 : m.isElite ? 80 : 68;
            const barY = -r * 1.75 - 12;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(-barW / 2, barY, barW, 7);
            const ratio = Math.max(0, m.hp / m.maxHp);
            ctx.fillStyle = m.isBoss ? '#ef4444' : m.isElite ? '#f59e0b' : '#f43f5e';
            ctx.fillRect(-barW / 2 + 1, barY + 1, (barW - 2) * ratio, 5);

            ctx.font = m.isBoss
              ? 'bold 13px "Noto Sans TC"'
              : m.isElite
              ? 'bold 11.5px "Noto Sans TC"'
              : '11px "Noto Sans TC"';
            ctx.textAlign = 'center';
            const monsterLabel = m.isBoss
              ? `Lv.${m.level} 【BOSS】${m.name}`
              : m.isElite
              ? `Lv.${m.level} [菁英]${m.name}`
              : `Lv.${m.level} ${m.name}`;
            ctx.strokeStyle = 'rgba(0,0,0,0.9)';
            ctx.lineWidth = 3;
            ctx.strokeText(monsterLabel, 0, barY - 5);
            ctx.fillStyle = m.isBoss ? '#fde047' : m.isElite ? '#fbbf24' : '#fed7aa';
            ctx.fillText(monsterLabel, 0, barY - 5);

            ctx.restore();
          },
        });
      }

      // Cross-Server Arena Opponent (Full Xianxia Player Cultivator)
      if (sim.arenaOpponent) {
        const opp = sim.arenaOpponent;
        renderables.push({
          y: opp.y,
          draw: () => {
            ctx.save();
            ctx.translate(opp.x, opp.y);
            ctx.scale(opp.hitScale, opp.hitScale);
            const r = opp.rival;
            const oppRealm = REALMS[r.realmIndex] || REALMS[0];
            const oppCls = CLASSES.find((c) => c.id === r.classId) || CLASSES[0];
            const oppFashion = FASHION_CATALOG.find((f) => f.id === r.fashionId) || FASHION_CATALOG[0];
            const oppTitle = TITLE_CATALOG.find((t) => t.id === r.titleId) || TITLE_CATALOG[0];
            const bob = Math.sin(opp.bob) * 4;
            const flash = opp.flashTimer > 0;

            // Ground Arena Halo
            ctx.save();
            ctx.strokeStyle = oppRealm.auraColor;
            ctx.lineWidth = 2.2;
            ctx.globalAlpha = 0.72;
            ctx.beginPath();
            ctx.ellipse(0, 12, 46, 15, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Mount
            const mDef = COMPANION_SYSTEMS.mount.tiers[(r.mountTier || 1) - 1] || COMPANION_SYSTEMS.mount.tiers[0];
            ctx.save();
            ctx.scale(opp.facing, 1);
            ctx.fillStyle = `${mDef.color}38`;
            ctx.strokeStyle = mDef.color;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, 5 + bob * 0.4, 38 + r.mountTier * 2.5, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = mDef.color;
            ctx.beginPath();
            ctx.moveTo(-26, 4 + bob * 0.5);
            ctx.quadraticCurveTo(-8, -10 + bob * 0.5, 16, -4 + bob * 0.5);
            ctx.lineTo(30, -14 + bob * 0.5);
            ctx.lineTo(22, 4 + bob * 0.5);
            ctx.quadraticCurveTo(0, 11 + bob * 0.5, -34, 8 + bob * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Wings
            const wDef = COMPANION_SYSTEMS.wing.tiers[(r.wingTier || 1) - 1] || COMPANION_SYSTEMS.wing.tiers[0];
            const flap = Math.sin(tSec * 5.2 + 1.2) * 0.16;
            const wingSpan = 30 + r.wingTier * 7;
            ctx.save();
            ctx.translate(0, -34 + bob);
            [-1, 1].forEach((dir) => {
              ctx.save();
              ctx.scale(dir, 1);
              ctx.rotate(flap);
              ctx.fillStyle = flash ? '#ffffff' : `${wDef.color}cc`;
              ctx.beginPath();
              ctx.moveTo(4, 0);
              ctx.quadraticCurveTo(wingSpan * 0.72, -36, wingSpan, -18);
              ctx.quadraticCurveTo(wingSpan * 0.65, 6, 6, 14);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            });
            ctx.restore();

            // Fashion Robes + Head + Weapon
            ctx.save();
            ctx.scale(opp.facing, 1);
            const robeG = ctx.createLinearGradient(0, -56 + bob, 0, 4);
            robeG.addColorStop(0, flash ? '#ffffff' : oppFashion.primaryColor);
            robeG.addColorStop(1, flash ? '#fef08a' : oppFashion.secondaryColor);
            ctx.fillStyle = robeG;
            ctx.strokeStyle = oppFashion.trimColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-14, -44 + bob);
            ctx.lineTo(14, -44 + bob);
            ctx.lineTo(21, 5 + bob * 0.5);
            ctx.lineTo(-21, 5 + bob * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = oppFashion.trimColor;
            ctx.fillRect(-15, -45 + bob, 30, 5);

            // Head & Crown
            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.arc(0, -56 + bob, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.arc(0, -61 + bob, 10.5, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-4, -74 + bob, 8, 6);

            // Weapon
            const swing = opp.animTimer > 0 ? Math.sin(opp.animTimer * 24) * 1.1 : -0.3;
            ctx.save();
            ctx.translate(14, -32 + bob);
            ctx.rotate(swing);
            ctx.strokeStyle = oppCls.primaryColor;
            ctx.fillStyle = '#fef9c3';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-3, 4);
            ctx.lineTo(0, -44);
            ctx.lineTo(3, 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            ctx.restore();

            // Orbiting Pet
            const pDef = COMPANION_SYSTEMS.pet.tiers[(r.petTier || 1) - 1] || COMPANION_SYSTEMS.pet.tiers[0];
            const petX = Math.cos(-tSec * 2.2) * 56;
            const petY = -58 + Math.sin(tSec * 3.1 + 1) * 9;
            ctx.save();
            ctx.translate(petX, petY);
            ctx.fillStyle = pDef.color;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 8 + r.petTier * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Rival Overhead HP Bar + Nameplate + Ornate Title Crest
            const barW = 92;
            const barY = -86 + bob;
            ctx.fillStyle = 'rgba(0,0,0,0.82)';
            ctx.fillRect(-barW / 2, barY, barW, 7);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-barW / 2 + 1, barY + 1, (barW - 2) * Math.max(0, opp.hp / opp.maxHp), 5);

            ctx.font = 'bold 12.5px "Noto Sans TC"';
            ctx.textAlign = 'center';
            const rLabel = `[VIP${r.vip}] ${r.name}`;
            ctx.strokeStyle = 'rgba(0,0,0,0.9)';
            ctx.lineWidth = 3;
            ctx.strokeText(rLabel, 0, barY - 6);
            ctx.fillStyle = '#fca5a5';
            ctx.fillText(rLabel, 0, barY - 6);

            ctx.font = '10.5px "Noto Sans TC"';
            ctx.strokeText(`Lv.${r.level} · ${oppRealm.shortName}${r.realmLayer}層 · 第${r.rank}名`, 0, barY - 21);
            ctx.fillStyle = oppRealm.auraColor;
            ctx.fillText(`Lv.${r.level} · ${oppRealm.shortName}${r.realmLayer}層 · 第${r.rank}名`, 0, barY - 21);

            drawCanvasTitleCrest(ctx, oppTitle, 0, barY - 40);

            ctx.restore();
          },
        });
      }

      // Player Hero + Complete 5 Companion Systems (靈寵 / 仙騎 / 神翼 / 法寶 / 神器)
      renderables.push({
        y: sim.heroY,
        draw: () => {
          ctx.save();
          ctx.translate(sim.heroX, sim.heroY);
          const realm = REALMS[p.realmIndex] || REALMS[0];
          const cls = stats.cls;
          const bob = Math.sin(sim.heroBob) * 4;

          // 1. Realm Cultivation Halo + Equipped Fashion Theme Ring on Ground
          const fash = stats.equippedFashionDef;
          ctx.save();
          ctx.strokeStyle = realm.auraColor;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.65;
          ctx.beginPath();
          ctx.ellipse(0, 12, 42 + p.realmIndex * 3, 14 + p.realmIndex, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.translate(0, 12);
          ctx.rotate(tSec * 0.9);
          for (let r = 0; r < 4; r++) {
            const a = (r * Math.PI) / 2;
            ctx.fillStyle = realm.auraColor;
            ctx.fillRect(Math.cos(a) * 34 - 2, Math.sin(a) * 11 - 2, 4, 4);
          }

          // Special Yin-Yang / Flame / Lotus fashion ground aura
          if (fash.auraType === 'yinyang' || fash.auraType === 'chaos') {
            ctx.scale(1, 0.42);
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 52, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
            ctx.beginPath();
            ctx.arc(0, 0, 48, -Math.PI / 2, Math.PI / 2);
            ctx.fill();
          } else if (fash.auraType === 'flame') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, 50, 18, 0, 0, Math.PI * 2);
            ctx.stroke();
          } else if (fash.auraType === 'lotus') {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 50, 18, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          // 2. Mount Silhouette & Cloud Wake under feet (仙騎)
          const mountTier = p.companions.mount.tier;
          const mountDef = COMPANION_SYSTEMS.mount.tiers[mountTier - 1] || COMPANION_SYSTEMS.mount.tiers[0];
          ctx.save();
          ctx.scale(sim.heroFacing, 1);
          // Cloud / spirit ring
          ctx.fillStyle = `${mountDef.color}38`;
          ctx.strokeStyle = mountDef.color;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(0, 5 + bob * 0.4, 38 + mountTier * 2.5, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Stylized spirit beast / crane / dragon silhouette
          ctx.fillStyle = mountDef.color;
          ctx.beginPath();
          ctx.moveTo(-26, 4 + bob * 0.5);
          ctx.quadraticCurveTo(-8, -10 + bob * 0.5, 16, -4 + bob * 0.5);
          ctx.lineTo(30, -14 + bob * 0.5); // Head / crest
          ctx.lineTo(22, 4 + bob * 0.5);
          ctx.quadraticCurveTo(0, 11 + bob * 0.5, -34, 8 + bob * 0.5); // Flowing tail
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // 3. Multi-Layered Wings (神翼) behind hero
          const wingTier = p.companions.wing.tier;
          const wingDef = COMPANION_SYSTEMS.wing.tiers[wingTier - 1] || COMPANION_SYSTEMS.wing.tiers[0];
          const flap = Math.sin(tSec * 5.2) * 0.16;
          const wingSpan = 30 + wingTier * 7;
          ctx.save();
          ctx.translate(0, -34 + bob);
          [-1, 1].forEach((dir) => {
            ctx.save();
            ctx.scale(dir, 1);
            ctx.rotate(flap);
            const wg = ctx.createLinearGradient(0, 0, wingSpan, -28);
            wg.addColorStop(0, wingDef.color);
            wg.addColorStop(1, 'rgba(255,255,255,0.22)');
            ctx.fillStyle = wg;
            ctx.beginPath();
            ctx.moveTo(4, 0);
            ctx.quadraticCurveTo(wingSpan * 0.72, -36, wingSpan, -18);
            ctx.quadraticCurveTo(wingSpan * 0.65, 6, 6, 14);
            ctx.closePath();
            ctx.fill();
            // Secondary lower feather for higher tiers
            if (wingTier >= 2) {
              ctx.globalAlpha = 0.75;
              ctx.beginPath();
              ctx.moveTo(5, 8);
              ctx.quadraticCurveTo(wingSpan * 0.5, 10, wingSpan * 0.75, 22);
              ctx.quadraticCurveTo(wingSpan * 0.35, 24, 5, 15);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          });
          ctx.restore();

          // 4. Classic Animated Vector Xianxia Hero (Equipped Fashion Robes, Hair Crown, Weapon)
          ctx.save();
          ctx.scale(sim.heroFacing, 1);
          // Flowing Xianxia Fashion Robe
          const robeGrad = ctx.createLinearGradient(0, -56 + bob, 0, 4);
          robeGrad.addColorStop(0, fash.primaryColor);
          robeGrad.addColorStop(1, fash.secondaryColor);
          ctx.fillStyle = robeGrad;
          ctx.strokeStyle = fash.trimColor;
          ctx.lineWidth = fash.theme === 'yinyang' ? 2.2 : 1.8;
          ctx.beginPath();
          ctx.moveTo(-14, -44 + bob);
          ctx.lineTo(14, -44 + bob);
          ctx.lineTo(21, 5 + bob * 0.5);
          ctx.lineTo(-21, 5 + bob * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Flowing Yin-Yang / Chaos Scarf Ribbons for high-tier fashions
          if (fash.auraType === 'yinyang' || fash.auraType === 'chaos') {
            ctx.strokeStyle = fash.trimColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-14, -42 + bob);
            ctx.quadraticCurveTo(-28, -28 + Math.sin(tSec * 6) * 5, -24, -6);
            ctx.moveTo(14, -42 + bob);
            ctx.quadraticCurveTo(28, -28 + Math.cos(tSec * 6) * 5, 24, -6);
            ctx.stroke();
          }

          // Shoulders / Sash
          ctx.fillStyle = fash.trimColor;
          ctx.fillRect(-15, -45 + bob, 30, 5);

          // Head & Hair Crown
          ctx.fillStyle = '#fde68a';
          ctx.beginPath();
          ctx.arc(0, -56 + bob, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1e1b4b';
          ctx.beginPath();
          ctx.arc(0, -61 + bob, 10.5, Math.PI, Math.PI * 2);
          ctx.fill();
          // Golden Hair Crown
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(-4, -74 + bob, 8, 6);

          // Weapon in hand (swings during attack)
          const swing = sim.heroAttackAnim > 0 ? Math.sin(sim.heroAttackAnim * 24) * 1.1 : -0.3;
          ctx.save();
          ctx.translate(14, -32 + bob);
          ctx.rotate(swing);
          ctx.strokeStyle = cls.primaryColor;
          ctx.fillStyle = '#fef9c3';
          ctx.lineWidth = 2;
          if (cls.id === 'mage') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(3, -36);
            ctx.stroke();
            ctx.fillStyle = cls.primaryColor;
            ctx.beginPath();
            ctx.arc(3, -38, 7, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(-3, 4);
            ctx.lineTo(0, -44);
            ctx.lineTo(3, 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
          ctx.restore();

          // 5a. Orbiting Pet (靈寵 or 陰陽限定靈寵)
          const petTier = p.companions.pet.tier;
          const petDef = COMPANION_SYSTEMS.pet.tiers[petTier - 1] || COMPANION_SYSTEMS.pet.tiers[0];
          const limPet = stats.equippedLimitedPetDef;
          const petColor = limPet ? limPet.primaryColor : petDef.color;
          const petStroke = limPet ? '#fde047' : '#fef08a';
          const petLabel = limPet ? limPet.name : petDef.name;
          const petX = Math.cos(tSec * 2.2) * 58;
          const petY = -58 + Math.sin(tSec * 3.1) * 9;
          ctx.save();
          ctx.translate(petX, petY);
          if (limPet) {
            // Dual-tone Yin-Yang Spirit Ring around limited pet
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI);
            ctx.stroke();
            ctx.strokeStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(0, 0, 18, Math.PI, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = `${petColor}33`;
          ctx.beginPath();
          ctx.arc(0, 0, 14 + petTier, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = petColor;
          ctx.strokeStyle = petStroke;
          ctx.lineWidth = 1.5;
          // Ears / Horns
          ctx.beginPath();
          ctx.moveTo(-7, -4);
          ctx.lineTo(-10, -14);
          ctx.lineTo(-2, -8);
          ctx.moveTo(7, -4);
          ctx.lineTo(10, -14);
          ctx.lineTo(2, -8);
          ctx.fill();
          ctx.stroke();
          // Body / Head
          ctx.beginPath();
          ctx.arc(0, 0, 8.5 + petTier * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Spirit eyes
          ctx.fillStyle = limPet ? '#dc2626' : '#1e1b4b';
          ctx.beginPath();
          ctx.arc(-3, -1, 1.5, 0, Math.PI * 2);
          ctx.arc(3, -1, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 9.5px "Noto Sans TC"';
          ctx.textAlign = 'center';
          ctx.fillStyle = limPet ? '#fde047' : petDef.color;
          ctx.fillText(petLabel, 0, 22);
          ctx.restore();

          // 5b. Orbiting Treasure (法寶 or 陰陽兩儀寶鑑)
          const tresTier = p.companions.treasure.tier;
          const tresDef =
            COMPANION_SYSTEMS.treasure.tiers[tresTier - 1] || COMPANION_SYSTEMS.treasure.tiers[0];
          const limTre = stats.equippedLimitedTreasureDef;
          const tx = Math.cos(tSec * -2.3 + 2.4) * 56;
          const ty = -82 + Math.sin(tSec * 2.5) * 7;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(tSec * 1.8);
          if (limTre) {
            const rad = 14;
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(0, 0, rad, -Math.PI / 2, Math.PI / 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, -rad / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(0, rad / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = `${tresDef.color}44`;
            ctx.strokeStyle = tresDef.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i * Math.PI) / 3;
              const px = Math.cos(a) * (10 + tresTier * 0.8);
              const py = Math.sin(a) * (10 + tresTier * 0.8);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 5c. Hovering Divine Artifact (神器 or 太極乾坤斬神劍)
          const artTier = p.companions.artifact.tier;
          const artDef =
            COMPANION_SYSTEMS.artifact.tiers[artTier - 1] || COMPANION_SYSTEMS.artifact.tiers[0];
          const limArt = stats.equippedLimitedArtifactDef;
          const artColor = limArt ? limArt.primaryColor : artDef.color;
          const artX = -sim.heroFacing * 32;
          const artY = -66 + Math.sin(tSec * 3.4 + 1) * 6;
          ctx.save();
          ctx.translate(artX, artY);
          ctx.rotate(-0.35 * sim.heroFacing);
          ctx.shadowColor = artColor;
          ctx.shadowBlur = limArt ? 16 : 10;
          ctx.fillStyle = artColor;
          ctx.strokeStyle = limArt ? '#f8fafc' : '#fef08a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -26);
          ctx.lineTo(5.5, -6);
          ctx.lineTo(3, 16);
          ctx.lineTo(-3, 16);
          ctx.lineTo(-5.5, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = limArt ? '#0f172a' : '#fbbf24';
          ctx.fillRect(-9, 12, 18, 4);
          ctx.restore();

          // 6. Hero Nameplate + Ornate Canvas Title Crest
          ctx.font = 'bold 13px "Noto Sans TC"';
          ctx.textAlign = 'center';
          const vipPrefix = p.recharge.vipLevel > 0 ? `[VIP${p.recharge.vipLevel}] ` : '';
          ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx.lineWidth = 3;
          ctx.strokeText(`${vipPrefix}${p.name}`, 0, -90 + bob);
          ctx.fillStyle = '#fde047';
          ctx.fillText(`${vipPrefix}${p.name}`, 0, -90 + bob);
          ctx.font = '11px "Noto Sans TC"';
          ctx.strokeText(`Lv.${p.level} · ${realm.shortName}${p.realmLayer}層`, 0, -106 + bob);
          ctx.fillStyle = realm.auraColor;
          ctx.fillText(`Lv.${p.level} · ${realm.shortName}${p.realmLayer}層`, 0, -106 + bob);
          drawCanvasTitleCrest(ctx, stats.equippedTitleDef, 0, -128 + bob);

          ctx.restore();
        },
      });

      renderables.sort((a, b) => a.y - b.y);
      renderables.forEach((r) => r.draw());

      // 6. Render Skill VFX
      for (const v of sim.vfxs) {
        const progress = 1 - v.life / v.maxLife;
        const alpha = Math.max(0, v.life / v.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = v.color;
        ctx.fillStyle = v.color;

        if (v.style === 'slash') {
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(v.tx, v.ty - 16, v.radius * (0.4 + progress * 0.6), -Math.PI * 0.7, Math.PI * 0.35);
          ctx.stroke();
        } else if (v.style === 'lotus') {
          ctx.translate(v.tx, v.ty);
          ctx.rotate(progress * 4);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, 0, v.radius * progress, v.radius * progress * 0.48, 0, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 6; i++) {
            const ang = (i * Math.PI) / 3;
            ctx.beginPath();
            ctx.arc(
              Math.cos(ang) * v.radius * 0.45 * progress,
              Math.sin(ang) * v.radius * 0.24 * progress,
              14,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }
        } else if (v.style === 'lightning') {
          // Sky lightning bolts
          ctx.lineWidth = 4;
          for (let b = -1; b <= 1; b++) {
            const lx = v.tx + b * 36;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx - 18, v.ty * 0.35);
            ctx.lineTo(lx + 16, v.ty * 0.65);
            ctx.lineTo(lx, v.ty);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.ellipse(v.tx, v.ty, v.radius * progress, v.radius * 0.4 * progress, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (v.style === 'meteor') {
          for (let m = 0; m < 5; m++) {
            const mx = v.tx + (m - 2) * 38;
            const my = v.ty - (1 - progress) * 260 + (m % 2) * 20;
            ctx.beginPath();
            ctx.arc(mx, my, 12, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(v.tx, v.ty, v.radius * progress, v.radius * 0.45 * progress, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (v.style === 'dragon') {
          // Giant sweeping dragon wave & golden ring
          const cx = (v.x + v.tx) * 0.5;
          const cy = (v.y + v.ty) * 0.5;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.ellipse(cx, cy, v.radius * progress, v.radius * 0.52 * progress, 0, 0, Math.PI * 2);
          ctx.stroke();
          for (let s = 0; s < 8; s++) {
            const a = (s * Math.PI) / 4 + progress * 5;
            const sx = cx + Math.cos(a) * v.radius * 0.65 * progress;
            const sy = cy + Math.sin(a) * v.radius * 0.34 * progress;
            ctx.beginPath();
            ctx.arc(sx, sy, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (v.style === 'petBolt') {
          // Spirit bolt flying from Pet to Target
          const bx = v.x + (v.tx - v.x) * progress;
          const by = v.y + (v.ty - v.y) * progress;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(v.x, v.y);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(bx, by, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (v.style === 'treasurePulse') {
          // Bagua healing & shockwave ring around hero
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(v.x, v.y, v.radius * progress, v.radius * 0.42 * progress, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(v.x, v.y, v.radius * progress * 0.72, v.radius * 0.3 * progress, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (v.style === 'artifactBeam') {
          // Divine Sword / Artifact slash from sky & hero shoulder to target
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(v.tx, v.ty - 240 * (1 - progress));
          ctx.lineTo(v.tx, v.ty);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(v.tx, v.ty, v.radius * progress, v.radius * 0.4 * progress, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (v.style === 'treasureBurst') {
          // Exclusive Multi-stage Treasure Release Animation: Giant Rotating Bagua Matrix + Golden Rays + Expanding Aura
          ctx.save();
          ctx.translate(v.x, v.y);

          // 1. Expanding radial aura flash
          const bgGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, v.radius * progress);
          bgGrad.addColorStop(0, `${v.color}66`);
          bgGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.25)');
          bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = bgGrad;
          ctx.beginPath();
          ctx.ellipse(0, 0, v.radius * progress, v.radius * 0.56 * progress, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Rotating Octagonal Bagua Sigil
          ctx.save();
          ctx.scale(1, 0.52);
          ctx.rotate(progress * Math.PI * 1.5);
          const ringR = 70 + progress * (v.radius * 0.72);
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = v.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (i * Math.PI) / 4;
            const px = Math.cos(ang) * ringR;
            const py = Math.sin(ang) * ringR;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          // Bagua radiating beams
          for (let i = 0; i < 8; i++) {
            const ang = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * 24, Math.sin(ang) * 24);
            ctx.lineTo(Math.cos(ang) * ringR, Math.sin(ang) * ringR);
            ctx.stroke();
          }
          ctx.restore();

          // 3. Ascending Golden Treasure Projection & Light Pillars
          const hoverY = -95 - Math.sin(progress * Math.PI) * 35;
          ctx.fillStyle = `${v.color}cc`;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, hoverY, 24 + Math.sin(progress * Math.PI) * 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          for (let pIdx = -2; pIdx <= 2; pIdx++) {
            const px = pIdx * 95 * progress;
            const pGrad = ctx.createLinearGradient(px, -320, px, 40);
            pGrad.addColorStop(0, 'rgba(255,255,255,0)');
            pGrad.addColorStop(0.5, `${v.color}aa`);
            pGrad.addColorStop(1, 'rgba(253,224,71,0)');
            ctx.fillStyle = pGrad;
            ctx.fillRect(px - 5, -320, 10, 360);
          }

          ctx.restore();
        }
        ctx.restore();
      }

      // 7. Particles
      for (const pt of sim.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 8. Floating Damage / Loot Text
      for (const f of sim.floats) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, f.life / (f.maxLife * 0.5));
        ctx.font = `bold ${f.size}px "Noto Sans TC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }

      // 9. Tribulation screen flash
      if (sim.tribulationFlash > 0) {
        ctx.fillStyle = `rgba(254, 240, 138, ${sim.tribulationFlash * 0.45})`;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [skillTriggerRef, treasureTriggerRef]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    simRef.current.moveTarget = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="fixed inset-0 h-full w-full block cursor-crosshair"
    />
  );
};
