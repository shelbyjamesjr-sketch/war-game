/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FactionId, TechNode } from '../types/game';

export const TECH_TREES: Record<FactionId, TechNode[]> = {
  spartans: [
    // Tier 1
    {
      id: 'spartan_bronze_armor',
      faction: 'spartans',
      tier: 1,
      name: 'Bronze-Hardened Alloy',
      description: 'Strengthens Spartan cuirasses with dense alien bronze alloys (+25% HP to all Spartan units).',
      cost: 50,
      researchTime: 6.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: [],
      effect: { type: 'unit_armor', value: 1.25, unitType: 'all' },
    },
    {
      id: 'spartan_phalanx_training',
      faction: 'spartans',
      tier: 1,
      name: 'Leonidas Phalanx Drill',
      description: 'Reinforces shield lock cohesion. Spartan Phalanx ability grants +40% additional defense against frontal attacks.',
      cost: 65,
      researchTime: 8.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: [],
      effect: { type: 'ability_boost', value: 1.4 },
    },
    // Tier 2
    {
      id: 'spartan_spearheads',
      faction: 'spartans',
      tier: 2,
      name: 'Plasma-Infused Dory Tips',
      description: 'Superheats spearheads with Xenonite energy (+30% attack damage to Spartan infantry and champions).',
      cost: 110,
      researchTime: 12.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['spartan_bronze_armor'],
      effect: { type: 'unit_damage', value: 1.3, unitType: 'all' },
    },
    {
      id: 'spartan_unlock_myrmidon',
      faction: 'spartans',
      tier: 2,
      name: 'Order of the Myrmidons',
      description: 'Unlocks legendary Myrmidon shock troops at the Barracks with heavy shields and sweeping halberds.',
      cost: 130,
      researchTime: 14.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['spartan_phalanx_training'],
      effect: { type: 'unlock_unit', value: 1, unitType: 'elite' },
    },
    // Tier 3
    {
      id: 'spartan_wrath_thermopylae',
      faction: 'spartans',
      tier: 3,
      name: 'Wrath of Thermopylae',
      description: 'Unbreakable spirit. While Phalanx is active, reflects 40% of blocked projectile damage back at enemies and radiates +35% attack aura.',
      cost: 180,
      researchTime: 18.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['spartan_spearheads', 'spartan_unlock_myrmidon'],
      effect: { type: 'ability_boost', value: 1.75 },
    },
    {
      id: 'spartan_aegis_shielding',
      faction: 'spartans',
      tier: 3,
      name: 'Orbital Aegis Generator',
      description: 'Surrounds all constructed bases and defensive turrets in kinetic energy shields (+50% building HP).',
      cost: 190,
      researchTime: 20.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['spartan_spearheads'],
      effect: { type: 'turret_boost', value: 1.5 },
    },
  ],

  romans: [
    // Tier 1
    {
      id: 'roman_lorica_reinforce',
      faction: 'romans',
      tier: 1,
      name: 'Lorica Segmentata Hardening',
      description: 'Overlaps tempered steel plates, reducing incoming enemy damage by 20% across all Roman legionaries.',
      cost: 50,
      researchTime: 6.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: [],
      effect: { type: 'unit_armor', value: 1.2, unitType: 'all' },
    },
    {
      id: 'roman_centuria_logistics',
      faction: 'romans',
      tier: 1,
      name: 'Centuria Logistics',
      description: 'Standardized Roman legion supply chains increase Barracks training and deploy speed by +35%.',
      cost: 65,
      researchTime: 7.5,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: [],
      effect: { type: 'production_speed', value: 1.35 },
    },
    // Tier 2
    {
      id: 'roman_siege_ballista',
      faction: 'romans',
      tier: 2,
      name: 'Onager & Ballista Fabrication',
      description: 'Enables construction of heavy Roman Siege Engines that fire devastating explosive plasma boulders at extreme range.',
      cost: 120,
      researchTime: 12.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['roman_lorica_reinforce'],
      effect: { type: 'unlock_unit', value: 1, unitType: 'siege' },
    },
    {
      id: 'roman_pilum_volleys',
      faction: 'romans',
      tier: 2,
      name: 'Electromagnetic Pilum Volleys',
      description: 'Imbues Roman javelins with electromagnetic charges (+35% ranged attack damage and shield piercing).',
      cost: 110,
      researchTime: 12.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['roman_centuria_logistics'],
      effect: { type: 'unit_damage', value: 1.35, unitType: 'ranged' },
    },
    // Tier 3
    {
      id: 'roman_catapult_clusters',
      faction: 'romans',
      tier: 3,
      name: 'Jupiter Cluster Shells',
      description: 'Roman Siege Engines detonate into cluster bursts on impact, wiping out entire enemy infantry formations.',
      cost: 190,
      researchTime: 18.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['roman_siege_ballista'],
      effect: { type: 'ability_boost', value: 1.8 },
    },
    {
      id: 'roman_castrum_engineering',
      faction: 'romans',
      tier: 3,
      name: 'Castrum Engineering Mastery',
      description: 'Automated Roman defensive turrets gain +50% range, double fire rate, and explosive shrapnel rounds.',
      cost: 180,
      researchTime: 18.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['roman_siege_ballista', 'roman_pilum_volleys'],
      effect: { type: 'turret_boost', value: 1.7 },
    },
  ],

  greeks: [
    // Tier 1
    {
      id: 'greek_sarissa_reach',
      faction: 'greeks',
      tier: 1,
      name: 'Macedonian Sarissa Reach',
      description: 'Lengthens Macedonian pikes with carbon-nanotube cores (+40% melee attack range for Syntagma Pikemen).',
      cost: 50,
      researchTime: 6.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: [],
      effect: { type: 'unit_damage', value: 1.25, unitType: 'infantry' },
    },
    {
      id: 'greek_athenian_extractors',
      faction: 'greeks',
      tier: 1,
      name: 'Athenian Mineral Refining',
      description: 'Advanced Athenian metallurgy improves Resource Extractor output by +35% Xenonite energy.',
      cost: 65,
      researchTime: 7.5,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: [],
      effect: { type: 'extractor_boost', value: 1.35 },
    },
    // Tier 2
    {
      id: 'greek_hoplite_charge_surge',
      faction: 'greeks',
      tier: 2,
      name: 'Syntagma Shock Momentum',
      description: 'Hoplite Charge ability cooldown reduced by 50%. The initial charge impact deals +100% bonus damage and topples foes.',
      cost: 115,
      researchTime: 12.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['greek_sarissa_reach'],
      effect: { type: 'ability_boost', value: 2.0 },
    },
    {
      id: 'greek_unlock_cretan_archers',
      faction: 'greeks',
      tier: 2,
      name: 'Cretan Plasma Toxotes',
      description: 'Unlocks elite Cretan bowmen who fire guided plasma energy arrows at rapid velocity.',
      cost: 125,
      researchTime: 13.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['greek_athenian_extractors'],
      effect: { type: 'unlock_unit', value: 1, unitType: 'ranged' },
    },
    // Tier 3
    {
      id: 'greek_alexander_blitz',
      faction: 'greeks',
      tier: 3,
      name: "Alexander's Planetary Blitz",
      description: 'Unmatched maneuver warfare. All Greek units gain +25% sprint speed and deploy costs are reduced by 20%.',
      cost: 185,
      researchTime: 18.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['greek_hoplite_charge_surge'],
      effect: { type: 'production_speed', value: 1.6 },
    },
    {
      id: 'greek_colossus_defense',
      faction: 'greeks',
      tier: 3,
      name: 'Colossus of Rhodes Defense Spire',
      description: 'Upgrades Defensive Turrets with continuous piercing plasma beam projectors that incinerate lines of enemies.',
      cost: 190,
      researchTime: 20.0,
      researchProgress: 0,
      isResearching: false,
      isResearched: false,
      prereqs: ['greek_hoplite_charge_surge', 'greek_unlock_cretan_archers'],
      effect: { type: 'turret_boost', value: 1.8 },
    },
  ],
};

/**
 * Checks if a technology node can be researched (prereqs met, not already researched/researching)
 */
export function canResearchTech(tech: TechNode, allTechs: TechNode[], playerEnergy: number): boolean {
  if (tech.isResearched || tech.isResearching) return false;
  if (playerEnergy < tech.cost) return false;

  // Prerequisite check
  for (const prereqId of tech.prereqs) {
    const prereq = allTechs.find((t) => t.id === prereqId);
    if (!prereq || !prereq.isResearched) {
      return false;
    }
  }

  return true;
}

/**
 * Computes aggregate tech multiplier for a given effect type
 */
export function getTechMultiplier(
  techs: TechNode[],
  effectType: TechNode['effect']['type'],
  unitType?: 'infantry' | 'ranged' | 'elite' | 'siege' | 'all'
): number {
  let multiplier = 1.0;

  for (const t of techs) {
    if (t.isResearched && t.effect.type === effectType) {
      if (!unitType || t.effect.unitType === 'all' || t.effect.unitType === unitType) {
        multiplier *= t.effect.value;
      }
    }
  }

  return multiplier;
}

/**
 * Checks if a specific unit type is unlocked by researched tech
 */
export function isUnitTypeUnlocked(techs: TechNode[], unitType: 'infantry' | 'ranged' | 'elite' | 'siege'): boolean {
  if (unitType === 'infantry' || unitType === 'ranged') return true;
  if (unitType === 'elite') {
    // Basic champions are available, elite tech enhances them or unlocks special variant
    return true;
  }
  if (unitType === 'siege') {
    // Roman siege engine requires tech unlock or Roman faction siege ability
    return techs.some((t) => t.isResearched && t.effect.type === 'unlock_unit' && t.effect.unitType === 'siege');
  }
  return true;
}
