/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  FactionId,
  SquadOrder,
  UnitState,
  ObeliskState,
  BattlefieldState,
  BuildingType,
  BuildingState,
  TechNode,
  Projectile,
} from '../types/game';
import {
  FACTIONS,
  calculateDamage,
  updateObeliskCapture,
  calculateTicketDecay,
  checkBattleOutcome,
  getFormationOffset,
  OBELISK_CAPTURE_RADIUS,
  REINFORCEMENT_COSTS,
} from './rules';
import { TECH_TREES, canResearchTech, getTechMultiplier } from './techTree';
import { BUILDING_CONFIGS, canConstructBuilding, createBuildingState } from './baseBuilding';
import { soundManager } from '../audio/soundManager';
import { getTerrainHeight, createAlienWorld, AlienWorld } from '../rendering/alienTerrain';
import { createWarriorMesh, UnitMeshContainer } from '../rendering/unitModels';
import { createBuildingMesh, BuildingMeshContainer, createSiegeEngineMesh } from '../rendering/buildingModels';
import { createCommanderViewModel, WeaponViewModel } from '../rendering/weapons';

export interface SimulationInput {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  sprint: boolean;
  attackJustPressed: boolean;
  blockHeld: boolean;
  orderRequested?: SquadOrder;
  deployRequested?: 'infantry' | 'ranged' | 'elite';
  abilityRequested?: boolean;
  rallyRequested?: boolean;
  confirmBuildRequested?: boolean;
  cancelBuildRequested?: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

export class BattleSimulation {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;

  // World objects
  private alienWorld!: AlienWorld;
  private viewModel!: WeaponViewModel;
  private unitMeshes = new Map<string, UnitMeshContainer>();
  private buildingMeshes = new Map<string, BuildingMeshContainer>();
  private siegeMeshes = new Map<string, THREE.Group>();

  // Particle pool
  private particleGroup = new THREE.Group();
  private particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

  // Projectiles
  public projectiles: Projectile[] = [];
  private projectileMeshes = new Map<string, THREE.Mesh>();

  // Build Preview
  private buildPreviewGroup = new THREE.Group();
  private buildPreviewRing: THREE.Mesh;
  public pendingBuildingType: BuildingType | null = null;

  // Game state
  public battlefield: BattlefieldState;
  public obelisks: ObeliskState[] = [];
  public units: UnitState[] = [];
  public buildings: BuildingState[] = [];
  public playerTechs: TechNode[] = [];
  public enemyTechs: TechNode[] = [];

  // Player state
  public player = {
    x: 0,
    z: 45,
    y: 0,
    vx: 0,
    vz: 0,
    yaw: 0,
    pitch: 0,
    hp: 100,
    maxHp: 100,
    isAttacking: false,
    attackProgress: 0,
    attackCooldown: 0,
    isBlocking: false,
    trauma: 0,
    rallyActive: false,
    rallyTimer: 0,
  };

  // Enemy Commander state
  private enemyCommander = {
    x: 0,
    z: -45,
    y: 0,
    hp: 120,
    maxHp: 120,
  };

  private hitstopTimer = 0;
  private onStateChange: (state: BattlefieldState) => void;

  constructor(
    canvasContainer: HTMLElement,
    playerFaction: FactionId,
    enemyFaction: FactionId,
    onStateChange: (state: BattlefieldState) => void
  ) {
    this.onStateChange = onStateChange;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 350);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    canvasContainer.appendChild(this.renderer.domElement);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    sunLight.position.set(45, 60, 35);
    sunLight.castShadow = !this.isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 180;
    const d = 55;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1022, 1.2);
    this.scene.add(hemiLight);

    this.obelisks = [
      { id: 'alpha', name: 'Obelisk Alpha (North Ridge)', x: -38, z: 0, owner: 'neutral', captureProgress: 0, capturingFaction: null, captureRate: 1, beaconHeight: 25 },
      { id: 'beta', name: 'Obelisk Beta (Core Crater)', x: 0, z: 0, owner: 'neutral', captureProgress: 0, capturingFaction: null, captureRate: 1, beaconHeight: 30 },
      { id: 'gamma', name: 'Obelisk Gamma (South Plateau)', x: 38, z: 0, owner: 'neutral', captureProgress: 0, capturingFaction: null, captureRate: 1, beaconHeight: 25 },
    ];

    this.alienWorld = createAlienWorld({ scene: this.scene, obelisks: this.obelisks });

    this.viewModel = createCommanderViewModel(playerFaction);
    this.camera.add(this.viewModel.group);
    this.scene.add(this.camera);

    // Particle pool setup
    const pGeom = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let i = 0; i < 70; i++) {
      const p = new THREE.Mesh(pGeom, pMat.clone());
      p.visible = false;
      this.particleGroup.add(p);
      this.particles.push({ mesh: p, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.5 });
    }
    this.scene.add(this.particleGroup);

    // Build Preview Ring setup
    const ringGeom = new THREE.RingGeometry(3.2, 3.6, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.buildPreviewRing = new THREE.Mesh(ringGeom, ringMat);
    this.buildPreviewGroup.add(this.buildPreviewRing);
    this.buildPreviewGroup.visible = false;
    this.scene.add(this.buildPreviewGroup);

    // Tech Trees
    this.playerTechs = TECH_TREES[playerFaction].map((t) => ({ ...t }));
    this.enemyTechs = TECH_TREES[enemyFaction].map((t) => ({ ...t }));

    // Setup Battlefield State
    this.battlefield = {
      playerFaction,
      enemyFaction,
      playerTickets: 250,
      enemyTickets: 250,
      playerEnergy: 120, // Starting capital to build Command Center
      maxTickets: 250,
      gameTime: 0,
      currentOrder: 'follow',
      gameStatus: 'playing',
      abilityCooldown: 0,
      abilityActiveTimer: 0,
      isPhalanxActive: false,
      isChargeActive: false,
      stats: {
        enemiesKilled: 0,
        alliesLost: 0,
        obelisksCaptured: 0,
        buildingsConstructed: 0,
        techsResearched: 0,
        damageDealt: 0,
        damageTaken: 0,
      },
    };

    this.player.y = getTerrainHeight(this.player.x, this.player.z) + 1.7;
    this.camera.position.set(this.player.x, this.player.y, this.player.z);
    this.player.yaw = Math.PI;

    this.spawnInitialArmies();
    soundManager.playWarHorn(playerFaction);
  }

  private spawnInitialArmies() {
    for (let i = 0; i < 5; i++) {
      const type = i % 2 === 0 ? 'infantry' : 'ranged';
      this.spawnUnit(this.battlefield.playerFaction, type, this.player.x + (i - 2) * 2.5, this.player.z + 5);
    }
    for (let i = 0; i < 5; i++) {
      const type = i % 2 === 0 ? 'infantry' : 'ranged';
      this.spawnUnit(this.battlefield.enemyFaction, type, this.enemyCommander.x + (i - 2) * 2.5, this.enemyCommander.z - 5);
    }
  }

  public spawnUnit(faction: FactionId, type: 'infantry' | 'ranged' | 'elite' | 'siege', x: number, z: number): UnitState {
    const id = `unit_${faction}_${Math.random().toString(36).substring(2, 9)}`;
    const isPlayer = faction === this.battlefield.playerFaction;
    const isElite = type === 'elite';
    const isSiege = type === 'siege';

    const hp = isSiege ? 320 : isElite ? 160 : type === 'infantry' ? 100 : 75;
    const attack = isSiege ? 55 : isElite ? 28 : type === 'infantry' ? 18 : 15;

    const unit: UnitState = {
      id,
      faction,
      type,
      x,
      z,
      vx: 0,
      vz: 0,
      rotation: isPlayer ? Math.PI : 0,
      hp,
      maxHp: hp,
      attackPower: attack,
      attackRange: isSiege ? 28 : type === 'ranged' ? 15 : 2.5,
      attackCooldown: isSiege ? 3.5 : type === 'ranged' ? 2.0 : 1.2,
      currentCooldown: Math.random() * 0.8,
      shieldValue: 50,
      isBlocking: false,
      targetId: null,
      state: 'idle',
      deathTimer: 0,
    };

    if (isSiege) {
      const siegeMesh = createSiegeEngineMesh(faction);
      siegeMesh.position.set(x, getTerrainHeight(x, z), z);
      this.scene.add(siegeMesh);
      this.siegeMeshes.set(id, siegeMesh);
    } else {
      const meshContainer = createWarriorMesh(faction, type);
      meshContainer.root.position.set(x, getTerrainHeight(x, z), z);
      this.scene.add(meshContainer.root);
      this.unitMeshes.set(id, meshContainer);
    }

    this.units.push(unit);
    return unit;
  }

  public setBuildingToConstruct(type: BuildingType | null) {
    this.pendingBuildingType = type;
    this.buildPreviewGroup.visible = !!type;
  }

  public confirmBuild(): boolean {
    if (!this.pendingBuildingType) return false;
    const check = canConstructBuilding(
      this.pendingBuildingType,
      this.buildings,
      this.battlefield.playerFaction,
      this.battlefield.playerEnergy
    );

    if (!check.allowed) {
      return false;
    }

    const config = BUILDING_CONFIGS[this.pendingBuildingType];
    this.battlefield.playerEnergy -= config.cost;

    // Place building in front of player
    const fwdX = -Math.sin(this.player.yaw);
    const fwdZ = -Math.cos(this.player.yaw);
    const bx = this.player.x + fwdX * 7.0;
    const bz = this.player.z + fwdZ * 7.0;
    const by = getTerrainHeight(bx, bz);

    const bldState = createBuildingState(this.pendingBuildingType, this.battlefield.playerFaction, bx, bz, by);
    this.buildings.push(bldState);

    // 3D mesh
    const meshContainer = createBuildingMesh(this.pendingBuildingType, this.battlefield.playerFaction);
    meshContainer.root.position.set(bx, by, bz);
    this.scene.add(meshContainer.root);
    this.buildingMeshes.set(bldState.id, meshContainer);

    this.battlefield.stats.buildingsConstructed++;
    soundManager.playOrderIssued();
    this.emitBurst(bx, by + 1.5, bz, 0xf59e0b, 20);

    // Reset pending build mode
    this.pendingBuildingType = null;
    this.buildPreviewGroup.visible = false;
    this.onStateChange({ ...this.battlefield });
    return true;
  }

  public startTechResearch(techId: string): boolean {
    const tech = this.playerTechs.find((t) => t.id === techId);
    if (!tech || !canResearchTech(tech, this.playerTechs, this.battlefield.playerEnergy)) {
      return false;
    }

    this.battlefield.playerEnergy -= tech.cost;
    tech.isResearching = true;
    tech.researchProgress = 0;
    soundManager.playOrderIssued();
    this.onStateChange({ ...this.battlefield });
    return true;
  }

  /**
   * Activates Army Unique Ability
   */
  public triggerArmyAbility(): boolean {
    const faction = FACTIONS[this.battlefield.playerFaction];
    const ability = faction.uniqueAbility;

    if (this.battlefield.abilityCooldown > 0) return false;
    if (this.battlefield.playerEnergy < ability.energyCost) return false;

    this.battlefield.playerEnergy -= ability.energyCost;
    this.battlefield.abilityCooldown = ability.cooldown;

    if (ability.id === 'phalanx_formation') {
      // Spartan Phalanx Formation: +75% defense wall
      this.battlefield.isPhalanxActive = true;
      this.battlefield.abilityActiveTimer = ability.duration || 10.0;
      soundManager.playShieldBlock();
      soundManager.playWarHorn('spartans');
      this.emitBurst(this.player.x, this.player.y, this.player.z, 0xdc2626, 25);
    } else if (ability.id === 'siege_engine') {
      // Roman Siege Engine: Constructs mobile heavy Onager/Ballista
      const fwdX = -Math.sin(this.player.yaw);
      const fwdZ = -Math.cos(this.player.yaw);
      this.spawnUnit('romans', 'siege', this.player.x + fwdX * 4, this.player.z + fwdZ * 4);
      soundManager.playWarHorn('romans');
      this.emitBurst(this.player.x + fwdX * 4, this.player.y, this.player.z + fwdZ * 4, 0xb91c1c, 25);
    } else if (ability.id === 'hoplite_charge') {
      // Greek Hoplite Charge: +50% speed, 2x damage surge
      this.battlefield.isChargeActive = true;
      this.battlefield.abilityActiveTimer = ability.duration || 8.0;
      soundManager.playWarHorn('greeks');
      this.emitBurst(this.player.x, this.player.y, this.player.z, 0x0284c7, 25);
    }

    this.onStateChange({ ...this.battlefield });
    return true;
  }

  public emitBurst(x: number, y: number, z: number, colorHex: number, count: number = 10) {
    let emitted = 0;
    for (const p of this.particles) {
      if (p.life <= 0) {
        p.mesh.position.set(x, y, z);
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        p.mesh.visible = true;
        p.vx = (Math.random() - 0.5) * 6;
        p.vy = Math.random() * 4 + 1;
        p.vz = (Math.random() - 0.5) * 6;
        p.life = 0.35 + Math.random() * 0.25;
        p.maxLife = p.life;
        emitted++;
        if (emitted >= count) break;
      }
    }
  }

  public setSquadOrder(order: SquadOrder) {
    this.battlefield.currentOrder = order;
    this.viewModel.setOrderLabel(order);
    soundManager.playOrderIssued();
    this.onStateChange({ ...this.battlefield });
  }

  public requestReinforcement(type: 'infantry' | 'ranged' | 'elite'): boolean {
    const cost = REINFORCEMENT_COSTS[type];
    if (this.battlefield.playerEnergy >= cost) {
      this.battlefield.playerEnergy -= cost;
      const angle = Math.random() * Math.PI * 2;
      const sx = this.player.x + Math.cos(angle) * 4;
      const sz = this.player.z + Math.sin(angle) * 4;
      this.spawnUnit(this.battlefield.playerFaction, type, sx, sz);
      soundManager.playOrderIssued();
      this.emitBurst(sx, getTerrainHeight(sx, sz) + 1, sz, 0x38bdf8, 14);
      this.onStateChange({ ...this.battlefield });
      return true;
    }
    return false;
  }

  public triggerRally(): boolean {
    if (this.battlefield.playerEnergy >= REINFORCEMENT_COSTS.rally && !this.player.rallyActive) {
      this.battlefield.playerEnergy -= REINFORCEMENT_COSTS.rally;
      this.player.rallyActive = true;
      this.player.rallyTimer = 8.0;
      soundManager.playWarHorn(this.battlefield.playerFaction);
      this.emitBurst(this.player.x, this.player.y, this.player.z, 0xf59e0b, 20);
      this.onStateChange({ ...this.battlefield });
      return true;
    }
    return false;
  }

  public step(dt: number, input: SimulationInput) {
    if (this.battlefield.gameStatus !== 'playing') return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    const clampedDt = Math.min(dt, 0.05);
    this.battlefield.gameTime += clampedDt;

    // Ability cooldowns & active timers
    if (this.battlefield.abilityCooldown > 0) {
      this.battlefield.abilityCooldown = Math.max(0, this.battlefield.abilityCooldown - clampedDt);
    }
    if (this.battlefield.abilityActiveTimer > 0) {
      this.battlefield.abilityActiveTimer -= clampedDt;
      if (this.battlefield.abilityActiveTimer <= 0) {
        this.battlefield.isPhalanxActive = false;
        this.battlefield.isChargeActive = false;
      }
    }

    // Energy income: base + obelisks + completed Extractors!
    let playerOwnedObelisks = 0;
    for (const ob of this.obelisks) {
      if (ob.owner === this.battlefield.playerFaction) playerOwnedObelisks++;
    }

    const extractorBoost = getTechMultiplier(this.playerTechs, 'extractor_boost');
    let extractorCount = 0;
    let hasCommandCenter = false;

    this.buildings.forEach((b) => {
      if (b.faction === this.battlefield.playerFaction && !b.isUnderConstruction) {
        if (b.type === 'command_center') hasCommandCenter = true;
        if (b.type === 'extractor') extractorCount++;
      }
    });

    const baseIncome = hasCommandCenter ? 14 : 9;
    const extractorIncome = extractorCount * 7.5 * extractorBoost;
    this.battlefield.playerEnergy = Math.min(
      250,
      this.battlefield.playerEnergy + (baseIncome + playerOwnedObelisks * 4.5 + extractorIncome) * clampedDt
    );

    // Rally timer
    if (this.player.rallyActive) {
      this.player.rallyTimer -= clampedDt;
      if (this.player.rallyTimer <= 0) {
        this.player.rallyActive = false;
      }
    }

    // Process Tech Tree Research Progress
    this.playerTechs.forEach((t) => {
      if (t.isResearching) {
        t.researchProgress += (100 / t.researchTime) * clampedDt;
        if (t.researchProgress >= 100) {
          t.researchProgress = 100;
          t.isResearching = false;
          t.isResearched = true;
          this.battlefield.stats.techsResearched++;
          soundManager.playObeliskCaptured();
        }
      }
    });

    // 1. Process Orders & Abilities from Input
    if (input.orderRequested) this.setSquadOrder(input.orderRequested);
    if (input.deployRequested) this.requestReinforcement(input.deployRequested);
    if (input.abilityRequested) this.triggerArmyAbility();
    if (input.rallyRequested) this.triggerRally();
    if (input.confirmBuildRequested) this.confirmBuild();
    if (input.cancelBuildRequested) {
      this.pendingBuildingType = null;
      this.buildPreviewGroup.visible = false;
    }

    // 2. Player Movement and Look Controls
    this.player.yaw -= input.lookDeltaX * 0.0022;
    this.player.pitch -= input.lookDeltaY * 0.0022;
    this.player.pitch = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, this.player.pitch));

    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));

    let moveX = 0;
    let moveZ = 0;
    if (input.moveForward) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (input.moveBackward) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (input.moveLeft) {
      moveX -= right.x;
      moveZ -= right.z;
    }
    if (input.moveRight) {
      moveX += right.x;
      moveZ += right.z;
    }

    const moveMag = Math.hypot(moveX, moveZ);
    const speedMult =
      (input.sprint ? 9.5 : 6.0) *
      (this.player.rallyActive ? 1.3 : 1.0) *
      (this.battlefield.isChargeActive ? 1.5 : 1.0) *
      (this.battlefield.isPhalanxActive ? 0.75 : 1.0); // slower while in Phalanx lock

    if (moveMag > 0.001) {
      moveX = (moveX / moveMag) * speedMult;
      moveZ = (moveZ / moveMag) * speedMult;
    }

    this.player.vx = THREE.MathUtils.damp(this.player.vx, moveX, 10, clampedDt);
    this.player.vz = THREE.MathUtils.damp(this.player.vz, moveZ, 10, clampedDt);

    this.player.x += this.player.vx * clampedDt;
    this.player.z += this.player.vz * clampedDt;

    this.player.x = Math.max(-100, Math.min(100, this.player.x));
    this.player.z = Math.max(-100, Math.min(100, this.player.z));

    const groundY = getTerrainHeight(this.player.x, this.player.z);
    this.player.y = groundY + 1.7;

    // Camera follow & shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.player.trauma > 0) {
      const shakeAmt = this.player.trauma * this.player.trauma * 0.05;
      shakeX = (Math.random() - 0.5) * shakeAmt;
      shakeY = (Math.random() - 0.5) * shakeAmt;
      this.player.trauma = Math.max(0, this.player.trauma - clampedDt * 2.5);
    }

    this.camera.position.set(this.player.x + shakeX, this.player.y + shakeY, this.player.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.player.yaw);
    this.camera.rotateX(this.player.pitch);

    // Update Building Placement Preview
    if (this.pendingBuildingType) {
      const px = this.player.x + forward.x * 7.0;
      const pz = this.player.z + forward.z * 7.0;
      const py = getTerrainHeight(px, pz) + 0.1;
      this.buildPreviewGroup.position.set(px, py, pz);

      const check = canConstructBuilding(
        this.pendingBuildingType,
        this.buildings,
        this.battlefield.playerFaction,
        this.battlefield.playerEnergy
      );
      (this.buildPreviewRing.material as THREE.MeshBasicMaterial).color.setHex(check.allowed ? 0x10b981 : 0xef4444);
    }

    // 3. Player Attack and Block Execution
    this.player.isBlocking = input.blockHeld || this.battlefield.isPhalanxActive;

    if (this.player.attackCooldown > 0) {
      this.player.attackCooldown -= clampedDt;
    }

    if (input.attackJustPressed && this.player.attackCooldown <= 0 && (!this.player.isBlocking || this.battlefield.isPhalanxActive)) {
      this.player.isAttacking = true;
      this.player.attackProgress = 0;
      this.player.attackCooldown = 0.5;
      soundManager.playWeaponThrust();

      const reach = 3.6;
      for (const u of this.units) {
        if (u.faction !== this.battlefield.playerFaction && u.state !== 'dead') {
          const dist = Math.hypot(u.x - this.player.x, u.z - this.player.z);
          const toEnemyX = u.x - this.player.x;
          const toEnemyZ = u.z - this.player.z;
          const dot = (toEnemyX * forward.x + toEnemyZ * forward.z) / Math.max(0.01, dist);

          if (dist <= reach && dot > 0.45) {
            const isBlocked = u.isBlocking;
            const { finalDamage, blockedAmount } = calculateDamage(
              this.battlefield.playerFaction,
              u.faction,
              30 * (this.player.rallyActive ? 1.4 : 1.0),
              isBlocked,
              true,
              this.battlefield.isPhalanxActive,
              this.battlefield.isChargeActive,
              this.playerTechs,
              this.enemyTechs
            );

            u.hp -= finalDamage;
            this.battlefield.stats.damageDealt += finalDamage;

            if (isBlocked && blockedAmount > 10) {
              soundManager.playShieldBlock();
              this.emitBurst(u.x, getTerrainHeight(u.x, u.z) + 1.2, u.z, 0xf59e0b, 8);
            } else {
              soundManager.playHit(finalDamage > 25);
              this.emitBurst(u.x, getTerrainHeight(u.x, u.z) + 1.2, u.z, 0xdc2626, 12);
              this.player.trauma = Math.min(1.0, this.player.trauma + 0.3);
              this.hitstopTimer = 0.04;
            }

            if (u.hp <= 0) {
              u.state = 'dead';
              u.deathTimer = 0.6;
              this.battlefield.stats.enemiesKilled++;
              this.battlefield.enemyTickets = Math.max(0, this.battlefield.enemyTickets - 5);
            }
          }
        }
      }
    }

    if (this.player.isAttacking) {
      this.player.attackProgress += clampedDt * 3.5;
      if (this.player.attackProgress >= 1.0) {
        this.player.isAttacking = false;
        this.player.attackProgress = 0;
      }
    }

    const isPlayerWalking = Math.hypot(this.player.vx, this.player.vz) > 0.5;
    this.viewModel.update(
      clampedDt,
      isPlayerWalking,
      this.player.isAttacking,
      this.player.isBlocking,
      this.player.attackProgress,
      this.battlefield.currentOrder
    );

    // 4. Update Obelisk Contest & Ticket Bleed
    this.obelisks.forEach((ob) => {
      let pCount = 0;
      let eCount = 0;

      if (Math.hypot(this.player.x - ob.x, this.player.z - ob.z) <= OBELISK_CAPTURE_RADIUS) {
        pCount += 2;
      }

      this.units.forEach((u) => {
        if (u.state !== 'dead' && Math.hypot(u.x - ob.x, u.z - ob.z) <= OBELISK_CAPTURE_RADIUS) {
          if (u.faction === this.battlefield.playerFaction) pCount++;
          else eCount++;
        }
      });

      const { newOwner, newProgress, capturedThisFrame, lostThisFrame } = updateObeliskCapture(
        ob,
        pCount,
        eCount,
        this.battlefield.playerFaction,
        this.battlefield.enemyFaction,
        clampedDt
      );
      ob.owner = newOwner;
      ob.captureProgress = newProgress;

      if (capturedThisFrame) {
        soundManager.playObeliskCaptured();
        this.battlefield.stats.obelisksCaptured++;
        this.emitBurst(ob.x, getTerrainHeight(ob.x, ob.z) + 8, ob.z, 0x38bdf8, 25);
      }
      if (lostThisFrame) {
        soundManager.playHit(true);
        this.emitBurst(ob.x, getTerrainHeight(ob.x, ob.z) + 8, ob.z, 0xef4444, 25);
      }
    });

    const decay = calculateTicketDecay(this.obelisks, this.battlefield.playerFaction, this.battlefield.enemyFaction);
    this.battlefield.playerTickets = Math.max(0, this.battlefield.playerTickets - decay.playerDecayPerSec * clampedDt);
    this.battlefield.enemyTickets = Math.max(0, this.battlefield.enemyTickets - decay.enemyDecayPerSec * clampedDt);

    // 5. Update Base Buildings (Construction, Turrets auto-firing)
    this.updateBuildings(clampedDt);

    // 6. Units AI, Navigation, and Clashing
    this.updateUnitsAI(clampedDt);

    // 7. Enemy Wave Spawner
    if (this.units.filter((u) => u.faction === this.battlefield.enemyFaction && u.state !== 'dead').length < 7) {
      if (Math.random() < clampedDt * 0.6) {
        const types: ('infantry' | 'ranged' | 'elite')[] = ['infantry', 'infantry', 'ranged', 'elite'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        const sx = this.enemyCommander.x + (Math.random() - 0.5) * 15;
        const sz = this.enemyCommander.z - 5;
        this.spawnUnit(this.battlefield.enemyFaction, chosen, sx, sz);
      }
    }

    // 8. Update Particles
    for (const p of this.particles) {
      if (p.life > 0) {
        p.life -= clampedDt;
        p.mesh.position.x += p.vx * clampedDt;
        p.mesh.position.y += p.vy * clampedDt;
        p.mesh.position.z += p.vz * clampedDt;
        p.vy -= 9.8 * clampedDt;
        const sc = Math.max(0, p.life / p.maxLife);
        p.mesh.scale.set(sc, sc, sc);
        if (p.life <= 0) p.mesh.visible = false;
      }
    }

    // 9. Update Projectiles
    this.updateProjectiles(clampedDt);

    // 10. Update World animations
    this.alienWorld.update(this.battlefield.gameTime);

    // 11. Check Victory / Defeat
    const outcome = checkBattleOutcome(
      this.battlefield.playerTickets,
      this.battlefield.enemyTickets,
      this.player.hp
    );
    if (outcome !== 'playing') {
      this.battlefield.gameStatus = outcome;
      if (outcome === 'victory') soundManager.playVictory();
      else soundManager.playDefeat();
    }

    this.onStateChange({ ...this.battlefield });
  }

  private updateBuildings(dt: number) {
    const enemies = this.units.filter((u) => u.faction !== this.battlefield.playerFaction && u.state !== 'dead');

    this.buildings.forEach((bld) => {
      const meshContainer = this.buildingMeshes.get(bld.id);

      // Handle construction progress
      if (bld.isUnderConstruction) {
        const config = BUILDING_CONFIGS[bld.type];
        bld.buildProgress += (100 / config.buildTime) * dt;
        if (bld.buildProgress >= 100) {
          bld.buildProgress = 100;
          bld.isUnderConstruction = false;
          bld.hp = bld.maxHp;
          soundManager.playObeliskCaptured();
        }
      }

      if (meshContainer) {
        meshContainer.updateAnimation(this.battlefield.gameTime, bld.isUnderConstruction, bld.buildProgress);
      }

      // Automated Turret logic
      if (bld.type === 'turret' && !bld.isUnderConstruction) {
        let nearestTarget: UnitState | null = null;
        let nearestDist = bld.range;

        for (const e of enemies) {
          const d = Math.hypot(e.x - bld.x, e.z - bld.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestTarget = e;
          }
        }

        if (nearestTarget) {
          // Rotate turret head toward enemy
          const targetAngle = Math.atan2(nearestTarget.x - bld.x, nearestTarget.z - bld.z);
          bld.turretRotation = targetAngle;
          if (meshContainer?.turretHead) {
            meshContainer.turretHead.rotation.y = targetAngle;
          }

          bld.currentCooldown -= dt;
          if (bld.currentCooldown <= 0) {
            bld.currentCooldown = bld.attackCooldown;
            // Fire plasma projectile!
            soundManager.playWeaponThrust();
            this.fireProjectile(
              bld.faction,
              'turret',
              bld.x,
              bld.y + 2.5,
              bld.z,
              nearestTarget.x,
              getTerrainHeight(nearestTarget.x, nearestTarget.z) + 1.2,
              nearestTarget.z,
              26,
              28
            );
          }
        }
      }
    });
  }

  private fireProjectile(
    faction: FactionId,
    sourceType: 'unit' | 'turret' | 'siege',
    fromX: number,
    fromY: number,
    fromZ: number,
    toX: number,
    toY: number,
    toZ: number,
    damage: number,
    speed: number
  ) {
    const id = `proj_${Math.random().toString(36).substring(2, 9)}`;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dz = toZ - fromZ;
    const dist = Math.hypot(dx, dy, dz);

    const proj: Projectile = {
      id,
      faction,
      sourceType,
      x: fromX,
      y: fromY,
      z: fromZ,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed + (sourceType === 'siege' ? 4 : 0),
      vz: (dz / dist) * speed,
      damage,
      life: 2.5,
      isExplosive: sourceType === 'siege',
    };

    // 3D mesh for projectile
    const geom = sourceType === 'siege' ? new THREE.DodecahedronGeometry(0.4) : new THREE.SphereGeometry(0.16, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: faction === 'spartans' ? 0xdc2626 : faction === 'romans' ? 0xf59e0b : 0x38bdf8,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(fromX, fromY, fromZ);
    this.scene.add(mesh);
    this.projectileMeshes.set(id, mesh);

    this.projectiles.push(proj);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.isExplosive) p.vy -= 9.8 * dt; // gravity arc for catapult boulders

      const mesh = this.projectileMeshes.get(p.id);
      if (mesh) {
        mesh.position.set(p.x, p.y, p.z);
      }

      // Check collision with units
      let hit = false;
      const targets = this.units.filter((u) => u.faction !== p.faction && u.state !== 'dead');
      for (const t of targets) {
        const d = Math.hypot(t.x - p.x, t.z - p.z);
        if (d < (p.isExplosive ? 3.5 : 1.4)) {
          hit = true;
          t.hp -= p.damage;
          this.emitBurst(t.x, getTerrainHeight(t.x, t.z) + 1, t.z, 0xf59e0b, p.isExplosive ? 20 : 8);
          soundManager.playHit(p.isExplosive);

          if (t.hp <= 0) {
            t.state = 'dead';
            t.deathTimer = 0.6;
            if (p.faction === this.battlefield.playerFaction) {
              this.battlefield.stats.enemiesKilled++;
              this.battlefield.enemyTickets = Math.max(0, this.battlefield.enemyTickets - 5);
            }
          }
        }
      }

      // Ground impact check
      const groundAtP = getTerrainHeight(p.x, p.z);
      if (p.y <= groundAtP || p.life <= 0 || hit) {
        if (p.isExplosive) {
          this.emitBurst(p.x, groundAtP + 0.5, p.z, 0xef4444, 25);
          soundManager.playHit(true);
        }
        if (mesh) {
          this.scene.remove(mesh);
          this.projectileMeshes.delete(p.id);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateUnitsAI(dt: number) {
    const playerAllies = this.units.filter((u) => u.faction === this.battlefield.playerFaction && u.state !== 'dead');
    const enemyUnits = this.units.filter((u) => u.faction === this.battlefield.enemyFaction && u.state !== 'dead');

    playerAllies.forEach((u, idx) => {
      let targetX = this.player.x;
      let targetZ = this.player.z;

      if (this.battlefield.currentOrder === 'charge') {
        let closestDist = 999;
        let targetEnemy: UnitState | null = null;
        for (const e of enemyUnits) {
          const d = Math.hypot(e.x - u.x, e.z - u.z);
          if (d < closestDist) {
            closestDist = d;
            targetEnemy = e;
          }
        }
        if (targetEnemy) {
          targetX = targetEnemy.x;
          targetZ = targetEnemy.z;
        } else {
          targetX = 0;
          targetZ = 0;
        }
      } else if (this.battlefield.currentOrder === 'phalanx' || this.battlefield.isPhalanxActive) {
        const offset = getFormationOffset(idx, playerAllies.length, 'phalanx');
        const fwdX = -Math.sin(this.player.yaw);
        const fwdZ = -Math.cos(this.player.yaw);
        const rgtX = Math.cos(this.player.yaw);
        const rgtZ = -Math.sin(this.player.yaw);
        targetX = this.player.x + fwdX * offset.z + rgtX * offset.x;
        targetZ = this.player.z + fwdZ * offset.z + rgtZ * offset.x;
        u.isBlocking = true;
      } else {
        const offset = getFormationOffset(idx, playerAllies.length, this.battlefield.currentOrder);
        targetX = this.player.x + offset.x;
        targetZ = this.player.z + offset.z;
        u.isBlocking = this.battlefield.currentOrder === 'defend';
      }

      this.stepSingleUnitAI(u, targetX, targetZ, enemyUnits, dt);
    });

    enemyUnits.forEach((u) => {
      const distToPlayer = Math.hypot(this.player.x - u.x, this.player.z - u.z);
      let targetX = 0;
      let targetZ = 0;

      if (distToPlayer < 18) {
        targetX = this.player.x;
        targetZ = this.player.z;
      } else {
        const targetOb = this.obelisks.find((o) => o.owner !== this.battlefield.enemyFaction) || this.obelisks[1];
        targetX = targetOb.x;
        targetZ = targetOb.z;
      }

      this.stepSingleUnitAI(u, targetX, targetZ, playerAllies, dt, true);
    });

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.state === 'dead') {
        u.deathTimer -= dt;
        const mesh = this.unitMeshes.get(u.id);
        if (mesh) {
          mesh.root.position.y -= dt * 0.8;
          mesh.root.scale.multiplyScalar(Math.max(0.01, 1 - dt * 2));
        }
        const sMesh = this.siegeMeshes.get(u.id);
        if (sMesh) {
          sMesh.position.y -= dt * 0.8;
        }

        if (u.deathTimer <= 0) {
          if (mesh) {
            this.scene.remove(mesh.root);
            this.unitMeshes.delete(u.id);
          }
          if (sMesh) {
            this.scene.remove(sMesh);
            this.siegeMeshes.delete(u.id);
          }
          this.units.splice(i, 1);
        }
      }
    }
  }

  private stepSingleUnitAI(
    u: UnitState,
    targetX: number,
    targetZ: number,
    opponents: UnitState[],
    dt: number,
    isEnemy: boolean = false
  ) {
    if (u.state === 'dead') return;

    let nearestOpponent: UnitState | null = null;
    let nearestDist = 9999;
    for (const opp of opponents) {
      if (opp.state !== 'dead') {
        const d = Math.hypot(opp.x - u.x, opp.z - u.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestOpponent = opp;
        }
      }
    }

    let attackingPlayer = false;
    if (isEnemy) {
      const dToP = Math.hypot(this.player.x - u.x, this.player.z - u.z);
      if (dToP < nearestDist) {
        nearestDist = dToP;
        attackingPlayer = true;
      }
    }

    let isAttacking = false;
    const combatRange = u.attackRange;

    if (nearestDist <= combatRange) {
      const oppX = attackingPlayer ? this.player.x : nearestOpponent ? nearestOpponent.x : targetX;
      const oppZ = attackingPlayer ? this.player.z : nearestOpponent ? nearestOpponent.z : targetZ;
      u.rotation = Math.atan2(oppX - u.x, oppZ - u.z);

      u.currentCooldown -= dt;
      if (u.currentCooldown <= 0) {
        u.currentCooldown = u.attackCooldown;
        isAttacking = true;

        if (u.type === 'siege') {
          // Siege Engine fires explosive boulder
          soundManager.playHit(true);
          this.fireProjectile(u.faction, 'siege', u.x, getTerrainHeight(u.x, u.z) + 2.5, u.z, oppX, getTerrainHeight(oppX, oppZ), oppZ, u.attackPower, 22);
        } else if (attackingPlayer) {
          const { finalDamage, blockedAmount } = calculateDamage(
            u.faction,
            this.battlefield.playerFaction,
            u.attackPower,
            this.player.isBlocking,
            true,
            this.battlefield.isPhalanxActive,
            false,
            this.enemyTechs,
            this.playerTechs
          );
          this.player.hp = Math.max(0, this.player.hp - finalDamage);
          this.battlefield.stats.damageTaken += finalDamage;
          this.player.trauma = Math.min(1.0, this.player.trauma + 0.4);

          if (this.player.isBlocking && blockedAmount > 5) {
            soundManager.playShieldBlock();
            this.emitBurst(this.player.x, this.player.y - 0.5, this.player.z, 0xf59e0b, 8);
          } else {
            soundManager.playHit(true);
            this.emitBurst(this.player.x, this.player.y - 0.5, this.player.z, 0xdc2626, 10);
            this.hitstopTimer = 0.03;
          }
        } else if (nearestOpponent) {
          const { finalDamage } = calculateDamage(
            u.faction,
            nearestOpponent.faction,
            u.attackPower,
            nearestOpponent.isBlocking,
            true,
            false,
            false,
            isEnemy ? this.enemyTechs : this.playerTechs,
            isEnemy ? this.playerTechs : this.enemyTechs
          );
          nearestOpponent.hp -= finalDamage;
          if (nearestOpponent.hp <= 0) {
            nearestOpponent.state = 'dead';
            nearestOpponent.deathTimer = 0.6;
            if (isEnemy) {
              this.battlefield.stats.alliesLost++;
              this.battlefield.playerTickets = Math.max(0, this.battlefield.playerTickets - 5);
            } else {
              this.battlefield.stats.enemiesKilled++;
              this.battlefield.enemyTickets = Math.max(0, this.battlefield.enemyTickets - 5);
            }
          }
        }
      }
      u.state = 'attacking';
    } else {
      const dx = targetX - u.x;
      const dz = targetZ - u.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.2) {
        const moveSpeed =
          (u.type === 'siege' ? 2.6 : u.type === 'ranged' ? 4.5 : 4.0) *
          (u.isBlocking ? 0.6 : 1.0) *
          (this.battlefield.isChargeActive && u.faction === 'greeks' ? 1.6 : 1.0);

        u.vx = (dx / dist) * moveSpeed;
        u.vz = (dz / dist) * moveSpeed;
        u.x += u.vx * dt;
        u.z += u.vz * dt;
        u.rotation = Math.atan2(u.vx, u.vz);
        u.state = 'walking';
      } else {
        u.vx = 0;
        u.vz = 0;
        u.state = 'idle';
      }
    }

    if (u.type === 'siege') {
      const sMesh = this.siegeMeshes.get(u.id);
      if (sMesh) {
        sMesh.position.set(u.x, getTerrainHeight(u.x, u.z), u.z);
        sMesh.rotation.y = u.rotation;
      }
    } else {
      const mesh = this.unitMeshes.get(u.id);
      if (mesh) {
        const gy = getTerrainHeight(u.x, u.z);
        mesh.root.position.set(u.x, gy, u.z);
        mesh.root.rotation.y = u.rotation;
        const spd = Math.hypot(u.vx, u.vz);
        mesh.animate(spd, this.battlefield.gameTime, isAttacking, u.isBlocking);
      }
    }
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    cancelAnimationFrame(0);
    this.alienWorld.dispose();
    this.renderer.dispose();
  }
}
