/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { FactionId } from '../types/game';

// Shared materials cache to minimize GPU allocations and draw calls
const materialsCache = new Map<string, THREE.Material>();

function getUnitMaterial(key: string, createFn: () => THREE.Material): THREE.Material {
  let mat = materialsCache.get(key);
  if (!mat) {
    mat = createFn();
    materialsCache.set(key, mat);
  }
  return mat;
}

/**
 * Creates procedural shield texture with faction insignia
 */
function createShieldTexture(faction: FactionId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (faction === 'spartans') {
    // Crimson base with bronze rim and golden Lambda (Λ)
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Golden Lambda
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(58, 200);
    ctx.lineTo(128, 55);
    ctx.lineTo(198, 200);
    ctx.stroke();
  } else if (faction === 'romans') {
    // Imperial red rectangle/oval with golden Roman winged thunderbolt / Eagle
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 236, 236);

    // Center Golden Umbo boss
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(128, 128, 38, 0, Math.PI * 2);
    ctx.fill();

    // Winged thunderbolts
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.beginPath();
    // Lightning diagonals
    ctx.moveTo(40, 40);
    ctx.lineTo(110, 110);
    ctx.moveTo(216, 40);
    ctx.lineTo(146, 110);
    ctx.moveTo(40, 216);
    ctx.lineTo(110, 146);
    ctx.moveTo(216, 216);
    ctx.lineTo(146, 146);
    ctx.stroke();
  } else {
    // Greeks: Aegean blue with golden rim and Athenian Owl / Sunburst
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Golden Owl silhouette / Sun rays
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 10;
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(angle) * 35, 128 + Math.sin(angle) * 35);
      ctx.lineTo(128 + Math.cos(angle) * 95, 128 + Math.sin(angle) * 95);
      ctx.stroke();
    }
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(128, 128, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface UnitMeshContainer {
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  weaponArm: THREE.Group;
  shieldArm: THREE.Group;
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  shadowDisc: THREE.Mesh;
  animate: (speed: number, time: number, isAttacking: boolean, isBlocking: boolean) => void;
}

/**
 * Builds a composite 3-12 part procedural character mesh
 */
export function createWarriorMesh(faction: FactionId, type: 'infantry' | 'ranged' | 'elite' | 'commander'): UnitMeshContainer {
  const root = new THREE.Group();

  // Faction Palette
  const isSpartan = faction === 'spartans';
  const isRoman = faction === 'romans';
  const tunicColor = isSpartan ? 0x991b1b : isRoman ? 0x881337 : 0x075985;
  const armorColor = isSpartan ? 0xb45309 : isRoman ? 0x64748b : 0xd97706; // bronze vs steel vs gold
  const crestColor = isSpartan ? 0xdc2626 : isRoman ? 0xe11d48 : 0x0284c7;

  // Materials
  const tunicMat = getUnitMaterial(`tunic_${faction}`, () => new THREE.MeshStandardMaterial({
    color: tunicColor,
    roughness: 0.85,
    metalness: 0.1,
  }));

  const armorMat = getUnitMaterial(`armor_${faction}`, () => new THREE.MeshStandardMaterial({
    color: armorColor,
    roughness: isRoman ? 0.35 : 0.45,
    metalness: isRoman ? 0.75 : 0.65,
  }));

  const fleshMat = getUnitMaterial('flesh', () => new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.7,
    metalness: 0.05,
  }));

  const crestMat = getUnitMaterial(`crest_${faction}`, () => new THREE.MeshStandardMaterial({
    color: crestColor,
    roughness: 0.9,
    metalness: 0.05,
  }));

  // 1. Soft Radial Contact Shadow Disc at feet
  const shadowGeom = new THREE.CircleGeometry(0.75, 16);
  shadowGeom.rotateX(-Math.PI / 2);
  const shadowMat = getUnitMaterial('unit_shadow', () => new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }));
  const shadowDisc = new THREE.Mesh(shadowGeom, shadowMat);
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  // 2. Legs / Greaves (Pivoted at hip y=0.8)
  const legGeom = new THREE.BoxGeometry(0.24, 0.75, 0.28);
  legGeom.translate(0, -0.375, 0); // pivot at top of leg
  const leftLeg = new THREE.Mesh(legGeom, armorMat);
  leftLeg.position.set(-0.22, 0.8, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeom, armorMat);
  rightLeg.position.set(0.22, 0.8, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  // 3. Torso / Breastplate (y = 0.8 to 1.6)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.8;

  // Tunic Skirt
  const skirtGeom = new THREE.CylinderGeometry(0.38, 0.46, 0.35, 8);
  const skirt = new THREE.Mesh(skirtGeom, tunicMat);
  skirt.position.y = 0.2;
  torsoGroup.add(skirt);

  // Muscled Cuirass / Lorica Segmentata
  const chestGeom = new THREE.BoxGeometry(0.58, 0.65, 0.42);
  const torso = new THREE.Mesh(chestGeom, armorMat);
  torso.position.y = 0.65;
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Cloak on back (for Spartans/Elites)
  if (isSpartan || type === 'elite' || type === 'commander') {
    const cloakGeom = new THREE.PlaneGeometry(0.55, 1.1);
    const cloakMat = getUnitMaterial(`cloak_${faction}`, () => new THREE.MeshStandardMaterial({
      color: crestColor,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }));
    const cloak = new THREE.Mesh(cloakGeom, cloakMat);
    cloak.position.set(0, 0.55, -0.25);
    cloak.rotation.x = -0.15;
    torsoGroup.add(cloak);
  }

  root.add(torsoGroup);

  // 4. Head & Helmet (y = 1.7)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.7, 0);

  // Head sphere
  const headGeom = new THREE.SphereGeometry(0.2, 12, 12);
  const head = new THREE.Mesh(headGeom, fleshMat);
  headGroup.add(head);

  // Helmet shell
  const helmetGeom = new THREE.CylinderGeometry(0.23, 0.25, 0.3, 10);
  const helmet = new THREE.Mesh(helmetGeom, armorMat);
  helmet.position.y = 0.05;
  helmet.castShadow = true;
  headGroup.add(helmet);

  // Helmet Crest
  const crestGeom = new THREE.BoxGeometry(0.08, 0.25, isRoman ? 0.6 : 0.45);
  const crest = new THREE.Mesh(crestGeom, crestMat);
  crest.position.set(0, 0.28, 0);
  if (isRoman) crest.rotation.y = Math.PI / 2; // Transverse crest for Romans!
  headGroup.add(crest);

  root.add(headGroup);

  // 5. Shield Arm (Left side)
  const shieldArm = new THREE.Group();
  shieldArm.position.set(-0.38, 1.35, 0);

  const armGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.45, 6);
  const armMesh = new THREE.Mesh(armGeom, fleshMat);
  armMesh.position.y = -0.22;
  shieldArm.add(armMesh);

  // Shield
  const shieldTex = createShieldTexture(faction);
  let shieldMesh: THREE.Mesh;
  if (isRoman) {
    // Rectangular curved Scutum
    const scutumGeom = new THREE.CylinderGeometry(0.7, 0.7, 1.25, 12, 1, true, -Math.PI / 4, Math.PI / 2);
    const scutumMat = new THREE.MeshStandardMaterial({
      map: shieldTex,
      roughness: 0.5,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });
    shieldMesh = new THREE.Mesh(scutumGeom, scutumMat);
    shieldMesh.rotation.y = -Math.PI / 4;
    shieldMesh.position.set(-0.1, -0.2, 0.35);
  } else {
    // Round Aspis
    const aspisGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16);
    aspisGeom.rotateX(Math.PI / 2);
    const aspisMat = new THREE.MeshStandardMaterial({
      map: shieldTex,
      roughness: 0.45,
      metalness: 0.5,
    });
    shieldMesh = new THREE.Mesh(aspisGeom, aspisMat);
    shieldMesh.position.set(-0.05, -0.2, 0.3);
  }
  shieldMesh.castShadow = true;
  shieldArm.add(shieldMesh);
  root.add(shieldArm);

  // 6. Weapon Arm (Right side)
  const weaponArm = new THREE.Group();
  weaponArm.position.set(0.38, 1.35, 0);

  const rightArmMesh = new THREE.Mesh(armGeom, fleshMat);
  rightArmMesh.position.y = -0.22;
  weaponArm.add(rightArmMesh);

  // Weapon: Spear/Pike for Spartans/Greeks, Gladius sword for Romans
  if (isRoman) {
    // Gladius sword
    const hiltGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6);
    const bladeGeom = new THREE.BoxGeometry(0.1, 0.85, 0.02);
    const metalMat = getUnitMaterial('gladius_blade', () => new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.9,
    }));
    const sword = new THREE.Group();
    const hilt = new THREE.Mesh(hiltGeom, armorMat);
    const blade = new THREE.Mesh(bladeGeom, metalMat);
    blade.position.y = 0.5;
    sword.add(hilt);
    sword.add(blade);
    sword.position.set(0.05, -0.35, 0.2);
    sword.rotation.x = Math.PI * 0.4;
    sword.castShadow = true;
    weaponArm.add(sword);
  } else {
    // Long Dory / Sarissa Spear
    const shaftLen = faction === 'greeks' ? 3.2 : 2.5;
    const shaftGeom = new THREE.CylinderGeometry(0.035, 0.035, shaftLen, 6);
    const tipGeom = new THREE.ConeGeometry(0.08, 0.4, 6);
    const woodMat = getUnitMaterial('spear_wood', () => new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8,
    }));
    const tipMat = getUnitMaterial('spear_tip', () => new THREE.MeshStandardMaterial({
      color: isSpartan ? 0xd97706 : 0x38bdf8,
      emissive: isSpartan ? 0x78350f : 0x0284c7,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    }));
    const spear = new THREE.Group();
    const shaft = new THREE.Mesh(shaftGeom, woodMat);
    const tip = new THREE.Mesh(tipGeom, tipMat);
    tip.position.y = shaftLen / 2 + 0.2;
    spear.add(shaft);
    spear.add(tip);
    spear.position.set(0.05, -0.2, 0.2);
    spear.rotation.x = Math.PI * 0.45;
    spear.castShadow = true;
    weaponArm.add(spear);
  }
  root.add(weaponArm);

  // Scale adjustment for commander/elites
  if (type === 'commander') {
    root.scale.set(1.2, 1.2, 1.2);
  } else if (type === 'elite') {
    root.scale.set(1.1, 1.1, 1.1);
  }

  return {
    root,
    leftLeg,
    rightLeg,
    weaponArm,
    shieldArm,
    torso,
    headGroup,
    shadowDisc,
    animate: (speed: number, time: number, isAttacking: boolean, isBlocking: boolean) => {
      // Leg stride walking
      if (speed > 0.1) {
        const stride = Math.sin(time * 9.0) * 0.55;
        leftLeg.rotation.x = stride;
        rightLeg.rotation.x = -stride;
        torsoGroup.position.y = 0.8 + Math.abs(Math.sin(time * 9.0)) * 0.06;
      } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        torsoGroup.position.y = 0.8;
      }

      // Shield blocking stance
      if (isBlocking) {
        shieldArm.position.z = 0.25;
        shieldArm.rotation.y = 0.4;
        shieldArm.rotation.x = -0.3;
      } else {
        shieldArm.position.z = 0;
        shieldArm.rotation.set(0, 0, 0);
      }

      // Weapon attack thrust
      if (isAttacking) {
        const thrust = Math.sin(time * 16.0);
        weaponArm.position.z = Math.max(0, thrust * 0.4);
        weaponArm.rotation.x = -0.4;
      } else {
        weaponArm.position.z = 0;
        weaponArm.rotation.x = 0;
      }
    },
  };
}
