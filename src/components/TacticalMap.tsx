/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BattlefieldState, ObeliskState, UnitState } from '../types/game';
import { FACTIONS } from '../game/rules';

interface TacticalMapProps {
  battlefield: BattlefieldState;
  obelisks: ObeliskState[];
  units: UnitState[];
  playerPos: { x: number; z: number; yaw: number };
  onClose: () => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  battlefield,
  obelisks,
  units,
  playerPos,
  onClose,
}) => {
  // Map dimensions: -100 to +100 world units mapped to 0 to 400 SVG pixels
  const mapSize = 400;
  const worldRadius = 100;

  const toMapCoord = (wx: number, wz: number) => {
    const x = ((wx + worldRadius) / (worldRadius * 2)) * mapSize;
    const y = ((wz + worldRadius) / (worldRadius * 2)) * mapSize;
    return { x, y };
  };

  const pCoord = toMapCoord(playerPos.x, playerPos.z);
  const pFaction = FACTIONS[battlefield.playerFaction];
  const eFaction = FACTIONS[battlefield.enemyFaction];

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-cyan-500/40 rounded-xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex flex-col gap-4 font-mono text-cyan-400">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="2" x2="12" y2="22" />
            </svg>
            <h2 className="text-lg font-bold tracking-widest text-white uppercase">
              ORBITAL SATELLITE TACTICAL SCAN
            </h2>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-white border border-white/20 transition-colors cursor-pointer"
          >
            CLOSE [M / ESC]
          </button>
        </div>

        {/* Tactical Map Display */}
        <div className="relative w-full aspect-square max-w-[420px] mx-auto bg-black rounded-lg border border-cyan-500/30 overflow-hidden flex items-center justify-center">
          {/* Scanning line animation */}
          <div className="absolute inset-0 bg-radial from-cyan-950/20 to-black pointer-events-none" />

          <svg viewBox={`0 0 ${mapSize} ${mapSize}`} className="w-full h-full">
            {/* Grid Lines */}
            {[-60, -30, 0, 30, 60].map((v) => {
              const c = toMapCoord(v, 0).x;
              return (
                <g key={v}>
                  <line x1={c} y1={0} x2={c} y2={mapSize} stroke="#0e7490" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
                  <line x1={0} y1={c} x2={mapSize} y2={c} stroke="#0e7490" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
                </g>
              );
            })}

            {/* Range Rings */}
            <circle cx={mapSize / 2} cy={mapSize / 2} r={mapSize * 0.25} fill="none" stroke="#0e7490" strokeWidth="0.8" opacity="0.35" />
            <circle cx={mapSize / 2} cy={mapSize / 2} r={mapSize * 0.45} fill="none" stroke="#0e7490" strokeWidth="0.8" opacity="0.35" />

            {/* Obelisks */}
            {obelisks.map((ob, idx) => {
              const oc = toMapCoord(ob.x, ob.z);
              let obColor = '#a855f7'; // neutral
              if (ob.owner === battlefield.playerFaction) obColor = pFaction?.themeColor || '#dc2626';
              else if (ob.owner === battlefield.enemyFaction) obColor = eFaction?.themeColor || '#0284c7';

              return (
                <g key={ob.id}>
                  {/* Capture Radius */}
                  <circle cx={oc.x} cy={oc.y} r={32} fill={obColor} fillOpacity="0.12" stroke={obColor} strokeWidth="1" strokeDasharray="4 2" />
                  {/* Obelisk Center Marker */}
                  <polygon
                    points={`${oc.x},${oc.y - 8} ${oc.x + 7},${oc.y + 6} ${oc.x - 7},${oc.y + 6}`}
                    fill={obColor}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x={oc.x}
                    y={oc.y + 18}
                    fill="#ffffff"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    NODE {String.fromCharCode(65 + idx)}
                  </text>
                </g>
              );
            })}

            {/* Units */}
            {units.map((u) => {
              if (u.state === 'dead') return null;
              const uc = toMapCoord(u.x, u.z);
              const isPlayerSide = u.faction === battlefield.playerFaction;
              return (
                <circle
                  key={u.id}
                  cx={uc.x}
                  cy={uc.y}
                  r={isPlayerSide ? 3.5 : 3.5}
                  fill={isPlayerSide ? '#38bdf8' : '#ef4444'}
                  stroke="#000000"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Commander Marker */}
            <g transform={`translate(${pCoord.x}, ${pCoord.y}) rotate(${(-playerPos.yaw * 180) / Math.PI + 180})`}>
              <polygon points="0,-8 -5,6 0,3 5,6" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs border-t border-cyan-500/20 pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-300">Commander</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="text-zinc-300">Allies ({units.filter(u => u.faction === battlefield.playerFaction && u.state !== 'dead').length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-zinc-300">Enemies ({units.filter(u => u.faction === battlefield.enemyFaction && u.state !== 'dead').length})</span>
            </div>
          </div>

          <div className="text-zinc-400 text-[11px]">
            ACTIVE ORDER: <span className="text-amber-400 font-bold uppercase">{battlefield.currentOrder}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
