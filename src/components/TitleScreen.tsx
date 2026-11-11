/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FactionId } from '../types/game';
import { FACTIONS } from '../game/rules';

interface TitleScreenProps {
  onStartGame: (chosenFaction: FactionId, enemyFaction: FactionId) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const [selectedFaction, setSelectedFaction] = useState<FactionId>('spartans');

  const factionList: FactionId[] = ['spartans', 'romans', 'greeks'];
  const currentFaction = FACTIONS[selectedFaction];

  // Pick opposite faction for battle
  const getEnemyFaction = (player: FactionId): FactionId => {
    if (player === 'spartans') return 'romans';
    if (player === 'romans') return 'greeks';
    return 'spartans';
  };

  const handleStart = () => {
    const enemy = getEnemyFaction(selectedFaction);
    onStartGame(selectedFaction, enemy);
  };

  return (
    <div className="fixed inset-0 z-30 bg-zinc-950 text-white flex flex-col justify-between p-6 md:p-12 select-none overflow-y-auto">
      {/* Background Alien Dust Gradient with negative space */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0c1e] via-[#100714] to-[#0a040d] -z-10" />

      {/* 1. Bespoke Inline SVG Title Lockup */}
      <header className="w-full max-w-4xl mx-auto flex flex-col items-center text-center mt-4 md:mt-8">
        <div className="flex items-center gap-3 mb-2">
          {/* Emblem Icon */}
          <svg className="w-10 h-10 text-amber-500" viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 30,26 2,26" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="16" cy="18" r="4" fill="currentColor" />
            <line x1="16" y1="6" x2="16" y2="12" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-amber-400/90">
            WAR ON AN ALIEN WORLD
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight font-serif uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-amber-500 drop-shadow-[0_4px_16px_rgba(245,158,11,0.2)]">
          ARES IX: ALIEN FRONTLINE
        </h1>
        <p className="mt-2 text-sm md:text-base text-zinc-400 font-mono max-w-xl">
          Lead legendary ancient legions resurrected on a desolate alien planet.
          Capture power obelisks and command your squad in visceral first-person warfare.
        </p>
      </header>

      {/* 2. Faction Selection Showcase */}
      <main className="w-full max-w-5xl mx-auto my-6 flex flex-col items-center">
        <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase mb-4">
          SELECT YOUR ARMY COMMAND
        </h2>

        {/* Faction Cards Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          {factionList.map((fId) => {
            const f = FACTIONS[fId];
            const isSelected = selectedFaction === fId;

            return (
              <button
                key={fId}
                onClick={() => setSelectedFaction(fId)}
                className={`text-left p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-zinc-900/90 shadow-[0_0_25px_rgba(251,191,36,0.25)] scale-[1.02]'
                    : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                {/* Accent Top Strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: f.themeColor }}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${f.themeColor}33`, color: f.accentColor }}
                    >
                      {fId}
                    </span>
                    {/* Shield Emblem Icon */}
                    <div className="w-6 h-6 flex items-center justify-center text-amber-300">
                      {f.shieldIcon === 'lambda' && (
                        <span className="font-serif font-black text-lg">Λ</span>
                      )}
                      {f.shieldIcon === 'eagle' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" />
                        </svg>
                      )}
                      {f.shieldIcon === 'owl' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="9" cy="10" r="2" fill="#000" />
                          <circle cx="15" cy="10" r="2" fill="#000" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold font-serif text-white">{f.name}</h3>
                  <div className="text-xs italic text-amber-200/80 mb-3">{f.motto}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">{f.description}</p>
                </div>

                {/* Stat Buffs */}
                <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>DEFENSE:</span>
                    <span className="text-zinc-200 font-bold">
                      {Math.round(f.buffs.defense * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ATTACK:</span>
                    <span className="text-zinc-200 font-bold">
                      {Math.round(f.buffs.attack * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>SPEED / CAPTURE:</span>
                    <span className="text-zinc-200 font-bold">
                      {Math.round(f.buffs.captureSpeed * 100)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Primary Start CTA Button */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            data-start="true"
            onClick={handleStart}
            className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-serif font-black text-lg md:text-xl tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all cursor-pointer transform hover:scale-105 active:scale-95"
          >
            ENTER PLANETARY WAR [SPACE / ENTER]
          </button>
          <div className="text-[11px] font-mono text-zinc-400">
            Opposing Force: <span className="text-rose-400 font-bold">{FACTIONS[getEnemyFaction(selectedFaction)].name}</span>
          </div>
        </div>
      </main>

      {/* 3. Single Flat Control Hint Line */}
      <footer className="w-full max-w-4xl mx-auto text-center border-t border-white/10 pt-4">
        <p className="text-xs font-mono text-zinc-400 tracking-wide">
          WASD Move · Click Strike · Shift / R-Click Block · 1-4 Squad Orders · M Tactical Map · Esc Pause
        </p>
      </footer>
    </div>
  );
};
