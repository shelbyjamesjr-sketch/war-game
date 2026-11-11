/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FactionId = 'spartans' | 'romans' | 'greeks';

export type BuildingType = 'command_center' | 'barracks' | 'extractor' | 'turret';

export type ArmyAbilityId = 'phalanx_formation' | 'siege_engine' | 'hoplite_charge';

export interface FactionInfo {
  id: FactionId;
  name: string;
  motto: string;
  themeColor: string;
  accentColor: string;
  description: string;
  shieldIcon: 'lambda' | 'eagle' | 'owl';
  uniqueAbility: {
    id: ArmyAbilityId;
    name: string;
    description: string;
    cooldown: number;
    duration?: number;
    energyCost: number;
  };
  buffs: {
    defense: number;
    attack: number;
    speed: number;
    captureSpeed: number;
  };
  units: {
    infantry: string;
    ranged: string;
    elite: string;
    siege?: string;
  };
}

export type SquadOrder = 'charge' | 'phalanx' | 'follow' | 'defend';

export interface UnitState {
  id: string;
  faction: FactionId;
  type: 'infantry' | 'ranged' | 'elite' | 'commander' | 'siege';
  x: number;
  z: number;
  vx: number;
  vz: number;
  rotation: number;
  hp: number;
  maxHp: number;
  attackPower: number;
  attackRange: number;
  attackCooldown: number;
  currentCooldown: number;
  shieldValue: number;
  isBlocking: boolean;
  targetId: string | null;
  state: 'idle' | 'walking' | 'attacking' | 'blocking' | 'dead';
  deathTimer: number;
}

export interface BuildingState {
  id: string;
  type: BuildingType;
  faction: FactionId;
  x: number;
  z: number;
  y: number;
  hp: number;
  maxHp: number;
  isUnderConstruction: boolean;
  buildProgress: number; // 0 to 100
  range: number;
  attackCooldown: number;
  currentCooldown: number;
  targetUnitId: string | null;
  turretRotation: number;
}

export interface TechNode {
  id: string;
  faction: FactionId;
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  cost: number;
  researchTime: number; // seconds
  researchProgress: number; // 0 to 100
  isResearching: boolean;
  isResearched: boolean;
  prereqs: string[]; // required tech IDs
  effect: {
    type: 'unit_armor' | 'unit_damage' | 'production_speed' | 'ability_boost' | 'extractor_boost' | 'turret_boost' | 'unlock_unit';
    value: number; // multiplier or unlock flag
    unitType?: 'infantry' | 'ranged' | 'elite' | 'siege' | 'all';
  };
}

export interface ObeliskState {
  id: string;
  name: string;
  x: number;
  z: number;
  owner: FactionId | 'neutral';
  captureProgress: number;
  capturingFaction: FactionId | null;
  captureRate: number;
  beaconHeight: number;
}

export interface BattlefieldState {
  playerFaction: FactionId;
  enemyFaction: FactionId;
  playerTickets: number;
  enemyTickets: number;
  playerEnergy: number;
  maxTickets: number;
  gameTime: number;
  currentOrder: SquadOrder;
  gameStatus: 'title' | 'playing' | 'paused' | 'victory' | 'defeat';
  // Ability state
  abilityCooldown: number;
  abilityActiveTimer: number;
  isPhalanxActive: boolean; // Spartan unique stance
  isChargeActive: boolean;  // Greek charge surge
  stats: {
    enemiesKilled: number;
    alliesLost: number;
    obelisksCaptured: number;
    buildingsConstructed: number;
    techsResearched: number;
    damageDealt: number;
    damageTaken: number;
  };
}

export interface Projectile {
  id: string;
  faction: FactionId;
  sourceType: 'unit' | 'turret' | 'siege';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  life: number;
  isExplosive?: boolean;
}
