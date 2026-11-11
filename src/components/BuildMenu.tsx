/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BuildingType, BuildingState, FactionId } from '../types/game';
import { BUILDING_CONFIGS, canConstructBuilding } from '../game/baseBuilding';

interface BuildMenuProps {
  playerFaction: FactionId;
  playerEnergy: number;
  buildings: BuildingState[];
  onSelectBuildingToConstruct: (type: BuildingType) => void;
  onClose: () => void;
}

export const BuildMenu: React.FC<BuildMenuProps> = ({
  playerFaction,
  playerEnergy,
  buildings,
  onSelectBuildingToConstruct,
  onClose,
}) => {
  const buildingTypes: BuildingType[] = ['command_center', 'barracks', 'extractor', 'turret'];

  const hasCommandCenter = buildings.some(
    (b) => b.faction === playerFaction && b.type === 'command_center' && !b.isUnderConstruction
  );

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-zinc-950 border border-amber-500/40 rounded-2xl p-5 shadow-[0_0_35px_rgba(245,158,11,0.25)] flex flex-col gap-4 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            </svg>
            <h2 className="text-base sm:text-lg font-bold tracking-widest text-white uppercase">
              MILITARY FIELD ENGINEERING DOCK
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-cyan-300 font-bold">
              ENERGY: {Math.floor(playerEnergy)} XN
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-white border border-white/20 transition-colors cursor-pointer"
            >
              CLOSE [B / ESC]
            </button>
          </div>
        </div>

        {/* Warning if Command Center is needed */}
        {!hasCommandCenter && (
          <div className="bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs p-2.5 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 fill-amber-400" viewBox="0 0 24 24">
              <path d="M12 2L1 21h22L12 2zm0 3.5l8.5 14.5H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
            <span>
              <strong>COMMAND CENTER REQUIRED:</strong> Construct the Command Center first to establish the faction grid and authorize Barracks, Extractors, and Turrets.
            </span>
          </div>
        )}

        {/* Buildings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {buildingTypes.map((bType) => {
            const config = BUILDING_CONFIGS[bType];
            const check = canConstructBuilding(bType, buildings, playerFaction, playerEnergy);
            const isAffordable = playerEnergy >= config.cost;

            return (
              <div
                key={bType}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  check.allowed
                    ? 'bg-zinc-900/90 border-zinc-700 hover:border-amber-400 hover:bg-zinc-850'
                    : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="font-bold text-white text-sm">{config.name}</h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isAffordable ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-red-950 text-red-300'
                      }`}
                    >
                      {config.cost} XN
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                    {config.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-1">
                  <div className="text-[11px] text-zinc-400">
                    <span>HP: {config.maxHp}</span>
                    <span className="mx-1.5">·</span>
                    <span>BUILD: {config.buildTime}s</span>
                  </div>

                  <button
                    disabled={!check.allowed}
                    onClick={() => {
                      onSelectBuildingToConstruct(bType);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-400 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    CONSTRUCT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
