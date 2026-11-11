/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TechNode, FactionId } from '../types/game';
import { FACTIONS } from '../game/rules';
import { canResearchTech } from '../game/techTree';

interface TechTreeModalProps {
  playerFaction: FactionId;
  playerEnergy: number;
  techs: TechNode[];
  onStartResearch: (techId: string) => void;
  onClose: () => void;
}

export const TechTreeModal: React.FC<TechTreeModalProps> = ({
  playerFaction,
  playerEnergy,
  techs,
  onStartResearch,
  onClose,
}) => {
  const faction = FACTIONS[playerFaction];

  // Group by Tier 1, 2, 3
  const tier1 = techs.filter((t) => t.tier === 1);
  const tier2 = techs.filter((t) => t.tier === 2);
  const tier3 = techs.filter((t) => t.tier === 3);

  const renderTierColumn = (tierNumber: number, tierTitle: string, tierNodes: TechNode[]) => (
    <div className="flex-1 flex flex-col gap-3">
      <div className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400 border-b border-amber-500/30 pb-1 flex items-center justify-between">
        <span>TIER {tierNumber}: {tierTitle}</span>
        <span className="text-[10px] text-zinc-400 font-normal">
          {tierNodes.filter((t) => t.isResearched).length}/{tierNodes.length} COMPLETED
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {tierNodes.map((tech) => {
          const isEligible = canResearchTech(tech, techs, playerEnergy);

          return (
            <div
              key={tech.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                tech.isResearched
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : tech.isResearching
                  ? 'bg-cyan-950/60 border-cyan-400 animate-pulse'
                  : isEligible
                  ? 'bg-zinc-900 border-zinc-700 hover:border-amber-400'
                  : 'bg-zinc-950/60 border-zinc-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-white text-xs">{tech.name}</h4>
                  {tech.isResearched ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      RESEARCHED
                    </span>
                  ) : tech.isResearching ? (
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                      RESEARCHING ({Math.round(tech.researchProgress)}%)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {tech.cost} XN
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 leading-snug mb-2">{tech.description}</p>

                {/* Prerequisites Notice */}
                {!tech.isResearched && !tech.isResearching && tech.prereqs.length > 0 && (
                  <div className="text-[9px] text-zinc-400 mb-2">
                    Prereq:{' '}
                    {tech.prereqs
                      .map((pId) => techs.find((t) => t.id === pId)?.name || pId)
                      .join(', ')}
                  </div>
                )}
              </div>

              {/* Research Progress Bar if active */}
              {tech.isResearching && (
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{ width: `${tech.researchProgress}%` }}
                  />
                </div>
              )}

              {/* Action Button */}
              {!tech.isResearched && !tech.isResearching && (
                <button
                  disabled={!isEligible}
                  onClick={() => onStartResearch(tech.id)}
                  className="w-full py-1.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-400 text-black transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {playerEnergy < tech.cost ? `NEED ${tech.cost} XN` : 'INITIATE RESEARCH'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-zinc-950 border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(245,158,11,0.2)] flex flex-col gap-4 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: faction.themeColor }}
            >
              {faction.shieldIcon === 'lambda' ? 'Λ' : faction.shieldIcon === 'eagle' ? 'R' : 'Ω'}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider text-white uppercase">
                {faction.name} · MILITARY TECHNOLOGY MATRIX
              </h2>
              <div className="text-[11px] text-zinc-400">
                Unlock army upgrades, specialized formations, siege weapons, and defense spires.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-cyan-300 font-bold bg-zinc-900 border border-cyan-800/60 px-3 py-1 rounded">
              XENONITE: {Math.floor(playerEnergy)}
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-white border border-white/20 transition-colors cursor-pointer"
            >
              CLOSE [T / ESC]
            </button>
          </div>
        </div>

        {/* 3 Tier Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-h-[70vh] overflow-y-auto pr-1">
          {renderTierColumn(1, 'FOUNDATION', tier1)}
          {renderTierColumn(2, 'SPECIALIZATION', tier2)}
          {renderTierColumn(3, 'SUPREMACY', tier3)}
        </div>
      </div>
    </div>
  );
};
