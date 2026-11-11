/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { FactionId, SquadOrder } from '../types/game';

export interface WeaponViewModel {
  group: THREE.Group;
  weaponMesh: THREE.Group;
  shieldMesh: THREE.Group;
  holoSquadOrderMesh: THREE.Mesh;
  update: (
    dt: number,
    isWalking: boolean,
    isAttacking: boolean,
    isBlocking: boolean,
    attackProgress: number,
    order: SquadOrder
  ) => void;
  setOrderLabel: (order: SquadOrder) => void;
}

export function createCommanderViewModel(faction: FactionId): WeaponViewModel {
  const group = new THREE.Group();
  group.position.set(0, -0.4, -0.55); // in front of first-person camera

  const isSpartan = faction === 'spartans';
  const isRoman = faction === 'romans';

  // 1. Right Hand Weapon (Spear for Spartans/Greeks, Gladius for Romans)
  const weaponMesh = new THREE.Group();
  weaponMesh.position.set(0.35, -0.15, 0.15);

  if (isRoman) {
    // Imperial Gladius
    const bladeGeom = new THREE.BoxGeometry(0.06, 0.7, 0.015);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15,
    });
    const blade = new THREE.Mesh(bladeGeom, bladeMat);
    blade.position.y = 0.4;
    blade.castShadow = true;

    const guardGeom = new THREE.BoxGeometry(0.18, 0.04, 0.05);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.3 });
    const guard = new THREE.Mesh(guardGeom, guardMat);
    guard.position.y = 0.05;

    const gripGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const grip = new THREE.Mesh(gripGeom, gripMat);
    grip.position.y = -0.05;

    weaponMesh.add(blade);
    weaponMesh.add(guard);
    weaponMesh.add(grip);
    weaponMesh.rotation.x = -Math.PI * 0.25;
    weaponMesh.rotation.y = -0.15;
  } else {
    // Spartan Dory / Greek Sarissa Spear
    const shaftGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const shaft = new THREE.Mesh(shaftGeom, shaftMat);
    shaft.position.y = 0.5;

    const tipGeom = new THREE.ConeGeometry(0.06, 0.35, 6);
    const tipMat = new THREE.MeshStandardMaterial({
      color: isSpartan ? 0xf59e0b : 0x38bdf8,
      emissive: isSpartan ? 0xb45309 : 0x0284c7,
      emissiveIntensity: 0.6,
      metalness: 0.85,
      roughness: 0.2,
    });
    const tip = new THREE.Mesh(tipGeom, tipMat);
    tip.position.y = 1.5;

    weaponMesh.add(shaft);
    weaponMesh.add(tip);
    weaponMesh.rotation.x = -Math.PI * 0.45;
    weaponMesh.rotation.y = -0.1;
  }
  group.add(weaponMesh);

  // 2. Left Hand Tactical Shield / Command Gauntlet
  const shieldMesh = new THREE.Group();
  shieldMesh.position.set(-0.35, -0.2, 0.1);

  // Shield plate
  const plateGeom = isRoman
    ? new THREE.CylinderGeometry(0.35, 0.35, 0.6, 12, 1, true, -Math.PI / 4, Math.PI / 2)
    : new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16);
  if (!isRoman) plateGeom.rotateX(Math.PI / 2);

  const shieldColor = isSpartan ? 0x991b1b : isRoman ? 0xb91c1c : 0x0369a1;
  const plateMat = new THREE.MeshStandardMaterial({
    color: shieldColor,
    metalness: 0.6,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  const plate = new THREE.Mesh(plateGeom, plateMat);
  plate.position.set(0, 0, 0.15);
  plate.rotation.y = 0.3;
  shieldMesh.add(plate);

  // Holographic Order Projector on wrist
  const holoCanvas = document.createElement('canvas');
  holoCanvas.width = 128;
  holoCanvas.height = 64;
  const holoCtx = holoCanvas.getContext('2d')!;
  holoCtx.fillStyle = '#0f172a';
  holoCtx.fillRect(0, 0, 128, 64);
  holoCtx.fillStyle = '#38bdf8';
  holoCtx.font = 'bold 22px monospace';
  holoCtx.textAlign = 'center';
  holoCtx.textBaseline = 'middle';
  holoCtx.fillText('CHARGE', 64, 32);

  const holoTex = new THREE.CanvasTexture(holoCanvas);
  const holoGeom = new THREE.PlaneGeometry(0.18, 0.09);
  const holoMat = new THREE.MeshBasicMaterial({
    map: holoTex,
    transparent: true,
    opacity: 0.85,
  });
  const holoSquadOrderMesh = new THREE.Mesh(holoGeom, holoMat);
  holoSquadOrderMesh.position.set(0.05, 0.18, 0.22);
  holoSquadOrderMesh.rotation.x = -Math.PI * 0.25;
  shieldMesh.add(holoSquadOrderMesh);

  group.add(shieldMesh);

  let bobTime = 0;

  const setOrderLabel = (order: SquadOrder) => {
    holoCtx.fillStyle = '#0f172a';
    holoCtx.fillRect(0, 0, 128, 64);
    holoCtx.fillStyle = order === 'charge' ? '#ef4444' : order === 'phalanx' ? '#eab308' : '#38bdf8';
    holoCtx.font = 'bold 20px monospace';
    holoCtx.textAlign = 'center';
    holoCtx.textBaseline = 'middle';
    holoCtx.fillText(order.toUpperCase(), 64, 32);
    holoTex.needsUpdate = true;
  };

  return {
    group,
    weaponMesh,
    shieldMesh,
    holoSquadOrderMesh,
    setOrderLabel,
    update: (
      dt: number,
      isWalking: boolean,
      isAttacking: boolean,
      isBlocking: boolean,
      attackProgress: number,
      order: SquadOrder
    ) => {
      // Natural walking sway
      if (isWalking) {
        bobTime += dt * 10;
        group.position.x = Math.sin(bobTime * 0.5) * 0.02;
        group.position.y = -0.4 + Math.abs(Math.sin(bobTime)) * 0.025;
      } else {
        bobTime += dt * 2;
        group.position.x = Math.sin(bobTime * 0.5) * 0.005;
        group.position.y = -0.4 + Math.sin(bobTime) * 0.008;
      }

      // Attack Animation (Linear thrust forward then return)
      if (isAttacking) {
        const thrust = Math.sin(attackProgress * Math.PI);
        weaponMesh.position.z = 0.15 - thrust * 0.45;
        weaponMesh.position.y = -0.15 + thrust * 0.1;
        weaponMesh.rotation.x = -Math.PI * (isRoman ? 0.25 : 0.45) - thrust * 0.2;
      } else {
        weaponMesh.position.z = THREE.MathUtils.damp(weaponMesh.position.z, 0.15, 12, dt);
        weaponMesh.position.y = THREE.MathUtils.damp(weaponMesh.position.y, -0.15, 12, dt);
      }

      // Block Animation (Shield raises to screen center)
      if (isBlocking) {
        shieldMesh.position.x = THREE.MathUtils.damp(shieldMesh.position.x, -0.1, 14, dt);
        shieldMesh.position.y = THREE.MathUtils.damp(shieldMesh.position.y, -0.05, 14, dt);
        shieldMesh.position.z = THREE.MathUtils.damp(shieldMesh.position.z, 0.02, 14, dt);
        shieldMesh.rotation.y = THREE.MathUtils.damp(shieldMesh.rotation.y, 0.6, 14, dt);
      } else {
        shieldMesh.position.x = THREE.MathUtils.damp(shieldMesh.position.x, -0.35, 14, dt);
        shieldMesh.position.y = THREE.MathUtils.damp(shieldMesh.position.y, -0.2, 14, dt);
        shieldMesh.position.z = THREE.MathUtils.damp(shieldMesh.position.z, 0.1, 14, dt);
        shieldMesh.rotation.y = THREE.MathUtils.damp(shieldMesh.rotation.y, 0, 14, dt);
      }
    },
  };
}
