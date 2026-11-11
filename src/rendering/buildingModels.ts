/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BuildingType, FactionId } from '../types/game';

export interface BuildingMeshContainer {
  root: THREE.Group;
  turretHead?: THREE.Group;
  pistonMesh?: THREE.Mesh;
  energyCore?: THREE.Mesh;
  updateAnimation: (time: number, isUnderConstruction: boolean, buildProgress: number) => void;
}

export function createBuildingMesh(type: BuildingType, faction: FactionId): BuildingMeshContainer {
  const root = new THREE.Group();

  const isSpartan = faction === 'spartans';
  const isRoman = faction === 'romans';
  const primaryColor = isSpartan ? 0x991b1b : isRoman ? 0x881337 : 0x0369a1;
  const metalColor = isSpartan ? 0xb45309 : isRoman ? 0x64748b : 0xd97706;

  // Shared stone and metal materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x27202b,
    roughness: 0.75,
    metalness: 0.25,
  });

  const factionMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.45,
    metalness: 0.55,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: metalColor,
    roughness: 0.35,
    metalness: 0.75,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: isSpartan ? 0xf59e0b : isRoman ? 0xef4444 : 0x38bdf8,
    emissive: isSpartan ? 0xd97706 : isRoman ? 0xb91c1c : 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.8,
  });

  // Contact shadow disc at base
  const shadowRadius = type === 'command_center' ? 5.5 : type === 'barracks' ? 4.2 : 3.0;
  const shadowGeom = new THREE.CircleGeometry(shadowRadius, 16);
  shadowGeom.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeom, shadowMat);
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  let turretHead: THREE.Group | undefined;
  let pistonMesh: THREE.Mesh | undefined;
  let energyCore: THREE.Mesh | undefined;

  switch (type) {
    case 'command_center': {
      // 1. Octagonal Fortified Base
      const baseGeom = new THREE.CylinderGeometry(4.5, 5.2, 1.8, 8);
      const base = new THREE.Mesh(baseGeom, stoneMat);
      base.position.y = 0.9;
      base.castShadow = true;
      base.receiveShadow = true;
      root.add(base);

      // 2. Tier 2 Headquarters Tower
      const towerGeom = new THREE.CylinderGeometry(3.0, 3.8, 2.8, 8);
      const tower = new THREE.Mesh(towerGeom, factionMat);
      tower.position.y = 3.2;
      tower.castShadow = true;
      root.add(tower);

      // 3. Central Command Spire
      const spireGeom = new THREE.ConeGeometry(1.6, 3.5, 6);
      const spire = new THREE.Mesh(spireGeom, metalMat);
      spire.position.y = 6.2;
      spire.castShadow = true;
      root.add(spire);

      // 4. Floating Holographic Faction Orb
      const orbGeom = new THREE.OctahedronGeometry(1.1, 1);
      energyCore = new THREE.Mesh(orbGeom, glowMat);
      energyCore.position.y = 8.5;
      root.add(energyCore);

      // 5. 4 Corner Sentry Bastions
      for (let b = 0; b < 4; b++) {
        const ang = (b / 4) * Math.PI * 2;
        const bastionGeom = new THREE.BoxGeometry(1.2, 3.0, 1.2);
        const bastion = new THREE.Mesh(bastionGeom, metalMat);
        bastion.position.set(Math.cos(ang) * 4.2, 1.5, Math.sin(ang) * 4.2);
        bastion.castShadow = true;
        root.add(bastion);
      }
      break;
    }

    case 'barracks': {
      // 1. Heavy Rectangular Training Hall
      const hallGeom = new THREE.BoxGeometry(4.8, 2.4, 3.6);
      const hall = new THREE.Mesh(hallGeom, stoneMat);
      hall.position.y = 1.2;
      hall.castShadow = true;
      root.add(hall);

      // 2. Arched Gate Frame
      const gateGeom = new THREE.BoxGeometry(2.0, 2.8, 0.6);
      const gate = new THREE.Mesh(gateGeom, factionMat);
      gate.position.set(0, 1.4, 1.85);
      root.add(gate);

      // 3. Roof Battlement parapet
      const roofGeom = new THREE.BoxGeometry(5.2, 0.5, 4.0);
      const roof = new THREE.Mesh(roofGeom, metalMat);
      roof.position.y = 2.65;
      root.add(roof);

      // 4. Flagpole & Faction Banner
      const poleGeom = new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6);
      const pole = new THREE.Mesh(poleGeom, metalMat);
      pole.position.set(1.8, 4.2, 1.4);
      root.add(pole);

      const bannerGeom = new THREE.PlaneGeometry(1.2, 0.8);
      const banner = new THREE.Mesh(bannerGeom, factionMat);
      banner.position.set(2.4, 4.4, 1.4);
      banner.rotation.y = Math.PI / 2;
      root.add(banner);
      break;
    }

    case 'extractor': {
      // 1. Hexagonal Drill Well Base
      const wellGeom = new THREE.CylinderGeometry(2.4, 2.8, 1.2, 6);
      const well = new THREE.Mesh(wellGeom, stoneMat);
      well.position.y = 0.6;
      well.castShadow = true;
      root.add(well);

      // 2. Drill Frame Pylons (3 angled struts)
      const strutGeom = new THREE.BoxGeometry(0.3, 4.2, 0.3);
      for (let s = 0; s < 3; s++) {
        const ang = (s / 3) * Math.PI * 2;
        const strut = new THREE.Mesh(strutGeom, metalMat);
        strut.position.set(Math.cos(ang) * 1.5, 2.5, Math.sin(ang) * 1.5);
        strut.rotation.z = Math.sin(ang) * 0.15;
        strut.rotation.x = -Math.cos(ang) * 0.15;
        strut.castShadow = true;
        root.add(strut);
      }

      // 3. Central Pneumatic Piston Drill Head
      const pGeom = new THREE.CylinderGeometry(0.45, 0.2, 2.6, 8);
      pistonMesh = new THREE.Mesh(pGeom, glowMat);
      pistonMesh.position.y = 2.5;
      root.add(pistonMesh);

      // 4. Xenonite Storage Pods
      const podGeom = new THREE.SphereGeometry(0.55, 8, 8);
      for (let p = 0; p < 2; p++) {
        const pod = new THREE.Mesh(podGeom, glowMat);
        pod.position.set((p === 0 ? 1 : -1) * 1.8, 0.9, 0);
        root.add(pod);
      }
      break;
    }

    case 'turret': {
      // 1. Reinforced Stone Pedestal
      const pedGeom = new THREE.CylinderGeometry(1.2, 1.6, 2.2, 8);
      const ped = new THREE.Mesh(pedGeom, stoneMat);
      ped.position.y = 1.1;
      ped.castShadow = true;
      root.add(ped);

      // 2. Swiveling Turret Head Group
      turretHead = new THREE.Group();
      turretHead.position.y = 2.2;

      // Armor Shell
      const headGeom = new THREE.BoxGeometry(1.4, 0.9, 1.6);
      const head = new THREE.Mesh(headGeom, factionMat);
      head.castShadow = true;
      turretHead.add(head);

      // Dual Plasma Barrels
      const barrelGeom = new THREE.CylinderGeometry(0.12, 0.15, 1.8, 8);
      barrelGeom.rotateX(Math.PI / 2);

      const leftBarrel = new THREE.Mesh(barrelGeom, metalMat);
      leftBarrel.position.set(-0.4, 0.1, 0.9);
      leftBarrel.castShadow = true;
      turretHead.add(leftBarrel);

      const rightBarrel = new THREE.Mesh(barrelGeom, metalMat);
      rightBarrel.position.set(0.4, 0.1, 0.9);
      rightBarrel.castShadow = true;
      turretHead.add(rightBarrel);

      // Glowing Emitter Tips
      const tipGeom = new THREE.ConeGeometry(0.14, 0.3, 6);
      tipGeom.rotateX(Math.PI / 2);

      const leftTip = new THREE.Mesh(tipGeom, glowMat);
      leftTip.position.set(-0.4, 0.1, 1.85);
      turretHead.add(leftTip);

      const rightTip = new THREE.Mesh(tipGeom, glowMat);
      rightTip.position.set(0.4, 0.1, 1.85);
      turretHead.add(rightTip);

      root.add(turretHead);
      break;
    }
  }

  return {
    root,
    turretHead,
    pistonMesh,
    energyCore,
    updateAnimation: (time: number, isUnderConstruction: boolean, buildProgress: number) => {
      if (isUnderConstruction) {
        // Scaffolding or rising effect
        const targetScaleY = Math.max(0.15, buildProgress / 100);
        root.scale.y = targetScaleY;
        return;
      }
      root.scale.y = 1.0;

      // Energy core floating / rotation
      if (energyCore) {
        energyCore.rotation.y = time * 1.2;
        energyCore.rotation.x = Math.sin(time * 0.8) * 0.3;
        energyCore.position.y = 8.5 + Math.sin(time * 2.5) * 0.25;
      }

      // Extractor drill piston oscillation
      if (pistonMesh) {
        pistonMesh.position.y = 2.0 + Math.abs(Math.sin(time * 6.0)) * 1.1;
      }
    },
  };
}

/**
 * Creates a Roman Heavy Siege Engine (Onager / Ballista) procedural 3D model
 */
export function createSiegeEngineMesh(faction: FactionId): THREE.Group {
  const g = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.8,
  });

  // Heavy timber carriage
  const carriageGeom = new THREE.BoxGeometry(2.4, 0.6, 3.6);
  const carriage = new THREE.Mesh(carriageGeom, woodMat);
  carriage.position.y = 0.8;
  carriage.castShadow = true;
  g.add(carriage);

  // 4 Iron Spoked Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.35, 12);
  wheelGeom.rotateZ(Math.PI / 2);
  const wheelOffsets = [
    [-1.3, 0.65, 1.3],
    [1.3, 0.65, 1.3],
    [-1.3, 0.65, -1.3],
    [1.3, 0.65, -1.3],
  ];
  wheelOffsets.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeom, ironMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    g.add(wheel);
  });

  // Catapult / Onager Throwing Arm
  const armGeom = new THREE.BoxGeometry(0.35, 3.5, 0.35);
  const arm = new THREE.Mesh(armGeom, woodMat);
  arm.position.set(0, 2.2, -0.4);
  arm.rotation.x = -Math.PI * 0.25;
  arm.castShadow = true;
  g.add(arm);

  // Sling Bucket with Glowing Plasma Boulder
  const rockGeom = new THREE.DodecahedronGeometry(0.55);
  const rock = new THREE.Mesh(rockGeom, glowMat);
  rock.position.set(0, 3.5, -1.6);
  g.add(rock);

  return g;
}
