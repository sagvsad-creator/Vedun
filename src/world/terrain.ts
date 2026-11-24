export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

export const WATER_LEVEL = -0.18;

export const CLEARING_OBSTACLES: readonly CircleCollider[] = [
  { x: 0, z: -7.5, radius: 1.45 }, // Zbruch wooden idol & stone altar dais
  { x: 3.6, z: -0.6, radius: 1.05 }, // Campfire hearth
  { x: -10.8, z: -2.5, radius: 3.4 }, // Left Slavic log hut (изба 1)
  { x: 11.4, z: -4.2, radius: 3.4 }, // Right Slavic log hut (изба 2)
  { x: -5.2, z: 5.8, radius: 1.05 }, // Gnarled fallen log & stump
  { x: 5.4, z: -13.5, radius: 1.35 }, // Leshy shrine perimeter
  { x: -6.8, z: -15.5, radius: 2.6 }, // Sunken barrow crypt entrance
];

// Meandering bog channel cutting through the right-center marsh toward the sunken barrow
export function channelDepthAt(x: number, z: number): number {
  const curveX = 2.6 + Math.sin(z * 0.14) * 3.2;
  const distToChannel = Math.abs(x - curveX);
  const bankWidth = 2.6 + Math.cos(z * 0.21) * 0.6;
  if (distToChannel > bankWidth) return 0;
  const t = 1 - distToChannel / bankWidth;
  // Keep wooden footbridge / hero starting clearing dry around z = 2..8
  const pathClear = Math.exp(-Math.pow((z - 4.2) / 2.6, 2)) * Math.exp(-Math.pow(x / 3.2, 2));
  return Math.max(0, t * t * 0.42 * (1 - 0.85 * pathClear));
}

export function groundHeightAt(x: number, z: number): number {
  const r2 = x * x + z * z;
  const centerFlat = Math.min(1, Math.max(0, (r2 - 22) / 140));
  const undulation =
    Math.sin(x * 0.13) * Math.cos(z * 0.12) * 0.48 +
    Math.sin(x * 0.31 + z * 0.23) * 0.16 +
    Math.cos(x * 0.55 - z * 0.47) * 0.05;
  const rimRise = Math.max(0, Math.sqrt(r2) - 22) * 0.14;
  const raw = undulation * centerFlat + rimRise - channelDepthAt(x, z);
  return raw;
}

export function isWaterAt(x: number, z: number): boolean {
  return groundHeightAt(x, z) < WATER_LEVEL;
}
