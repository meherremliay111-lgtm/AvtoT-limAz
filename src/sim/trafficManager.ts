import * as THREE from 'three';
import {
  buildCyclist,
  buildPedestrian,
  buildRegulatorOfficer,
  buildTrafficVehicle,
  PedestrianRig,
  RegulatorRig,
  TrafficMeshRig,
  TrafficVehicleKind,
} from './vehicleModel';
import { PoliceSignalType, TrafficDensity } from './types';
import { TrafficLightColor, TrafficLightPole, WaypointNode, WorldData } from './worldBuilder';

interface AiVehicleAgent {
  id: string;
  kind: TrafficVehicleKind;
  rig: TrafficMeshRig;
  loop: WaypointNode[];
  waypointIndex: number;
  x: number;
  z: number;
  heading: number;
  speedMs: number;
  targetSpeedMs: number;
  isPolice: boolean;
  pursuitMode: boolean;
  halfWidth: number;
  halfLength: number;
}

interface PedestrianAgent {
  rig: PedestrianRig;
  path: WaypointNode[];
  toEnd: boolean;
  progress: number;
  speedMs: number;
  waitTimer: number;
  x: number;
  z: number;
  walkPhase: number;
}

interface CyclistAgent {
  rig: { group: THREE.Group; frontWheel: THREE.Mesh; rearWheel: THREE.Mesh };
  loop: WaypointNode[];
  waypointIndex: number;
  x: number;
  z: number;
  heading: number;
  speedMs: number;
}

const SEDAN_COLORS = ['#94a3b8', '#475569', '#0f766e', '#1d4ed8', '#f1f5f9', '#7c2d12', '#334155'];

export class TrafficManager {
  public readonly root = new THREE.Group();
  private vehicles: AiVehicleAgent[] = [];
  private pedestrians: PedestrianAgent[] = [];
  private cyclist: CyclistAgent | null = null;
  private regulator: RegulatorRig | null = null;
  private world: WorldData;

  // Traffic light controller
  private lightCycleTime = 0;
  private nsColor: TrafficLightColor = 'green';
  private ewColor: TrafficLightColor = 'red';

  // Regulator cycle controller
  private regTimer = 0;
  private regSignal: PoliceSignalType = 'left_turn_allowed';

  private playerStartX = 0;
  private playerStartZ = 0;

  // Reusable math helpers (zero allocation in loop)
  private readonly _dx = 0;

  constructor(world: WorldData, density: TrafficDensity) {
    this.world = world;
    this.playerStartX = world.startPos.x;
    this.playerStartZ = world.startPos.z;
    this.spawnVehicles(density);
    this.spawnPedestrians();
    this.spawnCyclist();
    this.spawnRegulator();
  }

  private spawnVehicles(density: TrafficDensity): void {
    if (this.world.vehicleLoops.length === 0) return;
    const count = density === 'low' ? 4 : density === 'medium' ? 8 : 12;

    for (let i = 0; i < count; i++) {
      const loop = this.world.vehicleLoops[i % this.world.vehicleLoops.length];
      if (loop.length < 2) continue;

      const isPolice = i === 0;
      const kind: TrafficVehicleKind = isPolice
        ? 'police'
        : i % 5 === 1
          ? 'bus'
          : i % 5 === 3
            ? 'truck'
            : 'sedan';

      const color = SEDAN_COLORS[i % SEDAN_COLORS.length];
      const rig = buildTrafficVehicle(kind, color);
      this.root.add(rig.group);

      const startIdx = Math.floor((i / count) * loop.length) % loop.length;
      const nextIdx = (startIdx + 1) % loop.length;
      const p0 = loop[startIdx];
      const p1 = loop[nextIdx];
      let tOffset = ((i * 0.27) % 0.7) + 0.1;
      let x = p0.x + (p1.x - p0.x) * tOffset;
      let z = p0.z + (p1.z - p0.z) * tOffset;
      // Keep minimum 32m clearance from player spawn so exam/start never triggers instant collision
      if (Math.hypot(x - this.playerStartX, z - this.playerStartZ) < 32) {
        tOffset = tOffset < 0.5 ? Math.min(0.88, tOffset + 0.35) : Math.max(0.05, tOffset - 0.35);
        x = p0.x + (p1.x - p0.x) * tOffset;
        z = p0.z + (p1.z - p0.z) * tOffset;
      }
      const heading = Math.atan2(-(p1.x - p0.x), -(p1.z - p0.z));

      rig.group.position.set(x, 0, z);
      rig.group.rotation.y = heading;

      const baseKmh =
        kind === 'bus' ? 42 : kind === 'truck' ? 46 : isPolice ? 54 : 48 + (i % 4) * 5;

      this.vehicles.push({
        id: `ai_${i}`,
        kind,
        rig,
        loop,
        waypointIndex: nextIdx,
        x,
        z,
        heading,
        speedMs: baseKmh / 3.6,
        targetSpeedMs: baseKmh / 3.6,
        isPolice,
        pursuitMode: false,
        halfWidth: kind === 'bus' || kind === 'truck' ? 1.2 : 0.95,
        halfLength: kind === 'bus' ? 4.4 : kind === 'truck' ? 3.5 : 2.35,
      });
    }
  }

  private spawnPedestrians(): void {
    const jackets = ['#0284c7', '#be123c', '#0f766e', '#ca8a04', '#4338ca'];
    this.world.pedestrianPaths.forEach((path, idx) => {
      if (path.length < 2) return;
      const rig = buildPedestrian(jackets[idx % jackets.length]);
      this.root.add(rig.group);
      const startProg = (idx * 0.33) % 0.8;
      const p0 = path[0];
      const p1 = path[1];
      const x = p0.x + (p1.x - p0.x) * startProg;
      const z = p0.z + (p1.z - p0.z) * startProg;
      rig.group.position.set(x, 0, z);
      this.pedestrians.push({
        rig,
        path,
        toEnd: true,
        progress: startProg,
        speedMs: 1.35 + (idx % 3) * 0.18,
        waitTimer: 0,
        x,
        z,
        walkPhase: idx * 1.4,
      });
    });
  }

  private spawnCyclist(): void {
    if (this.world.cyclistLoop.length < 2) return;
    const rig = buildCyclist();
    this.root.add(rig.group);
    const p0 = this.world.cyclistLoop[0];
    const p1 = this.world.cyclistLoop[1];
    const heading = Math.atan2(-(p1.x - p0.x), -(p1.z - p0.z));
    rig.group.position.set(p0.x, 0, p0.z);
    rig.group.rotation.y = heading;
    this.cyclist = {
      rig,
      loop: this.world.cyclistLoop,
      waypointIndex: 1,
      x: p0.x,
      z: p0.z,
      heading,
      speedMs: 5.4, // ~19 km/h
    };
  }

  private spawnRegulator(): void {
    if (!this.world.regulatorPos) return;
    this.regulator = buildRegulatorOfficer();
    this.regulator.group.position.set(this.world.regulatorPos.x, 0, this.world.regulatorPos.z);
    this.root.add(this.regulator.group);
  }

  public getAxisLight(axis: 'ns' | 'ew'): TrafficLightColor {
    return axis === 'ns' ? this.nsColor : this.ewColor;
  }

  public getRegulatorSignal(): { signal: PoliceSignalType; instruction: string; nearby: boolean } {
    const map: Record<PoliceSignalType, string> = {
      none: '',
      stop: 'Əl yuxarı qaldırılıb ("Diqqət!") — Bütün istiqamətlərdə hərəkət QADAĞANDIR.',
      left_turn_allowed:
        'Sağ əl önə uzadılıb — Sol tərəfdən bütün istiqamətlərə, qarşıdan yalnız sağa icazə var.',
      slow_down: 'Əl yuxarı-aşağı hərəkət edir — Sürəti azaldın!',
      speed_up: 'Əl dairəvi fırlanır — Hərəkəti sürətləndirin.',
    };
    return {
      signal: this.regSignal,
      instruction: map[this.regSignal],
      nearby: this.regulator !== null,
    };
  }

  public setPolicePursuit(active: boolean): void {
    for (const v of this.vehicles) {
      if (v.isPolice) {
        v.pursuitMode = active;
      }
    }
  }

  public getNearestPoliceDistance(px: number, pz: number): number {
    let best = 999;
    for (const v of this.vehicles) {
      if (!v.isPolice) continue;
      const d = Math.hypot(v.x - px, v.z - pz);
      if (d < best) best = d;
    }
    return Math.round(best);
  }

  public getNearestPolicePos(px: number, pz: number): { dist: number; x: number; z: number } | null {
    let bestDist = Infinity;
    let bestV: AiVehicleAgent | null = null;
    for (const v of this.vehicles) {
      if (!v.isPolice) continue;
      const d = Math.hypot(v.x - px, v.z - pz);
      if (d < bestDist) {
        bestDist = d;
        bestV = v;
      }
    }
    return bestV ? { dist: bestDist, x: bestV.x, z: bestV.z } : null;
  }

  public getNearestPedestrianInfo(
    px: number,
    pz: number
  ): { dist: number; x: number; z: number; waiting: boolean; nearCrosswalk: boolean } | null {
    let bestDist = Infinity;
    let bestPed: PedestrianAgent | null = null;
    for (const ped of this.pedestrians) {
      const d = Math.hypot(ped.x - px, ped.z - pz);
      if (d < bestDist) {
        bestDist = d;
        bestPed = ped;
      }
    }
    if (!bestPed) return null;

    let nearCrosswalk = false;
    for (const cw of this.world.crosswalks) {
      if (
        Math.abs(bestPed.x - cw.x) <= cw.width * 0.65 + 2.2 &&
        Math.abs(bestPed.z - cw.z) <= cw.length * 0.65 + 2.2
      ) {
        nearCrosswalk = true;
        break;
      }
    }
    return {
      dist: bestDist,
      x: bestPed.x,
      z: bestPed.z,
      waiting: bestPed.waitTimer > 0,
      nearCrosswalk,
    };
  }

  public isPedestrianActiveOnCrosswalk(cwX: number, cwZ: number, cwWidth: number, cwLength: number): boolean {
    for (const ped of this.pedestrians) {
      if (
        Math.abs(ped.x - cwX) <= cwWidth * 0.55 + 1.2 &&
        Math.abs(ped.z - cwZ) <= cwLength * 0.55 + 1.2
      ) {
        return true;
      }
    }
    return false;
  }

  public update(
    dt: number,
    nowSec: number,
    playerX: number,
    playerZ: number,
    playerHeading: number,
    playerSpeedMs: number
  ): {
    collidedWith: 'building' | 'vehicle' | 'pedestrian' | 'cyclist' | null;
    pushOutX: number;
    pushOutZ: number;
  } {
    const clampedDt = Math.min(dt, 0.05);

    this.updateTrafficLights(clampedDt, nowSec);
    this.updateRegulator(clampedDt, nowSec);
    this.updatePedestrians(clampedDt);
    this.updateCyclist(clampedDt);
    this.updateVehicles(clampedDt, nowSec, playerX, playerZ, playerHeading, playerSpeedMs);

    return this.checkCollisions(playerX, playerZ);
  }

  private updateTrafficLights(dt: number, nowSec: number): void {
    this.lightCycleTime = (this.lightCycleTime + dt) % 38;
    const t = this.lightCycleTime;

    if (t < 13) {
      this.nsColor = 'green';
      this.ewColor = 'red';
    } else if (t < 16) {
      this.nsColor = 'green_blink';
      this.ewColor = 'red';
    } else if (t < 18.5) {
      this.nsColor = 'yellow';
      this.ewColor = 'red';
    } else if (t < 31.5) {
      this.nsColor = 'red';
      this.ewColor = 'green';
    } else if (t < 34.5) {
      this.nsColor = 'red';
      this.ewColor = 'green_blink';
    } else if (t < 37) {
      this.nsColor = 'red';
      this.ewColor = 'yellow';
    } else {
      this.nsColor = 'red';
      this.ewColor = 'red';
    }

    const blinkOn = Math.floor(nowSec * 3.2) % 2 === 0;
    for (const pole of this.world.trafficLightPoles) {
      const col = pole.axis === 'ns' ? this.nsColor : this.ewColor;
      this.applyPoleLights(pole, col, blinkOn);
    }
  }

  private applyPoleLights(pole: TrafficLightPole, color: TrafficLightColor, blinkOn: boolean): void {
    const rMat = pole.redMesh.material as THREE.MeshStandardMaterial;
    const yMat = pole.yellowMesh.material as THREE.MeshStandardMaterial;
    const gMat = pole.greenMesh.material as THREE.MeshStandardMaterial;

    rMat.emissiveIntensity = color === 'red' ? 2.4 : 0.08;
    yMat.emissiveIntensity = color === 'yellow' ? 2.4 : 0.08;
    gMat.emissiveIntensity =
      color === 'green' ? 2.4 : color === 'green_blink' ? (blinkOn ? 2.4 : 0.08) : 0.08;
  }

  private updateRegulator(dt: number, nowSec: number): void {
    if (!this.regulator) return;
    this.regTimer = (this.regTimer + dt) % 32;

    if (this.regTimer < 11) {
      this.regSignal = 'left_turn_allowed';
    } else if (this.regTimer < 18) {
      this.regSignal = 'slow_down';
    } else if (this.regTimer < 25) {
      this.regSignal = 'speed_up';
    } else {
      this.regSignal = 'stop';
    }

    const rArm = this.regulator.rightArmPivot;
    const lArm = this.regulator.leftArmPivot;

    if (this.regSignal === 'stop') {
      rArm.rotation.z = Math.PI - 0.18;
      rArm.rotation.x = 0;
      lArm.rotation.z = -0.12;
    } else if (this.regSignal === 'slow_down') {
      rArm.rotation.z = Math.PI * 0.5 + Math.sin(nowSec * 5.2) * 0.25;
      rArm.rotation.x = 0;
      lArm.rotation.z = -0.12;
    } else if (this.regSignal === 'speed_up') {
      rArm.rotation.z = Math.PI * 0.48;
      rArm.rotation.x = Math.sin(nowSec * 6.5) * 0.32;
      lArm.rotation.z = -0.12;
    } else {
      rArm.rotation.x = -Math.PI * 0.48;
      rArm.rotation.z = 0.08;
      lArm.rotation.z = -0.22;
    }
  }

  private updatePedestrians(dt: number): void {
    for (const ped of this.pedestrians) {
      if (ped.waitTimer > 0) {
        ped.waitTimer -= dt;
        ped.rig.leftLeg.rotation.x = 0;
        ped.rig.rightLeg.rotation.x = 0;
        ped.rig.leftArm.rotation.x = 0;
        ped.rig.rightArm.rotation.x = 0;
        continue;
      }

      const p0 = ped.path[0];
      const p1 = ped.path[1];
      const segLen = Math.max(1, Math.hypot(p1.x - p0.x, p1.z - p0.z));
      const deltaProg = (ped.speedMs * dt) / segLen;

      if (ped.toEnd) {
        ped.progress += deltaProg;
        if (ped.progress >= 1) {
          ped.progress = 1;
          ped.toEnd = false;
          ped.waitTimer = 2.2;
        }
      } else {
        ped.progress -= deltaProg;
        if (ped.progress <= 0) {
          ped.progress = 0;
          ped.toEnd = true;
          ped.waitTimer = 2.2;
        }
      }

      ped.x = p0.x + (p1.x - p0.x) * ped.progress;
      ped.z = p0.z + (p1.z - p0.z) * ped.progress;
      const dirX = ped.toEnd ? p1.x - p0.x : p0.x - p1.x;
      const dirZ = ped.toEnd ? p1.z - p0.z : p0.z - p1.z;
      ped.rig.group.position.set(ped.x, 0, ped.z);
      ped.rig.group.rotation.y = Math.atan2(dirX, dirZ);

      ped.walkPhase += dt * 7.5;
      const swing = Math.sin(ped.walkPhase) * 0.48;
      ped.rig.leftLeg.rotation.x = swing;
      ped.rig.rightLeg.rotation.x = -swing;
      ped.rig.leftArm.rotation.x = -swing * 0.7;
      ped.rig.rightArm.rotation.x = swing * 0.7;
    }
  }

  private updateCyclist(dt: number): void {
    if (!this.cyclist) return;
    const c = this.cyclist;
    const target = c.loop[c.waypointIndex];
    const dx = target.x - c.x;
    const dz = target.z - c.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 2.2) {
      c.waypointIndex = (c.waypointIndex + 1) % c.loop.length;
    } else {
      const targetHeading = Math.atan2(-dx, -dz);
      let diff = targetHeading - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.heading += diff * Math.min(1, 5 * dt);

      c.x += -Math.sin(c.heading) * c.speedMs * dt;
      c.z += -Math.cos(c.heading) * c.speedMs * dt;
      c.rig.group.position.set(c.x, 0, c.z);
      c.rig.group.rotation.y = c.heading;
      c.rig.frontWheel.rotation.x -= (c.speedMs * dt) / 0.32;
      c.rig.rearWheel.rotation.x -= (c.speedMs * dt) / 0.32;
    }
  }

  private updateVehicles(
    dt: number,
    nowSec: number,
    playerX: number,
    playerZ: number,
    playerHeading: number,
    _playerSpeedMs: number
  ): void {
    const flash = Math.floor(nowSec * 9) % 2 === 0;

    for (const v of this.vehicles) {
      // Police siren animation
      if (v.isPolice && v.rig.sirenRed && v.rig.sirenBlue) {
        const rMat = v.rig.sirenRed.material as THREE.MeshStandardMaterial;
        const bMat = v.rig.sirenBlue.material as THREE.MeshStandardMaterial;
        if (v.pursuitMode) {
          rMat.emissiveIntensity = flash ? 3.2 : 0.15;
          bMat.emissiveIntensity = flash ? 0.15 : 3.2;
        } else {
          rMat.emissiveIntensity = 0.2;
          bMat.emissiveIntensity = 0.55;
        }
      }

      // If police is actively pursuing, pull up ~11m behind player
      let desiredSpeed = v.targetSpeedMs;
      if (v.isPolice && v.pursuitMode) {
        const behindX = playerX + Math.sin(playerHeading) * 11;
        const behindZ = playerZ + Math.cos(playerHeading) * 11;
        const dxP = behindX - v.x;
        const dzP = behindZ - v.z;
        const distP = Math.hypot(dxP, dzP);
        if (distP > 4) {
          const targetH = Math.atan2(-dxP, -dzP);
          let diff = targetH - v.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          v.heading += diff * Math.min(1, 3.6 * dt);
          desiredSpeed = Math.min(22, Math.max(4, distP * 0.75));
        } else {
          let diff = playerHeading - v.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          v.heading += diff * Math.min(1, 4 * dt);
          desiredSpeed = 0;
        }
      } else {
        // Normal loop navigation
        const target = v.loop[v.waypointIndex];
        const dx = target.x - v.x;
        const dz = target.z - v.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 4.5) {
          v.waypointIndex = (v.waypointIndex + 1) % v.loop.length;
        } else {
          const targetHeading = Math.atan2(-dx, -dz);
          let diff = targetHeading - v.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          v.heading += diff * Math.min(1, 3.8 * dt);
        }

        // Check traffic lights ahead
        const fx = -Math.sin(v.heading);
        const fz = -Math.cos(v.heading);

        for (const pole of this.world.trafficLightPoles) {
          const light = this.getAxisLight(pole.axis);
          if (light === 'green' || light === 'green_blink') continue;

          if (pole.axis === 'ns' && Math.abs(fz) > 0.65 && Math.abs(v.x) < 9) {
            const goingDir = fz > 0 ? 1 : -1;
            if (goingDir === pole.approachDir) {
              const distToLine = (pole.stopLineCoord - v.z) * goingDir;
              if (distToLine > 1.5 && distToLine < 16) {
                desiredSpeed = 0;
              }
            }
          } else if (pole.axis === 'ew' && Math.abs(fx) > 0.65 && Math.abs(v.z) < 9) {
            const goingDir = fx > 0 ? 1 : -1;
            if (goingDir === pole.approachDir) {
              const distToLine = (pole.stopLineCoord - v.x) * goingDir;
              if (distToLine > 1.5 && distToLine < 16) {
                desiredSpeed = 0;
              }
            }
          }
        }

        // Yield at crosswalks when pedestrians are crossing
        for (const cw of this.world.crosswalks) {
          const toCwX = cw.x - v.x;
          const toCwZ = cw.z - v.z;
          const forwardProj = toCwX * fx + toCwZ * fz;
          const sideProj = Math.abs(toCwX * fz - toCwZ * fx);
          if (forwardProj > 2 && forwardProj < 14 && sideProj < 6.5) {
            if (this.isPedestrianActiveOnCrosswalk(cw.x, cw.z, cw.width, cw.length)) {
              desiredSpeed = 0;
            }
          }
        }

        // Keep safe distance from player
        const toPX = playerX - v.x;
        const toPZ = playerZ - v.z;
        const pFwd = toPX * fx + toPZ * fz;
        const pSide = Math.abs(toPX * fz - toPZ * fx);
        if (pFwd > 1 && pFwd < 13 && pSide < 2.6) {
          desiredSpeed = Math.min(desiredSpeed, pFwd < 7.5 ? 0 : 4);
        }

        // Keep safe distance from other AI vehicles
        for (const other of this.vehicles) {
          if (other.id === v.id) continue;
          const ox = other.x - v.x;
          const oz = other.z - v.z;
          const oFwd = ox * fx + oz * fz;
          const oSide = Math.abs(ox * fz - oz * fx);
          if (oFwd > 1 && oFwd < 12.5 && oSide < 2.4) {
            desiredSpeed = Math.min(desiredSpeed, oFwd < 7.8 ? 0 : other.speedMs * 0.8);
          }
        }
      }

      // Smooth acceleration / braking
      const rate = desiredSpeed < v.speedMs ? 7.5 : 3.2;
      v.speedMs += (desiredSpeed - v.speedMs) * Math.min(1, rate * dt);

      v.x += -Math.sin(v.heading) * v.speedMs * dt;
      v.z += -Math.cos(v.heading) * v.speedMs * dt;
      v.rig.group.position.set(v.x, 0, v.z);
      v.rig.group.rotation.y = v.heading;

      for (const w of v.rig.wheels) {
        w.rotation.x -= (v.speedMs * dt) / 0.36;
      }
    }
  }

  private checkCollisions(
    px: number,
    pz: number
  ): {
    collidedWith: 'building' | 'vehicle' | 'pedestrian' | 'cyclist' | null;
    pushOutX: number;
    pushOutZ: number;
  } {
    const playerRadius = 1.45;

    // 1. Buildings / barriers
    for (const c of this.world.colliders) {
      const closestX = Math.max(c.minX, Math.min(px, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(pz, c.maxZ));
      const dx = px - closestX;
      const dz = pz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < playerRadius * playerRadius) {
        const dist = Math.max(0.01, Math.sqrt(distSq));
        const push = playerRadius - dist + 0.15;
        return {
          collidedWith: 'building',
          pushOutX: (dx / dist) * push,
          pushOutZ: (dz / dist) * push,
        };
      }
    }

    // 2. AI Vehicles
    for (const v of this.vehicles) {
      const d = Math.hypot(px - v.x, pz - v.z);
      const minD = playerRadius + (v.halfWidth + v.halfLength) * 0.44;
      if (d < minD) {
        const nx = (px - v.x) / Math.max(0.1, d);
        const nz = (pz - v.z) / Math.max(0.1, d);
        return {
          collidedWith: 'vehicle',
          pushOutX: nx * (minD - d + 0.2),
          pushOutZ: nz * (minD - d + 0.2),
        };
      }
    }

    // 3. Pedestrians
    for (const ped of this.pedestrians) {
      const d = Math.hypot(px - ped.x, pz - ped.z);
      if (d < 1.55) {
        return { collidedWith: 'pedestrian', pushOutX: 0, pushOutZ: 0 };
      }
    }

    // 4. Cyclist
    if (this.cyclist) {
      const d = Math.hypot(px - this.cyclist.x, pz - this.cyclist.z);
      if (d < 1.75) {
        return { collidedWith: 'cyclist', pushOutX: 0, pushOutZ: 0 };
      }
    }

    return { collidedWith: null, pushOutX: 0, pushOutZ: 0 };
  }

  public dispose(): void {
    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
      }
    });
    this.vehicles = [];
    this.pedestrians = [];
    this.cyclist = null;
    this.regulator = null;
  }
}
