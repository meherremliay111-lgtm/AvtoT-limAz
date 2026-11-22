import * as THREE from 'three';
import { EnvironmentType, TimeOfDay } from './types';

export type TrafficLightColor = 'green' | 'green_blink' | 'yellow' | 'red';

export interface TrafficLightPole {
  id: string;
  intersectionId: string;
  axis: 'ns' | 'ew'; // ns controls traffic moving along Z; ew controls traffic moving along X
  x: number;
  z: number;
  stopLineCoord: number; // Z or X coordinate of stop line
  approachDir: number; // +1 or -1
  redMesh: THREE.Mesh;
  yellowMesh: THREE.Mesh;
  greenMesh: THREE.Mesh;
}

export interface WorldSignTrigger {
  code: string;
  title: string;
  x: number;
  z: number;
  radius: number;
  ruleType:
    | 'speed_limit'
    | 'stop'
    | 'yield'
    | 'main_road'
    | 'roundabout'
    | 'no_entry'
    | 'no_overtake'
    | 'no_stopping'
    | 'pedestrian'
    | 'parking'
    | 'living_zone'
    | 'motorway'
    | 'fuel';
  limitValue?: number;
}

export interface CrosswalkZone {
  id: string;
  x: number;
  z: number;
  orientation: 'ns' | 'ew'; // ns = road runs N-S, pedestrians cross E-W
  width: number;
  length: number;
}

export interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WaypointNode {
  x: number;
  z: number;
}

export interface WorldData {
  root: THREE.Group;
  startPos: { x: number; z: number; heading: number };
  trafficLightPoles: TrafficLightPole[];
  signTriggers: WorldSignTrigger[];
  crosswalks: CrosswalkZone[];
  colliders: BuildingCollider[];
  parkingZones: { x: number; z: number; w: number; l: number; label: string }[];
  noStoppingZones: { x: number; z: number; radius: number }[];
  fuelStations: { x: number; z: number; radius: number }[];
  roundaboutCenter: { x: number; z: number; innerR: number; outerR: number } | null;
  regulatorPos: { x: number; z: number } | null;
  streetLampLights: THREE.PointLight[];
  windowMaterials: THREE.MeshStandardMaterial[];
  vehicleLoops: WaypointNode[][];
  pedestrianPaths: WaypointNode[][];
  cyclistLoop: WaypointNode[];
  solidLineSegments: { x1: number; z1: number; x2: number; z2: number }[];
}

function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#252932';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 32 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSignFaceTexture(
  code: string,
  label: string,
  shape: 'triangle' | 'circle' | 'diamond' | 'octagon' | 'rect',
  bgColor: string,
  borderColor: string,
  textColor = '#0F172A'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(128, 128, 114, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 22;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  } else if (shape === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(128, 18);
    ctx.lineTo(238, 224);
    ctx.lineTo(18, 224);
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 20;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  } else if (shape === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(128, 14);
    ctx.lineTo(242, 128);
    ctx.lineTo(128, 242);
    ctx.lineTo(14, 128);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(128, 44);
    ctx.lineTo(212, 128);
    ctx.lineTo(128, 212);
    ctx.lineTo(44, 128);
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
  } else if (shape === 'octagon') {
    ctx.beginPath();
    const r = 114;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const px = 128 + r * Math.cos(a);
      const py = 128 + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(18, 18, 220, 220);
    ctx.lineWidth = 12;
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(18, 18, 220, 220);
  }

  // Draw crisp inner symbol / text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (code === '3.1') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(52, 108, 152, 40);
  } else if (code === '3.27') {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(56, 56);
    ctx.lineTo(200, 200);
    ctx.moveTo(200, 56);
    ctx.lineTo(56, 200);
    ctx.stroke();
  } else if (code === '2.4') {
    // Inverted yield triangle
    ctx.clearRect(0, 0, 256, 256);
    ctx.beginPath();
    ctx.moveTo(18, 32);
    ctx.lineTo(238, 32);
    ctx.lineTo(128, 232);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#DC2626';
    ctx.stroke();
  } else {
    ctx.font = label.length > 3 ? 'bold 54px sans-serif' : 'bold 82px sans-serif';
    const yPos = shape === 'triangle' ? 158 : 130;
    ctx.fillText(label, 128, yPos);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSignPost(
  x: number,
  z: number,
  rotY: number,
  code: string,
  label: string,
  shape: 'triangle' | 'circle' | 'diamond' | 'octagon' | 'rect',
  bgColor: string,
  borderColor: string,
  textColor = '#0F172A'
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.055, 2.75, 10),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.35 })
  );
  pole.position.y = 1.375;
  pole.castShadow = true;
  g.add(pole);

  const tex = createSignFaceTexture(code, label, shape, bgColor, borderColor, textColor);
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.2,
    roughness: 0.35,
  });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.4 });

  const plateFront = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), faceMat);
  plateFront.position.set(0, 2.45, 0.06);
  g.add(plateFront);

  const plateBack = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), backMat);
  plateBack.position.set(0, 2.45, 0.05);
  plateBack.rotation.y = Math.PI;
  g.add(plateBack);

  return g;
}

function createTrafficLightPoleMesh(
  id: string,
  intersectionId: string,
  axis: 'ns' | 'ew',
  x: number,
  z: number,
  rotY: number,
  stopLineCoord: number,
  approachDir: number
): { group: THREE.Group; poleData: TrafficLightPole } {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.2, 10), metalMat);
  pole.position.y = 2.6;
  pole.castShadow = true;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), metalMat);
  arm.position.set(-1.2, 4.9, 0);
  group.add(arm);

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.15, 0.32), metalMat);
  box.position.set(-2.2, 4.5, 0);
  group.add(box);

  const makeLens = (y: number, hex: number) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 16),
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.1,
        roughness: 0.2,
      })
    );
    m.position.set(-2.2, y, 0.17);
    group.add(m);
    return m;
  };

  const redMesh = makeLens(4.85, 0xef4444);
  const yellowMesh = makeLens(4.5, 0xf59e0b);
  const greenMesh = makeLens(4.15, 0x10b981);

  return {
    group,
    poleData: {
      id,
      intersectionId,
      axis,
      x,
      z,
      stopLineCoord,
      approachDir,
      redMesh,
      yellowMesh,
      greenMesh,
    },
  };
}

function addRoadStrip(
  root: THREE.Group,
  x: number,
  z: number,
  w: number,
  l: number,
  asphaltMat: THREE.Material,
  y = 0.02
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, l), asphaltMat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  root.add(mesh);
}

function addCrosswalk(
  root: THREE.Group,
  crosswalks: CrosswalkZone[],
  id: string,
  x: number,
  z: number,
  roadWidth: number,
  orientation: 'ns' | 'ew'
): void {
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const stripes = Math.floor(roadWidth / 1.1);
  for (let i = 0; i < stripes; i++) {
    const offset = -roadWidth / 2 + 0.65 + i * 1.1;
    const stripe =
      orientation === 'ns'
        ? new THREE.Mesh(new THREE.PlaneGeometry(0.55, 3.2), whiteMat)
        : new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.55), whiteMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(
      orientation === 'ns' ? x + offset : x,
      0.048,
      orientation === 'ns' ? z : z + offset
    );
    stripe.receiveShadow = true;
    root.add(stripe);
  }
  crosswalks.push({
    id,
    x,
    z,
    orientation,
    width: orientation === 'ns' ? roadWidth : 3.6,
    length: orientation === 'ns' ? 3.6 : roadWidth,
  });
}

function addTreesInstanced(
  root: THREE.Group,
  positions: { x: number; z: number; scale: number }[]
): void {
  if (positions.length === 0) return;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.4, 8);
  trunkGeo.translate(0, 1.2, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

  const crownGeo = new THREE.ConeGeometry(1.75, 4.4, 9);
  crownGeo.translate(0, 4.2, 0);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.85 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, positions.length);
  trunks.castShadow = true;
  crowns.castShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  positions.forEach((p, idx) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.scale.setScalar(p.scale);
    dummy.rotation.y = (idx * 1.37) % (Math.PI * 2);
    dummy.updateMatrix();
    trunks.setMatrixAt(idx, dummy.matrix);
    crowns.setMatrixAt(idx, dummy.matrix);

    color.setHSL(0.36 + (idx % 5) * 0.012, 0.45, 0.25 + (idx % 4) * 0.035);
    crowns.setColorAt(idx, color);
  });

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();

  root.add(trunks);
  root.add(crowns);
}

export function buildWorld(environment: EnvironmentType, timeOfDay: TimeOfDay): WorldData {
  const root = new THREE.Group();
  const trafficLightPoles: TrafficLightPole[] = [];
  const signTriggers: WorldSignTrigger[] = [];
  const crosswalks: CrosswalkZone[] = [];
  const colliders: BuildingCollider[] = [];
  const parkingZones: { x: number; z: number; w: number; l: number; label: string }[] = [];
  const noStoppingZones: { x: number; z: number; radius: number }[] = [];
  const fuelStations: { x: number; z: number; radius: number }[] = [];
  const streetLampLights: THREE.PointLight[] = [];
  const windowMaterials: THREE.MeshStandardMaterial[] = [];
  const vehicleLoops: WaypointNode[][] = [];
  const pedestrianPaths: WaypointNode[][] = [];
  const cyclistLoop: WaypointNode[] = [];
  const solidLineSegments: { x1: number; z1: number; x2: number; z2: number }[] = [];

  const asphaltTex = createAsphaltTexture();
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.78,
    metalness: 0.05,
  });

  const groundMat = new THREE.MeshStandardMaterial({
    color: environment === 'village' ? 0x3a5a40 : 0x334155,
    roughness: 0.92,
  });

  // Expansive terrain extending to horizon
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const yellowLineMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  const addLamp = (x: number, z: number, withPointLight: boolean) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 6.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 })
    );
    pole.position.set(x, 3.1, z);
    root.add(pole);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: timeOfDay === 'night' ? 1.8 : 0.05,
      })
    );
    bulb.position.set(x, 6.1, z);
    root.add(bulb);

    if (withPointLight) {
      const pl = new THREE.PointLight(0xfde68a, timeOfDay === 'night' ? 14 : 0, 28, 1.6);
      pl.position.set(x, 5.8, z);
      root.add(pl);
      streetLampLights.push(pl);
    }
  };

  if (environment === 'city') {
    // =====================================================
    // BAKI ŞƏHƏR MÜHİTİ
    // Outer square loop at X = ±120, Z = ±120, plus Central Cross Avenue (X=0, Z=0)
    // Road width = 14m (2 lanes each way = 7m per side)
    // =====================================================
    const roadW = 14;
    // Main avenues
    addRoadStrip(root, 0, 0, roadW, 260, asphaltMat); // Central N-S avenue (X=0)
    addRoadStrip(root, 0, 0, 260, roadW, asphaltMat); // Central E-W avenue (Z=0)
    addRoadStrip(root, -120, 0, roadW, 254, asphaltMat); // West boulevard
    addRoadStrip(root, 120, 0, roadW, 254, asphaltMat); // East boulevard
    addRoadStrip(root, 0, -120, 254, roadW, asphaltMat); // North boulevard
    addRoadStrip(root, 0, 120, 254, roadW, asphaltMat); // South boulevard

    // Sidewalk perimeter aprons around blocks
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const blockCenters = [
      [-60, -60],
      [60, -60],
      [-60, 60],
      [60, 60],
    ];
    const winMatDay = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0xfef08a,
      emissiveIntensity: timeOfDay === 'night' ? 0.85 : 0.05,
      roughness: 0.2,
    });
    windowMaterials.push(winMatDay);

    const bldgColors = [0xd6d3d1, 0xcbd5e1, 0xe7e5e4, 0x94a3b8];
    blockCenters.forEach(([bx, bz], bIdx) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(102, 0.16, 102), sidewalkMat);
      curb.position.set(bx, 0.08, bz);
      curb.receiveShadow = true;
      root.add(curb);

      // Two architectural buildings per city block
      for (let sub = 0; sub < 2; sub++) {
        const ox = bx + (sub === 0 ? -24 : 24);
        const oz = bz + (bIdx % 2 === 0 ? -16 : 16);
        const h = 16 + ((bIdx * 7 + sub * 5) % 18);
        const bw = 34;
        const bd = 38;
        const bMat = new THREE.MeshStandardMaterial({
          color: bldgColors[(bIdx + sub) % bldgColors.length],
          roughness: 0.72,
        });
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), bMat);
        bldg.position.set(ox, h / 2 + 0.16, oz);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        root.add(bldg);

        // Window bands
        for (let wy = 4; wy < h - 2; wy += 4.2) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.2, 1.4, bd + 0.2), winMatDay);
          band.position.set(ox, wy, oz);
          root.add(band);
        }

        colliders.push({
          minX: ox - bw / 2 - 1.2,
          maxX: ox + bw / 2 + 1.2,
          minZ: oz - bd / 2 - 1.2,
          maxZ: oz + bd / 2 + 1.2,
        });
      }
    });

    // Double solid center lines along Central Avenue (PDF p. 63: crossing white/yellow line = -100 pts)
    for (const segZ of [-65, 65]) {
      const lineL = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 86), lineMat);
      lineL.rotation.x = -Math.PI / 2;
      lineL.position.set(-0.22, 0.046, segZ);
      root.add(lineL);

      const lineR = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 86), lineMat);
      lineR.rotation.x = -Math.PI / 2;
      lineR.position.set(0.22, 0.046, segZ);
      root.add(lineR);

      solidLineSegments.push({ x1: 0, z1: segZ - 42, x2: 0, z2: segZ + 42 });
    }

    // Roundabout at (0, -120) — North Central Junction
    const rCenter = { x: 0, z: -120, innerR: 9, outerR: 21 };
    const rIsland = new THREE.Mesh(
      new THREE.CylinderGeometry(rCenter.innerR, rCenter.innerR, 0.35, 32),
      new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85 })
    );
    rIsland.position.set(rCenter.x, 0.175, rCenter.z);
    root.add(rIsland);

    const rRing = new THREE.Mesh(
      new THREE.RingGeometry(rCenter.innerR, rCenter.outerR, 40),
      asphaltMat
    );
    rRing.rotation.x = -Math.PI / 2;
    rRing.position.set(rCenter.x, 0.044, rCenter.z);
    root.add(rRing);

    colliders.push({
      minX: rCenter.x - 7.5,
      maxX: rCenter.x + 7.5,
      minZ: rCenter.z - 7.5,
      maxZ: rCenter.z + 7.5,
    });

    // Signalized Central Intersection (0, 0) — 4 Traffic Light Poles
    const polesConfig: [string, 'ns' | 'ew', number, number, number, number, number][] = [
      ['tl_n', 'ns', 7.8, -11, 0, -11, 1], // Facing -Z? Wait: traffic going +Z stops at Z=-11
      ['tl_s', 'ns', -7.8, 11, Math.PI, 11, -1], // Traffic going -Z (northbound) stops at Z=+11
      ['tl_e', 'ew', 11, 7.8, -Math.PI / 2, 11, -1],
      ['tl_w', 'ew', -11, -7.8, Math.PI / 2, -11, 1],
    ];
    polesConfig.forEach(([id, axis, px, pz, ry, stopCoord, dir]) => {
      const { group, poleData } = createTrafficLightPoleMesh(id, 'central', axis, px, pz, ry, stopCoord, dir);
      root.add(group);
      trafficLightPoles.push(poleData);
    });

    // Crosswalks around Central Intersection & South Avenue
    addCrosswalk(root, crosswalks, 'cw_south', 0, 14, roadW, 'ns');
    addCrosswalk(root, crosswalks, 'cw_north', 0, -14, roadW, 'ns');
    addCrosswalk(root, crosswalks, 'cw_east', 14, 0, roadW, 'ew');
    addCrosswalk(root, crosswalks, 'cw_west', -14, 0, roadW, 'ew');
    addCrosswalk(root, crosswalks, 'cw_mid_s', 0, 62, roadW, 'ns');

    // Dedicated Parking Zone (5.15) at East Side of Central South Avenue (X = +9.5, Z = +40)
    const parkBay = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 14),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    parkBay.rotation.x = -Math.PI / 2;
    parkBay.position.set(10.5, 0.045, 42);
    root.add(parkBay);
    parkingZones.push({ x: 10.5, z: 42, w: 5.5, l: 15, label: '5.15 Parklama meydançası' });

    // Fuel Station (6.3 YDM) at (102, 22)
    const ydmPad = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    ydmPad.position.set(105, 0.05, 22);
    root.add(ydmPad);
    const ydmCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.45, 11),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
    );
    ydmCanopy.position.set(105, 4.4, 22);
    root.add(ydmCanopy);
    fuelStations.push({ x: 105, z: 22, radius: 10 });

    // No-Stopping Zone (3.27) along West Boulevard
    noStoppingZones.push({ x: -120, z: 40, radius: 18 });

    // Street signs placed realistically along roads
    const citySigns: [number, number, number, string, string, 'triangle' | 'circle' | 'diamond' | 'octagon' | 'rect', string, string, string, WorldSignTrigger['ruleType'], number?][] = [
      [8.2, 82, 0, '3.24', '60', 'circle', '#FFFFFF', '#DC2626', '#0F172A', 'speed_limit', 60],
      [8.2, 68, 0, '5.16.1', 'PİY', 'rect', '#0284C7', '#FFFFFF', '#FFFFFF', 'pedestrian'],
      [13.5, 50, 0, '5.15', 'P', 'rect', '#0284C7', '#FFFFFF', '#FFFFFF', 'parking'],
      [8.2, 24, 0, '2.1', '', 'diamond', '#FACC15', '#FFFFFF', '#0F172A', 'main_road'],
      [8.2, -96, 0, '4.3', '↺', 'circle', '#0284C7', '#FFFFFF', '#FFFFFF', 'roundabout'],
      [-8.2, -55, Math.PI, '3.20', 'ÖT', 'circle', '#FFFFFF', '#DC2626', '#0F172A', 'no_overtake'],
      [112, -111, Math.PI / 2, '2.5', 'STOP', 'octagon', '#DC2626', '#FFFFFF', '#FFFFFF', 'stop'],
      [-112, 24, -Math.PI / 2, '3.27', '', 'circle', '#1D4ED8', '#DC2626', '#FFFFFF', 'no_stopping'],
      [96, 12, 0, '6.3', 'YDM', 'rect', '#0284C7', '#FFFFFF', '#FFFFFF', 'fuel'],
      [-112, -111, -Math.PI / 2, '2.4', '', 'triangle', '#FFFFFF', '#DC2626', '#0F172A', 'yield'],
    ];

    citySigns.forEach(([sx, sz, sry, code, lbl, shape, bg, border, txt, ruleType, limitVal]) => {
      root.add(createSignPost(sx, sz, sry, code, lbl, shape, bg, border, txt));
      signTriggers.push({
        code,
        title: `${code} nişanı`,
        x: sx,
        z: sz,
        radius: 16,
        ruleType,
        limitValue: limitVal,
      });
    });

    // Lamps
    for (let d = -100; d <= 100; d += 40) {
      addLamp(9, d, d === -40 || d === 40);
      addLamp(-9, d, false);
    }

    // Trees
    const treePos: { x: number; z: number; scale: number }[] = [];
    for (let i = -95; i <= 95; i += 22) {
      if (Math.abs(i) < 15) continue;
      treePos.push({ x: 10, z: i, scale: 0.9 });
      treePos.push({ x: -10, z: i, scale: 0.95 });
    }
    addTreesInstanced(root, treePos);

    // AI Vehicle Loops (Right-hand traffic in Azerbaijan!)
    vehicleLoops.push([
      { x: 3.5, z: 116.5 },
      { x: 3.5, z: -102 },
      { x: 14, z: -116.5 },
      { x: 116.5, z: -116.5 },
      { x: 116.5, z: 116.5 },
    ]);
    vehicleLoops.push([
      { x: -3.5, z: -102 },
      { x: -3.5, z: 116.5 },
      { x: -116.5, z: 116.5 },
      { x: -116.5, z: -116.5 },
      { x: -14, z: -116.5 },
    ]);
    vehicleLoops.push([
      { x: -110, z: 3.5 },
      { x: 110, z: 3.5 },
      { x: 116.5, z: -3.5 },
      { x: -116.5, z: -3.5 },
    ]);

    // Pedestrians crossing at zebra crossings
    pedestrianPaths.push([
      { x: -9.5, z: 62 },
      { x: 9.5, z: 62 },
    ]);
    pedestrianPaths.push([
      { x: 9.5, z: 14 },
      { x: -9.5, z: 14 },
    ]);
    pedestrianPaths.push([
      { x: -9.5, z: -14 },
      { x: 9.5, z: -14 },
    ]);

    // Cyclist riding along right edge (PDF p. 25)
    cyclistLoop.push(
      { x: 5.8, z: 114 },
      { x: 5.8, z: -98 },
      { x: 114, z: -114 },
      { x: 114, z: 114 }
    );

    return {
      root,
      startPos: { x: 3.5, z: 96, heading: 0 },
      trafficLightPoles,
      signTriggers,
      crosswalks,
      colliders,
      parkingZones,
      noStoppingZones,
      fuelStations,
      roundaboutCenter: rCenter,
      regulatorPos: { x: 0, z: 0 },
      streetLampLights,
      windowMaterials,
      vehicleLoops,
      pedestrianPaths,
      cyclistLoop,
      solidLineSegments,
    };
  }

  if (environment === 'village') {
    // =====================================================
    // KƏND YOLU MÜHİTİ (Dar ikitərəfli yol, döngələr, körpü, məhdud görünüş)
    // =====================================================
    const roadW = 8.4; // Narrow 2-lane road
    // Rectangular scenic country loop with curves / corners at ±140
    addRoadStrip(root, 0, -140, 288, roadW, asphaltMat);
    addRoadStrip(root, 0, 140, 288, roadW, asphaltMat);
    addRoadStrip(root, -140, 0, roadW, 288, asphaltMat);
    addRoadStrip(root, 140, 0, roadW, 288, asphaltMat);
    // Village center cross-road
    addRoadStrip(root, 0, 0, roadW, 280, asphaltMat);

    // Solid center line near blind corners (PDF p. 39, 67)
    const cLine = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 160), lineMat);
    cLine.rotation.x = -Math.PI / 2;
    cLine.position.set(0, 0.046, 0);
    root.add(cLine);
    solidLineSegments.push({ x1: 0, z1: -80, x2: 0, z2: 80 });

    // Crosswalk near village school/market
    addCrosswalk(root, crosswalks, 'cw_village', 0, 32, roadW, 'ns');
    pedestrianPaths.push([
      { x: -6.5, z: 32 },
      { x: 6.5, z: 32 },
    ]);

    // Village houses
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
    const houseCoords = [
      [-18, 50],
      [18, 12],
      [-22, -45],
      [20, -78],
      [-70, -124],
      [75, 124],
    ];
    houseCoords.forEach(([hx, hz]) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 7.5), houseMat);
      base.position.set(hx, 2.1, hz);
      base.castShadow = true;
      root.add(base);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 2.8, 4), roofMat);
      roof.position.set(hx, 5.6, hz);
      roof.rotation.y = Math.PI / 4;
      root.add(roof);
      colliders.push({ minX: hx - 5, maxX: hx + 5, minZ: hz - 4.5, maxZ: hz + 4.5 });
    });

    // Dense tree groves
    const treePos: { x: number; z: number; scale: number }[] = [];
    for (let i = -120; i <= 120; i += 18) {
      if (Math.abs(i) < 12) continue;
      treePos.push({ x: -12, z: i, scale: 1.15 });
      treePos.push({ x: 12, z: i, scale: 1.1 });
      treePos.push({ x: i, z: -126, scale: 1.2 });
      treePos.push({ x: i, z: 126, scale: 1.15 });
    }
    addTreesInstanced(root, treePos);

    // Village road signs (1.11.1, 1.20, 1.24, 3.20, 3.24 40)
    const vSigns: [number, number, number, string, string, 'triangle' | 'circle' | 'diamond' | 'octagon' | 'rect', string, string, string, WorldSignTrigger['ruleType'], number?][] = [
      [5.5, 65, 0, '3.24', '40', 'circle', '#FFFFFF', '#DC2626', '#0F172A', 'speed_limit', 40],
      [5.5, 48, 0, '1.20', 'PİY', 'triangle', '#FFFFFF', '#DC2626', '#0F172A', 'pedestrian'],
      [5.5, 15, 0, '3.20', 'ÖT', 'circle', '#FFFFFF', '#DC2626', '#0F172A', 'no_overtake'],
      [5.5, -110, 0, '1.11.1', '↱', 'triangle', '#FFFFFF', '#DC2626', '#0F172A', 'yield'],
      [-5.5, -60, Math.PI, '1.24', '🐄', 'triangle', '#FFFFFF', '#DC2626', '#0F172A', 'yield'],
    ];
    vSigns.forEach(([sx, sz, sry, code, lbl, shape, bg, border, txt, ruleType, limitVal]) => {
      root.add(createSignPost(sx, sz, sry, code, lbl, shape, bg, border, txt));
      signTriggers.push({ code, title: `${code} nişanı`, x: sx, z: sz, radius: 14, ruleType, limitValue: limitVal });
    });

    vehicleLoops.push([
      { x: 2.1, z: 138 },
      { x: 2.1, z: -138 },
      { x: 138, z: -138 },
      { x: 138, z: 138 },
    ]);
    vehicleLoops.push([
      { x: -2.1, z: -138 },
      { x: -2.1, z: 138 },
      { x: -138, z: 138 },
      { x: -138, z: -138 },
    ]);
    cyclistLoop.push(
      { x: 3.3, z: 136 },
      { x: 3.3, z: -136 },
      { x: 136, z: -136 },
      { x: 136, z: 136 }
    );

    return {
      root,
      startPos: { x: 2.1, z: 112, heading: 0 },
      trafficLightPoles,
      signTriggers,
      crosswalks,
      colliders,
      parkingZones,
      noStoppingZones,
      fuelStations,
      roundaboutCenter: null,
      regulatorPos: null,
      streetLampLights,
      windowMaterials,
      vehicleLoops,
      pedestrianPaths,
      cyclistLoop,
      solidLineSegments,
    };
  }

  // =====================================================
  // AVTOMAGİSTRAL MÜHİTİ (Çoxzolaqlı, 110 km/saat, Ayırıcı zolaq, İstirahət/YDM)
  // =====================================================
  const halfW = 12; // 3 lanes per direction (12m each carriageway)
  // Long oval highway loop: straight stretches X = -140 and X = +140, Z from -260 to +260
  addRoadStrip(root, 14, 0, halfW, 540, asphaltMat); // Northbound carriageway (X = +14, 3 lanes)
  addRoadStrip(root, -14, 0, halfW, 540, asphaltMat); // Southbound carriageway (X = -14, 3 lanes)
  // Connecting curved/straight highway ends
  addRoadStrip(root, 140, 0, halfW, 540, asphaltMat);
  addRoadStrip(root, 77, -264, 150, 24, asphaltMat);
  addRoadStrip(root, 77, 264, 150, 24, asphaltMat);

  // Central Median Jersey Barrier (Ayırıcı zolaq - PDF p. 6-7)
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const median = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 510), barrierMat);
  median.position.set(0, 0.475, 0);
  median.castShadow = true;
  root.add(median);
  colliders.push({ minX: -1.6, maxX: 1.6, minZ: -255, maxZ: 255 });

  // Dashed lane lines on Northbound carriageway (X = +10, +14, +18)
  for (let z = -250; z <= 250; z += 12) {
    for (const lx of [12, 16, -12, -16]) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lx, 0.046, z);
      root.add(dash);
    }
  }

  // Yellow shoulder edge line (PDF p. 63)
  const shoulderR = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 520), yellowLineMat);
  shoulderR.rotation.x = -Math.PI / 2;
  shoulderR.position.set(19.6, 0.046, 0);
  root.add(shoulderR);
  solidLineSegments.push({ x1: 19.6, z1: -250, x2: 19.6, z2: 250 });

  // Rest Area & YDM off-ramp on East side at X = +28, Z = -60
  addRoadStrip(root, 26, -60, 14, 48, asphaltMat);
  parkingZones.push({ x: 28, z: -60, w: 8, l: 26, label: '6.9 Magistral istirahət meydançası' });
  fuelStations.push({ x: 28, z: -76, radius: 9 });

  // Highway signs (5.1 Avtomagistral, 3.24 110, 6.9 Istirahət, 6.3 YDM)
  const hSigns: [number, number, number, string, string, 'triangle' | 'circle' | 'diamond' | 'octagon' | 'rect', string, string, string, WorldSignTrigger['ruleType'], number?][] = [
    [21.2, 210, 0, '5.1', 'MAG', 'rect', '#15803D', '#FFFFFF', '#FFFFFF', 'motorway', 110],
    [21.2, 160, 0, '3.24', '110', 'circle', '#FFFFFF', '#DC2626', '#0F172A', 'speed_limit', 110],
    [21.2, 10, 0, '3.24', '110', 'circle', '#FFFFFF', '#DC2626', '#0F172A', 'speed_limit', 110],
    [21.2, -32, 0, '6.9', 'P / ☕', 'rect', '#0284C7', '#FFFFFF', '#FFFFFF', 'parking'],
    [21.2, -85, 0, '6.3', 'YDM', 'rect', '#0284C7', '#FFFFFF', '#FFFFFF', 'fuel'],
  ];
  hSigns.forEach(([sx, sz, sry, code, lbl, shape, bg, border, txt, ruleType, limitVal]) => {
    root.add(createSignPost(sx, sz, sry, code, lbl, shape, bg, border, txt));
    signTriggers.push({ code, title: `${code} nişanı`, x: sx, z: sz, radius: 22, ruleType, limitValue: limitVal });
  });

  // Highway Lamps & Trees
  for (let z = -220; z <= 220; z += 55) {
    addLamp(0, z, z === -110 || z === 0 || z === 110);
  }
  const hTrees: { x: number; z: number; scale: number }[] = [];
  for (let z = -240; z <= 240; z += 28) {
    hTrees.push({ x: -32, z, scale: 1.25 });
    if (Math.abs(z + 60) > 35) hTrees.push({ x: 34, z, scale: 1.2 });
  }
  addTreesInstanced(root, hTrees);

  // Fast 3-lane highway traffic
  vehicleLoops.push([
    { x: 14, z: 255 },
    { x: 14, z: -255 },
    { x: 136, z: -255 },
    { x: 136, z: 255 },
  ]);
  vehicleLoops.push([
    { x: 18, z: 255 },
    { x: 18, z: -255 },
    { x: 144, z: -255 },
    { x: 144, z: 255 },
  ]);
  vehicleLoops.push([
    { x: -14, z: -255 },
    { x: -14, z: 255 },
    { x: 140, z: 264 },
    { x: 140, z: -264 },
  ]);

  return {
    root,
    startPos: { x: 14, z: 230, heading: 0 },
    trafficLightPoles,
    signTriggers,
    crosswalks,
    colliders,
    parkingZones,
    noStoppingZones,
    fuelStations,
    roundaboutCenter: null,
    regulatorPos: null,
    streetLampLights,
    windowMaterials,
    vehicleLoops,
    pedestrianPaths,
    cyclistLoop,
    solidLineSegments,
  };
}
