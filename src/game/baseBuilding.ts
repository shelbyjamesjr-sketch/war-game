/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BuildingType, BuildingState, FactionId } from '../types/game';

export interface BuildingConfig {
  type: BuildingType;
  name: string;
  description: string;
  cost: number;
  buildTime: number; // in seconds
  maxHp: number;
  range: number;
  attackPower: number;
  attackCooldown: number;
  requiresCommandCenter: boolean;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  command_center: {
    type: 'command_center',
    name: 'Command Center Nexus',
    description: 'Primary faction headquarters. Mandatory prerequisite for all other structures. Radiates command authority and generates steady Xenonite income.',
    cost: 80,
    buildTime: 5.0,
    maxHp: 500,
    range: 0,
    attackPower: 0,
    attackCooldown: 0,
    requiresCommandCenter: false, // Core foundation
  },
  barracks: {
    type: 'barracks',
    name: 'Legion Training Barracks',
    description: 'Military facility for training infantry, skirmishers, and unlocked elite shock troops directly onto the frontline.',
    cost: 60,
    buildTime: 4.0,
    maxHp: 320,
    range: 0,
    attackPower: 0,
    attackCooldown: 0,
    requiresCommandCenter: true,
  },
  extractor: {
    type: 'extractor',
    name: 'Xenonite Energy Extractor',
    description: 'Harvester drill that taps deep alien subterranean magma conduits. Generates +15 Xenonite energy every 4 seconds.',
    cost: 50,
    buildTime: 3.5,
    maxHp: 240,
    range: 0,
    attackPower: 0,
    attackCooldown: 0,
    requiresCommandCenter: true,
  },
  turret: {
    type: 'turret',
    name: 'Automated Defense Turret',
    description: 'Heavy rotating plasma pylon that tracks and fires armor-piercing energy rounds at hostile enemy units within 24m.',
    cost: 55,
    buildTime: 4.0,
    maxHp: 280,
    range: 24,
    attackPower: 24,
    attackCooldown: 1.1,
    requiresCommandCenter: true,
  },
};

/**
 * Checks if a building can be constructed by the player
 */
export function canConstructBuilding(
  type: BuildingType,
  currentBuildings: BuildingState[],
  playerFaction: FactionId,
  playerEnergy: number
): { allowed: boolean; reason?: string } {
  const config = BUILDING_CONFIGS[type];
  if (!config) return { allowed: false, reason: 'Invalid building type' };

  if (playerEnergy < config.cost) {
    return { allowed: false, reason: `Requires ${config.cost} Xenonite Energy (you have ${Math.floor(playerEnergy)})` };
  }

  // Check Command Center requirement
  if (config.requiresCommandCenter) {
    const hasCommandCenter = currentBuildings.some(
      (b) => b.faction === playerFaction && b.type === 'command_center' && !b.isUnderConstruction
    );
    if (!hasCommandCenter) {
      return { allowed: false, reason: 'Command Center must be constructed first!' };
    }
  } else {
    // Only 1 Command Center allowed per faction
    const alreadyHas = currentBuildings.some((b) => b.faction === playerFaction && b.type === 'command_center');
    if (alreadyHas) {
      return { allowed: false, reason: 'Command Center already exists for your legion' };
    }
  }

  return { allowed: true };
}

/**
 * Creates a new building state
 */
export function createBuildingState(
  type: BuildingType,
  faction: FactionId,
  x: number,
  z: number,
  y: number
): BuildingState {
  const config = BUILDING_CONFIGS[type];
  const id = `bld_${type}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    type,
    faction,
    x,
    z,
    y,
    hp: Math.round(config.maxHp * 0.25), // starts with partial HP under construction
    maxHp: config.maxHp,
    isUnderConstruction: true,
    buildProgress: 0,
    range: config.range,
    attackCooldown: config.attackCooldown,
    currentCooldown: 0,
    targetUnitId: null,
    turretRotation: 0,
  };
}
