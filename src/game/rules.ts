/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FactionId, FactionInfo, SquadOrder, ObeliskState, BuildingState, TechNode } from '../types/game';
import { getTechMultiplier } from './techTree';

export const FACTIONS: Record<FactionId, FactionInfo> = {
  spartans: {
    id: 'spartans',
    name: 'Spartan Hegemony',
    motto: 'Molon Labe — With Shield or Upon It',
    themeColor: '#dc2626', // Crimson red
    accentColor: '#fbbf24', // Bronze gold
    description: 'Relentless cyber-hoplites wielding crimson plasma cloaks and impenetrable bronze phalanxes. Highest durability and close-quarters impale power.',
    shieldIcon: 'lambda',
    uniqueAbility: {
      id: 'phalanx_formation',
      name: 'Spartan Phalanx Formation',
      description: 'Locks shields into an impenetrable wall. Boosts defense by +75%, grants knockback immunity, and reflects frontal projectile damage.',
      cooldown: 12.0,
      duration: 10.0,
      energyCost: 35,
    },
    buffs: {
      defense: 1.3,
      attack: 1.1,
      speed: 0.95,
      captureSpeed: 1.0,
    },
    units: {
      infantry: 'Spartan Hoplite',
      ranged: 'Helot Skirmisher',
      elite: 'Royal Spartan Champion',
    },
  },
  romans: {
    id: 'romans',
    name: 'Legio Martia',
    motto: 'Senatus Populusque Romanus',
    themeColor: '#b91c1c', // Imperial scarlet
    accentColor: '#e2e8f0', // Roman iron / silver
    description: 'Discipline-forged legionaries equipped with curved electromagnetic Scutums and armor-piercing Pilum javelins. Superior formation cohesion.',
    shieldIcon: 'eagle',
    uniqueAbility: {
      id: 'siege_engine',
      name: 'Construct Siege Engine',
      description: 'Deploys a heavy Roman Onager / Ballista that hurls massive explosive plasma boulders at extreme range into enemy lines.',
      cooldown: 15.0,
      energyCost: 65,
    },
    buffs: {
      defense: 1.15,
      attack: 1.25,
      speed: 1.0,
      captureSpeed: 1.1,
    },
    units: {
      infantry: 'Imperial Legionary',
      ranged: 'Sagittarius Archer',
      elite: 'Centurion Vanguard',
      siege: 'Roman Heavy Onager',
    },
  },
  greeks: {
    id: 'greeks',
    name: 'Athenian Vanguard',
    motto: 'Victory Through Intellect and Reach',
    themeColor: '#0284c7', // Aegean azure
    accentColor: '#38bdf8', // Neon sky
    description: 'Swift Macedonian pike-masters and Athenian plasma slingers. Unrivaled battlefield reach, rapid deployment, and accelerated node conquest.',
    shieldIcon: 'owl',
    uniqueAbility: {
      id: 'hoplite_charge',
      name: 'Macedonian Hoplite Charge',
      description: 'Unleashes a devastating sprint charge (+50% speed, +100% initial impact damage, and topples enemy lines on contact).',
      cooldown: 10.0,
      duration: 8.0,
      energyCost: 30,
    },
    buffs: {
      defense: 1.0,
      attack: 1.15,
      speed: 1.2,
      captureSpeed: 1.35,
    },
    units: {
      infantry: 'Syntagma Pikeman',
      ranged: 'Athenian Toxotes',
      elite: 'Strategos Champion',
    },
  },
};

export const REINFORCEMENT_COSTS = {
  infantry: 40,
  ranged: 50,
  elite: 85,
  siege: 95,
  barricade: 60,
  rally: 30,
};

export const OBELISK_CAPTURE_RADIUS = 16;
export const MAX_CAPTURE_PROGRESS = 100;

/**
 * Calculates raw and mitigated damage with tech multipliers and abilities
 */
export function calculateDamage(
  attackerFaction: FactionId,
  defenderFaction: FactionId,
  baseDamage: number,
  isBlocking: boolean,
  isFrontalHit: boolean,
  isPhalanxActive: boolean = false,
  isChargeActive: boolean = false,
  attackerTechs: TechNode[] = [],
  defenderTechs: TechNode[] = []
): { finalDamage: number; blockedAmount: number } {
  let attackMod = FACTIONS[attackerFaction]?.buffs.attack ?? 1.0;

  // Greek Hoplite charge attack boost
  if (isChargeActive && attackerFaction === 'greeks') {
    attackMod *= 2.0;
  }

  // Tech attack bonuses
  const techAtk = getTechMultiplier(attackerTechs, 'unit_damage', 'all');
  attackMod *= techAtk;

  const rawDamage = baseDamage * attackMod;

  let defenseMod = FACTIONS[defenderFaction]?.buffs.defense ?? 1.0;
  // Tech armor bonuses
  const techArmor = getTechMultiplier(defenderTechs, 'unit_armor', 'all');
  defenseMod *= techArmor;

  // Spartan Phalanx Formation active
  if (isPhalanxActive && defenderFaction === 'spartans') {
    defenseMod *= 1.75; // Major 75% defense surge
  }

  if (isBlocking && isFrontalHit) {
    const absorbRatio = Math.min(0.92, 0.70 * defenseMod);
    const blockedAmount = rawDamage * absorbRatio;
    const finalDamage = Math.max(1, Math.round(rawDamage - blockedAmount));
    return { finalDamage, blockedAmount: Math.round(blockedAmount) };
  }

  // Passive armor mitigation
  const mitigated = Math.max(1, Math.round(rawDamage / defenseMod));
  return { finalDamage: mitigated, blockedAmount: 0 };
}

/**
 * Updates obelisk capture progress based on presence of units
 */
export function updateObeliskCapture(
  obelisk: ObeliskState,
  playerUnitsInRadius: number,
  enemyUnitsInRadius: number,
  playerFaction: FactionId,
  enemyFaction: FactionId,
  dt: number
): {
  newOwner: FactionId | 'neutral';
  newProgress: number;
  capturedThisFrame: boolean;
  lostThisFrame: boolean;
} {
  const pSpeed = FACTIONS[playerFaction]?.buffs.captureSpeed ?? 1.0;
  const eSpeed = FACTIONS[enemyFaction]?.buffs.captureSpeed ?? 1.0;

  let progress = obelisk.captureProgress;
  let owner = obelisk.owner;
  let capturedThisFrame = false;
  let lostThisFrame = false;

  const playerPressure = playerUnitsInRadius * pSpeed;
  const enemyPressure = enemyUnitsInRadius * eSpeed;
  const netPressure = playerPressure - enemyPressure;

  if (netPressure !== 0) {
    const delta = netPressure * 12 * dt;
    progress += delta;

    if (progress >= MAX_CAPTURE_PROGRESS) {
      progress = MAX_CAPTURE_PROGRESS;
      if (owner !== playerFaction) {
        owner = playerFaction;
        capturedThisFrame = true;
      }
    } else if (progress <= -MAX_CAPTURE_PROGRESS) {
      progress = -MAX_CAPTURE_PROGRESS;
      if (owner !== enemyFaction) {
        owner = enemyFaction;
        lostThisFrame = true;
      }
    } else if (progress > 0 && owner === enemyFaction) {
      owner = 'neutral';
    } else if (progress < 0 && owner === playerFaction) {
      owner = 'neutral';
    }
  }

  return {
    newOwner: owner,
    newProgress: progress,
    capturedThisFrame,
    lostThisFrame,
  };
}

/**
 * Calculates ticket decay rate per second based on obelisk control
 */
export function calculateTicketDecay(
  obelisks: ObeliskState[],
  playerFaction: FactionId,
  enemyFaction: FactionId
): { playerDecayPerSec: number; enemyDecayPerSec: number } {
  let playerOwned = 0;
  let enemyOwned = 0;

  for (const o of obelisks) {
    if (o.owner === playerFaction) playerOwned++;
    else if (o.owner === enemyFaction) enemyOwned++;
  }

  let playerDecay = 0;
  let enemyDecay = 0;

  if (playerOwned > enemyOwned) {
    enemyDecay = (playerOwned - enemyOwned) * 1.5;
  } else if (enemyOwned > playerOwned) {
    playerDecay = (enemyOwned - playerOwned) * 1.5;
  }

  return {
    playerDecayPerSec: playerDecay,
    enemyDecayPerSec: enemyDecay,
  };
}

/**
 * Evaluates whether victory or defeat is reached
 */
export function checkBattleOutcome(
  playerTickets: number,
  enemyTickets: number,
  playerHp: number
): 'playing' | 'victory' | 'defeat' {
  if (playerHp <= 0 || playerTickets <= 0) {
    return 'defeat';
  }
  if (enemyTickets <= 0) {
    return 'victory';
  }
  return 'playing';
}

/**
 * Computes squad formation offsets around commander or anchor point
 */
export function getFormationOffset(
  index: number,
  totalUnits: number,
  order: SquadOrder
): { x: number; z: number } {
  switch (order) {
    case 'phalanx': {
      const cols = Math.min(5, Math.max(3, Math.ceil(totalUnits / 2)));
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = (col - (cols - 1) / 2) * 1.8;
      const z = 3.5 + row * 1.6;
      return { x, z };
    }
    case 'charge': {
      const row = Math.floor(Math.sqrt(index));
      const rowStart = row * row;
      const posInRow = index - rowStart;
      const x = (posInRow - row / 2) * 2.2;
      const z = 5.0 + row * 2.0;
      return { x, z };
    }
    case 'defend': {
      const angle = (index / Math.max(1, totalUnits)) * Math.PI * 2;
      const radius = 4.5;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
      };
    }
    case 'follow':
    default: {
      const row = Math.floor(index / 3) + 1;
      const col = index % 3;
      const x = (col - 1) * 2.5;
      const z = -2.5 - row * 2.2;
      return { x, z };
    }
  }
}
