/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BattlefieldState, ObeliskState, SquadOrder, BuildingState, TechNode } from '../types/game';
import { FACTIONS } from '../game/rules';

interface HUDProps {
  battlefield: BattlefieldState;
  obelisks: ObeliskState[];
  buildings: BuildingState[];
  techs: TechNode[];
  playerHp: number;
  maxPlayerHp: number;
  rallyActive: boolean;
  rallyTimer: number;
  isBuildingMode: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onSelectOrder: (order: SquadOrder) => void;
  onDeploy: (type: 'infantry' | 'ranged' | 'elite') => void;
  onTriggerAbility: () => void;
  onRally: () => void;
  onOpenBuildMenu: () => void;
  onOpenTechTree: () => void;
  onToggleMap: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  battlefield,
  obelisks,
  buildings,
  techs,
  playerHp,
  maxPlayerHp,
  rallyActive,
  rallyTimer,
  isBuildingMode,
  isMuted,
  onToggleMute,
  onSelectOrder,
  onDeploy,
  onTriggerAbility,
  onRally,
  onOpenBuildMenu,
  onOpenTechTree,
  onToggleMap,
  onPause,
}) => {
  const pFaction = FACTIONS[battlefield.playerFaction];
  const eFaction = FACTIONS[battlefield.enemyFaction];
  const ability = pFaction?.uniqueAbility;

  const pRatio = Math.max(0, battlefield.playerTickets / battlefield.maxTickets);
  const eRatio = Math.max(0, battlefield.enemyTickets / battlefield.maxTickets);
  const hpRatio = Math.max(0, playerHp / maxPlayerHp);

  const canUseAbility = battlefield.abilityCooldown <= 0 && battlefield.playerEnergy >= (ability?.energyCost || 0);
  const researchedCount = techs.filter((t) => t.isResearched).length;

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 font-sans text-white overflow-hidden flex flex-col justify-between p-4 md:p-6">
      {/* 1. TOP BAR: Dominance Tickets & Obelisk Control */}
      <header className="w-full max-w-xl mx-auto flex flex-col items-center gap-1.5 px-4 pointer-events-none">
        <div className="w-full flex items-center justify-between text-xs tracking-wider uppercase font-semibold">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: pFaction?.themeColor || '#dc2626' }}
            />
            <span className="text-zinc-200">{pFaction?.name || 'Allies'}</span>
            <span className="font-mono text-sm tabular-nums text-white bg-black/60 px-2 py-0.5 rounded border border-white/10">
              {Math.round(battlefield.playerTickets)}
            </span>
          </div>

          <div className="text-zinc-400 font-mono tracking-widest text-[11px]">
            {Math.floor(battlefield.gameTime / 60)}:
            {String(Math.floor(battlefield.gameTime % 60)).padStart(2, '0')}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-white bg-black/60 px-2 py-0.5 rounded border border-white/10">
              {Math.round(battlefield.enemyTickets)}
            </span>
            <span className="text-zinc-200">{eFaction?.name || 'Enemies'}</span>
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: eFaction?.themeColor || '#0284c7' }}
            />
          </div>
        </div>

        {/* Dual Ticket Progress */}
        <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden flex border border-white/15">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${pRatio * 50}%`,
              backgroundColor: pFaction?.themeColor || '#dc2626',
            }}
          />
          <div className="flex-1 bg-zinc-900/60" />
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${eRatio * 50}%`,
              backgroundColor: eFaction?.themeColor || '#0284c7',
            }}
          />
        </div>

        {/* Obelisk Status Pips */}
        <div className="flex items-center justify-center gap-3 mt-1">
          {obelisks.map((ob, idx) => {
            const letter = String.fromCharCode(65 + idx);
            let bg = 'bg-zinc-800 text-zinc-400 border-zinc-600';
            if (ob.owner === battlefield.playerFaction) {
              bg = 'bg-red-950/80 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
            } else if (ob.owner === battlefield.enemyFaction) {
              bg = 'bg-blue-950/80 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]';
            }

            return (
              <div
                key={ob.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-mono font-bold tracking-wider ${bg}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 12l8 10 8-10L12 2zm0 4.5l4.5 5.5-4.5 6-4.5-6L12 6.5z" />
                </svg>
                <span>OBELISK {letter}</span>
                {Math.abs(ob.captureProgress) > 0 && Math.abs(ob.captureProgress) < 100 && (
                  <span className="text-[10px] text-amber-200">
                    {Math.round(Math.abs(ob.captureProgress))}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* 2. CENTER RETICLE & BUILD INSTRUCTION */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center">
        <svg className="w-8 h-8 opacity-75 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="3" fill="none" stroke="#f8fafc" strokeWidth="1.5" />
          <line x1="16" y1="5" x2="16" y2="10" stroke="#f8fafc" strokeWidth="1.5" />
          <line x1="16" y1="22" x2="16" y2="27" stroke="#f8fafc" strokeWidth="1.5" />
          <line x1="5" y1="16" x2="10" y2="16" stroke="#f8fafc" strokeWidth="1.5" />
          <line x1="22" y1="16" x2="27" y2="16" stroke="#f8fafc" strokeWidth="1.5" />
        </svg>

        {isBuildingMode && (
          <div className="mt-4 px-3 py-1.5 rounded bg-black/85 border border-emerald-400 text-emerald-300 font-mono text-xs font-bold tracking-wide shadow-lg">
            AIM AT GROUND · LEFT-CLICK OR [ENTER] TO CONSTRUCT · [ESC] CANCEL
          </div>
        )}
      </div>

      {/* 3. TOP RIGHT CONTROLS: Build Menu [B], Tech Tree [T], Map [M], Mute, Pause */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex items-center gap-2">
        <button
          onClick={onOpenBuildMenu}
          className="px-2.5 py-1.5 rounded bg-black/70 hover:bg-black/90 border border-amber-500/40 text-xs font-mono font-medium text-amber-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Open Military Base Building [B]"
        >
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
          </svg>
          <span className="hidden sm:inline">BUILD [B]</span>
        </button>

        <button
          onClick={onOpenTechTree}
          className="px-2.5 py-1.5 rounded bg-black/70 hover:bg-black/90 border border-cyan-500/40 text-xs font-mono font-medium text-cyan-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Open Army Technology Tree [T]"
        >
          <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="hidden sm:inline">TECH [T] ({researchedCount})</span>
        </button>

        <button
          onClick={onToggleMap}
          className="px-2.5 py-1.5 rounded bg-black/70 hover:bg-black/90 border border-white/20 text-xs font-mono font-medium text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          title="Toggle Tactical Map [M / Tab]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span className="hidden sm:inline">MAP [M]</span>
        </button>

        <button
          onClick={onToggleMute}
          className="p-1.5 rounded bg-black/70 hover:bg-black/90 border border-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Toggle Audio [U]"
        >
          {isMuted ? (
            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

        <button
          onClick={onPause}
          className="p-1.5 rounded bg-black/70 hover:bg-black/90 border border-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Pause [Esc / P]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>
      </div>

      {/* 4. BOTTOM CLUSTERS: Health, Energy, Orders, Deployments, Unique Army Ability */}
      <div className="w-full flex flex-col md:flex-row items-end justify-between gap-4">
        {/* Bottom Left: Commander Health & Energy */}
        <div className="flex flex-col gap-2 min-w-[220px]">
          {/* Health Bar */}
          <div className="bg-black/75 border border-white/15 rounded-lg p-2.5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono font-semibold mb-1">
              <span className="text-red-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 fill-red-500" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                COMMANDER HP
              </span>
              <span className="tabular-nums font-mono text-zinc-200">
                {Math.round(playerHp)} / {maxPlayerHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-red-900/40">
              <div
                className={`h-full transition-all duration-200 ${
                  hpRatio > 0.5 ? 'bg-red-500' : hpRatio > 0.25 ? 'bg-amber-500' : 'bg-red-600 animate-pulse'
                }`}
                style={{ width: `${hpRatio * 100}%` }}
              />
            </div>
          </div>

          {/* Xenonite Energy */}
          <div className="bg-black/75 border border-white/15 rounded-lg p-2.5 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-400">
              <svg className="w-3.5 h-3.5 fill-cyan-400" viewBox="0 0 24 24">
                <path d="M12 2L4 8l8 12 8-12-8-6zm0 3.5l4.8 3.6L12 16.3 7.2 9.1 12 5.5z" />
              </svg>
              <span>XENONITE ENERGY</span>
            </div>
            <div className="font-mono text-sm font-bold text-cyan-300 tabular-nums">
              {Math.floor(battlefield.playerEnergy)}
              <span className="text-[10px] text-zinc-400 font-normal"> / 250</span>
            </div>
          </div>

          {/* Active Army Ability / Buff Banner */}
          {battlefield.isPhalanxActive && (
            <div className="bg-red-950/90 border border-amber-400 text-amber-300 text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center justify-between animate-pulse">
              <span>PHALANX WALL ACTIVE (+75% DEF)</span>
              <span>{battlefield.abilityActiveTimer.toFixed(1)}s</span>
            </div>
          )}

          {battlefield.isChargeActive && (
            <div className="bg-sky-950/90 border border-sky-400 text-sky-200 text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center justify-between animate-pulse">
              <span>HOPLITE CHARGE (+50% SPD · 2X ATK)</span>
              <span>{battlefield.abilityActiveTimer.toFixed(1)}s</span>
            </div>
          )}

          {rallyActive && (
            <div className="bg-amber-950/80 border border-amber-500 text-amber-300 text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center justify-between animate-pulse">
              <span>WAR HORN BUFF</span>
              <span>{rallyTimer.toFixed(1)}s</span>
            </div>
          )}
        </div>

        {/* Bottom Center: Squad Orders, Deployments & Army Ability */}
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          {/* Unique Army Ability Trigger Bar */}
          {ability && (
            <div className="flex items-center gap-2 bg-black/85 border border-amber-400/50 px-3 py-1.5 rounded-lg shadow-2xl">
              <button
                disabled={!canUseAbility}
                onClick={onTriggerAbility}
                className={`px-3 py-1 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  canUseAbility
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)] transform hover:scale-105'
                    : 'bg-zinc-800 text-zinc-400 border border-white/10 cursor-not-allowed'
                }`}
              >
                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-black/30">[F]</span>
                <span>{ability.name} ({ability.energyCost} XN)</span>
              </button>

              {battlefield.abilityCooldown > 0 && (
                <span className="text-[11px] font-mono text-zinc-400">
                  CD: {battlefield.abilityCooldown.toFixed(1)}s
                </span>
              )}
            </div>
          )}

          {/* Squad Formations Row */}
          <div className="flex items-center gap-1.5 bg-black/80 border border-white/20 p-1.5 rounded-lg shadow-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 font-semibold">
              ORDERS:
            </span>
            {(['charge', 'phalanx', 'follow', 'defend'] as SquadOrder[]).map((order, idx) => {
              const isActive = battlefield.currentOrder === order;
              return (
                <button
                  key={order}
                  onClick={() => onSelectOrder(order)}
                  className={`px-3 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/10'
                  }`}
                >
                  <span className="text-[10px] opacity-75 font-mono">[{idx + 1}]</span>
                  <span>{order}</span>
                </button>
              );
            })}
          </div>

          {/* Reinforcements Deploy Row */}
          <div className="flex items-center gap-1.5 bg-black/80 border border-white/20 p-1.5 rounded-lg shadow-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 font-semibold">
              TRAIN:
            </span>
            <button
              onClick={() => onDeploy('infantry')}
              disabled={battlefield.playerEnergy < 40}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-mono text-zinc-200 border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="text-[10px] text-amber-400 font-bold">[Z]</span>
              <span>Infantry (40)</span>
            </button>

            <button
              onClick={() => onDeploy('ranged')}
              disabled={battlefield.playerEnergy < 50}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-mono text-zinc-200 border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="text-[10px] text-amber-400 font-bold">[X]</span>
              <span>Skirmisher (50)</span>
            </button>

            <button
              onClick={() => onDeploy('elite')}
              disabled={battlefield.playerEnergy < 85}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-mono text-zinc-200 border border-white/10 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="text-[10px] text-amber-400 font-bold">[C]</span>
              <span>Champion (85)</span>
            </button>

            <button
              onClick={onRally}
              disabled={battlefield.playerEnergy < 30 || rallyActive}
              className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800/80 disabled:opacity-40 text-xs font-mono text-amber-300 border border-amber-600/40 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="text-[10px] text-amber-300 font-bold">[Q]</span>
              <span>War Horn (30)</span>
            </button>
          </div>
        </div>

        {/* Bottom Right: Tactical Radar & Base Structures Summary */}
        <div className="bg-black/75 border border-white/15 rounded-lg p-3 shadow-lg flex flex-col items-center">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 mb-1">
            SECTOR RADAR
          </div>
          <div className="w-20 h-20 rounded-full border border-white/20 relative flex items-center justify-center bg-zinc-950/80">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-white/10" />
              <div className="h-full w-px bg-white/10" />
            </div>
            <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-400" style={{ left: '20%', top: '50%' }} />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-purple-400" style={{ left: '50%', top: '50%' }} />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ left: '80%', top: '50%' }} />
          </div>

          <div className="text-[9px] font-mono text-zinc-400 mt-1">
            BASES: {buildings.filter((b) => b.faction === battlefield.playerFaction).length}
          </div>
        </div>
      </div>
    </div>
  );
};
