import { ControlInputs, GearMode, VehicleTelemetry, WeatherType } from './types';

const GEAR_MAX_SPEEDS = [0, 42, 74, 112, 152, 194, 235, 260, 285];

export class VehiclePhysics {
  public x = 0;
  public z = 0;
  public heading = 0; // 0 = facing -Z
  public speedMs = 0; // signed longitudinal speed m/s (+ = forward along heading)
  public steeringAngle = 0; // radians (+ = turn left, - = turn right)
  public rpm = 820;
  public gear: GearMode = 'P';
  public autoGearStep = 1;
  public fuelPercent = 88;
  public pitchAngle = 0;
  public rollAngle = 0;
  public wheelSpinAngle = 0;
  public distanceMeters = 0;

  private readonly wheelbase = 2.98; // BMW M5 F90 wheelbase ~2.982 m
  private readonly maxSteer = 0.58; // ~33 deg

  public reset(startX: number, startZ: number, startHeading: number): void {
    this.x = startX;
    this.z = startZ;
    this.heading = startHeading;
    this.speedMs = 0;
    this.steeringAngle = 0;
    this.rpm = 820;
    this.gear = 'P';
    this.autoGearStep = 1;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.distanceMeters = 0;
  }

  public setGear(nextGear: GearMode): boolean {
    const speedKmh = Math.abs(this.speedMs * 3.6);
    if (nextGear === 'P' && speedKmh > 4) return false;
    if ((nextGear === 'R' && this.speedMs > 1.5) || (nextGear === 'D' && this.speedMs < -1.5)) {
      return false;
    }
    this.gear = nextGear;
    return true;
  }

  public step(
    dt: number,
    inputs: ControlInputs,
    weather: WeatherType,
    handbrakeEngaged: boolean,
    engineRunning: boolean
  ): { lateralSlip: number; brakingDecel: number } {
    const clampedDt = Math.min(dt, 0.05);

    // Weather friction coefficient (PDF p. 71: wet/foggy roads significantly lengthen braking distance)
    const gripFactor = weather === 'rain' ? 0.72 : weather === 'fog' ? 0.84 : 1.0;

    // 1. Steering response (speed-sensitive Ackermann)
    const speedKmh = Math.abs(this.speedMs * 3.6);
    const speedSteerScale = Math.max(0.28, 1.0 - speedKmh / 190);
    const targetSteer =
      inputs.steerTarget !== null
        ? inputs.steerTarget * this.maxSteer * speedSteerScale
        : inputs.steerInput * this.maxSteer * speedSteerScale;

    const steerRate = inputs.steerTarget !== null ? 9.5 : Math.abs(targetSteer) > 0.01 ? 3.8 : 5.4;
    this.steeringAngle += (targetSteer - this.steeringAngle) * Math.min(1, steerRate * clampedDt);

    // 2. Longitudinal acceleration & braking
    let driveForce = 0;
    if (engineRunning && this.fuelPercent > 0) {
      if (this.gear === 'D') {
        // Automatic transmission creep (~7 km/h) when brake is released
        if (inputs.throttle > 0.02) {
          const torqueCurve = Math.max(0.35, 1.0 - speedKmh / 270);
          driveForce = inputs.throttle * 7.8 * torqueCurve * gripFactor;
        } else if (inputs.brake < 0.05 && !handbrakeEngaged && this.speedMs < 2.2) {
          driveForce = 1.45;
        }
      } else if (this.gear === 'R') {
        if (inputs.throttle > 0.02) {
          const revCurve = Math.max(0.2, 1.0 - speedKmh / 48);
          driveForce = -inputs.throttle * 4.4 * revCurve * gripFactor;
        } else if (inputs.brake < 0.05 && !handbrakeEngaged && this.speedMs > -1.8) {
          driveForce = -1.1;
        }
      }
    }

    // Braking & rolling resistance
    const aeroDrag = 0.00042 * this.speedMs * Math.abs(this.speedMs);
    const rollingDrag = this.speedMs !== 0 ? Math.sign(this.speedMs) * 0.22 : 0;
    const brakePower = (inputs.brake * 10.2 + (handbrakeEngaged || this.gear === 'P' ? 12.5 : 0)) * gripFactor;

    const prevSpeed = this.speedMs;
    this.speedMs += (driveForce - aeroDrag - rollingDrag) * clampedDt;

    if (brakePower > 0.05) {
      const decel = brakePower * clampedDt;
      if (Math.abs(this.speedMs) <= decel) {
        this.speedMs = 0;
      } else {
        this.speedMs -= Math.sign(this.speedMs) * decel;
      }
    }

    // Clamp direction strictly to selected gear
    if (this.gear === 'D' && this.speedMs < 0) this.speedMs = 0;
    if (this.gear === 'R' && this.speedMs > 0) this.speedMs = 0;
    if (this.gear === 'P') this.speedMs = 0;

    // Max speeds
    if (this.speedMs > 70) this.speedMs = 70; // 252 km/h cap
    if (this.speedMs < -12.5) this.speedMs = -12.5; // 45 km/h reverse cap

    // 3. Bicycle kinematics integration
    if (Math.abs(this.speedMs) > 0.01) {
      const angularVel = (this.speedMs / this.wheelbase) * Math.tan(this.steeringAngle);
      this.heading += angularVel * clampedDt;
      const forwardX = -Math.sin(this.heading);
      const forwardZ = -Math.cos(this.heading);
      this.x += forwardX * this.speedMs * clampedDt;
      this.z += forwardZ * this.speedMs * clampedDt;
      const stepDist = Math.abs(this.speedMs * clampedDt);
      this.distanceMeters += stepDist;
      this.wheelSpinAngle -= (this.speedMs * clampedDt) / 0.35;
    }

    // 4. Simulated 8-speed M Steptronic RPM & gear step
    const absKmh = Math.abs(this.speedMs * 3.6);
    if (this.gear === 'D') {
      let step = 1;
      for (let g = 1; g <= 8; g++) {
        if (absKmh <= GEAR_MAX_SPEEDS[g]) {
          step = g;
          break;
        }
      }
      this.autoGearStep = step;
      const prevMax = GEAR_MAX_SPEEDS[step - 1] * 0.72;
      const curMax = GEAR_MAX_SPEEDS[step];
      const ratio = Math.min(1, Math.max(0, (absKmh - prevMax) / Math.max(10, curMax - prevMax)));
      const targetRpm = engineRunning ? 950 + ratio * 5600 + inputs.throttle * 650 : 0;
      this.rpm += (targetRpm - this.rpm) * Math.min(1, 8 * clampedDt);
    } else if (this.gear === 'R') {
      this.autoGearStep = 1;
      const targetRpm = engineRunning ? 950 + (absKmh / 45) * 4200 + inputs.throttle * 500 : 0;
      this.rpm += (targetRpm - this.rpm) * Math.min(1, 8 * clampedDt);
    } else {
      this.autoGearStep = 1;
      const revTarget = engineRunning ? 820 + inputs.throttle * 4400 : 0;
      this.rpm += (revTarget - this.rpm) * Math.min(1, 7 * clampedDt);
    }

    // Fuel consumption
    if (engineRunning && this.fuelPercent > 0) {
      const rate = 0.0015 + (inputs.throttle * 0.012 + absKmh * 0.00012);
      this.fuelPercent = Math.max(0, this.fuelPercent - rate * clampedDt);
    }

    // Suspension pitch & roll
    const accelLong = (this.speedMs - prevSpeed) / Math.max(0.001, clampedDt);
    const targetPitch = Math.max(-0.045, Math.min(0.045, accelLong * 0.0045));
    const lateralAcc = this.speedMs * (this.speedMs / this.wheelbase) * Math.tan(this.steeringAngle);
    const targetRoll = Math.max(-0.055, Math.min(0.055, lateralAcc * 0.006));
    this.pitchAngle += (targetPitch - this.pitchAngle) * Math.min(1, 10 * clampedDt);
    this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1, 10 * clampedDt);

    return {
      lateralSlip: Math.abs(lateralAcc) / (9.81 * gripFactor),
      brakingDecel: Math.max(0, -accelLong),
    };
  }

  public fillTelemetry(base: VehicleTelemetry): void {
    base.x = this.x;
    base.z = this.z;
    base.heading = this.heading;
    base.speedKmh = Math.round(Math.abs(this.speedMs * 3.6));
    base.rpm = Math.round(this.rpm);
    base.gear = this.gear;
    base.autoGearStep = this.autoGearStep;
    base.steeringAngle = this.steeringAngle;
    base.fuelPercent = Number(this.fuelPercent.toFixed(1));
    base.distanceMeters = Math.round(this.distanceMeters);
  }
}
