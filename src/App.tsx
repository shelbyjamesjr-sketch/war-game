/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BattleSimulation, SimulationInput } from './game/battleSimulation';
import { BattlefieldState, FactionId, SquadOrder, BuildingType } from './types/game';
import { HUD } from './components/HUD';
import { TacticalMap } from './components/TacticalMap';
import { TitleScreen } from './components/TitleScreen';
import { StatusModal } from './components/StatusModal';
import { BuildMenu } from './components/BuildMenu';
import { TechTreeModal } from './components/TechTreeModal';
import { soundManager } from './audio/soundManager';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<BattleSimulation | null>(null);

  // App State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'victory' | 'defeat'>('title');
  const [playerFaction, setPlayerFaction] = useState<FactionId>('spartans');
  const [enemyFaction, setEnemyFaction] = useState<FactionId>('romans');
  const [showMap, setShowMap] = useState(false);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showTechTree, setShowTechTree] = useState(false);
  const [isBuildingMode, setIsBuildingMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // HUD state mirrored from simulation
  const [battlefield, setBattlefield] = useState<BattlefieldState | null>(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [maxPlayerHp, setMaxPlayerHp] = useState(100);
  const [rallyActive, setRallyActive] = useState(false);
  const [rallyTimer, setRallyTimer] = useState(0);

  // Input tracking refs to avoid React re-renders in 60fps loop
  const inputRef = useRef<SimulationInput>({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    sprint: false,
    attackJustPressed: false,
    blockHeld: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  });

  const isMouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const bodyState = gameState === 'victory' || gameState === 'defeat' ? 'gameover' : gameState;
    document.body.dataset.state = bodyState;
  }, [gameState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startGame('spartans', 'romans');
    }
  }, []);

  const initSimulation = useCallback((pFac: FactionId, eFac: FactionId) => {
    if (simRef.current) {
      simRef.current.dispose();
      simRef.current = null;
    }

    if (!canvasMountRef.current) return;

    while (canvasMountRef.current.firstChild) {
      canvasMountRef.current.removeChild(canvasMountRef.current.firstChild);
    }

    const sim = new BattleSimulation(
      canvasMountRef.current,
      pFac,
      eFac,
      (state) => {
        setBattlefield(state);
        if (state.gameStatus !== 'playing') {
          setGameState(state.gameStatus);
        }
      }
    );

    simRef.current = sim;
    setBattlefield(sim.battlefield);
    setPlayerHp(sim.player.hp);
    setMaxPlayerHp(sim.player.maxHp);
  }, []);

  const startGame = useCallback((chosenFaction: FactionId, oppFaction: FactionId) => {
    setPlayerFaction(chosenFaction);
    setEnemyFaction(oppFaction);
    setGameState('playing');
    setShowMap(false);
    setShowBuildMenu(false);
    setShowTechTree(false);
    setIsBuildingMode(false);
    initSimulation(chosenFaction, oppFaction);

    setTimeout(() => {
      canvasMountRef.current?.querySelector('canvas')?.requestPointerLock?.();
    }, 100);
  }, [initSimulation]);

  const handleRestart = useCallback(() => {
    startGame(playerFaction, enemyFaction);
  }, [startGame, playerFaction, enemyFaction]);

  const handleReturnToTitle = useCallback(() => {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    if (simRef.current) {
      simRef.current.dispose();
      simRef.current = null;
    }
    setGameState('title');
    setShowMap(false);
    setShowBuildMenu(false);
    setShowTechTree(false);
    setIsBuildingMode(false);
  }, []);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let frameId = 0;
    let lastT = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastT) / 1000;
      lastT = time;

      if (simRef.current && gameState === 'playing') {
        const input = inputRef.current;
        simRef.current.step(dt, input);
        simRef.current.render();

        setPlayerHp(simRef.current.player.hp);
        setRallyActive(simRef.current.player.rallyActive);
        setRallyTimer(simRef.current.player.rallyTimer);
        setIsBuildingMode(!!simRef.current.pendingBuildingType);

        input.attackJustPressed = false;
        input.lookDeltaX = 0;
        input.lookDeltaY = 0;
        input.orderRequested = undefined;
        input.deployRequested = undefined;
        input.abilityRequested = undefined;
        input.rallyRequested = undefined;
        input.confirmBuildRequested = undefined;
        input.cancelBuildRequested = undefined;
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [gameState]);

  useEffect(() => {
    const handleResize = () => {
      if (simRef.current && canvasMountRef.current) {
        simRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Input Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGame(playerFaction, enemyFaction);
        }
        return;
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.moveForward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.moveBackward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.moveLeft = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.moveRight = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        inputRef.current.sprint = true;
        inputRef.current.blockHeld = true;
      }

      // Squad orders hotkeys [1, 2, 3, 4]
      if (e.code === 'Digit1') inputRef.current.orderRequested = 'charge';
      if (e.code === 'Digit2') inputRef.current.orderRequested = 'phalanx';
      if (e.code === 'Digit3') inputRef.current.orderRequested = 'follow';
      if (e.code === 'Digit4') inputRef.current.orderRequested = 'defend';

      // Deploy hotkeys [Z, X, C, Q]
      if (e.code === 'KeyZ') inputRef.current.deployRequested = 'infantry';
      if (e.code === 'KeyX') inputRef.current.deployRequested = 'ranged';
      if (e.code === 'KeyC') inputRef.current.deployRequested = 'elite';
      if (e.code === 'KeyQ') inputRef.current.rallyRequested = true;

      // Unique Army Ability hotkey [F]
      if (e.code === 'KeyF') {
        inputRef.current.abilityRequested = true;
      }

      // Build Menu toggle [B]
      if (e.code === 'KeyB') {
        if (simRef.current?.pendingBuildingType) {
          // If in placement mode, pressing B cancels
          inputRef.current.cancelBuildRequested = true;
        } else {
          setShowBuildMenu((prev) => !prev);
          if (document.pointerLockElement) document.exitPointerLock?.();
        }
      }

      // Tech Tree toggle [T]
      if (e.code === 'KeyT') {
        setShowTechTree((prev) => !prev);
        if (document.pointerLockElement) document.exitPointerLock?.();
      }

      // Map toggle [M or Tab]
      if (e.code === 'KeyM' || e.code === 'Tab') {
        e.preventDefault();
        setShowMap((prev) => !prev);
        if (document.pointerLockElement) document.exitPointerLock?.();
      }

      // Enter key confirms placement if in building mode
      if (e.code === 'Enter' && simRef.current?.pendingBuildingType) {
        inputRef.current.confirmBuildRequested = true;
      }

      // Mute toggle
      if (e.code === 'KeyU') {
        const muted = soundManager.toggleMute();
        setIsMuted(muted);
      }

      // Pause toggle [Esc / P]
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (showBuildMenu) {
          setShowBuildMenu(false);
          return;
        }
        if (showTechTree) {
          setShowTechTree(false);
          return;
        }
        if (showMap) {
          setShowMap(false);
          return;
        }
        if (simRef.current?.pendingBuildingType) {
          inputRef.current.cancelBuildRequested = true;
          return;
        }

        if (gameState === 'playing') {
          setGameState('paused');
          document.exitPointerLock?.();
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.moveForward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.moveBackward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.moveLeft = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.moveRight = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        inputRef.current.sprint = false;
        inputRef.current.blockHeld = false;
      }
    };

    const onBlur = () => {
      inputRef.current.moveForward = false;
      inputRef.current.moveBackward = false;
      inputRef.current.moveLeft = false;
      inputRef.current.moveRight = false;
      inputRef.current.sprint = false;
      inputRef.current.blockHeld = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;

      if (document.pointerLockElement) {
        inputRef.current.lookDeltaX += e.movementX;
        inputRef.current.lookDeltaY += e.movementY;
      } else if (isMouseDown.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        inputRef.current.lookDeltaX += dx * 1.5;
        inputRef.current.lookDeltaY += dy * 1.5;
      }
    };

    const onMouseDownEvt = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      isMouseDown.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      if (!document.pointerLockElement && (e.target as HTMLElement).tagName === 'CANVAS') {
        canvasMountRef.current?.querySelector('canvas')?.requestPointerLock?.();
      }

      if (e.button === 0) {
        if (simRef.current?.pendingBuildingType) {
          // Left click in building mode places structure!
          inputRef.current.confirmBuildRequested = true;
        } else {
          inputRef.current.attackJustPressed = true;
        }
      } else if (e.button === 2) {
        inputRef.current.blockHeld = true;
      }
    };

    const onMouseUpEvt = (e: MouseEvent) => {
      isMouseDown.current = false;
      if (e.button === 2) {
        inputRef.current.blockHeld = false;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDownEvt);
    window.addEventListener('mouseup', onMouseUpEvt);
    window.addEventListener('contextmenu', onContextMenu);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDownEvt);
      window.removeEventListener('mouseup', onMouseUpEvt);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gameState, playerFaction, enemyFaction, startGame, showBuildMenu, showTechTree, showMap]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none">
      <div
        ref={canvasMountRef}
        data-testid="webgl-canvas"
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {gameState === 'title' && (
        <TitleScreen onStartGame={startGame} />
      )}

      {gameState === 'playing' && battlefield && (
        <HUD
          battlefield={battlefield}
          obelisks={simRef.current?.obelisks || []}
          buildings={simRef.current?.buildings || []}
          techs={simRef.current?.playerTechs || []}
          playerHp={playerHp}
          maxPlayerHp={maxPlayerHp}
          rallyActive={rallyActive}
          rallyTimer={rallyTimer}
          isBuildingMode={isBuildingMode}
          isMuted={isMuted}
          onToggleMute={() => {
            const m = soundManager.toggleMute();
            setIsMuted(m);
          }}
          onSelectOrder={(order) => {
            simRef.current?.setSquadOrder(order);
          }}
          onDeploy={(type) => {
            simRef.current?.requestReinforcement(type);
          }}
          onTriggerAbility={() => {
            simRef.current?.triggerArmyAbility();
          }}
          onRally={() => {
            simRef.current?.triggerRally();
          }}
          onOpenBuildMenu={() => setShowBuildMenu(true)}
          onOpenTechTree={() => setShowTechTree(true)}
          onToggleMap={() => setShowMap((prev) => !prev)}
          onPause={() => {
            setGameState('paused');
            document.exitPointerLock?.();
          }}
        />
      )}

      {/* Military Field Engineering Build Menu [B] */}
      {showBuildMenu && battlefield && (
        <BuildMenu
          playerFaction={playerFaction}
          playerEnergy={battlefield.playerEnergy}
          buildings={simRef.current?.buildings || []}
          onSelectBuildingToConstruct={(type: BuildingType) => {
            simRef.current?.setBuildingToConstruct(type);
            setShowBuildMenu(false);
            canvasMountRef.current?.querySelector('canvas')?.requestPointerLock?.();
          }}
          onClose={() => setShowBuildMenu(false)}
        />
      )}

      {/* Army Technology Tree Modal [T] */}
      {showTechTree && battlefield && simRef.current && (
        <TechTreeModal
          playerFaction={playerFaction}
          playerEnergy={battlefield.playerEnergy}
          techs={simRef.current.playerTechs}
          onStartResearch={(techId) => {
            simRef.current?.startTechResearch(techId);
          }}
          onClose={() => setShowTechTree(false)}
        />
      )}

      {/* Orbital Satellite Tactical Map Overlay [M / Tab] */}
      {showMap && battlefield && simRef.current && (
        <TacticalMap
          battlefield={battlefield}
          obelisks={simRef.current.obelisks}
          units={simRef.current.units}
          playerPos={{
            x: simRef.current.player.x,
            z: simRef.current.player.z,
            yaw: simRef.current.player.yaw,
          }}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Status Modal (Pause, Victory, Defeat) */}
      {(gameState === 'paused' || gameState === 'victory' || gameState === 'defeat') && battlefield && (
        <StatusModal
          status={gameState}
          battlefield={battlefield}
          onResume={() => {
            setGameState('playing');
            canvasMountRef.current?.querySelector('canvas')?.requestPointerLock?.();
          }}
          onRestart={handleRestart}
          onReturnToTitle={handleReturnToTitle}
        />
      )}
    </div>
  );
}
