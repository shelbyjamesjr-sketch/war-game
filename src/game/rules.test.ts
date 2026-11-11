/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FACTIONS,
  calculateDamage,
  updateObeliskCapture,
  calculateTicketDecay,
  checkBattleOutcome,
  getFormationOffset,
} from './rules';
import { TECH_TREES, canResearchTech, getTechMultiplier } from './techTree';
import { canConstructBuilding, BUILDING_CONFIGS } from './baseBuilding';
import { ObeliskState, BuildingState, TechNode } from '../types/game';

test('FACTIONS config includes spartans, romans, and greeks with unique perks and abilities', () => {
  assert.ok(FACTIONS.spartans, 'Spartans faction exists');
  assert.ok(FACTIONS.romans, 'Romans faction exists');
  assert.ok(FACTIONS.greeks, 'Greeks faction exists');

  assert.equal(FACTIONS.spartans.uniqueAbility.id, 'phalanx_formation');
  assert.equal(FACTIONS.romans.uniqueAbility.id, 'siege_engine');
  assert.equal(FACTIONS.greeks.uniqueAbility.id, 'hoplite_charge');
});

test('calculateDamage handles unique abilities: Phalanx and Hoplite Charge', () => {
  // Greek normal attack vs Roman defender
  const normalGreekAtk = calculateDamage('greeks', 'romans', 20, false, false, false, false);

  // Greek Hoplite Charge active (deals 2x damage surge)
  const chargeGreekAtk = calculateDamage('greeks', 'romans', 20, false, false, false, true);
  assert.ok(chargeGreekAtk.finalDamage > normalGreekAtk.finalDamage * 1.5, 'Hoplite Charge should deal massive bonus damage');

  // Spartan Phalanx Formation active (boosts defense)
  const vsNormalSpartan = calculateDamage('romans', 'spartans', 30, false, false, false, false);
  const vsPhalanxSpartan = calculateDamage('romans', 'spartans', 30, false, false, true, false);
  assert.ok(vsPhalanxSpartan.finalDamage < vsNormalSpartan.finalDamage, 'Phalanx formation should drastically mitigate incoming damage');
});

test('canConstructBuilding enforces Command Center as prerequisite for other structures', () => {
  const currentBuildings: BuildingState[] = [];

  // Attempting to build barracks before Command Center should fail
  const barracksCheck1 = canConstructBuilding('barracks', currentBuildings, 'spartans', 100);
  assert.equal(barracksCheck1.allowed, false);
  assert.match(barracksCheck1.reason || '', /Command Center must be constructed first/);

  // Attempting to build Command Center with sufficient energy should succeed
  const ccCheck = canConstructBuilding('command_center', currentBuildings, 'spartans', 100);
  assert.equal(ccCheck.allowed, true);

  // Once Command Center exists and is completed:
  const activeBuildings: BuildingState[] = [
    {
      id: 'cc-1',
      type: 'command_center',
      faction: 'spartans',
      x: 0,
      z: 0,
      y: 0,
      hp: 500,
      maxHp: 500,
      isUnderConstruction: false,
      buildProgress: 100,
      range: 0,
      attackCooldown: 0,
      currentCooldown: 0,
      targetUnitId: null,
      turretRotation: 0,
    },
  ];

  // Now Barracks can be built!
  const barracksCheck2 = canConstructBuilding('barracks', activeBuildings, 'spartans', 100);
  assert.equal(barracksCheck2.allowed, true);

  // Turret can also be built!
  const turretCheck = canConstructBuilding('turret', activeBuildings, 'spartans', 100);
  assert.equal(turretCheck.allowed, true);
});

test('TECH_TREES covers all 3 factions across 3 tiers with prerequisite validation', () => {
  assert.ok(TECH_TREES.spartans.length >= 6, 'Spartans have full tech tree');
  assert.ok(TECH_TREES.romans.length >= 6, 'Romans have full tech tree');
  assert.ok(TECH_TREES.greeks.length >= 6, 'Greeks have full tech tree');

  const spartanTechs = TECH_TREES.spartans;
  const tier1 = spartanTechs.find((t) => t.id === 'spartan_bronze_armor')!;
  const tier2 = spartanTechs.find((t) => t.id === 'spartan_spearheads')!;

  // Tier 1 has no prereqs
  assert.equal(canResearchTech(tier1, spartanTechs, 100), true);

  // Tier 2 requires Tier 1 to be researched first
  assert.equal(canResearchTech(tier2, spartanTechs, 200), false, 'Tier 2 should be locked before Tier 1');

  // Mark Tier 1 as researched
  const updatedTechs = spartanTechs.map((t) =>
    t.id === 'spartan_bronze_armor' ? { ...t, isResearched: true } : t
  );
  assert.equal(canResearchTech(tier2, updatedTechs, 200), true, 'Tier 2 should unlock once prereq is met');
});
