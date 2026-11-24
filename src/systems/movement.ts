import type { CircleCollider } from '../world/terrain';

export interface MovementTuning {
  walkSpeed: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  dashCost: number;
  jumpVelocity?: number;
  gravity?: number;
  coyoteTime?: number;
  jumpBuffer?: number;
  jumpCost?: number;
  maxStamina: number;
  staminaRegen: number;
  turnSpeed: number;
  arenaRadius: number;
}

export interface HeroMoveInput {
  forward: number; // +1 forward along camera, -1 back
  right: number; // +1 strafe right along camera, -1 left
  cameraYaw?: number; // camera facing yaw (default Math.PI = north -Z)
  steerWithCamera?: boolean; // WoW-style RMB steering: face cameraYaw while strafing/backpedaling
  dashPressed: boolean;
  jumpPressed?: boolean;
  jumpHeld?: boolean;
  lungeSpeed?: number;
  lungeDirX?: number;
  lungeDirZ?: number;
}

export interface HeroLocomotionState {
  x: number;
  y: number;
  z: number;
  groundY: number;
  airY: number;
  vy: number;
  vx: number;
  vz: number;
  yaw: number;
  stamina: number;
  dashTimer: number;
  dashCooldownTimer: number;
  dashDirX: number;
  dashDirZ: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  isGrounded: boolean;
  squashY: number;
  gaitPhase: number;
  totalDistance: number;
  isMoving: boolean;
  isDashing: boolean;
}

export function createHeroLocomotionState(
  maxStamina: number,
  heightAt: (x: number, z: number) => number,
  startX = 0,
  startZ = 4.5,
): HeroLocomotionState {
  const gy = heightAt(startX, startZ);
  return {
    x: startX,
    y: gy,
    z: startZ,
    groundY: gy,
    airY: 0,
    vy: 0,
    vx: 0,
    vz: 0,
    yaw: Math.PI, // Facing north (-Z) toward the Slavic idol and campfire
    stamina: maxStamina,
    dashTimer: 0,
    dashCooldownTimer: 0,
    dashDirX: 0,
    dashDirZ: -1,
    coyoteTimer: 0.11,
    jumpBufferTimer: 0,
    isGrounded: true,
    squashY: 1,
    gaitPhase: 0,
    totalDistance: 0,
    isMoving: false,
    isDashing: false,
  };
}

function normalizeAngleDelta(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function stepHeroLocomotion(
  state: HeroLocomotionState,
  input: HeroMoveInput,
  dt: number,
  tuning: MovementTuning,
  heightAt: (x: number, z: number) => number,
  obstacles: readonly CircleCollider[],
  heroRadius = 0.55,
): { dashed: boolean; jumped: boolean; landed: boolean; impactSpeed: number; moved: number } {
  const camYaw = input.cameraYaw ?? Math.PI;
  const fwdX = Math.sin(camYaw);
  const fwdZ = Math.cos(camYaw);
  const rightX = -Math.cos(camYaw);
  const rightZ = Math.sin(camYaw);

  let ix = fwdX * input.forward + rightX * input.right;
  let iz = fwdZ * input.forward + rightZ * input.right;
  const len = Math.hypot(ix, iz);
  if (len > 1e-4) {
    ix /= len;
    iz /= len;
  } else {
    ix = 0;
    iz = 0;
  }

  const jumpVel = tuning.jumpVelocity ?? 8.6;
  const gravity = tuning.gravity ?? 22.5;
  const coyoteMax = tuning.coyoteTime ?? 0.11;
  const jumpBufMax = tuning.jumpBuffer ?? 0.12;
  const jumpCost = tuning.jumpCost ?? 10;

  state.dashCooldownTimer = Math.max(0, state.dashCooldownTimer - dt);
  if (state.isGrounded) {
    state.coyoteTimer = coyoteMax;
  } else {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }

  if (input.jumpPressed) {
    state.jumpBufferTimer = jumpBufMax;
  } else {
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  }

  let jumped = false;
  if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0 && state.stamina >= jumpCost * 0.5) {
    state.vy = jumpVel;
    state.isGrounded = false;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    state.stamina = Math.max(0, state.stamina - jumpCost);
    state.squashY = 1.2;
    jumped = true;
  }

  // Variable jump height cut when released early
  if (!input.jumpHeld && state.vy > jumpVel * 0.35) {
    state.vy *= 0.84;
  }

  let dashed = false;
  if (
    input.dashPressed &&
    state.dashTimer <= 0 &&
    state.dashCooldownTimer <= 0 &&
    state.stamina >= tuning.dashCost
  ) {
    state.stamina -= tuning.dashCost;
    state.dashTimer = tuning.dashDuration;
    state.dashCooldownTimer = tuning.dashCooldown;
    if (len > 1e-4) {
      state.dashDirX = ix;
      state.dashDirZ = iz;
    } else {
      state.dashDirX = Math.sin(state.yaw);
      state.dashDirZ = Math.cos(state.yaw);
    }
    dashed = true;
  }

  const prevX = state.x;
  const prevZ = state.z;

  if (state.dashTimer > 0) {
    state.dashTimer = Math.max(0, state.dashTimer - dt);
    state.vx = state.dashDirX * tuning.dashSpeed;
    state.vz = state.dashDirZ * tuning.dashSpeed;
    state.isDashing = true;
  } else if ((input.lungeSpeed ?? 0) > 0.01) {
    state.isDashing = false;
    state.vx = (input.lungeDirX ?? Math.sin(state.yaw)) * (input.lungeSpeed ?? 0);
    state.vz = (input.lungeDirZ ?? Math.cos(state.yaw)) * (input.lungeSpeed ?? 0);
    state.stamina = Math.min(tuning.maxStamina, state.stamina + tuning.staminaRegen * 0.5 * dt);
  } else {
    state.isDashing = false;
    const airFactor = state.isGrounded ? 1.0 : 0.88;
    const backpedalScale = input.steerWithCamera && input.forward < -0.1 && Math.abs(input.right) < 0.2 ? 0.84 : 1.0;
    state.vx = ix * tuning.walkSpeed * airFactor * backpedalScale;
    state.vz = iz * tuning.walkSpeed * airFactor * backpedalScale;
    state.stamina = Math.min(tuning.maxStamina, state.stamina + tuning.staminaRegen * dt);
  }

  state.x += state.vx * dt;
  state.z += state.vz * dt;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const dx = state.x - obs.x;
    const dz = state.z - obs.z;
    const dist = Math.hypot(dx, dz);
    const minDist = obs.radius + heroRadius;
    if (dist < minDist) {
      if (dist > 1e-5) {
        const push = (minDist - dist) / dist;
        state.x += dx * push;
        state.z += dz * push;
      } else {
        state.z += minDist;
      }
    }
  }

  const maxR = Math.max(2, tuning.arenaRadius - heroRadius);
  const r = Math.hypot(state.x, state.z);
  if (r > maxR) {
    const scale = maxR / r;
    state.x *= scale;
    state.z *= scale;
  }

  state.groundY = heightAt(state.x, state.z);

  let landed = false;
  let impactSpeed = 0;
  if (!state.isGrounded || state.airY > 0 || state.vy > 0) {
    state.vy -= gravity * dt;
    state.airY += state.vy * dt;
    if (state.airY <= 0) {
      impactSpeed = Math.abs(state.vy);
      state.airY = 0;
      state.vy = 0;
      state.isGrounded = true;
      state.squashY = Math.max(0.76, 1 - Math.min(0.24, impactSpeed * 0.025));
      landed = true;
    }
  } else {
    state.airY = 0;
    state.vy = 0;
    state.isGrounded = true;
  }

  state.squashY += (1 - state.squashY) * (1 - Math.exp(-14 * dt));
  state.y = state.groundY + state.airY;

  const moved = Math.hypot(state.x - prevX, state.z - prevZ);
  state.totalDistance += moved;
  state.isMoving = moved > 1e-4;
  if (input.steerWithCamera && (input.lungeSpeed ?? 0) <= 0.01) {
    // WoW-style RMB steering: Voymir turns smoothly to camera heading for circle-strafing & tactical retreat
    const delta = normalizeAngleDelta(state.yaw, camYaw);
    state.yaw += delta * (1 - Math.exp(-tuning.turnSpeed * 1.45 * dt));
  } else if (state.isMoving && (input.lungeSpeed ?? 0) <= 0.01) {
    if (state.isGrounded) {
      state.gaitPhase += moved * 2.4;
    }
    const targetYaw = Math.atan2(state.x - prevX, state.z - prevZ);
    const delta = normalizeAngleDelta(state.yaw, targetYaw);
    state.yaw += delta * (1 - Math.exp(-tuning.turnSpeed * dt));
  }
  if (input.steerWithCamera && state.isMoving && state.isGrounded) {
    state.gaitPhase += moved * 2.4;
  }

  return { dashed, jumped, landed, impactSpeed, moved };
}
