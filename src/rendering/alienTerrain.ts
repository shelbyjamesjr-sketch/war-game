/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { ObeliskState } from '../types/game';

/**
 * Returns height of the terrain at any (x, z) coordinate.
 * Used for placing units, props, and camera flush on ground.
 */
export function getTerrainHeight(x: number, z: number): number {
  // Gentle rolling alien dunes with subtle craters
  const d = Math.hypot(x, z);
  const wave1 = Math.sin(x * 0.035) * Math.cos(z * 0.035) * 2.2;
  const wave2 = Math.sin(x * 0.08 + 1.2) * Math.sin(z * 0.07 + 0.4) * 0.8;
  const rim = Math.sin(d * 0.05) * 0.6;
  return wave1 + wave2 + rim;
}

/**
 * Generates procedural cracked alien crust texture
 */
function createAlienCrustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dusty ochre/crimson tone
  ctx.fillStyle = '#452229';
  ctx.fillRect(0, 0, 512, 512);

  // Micro craters and noise speckles
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 4 + 1;
    const brightness = Math.floor(Math.random() * 60 + 20);
    ctx.fillStyle = `rgb(${brightness + 40}, ${brightness + 10}, ${brightness + 15})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cracks
  ctx.strokeStyle = '#200e14';
  ctx.lineWidth = 1.5;
  for (let c = 0; c < 35; c++) {
    let px = Math.random() * 512;
    let py = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let seg = 0; seg < 6; seg++) {
      px += (Math.random() - 0.5) * 60;
      py += (Math.random() - 0.5) * 60;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface AlienWorldProps {
  scene: THREE.Scene;
  obelisks: ObeliskState[];
}

export interface AlienWorld {
  groundMesh: THREE.Mesh;
  obeliskMeshes: Map<string, { group: THREE.Group; beacon: THREE.Mesh; crystal: THREE.Mesh; light: THREE.PointLight }>;
  update: (time: number) => void;
  dispose: () => void;
}

export function createAlienWorld({ scene, obelisks }: AlienWorldProps): AlienWorld {
  // 1. Terrain Mesh
  const terrainSize = 260;
  const segments = 120;
  const geom = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    pos.setY(i, vy);
  }
  geom.computeVertexNormals();

  const crustTex = createAlienCrustTexture();
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x5a2d36,
    roughness: 0.88,
    metalness: 0.12,
    map: crustTex,
    bumpMap: crustTex,
    bumpScale: 0.15,
  });

  const groundMesh = new THREE.Mesh(geom, terrainMat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // 2. Alien Sky & Celestial Moons
  // Sky dome / background
  scene.background = new THREE.Color(0x1a0d18);
  scene.fog = new THREE.FogExp2(0x1e0f1e, 0.012);

  // Dual Moons:
  // Primary giant ringed moon
  const moonGroup = new THREE.Group();
  const moonGeom = new THREE.SphereGeometry(18, 32, 32);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
  const moon = new THREE.Mesh(moonGeom, moonMat);
  moon.position.set(-90, 80, -140);
  moonGroup.add(moon);

  // Planetary ring
  const ringGeom = new THREE.RingGeometry(24, 38, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI * 0.35;
  ring.rotation.y = Math.PI * 0.15;
  ring.position.copy(moon.position);
  moonGroup.add(ring);

  // Secondary red dwarf moon
  const redMoonGeom = new THREE.SphereGeometry(8, 24, 24);
  const redMoonMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });
  const redMoon = new THREE.Mesh(redMoonGeom, redMoonMat);
  redMoon.position.set(110, 65, -120);
  moonGroup.add(redMoon);

  scene.add(moonGroup);

  // 3. Procedural Obsidian Rock Spires and Alien Xenoliths
  const spireGroup = new THREE.Group();
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x1f1724,
    roughness: 0.65,
    metalness: 0.45,
  });

  // Spread 45 atmospheric alien rock monoliths
  const spireGeom = new THREE.ConeGeometry(2.5, 12, 5);
  for (let s = 0; s < 45; s++) {
    const angle = (s / 45) * Math.PI * 2 + Math.random() * 0.3;
    const rad = 25 + Math.random() * 85;
    const sx = Math.cos(angle) * rad;
    const sz = Math.sin(angle) * rad;
    const sy = getTerrainHeight(sx, sz);

    const m = new THREE.Mesh(spireGeom, spireMat);
    m.position.set(sx, sy + 5.5, sz);
    m.rotation.y = Math.random() * Math.PI;
    m.rotation.z = (Math.random() - 0.5) * 0.25;
    const scale = 0.6 + Math.random() * 0.9;
    m.scale.set(scale, scale * (0.8 + Math.random() * 0.8), scale);
    m.castShadow = true;
    m.receiveShadow = true;
    spireGroup.add(m);
  }
  scene.add(spireGroup);

  // 4. Bioluminescent Alien Flora / Energy Crystals
  const crystalGroup = new THREE.Group();
  const crystalGeom = new THREE.OctahedronGeometry(0.8, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.8,
  });

  for (let c = 0; c < 60; c++) {
    const cx = (Math.random() - 0.5) * 160;
    const cz = (Math.random() - 0.5) * 160;
    const cy = getTerrainHeight(cx, cz);
    const mesh = new THREE.Mesh(crystalGeom, crystalMat);
    mesh.position.set(cx, cy + 0.6, cz);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    const sc = 0.5 + Math.random() * 0.8;
    mesh.scale.set(sc, sc * 1.6, sc);
    crystalGroup.add(mesh);
  }
  scene.add(crystalGroup);

  // 5. Ancient Alien Obelisks (The Strategic Objectives)
  const obeliskMeshes = new Map<string, { group: THREE.Group; beacon: THREE.Mesh; crystal: THREE.Mesh; light: THREE.PointLight }>();

  obelisks.forEach((ob) => {
    const g = new THREE.Group();
    const groundY = getTerrainHeight(ob.x, ob.z);
    g.position.set(ob.x, groundY, ob.z);

    // Multi-part Obelisk monument (Base ring + tiered pedestal + carved pillar + floating alien power crystal + vertical energy ray)
    // 1) Base Ring
    const baseGeom = new THREE.CylinderGeometry(6, 7.5, 1.4, 8);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x2b1e2e,
      roughness: 0.7,
      metalness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeom, stoneMat);
    baseMesh.position.y = 0.7;
    baseMesh.receiveShadow = true;
    g.add(baseMesh);

    // 2) Tier 2 Pedestal with glowing runic insets
    const tierGeom = new THREE.CylinderGeometry(3.6, 4.8, 2.0, 6);
    const tierMesh = new THREE.Mesh(tierGeom, stoneMat);
    tierMesh.position.y = 2.2;
    g.add(tierMesh);

    // 3) Obelisk Pillar Columns (3 angled pylons surrounding the core)
    for (let p = 0; p < 3; p++) {
      const pylonAngle = (p / 3) * Math.PI * 2;
      const pylonGeom = new THREE.BoxGeometry(0.8, 11, 0.8);
      const pylon = new THREE.Mesh(pylonGeom, stoneMat);
      pylon.position.set(Math.cos(pylonAngle) * 2.2, 7.5, Math.sin(pylonAngle) * 2.2);
      pylon.rotation.y = pylonAngle;
      pylon.rotation.z = 0.08;
      g.add(pylon);
    }

    // 4) Floating Alien Crystal Heart
    const heartGeom = new THREE.OctahedronGeometry(1.6, 1);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
    });
    const crystal = new THREE.Mesh(heartGeom, heartMat);
    crystal.position.y = 8.5;
    g.add(crystal);

    // 5) Beacon Light & Sky Beam
    const beaconLight = new THREE.PointLight(0xa855f7, 2.5, 28);
    beaconLight.position.y = 9.0;
    g.add(beaconLight);

    // Sky Beam (vertical glowing cylinder reaching clouds)
    const beamGeom = new THREE.CylinderGeometry(0.5, 0.8, 70, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const beacon = new THREE.Mesh(beamGeom, beamMat);
    beacon.position.y = 44;
    g.add(beacon);

    scene.add(g);
    obeliskMeshes.set(ob.id, { group: g, beacon, crystal, light: beaconLight });
  });

  return {
    groundMesh,
    obeliskMeshes,
    update: (time: number) => {
      // Rotate crystal and pulse beacon
      obeliskMeshes.forEach(({ crystal, beacon, light }, id) => {
        crystal.rotation.y = time * 0.8;
        crystal.rotation.x = Math.sin(time * 0.5) * 0.2;
        crystal.position.y = 8.5 + Math.sin(time * 2.0) * 0.3;
        const targetOb = obelisks.find((o) => o.id === id);
        if (targetOb) {
          let hex = 0xa855f7; // purple neutral
          if (targetOb.owner === 'spartans') hex = 0xdc2626;
          else if (targetOb.owner === 'romans') hex = 0xb91c1c;
          else if (targetOb.owner === 'greeks') hex = 0x0284c7;

          const col = new THREE.Color(hex);
          (crystal.material as THREE.MeshStandardMaterial).emissive.copy(col);
          (beacon.material as THREE.MeshBasicMaterial).color.copy(col);
          light.color.copy(col);
        }
      });
    },
    dispose: () => {
      geom.dispose();
      terrainMat.dispose();
      crustTex.dispose();
    },
  };
}
