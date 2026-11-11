/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BattlefieldState } from '../types/game';
import { FACTIONS } from '../game/rules';

interface StatusModalProps {
  status: 'paused' | 'victory' | 'defeat';
  battlefield: BattlefieldState;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  status,
  battlefield,
  onResume,
  onRestart,
  onReturnToTitle,
}) => {
  const pFaction = FACTIONS[battlefield.playerFaction];
  const isVictory = status === 'victory';
  const isDefeat = status === 'defeat';
  const isPaused = status === 'paused';

  const timeFormatted = `${Math.floor(battlefield.gameTime / 60)}m ${Math.floor(battlefield.gameTime % 60)}s`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Status Emblem / Icon */}
        <div className="mb-3">
          {isVictory && (
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          )}
          {isDefeat && (
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          )}
          {isPaused && (
            <div className="w-16 h-16 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-zinc-300">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black font-serif uppercase tracking-tight text-white mb-1">
          {isVictory && 'PLANETARY VICTORY'}
          {isDefeat && 'TACTICAL DEFEAT'}
          {isPaused && 'TACTICAL PAUSE'}
        </h2>

        <p className="text-sm font-mono text-zinc-400 mb-6">
          {isVictory && `${pFaction.name} controls the alien obelisks. The enemy forces have routed.`}
          {isDefeat && 'Your legion was overwhelmed or your commander fell in combat.'}
          {isPaused && 'Combat paused. Review tactical status or adjust settings.'}
        </p>

        {/* Metrics Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 text-left">
          <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase">BATTLE DURATION</div>
            <div className="text-base font-bold text-white tabular-nums">{timeFormatted}</div>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase">ENEMIES FELLED</div>
            <div className="text-base font-bold text-emerald-400 tabular-nums">
              {battlefield.stats.enemiesKilled}
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase">ALLIES FALLEN</div>
            <div className="text-base font-bold text-rose-400 tabular-nums">
              {battlefield.stats.alliesLost}
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase">OBELISKS CONQUERED</div>
            <div className="text-base font-bold text-cyan-400 tabular-nums">
              {battlefield.stats.obelisksCaptured}
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase">DAMAGE DEALT</div>
            <div className="text-base font-bold text-amber-400 tabular-nums">
              {battlefield.stats.damageDealt}
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 font-mono">
            <div className="text-[10px] text-zinc-400 uppercase">REINFORCEMENT TICKETS</div>
            <div className="text-base font-bold text-zinc-200 tabular-nums">
              {Math.round(battlefield.playerTickets)} / {battlefield.maxTickets}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          {isPaused ? (
            <>
              <button
                onClick={onResume}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-sm tracking-wide uppercase transition-colors cursor-pointer"
              >
                RESUME [ESC / P]
              </button>
              <button
                onClick={onRestart}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-sm tracking-wide uppercase border border-white/20 transition-colors cursor-pointer"
              >
                RESTART
              </button>
              <button
                onClick={onReturnToTitle}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-sm tracking-wide uppercase border border-white/10 transition-colors cursor-pointer"
              >
                FACTION SELECT
              </button>
            </>
          ) : (
            <>
              <button
                data-start="true"
                onClick={onRestart}
                className="w-full sm:w-auto px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold font-serif text-base tracking-wide uppercase shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={onReturnToTitle}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-sm tracking-wide uppercase border border-white/20 transition-colors cursor-pointer"
              >
                CHANGE FACTION
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
