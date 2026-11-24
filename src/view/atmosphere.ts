import * as THREE from 'three';
import { createRng } from '../core/rng';

export interface AtmosphereParams {
  skyZenith: string;
  skyHorizon: string;
  cloudTint: string;
  sunGlow: string;
  keyDirection: [number, number, number];
  rayColor: string;
  rayOpacity: number;
  moonVisible: boolean;
}

export interface AtmosphereRig {
  group: THREE.Group;
  update(elapsed: number, params: AtmosphereParams): void;
  dispose(): void;
}

const SKY_VERT = `
varying vec3 vWorldDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = `
uniform float uTime;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uCloudTint;
uniform vec3 uSunGlow;
uniform vec3 uSunDir;
uniform float uMoonVisible;
varying vec3 vWorldDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.05 + vec2(13.1, 7.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float h = clamp(dir.y, 0.0, 1.0);
  // Lift linear sky radiance so overcast clouds & horizon read clearly under ACES Filmic
  vec3 col = mix(uHorizon * 2.1, uZenith * 2.2, pow(h, 0.62));

  vec2 cloudUv = dir.xz / (max(0.1, dir.y + 0.16)) * 1.35 + vec2(uTime * 0.015, uTime * 0.008);
  float n = fbm(cloudUv);
  float clouds = smoothstep(0.32, 0.76, n) * smoothstep(0.01, 0.28, dir.y);
  col = mix(col, uCloudTint * 2.4, clouds * 0.68);

  float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
  float halo = pow(sunDot, 4.0) * 0.85 + pow(sunDot, 22.0) * 1.1;
  col += uSunGlow * halo * (1.0 - clouds * 0.42);

  if (uMoonVisible > 0.5) {
    vec3 moonDir = normalize(vec3(-0.48, 0.25, -0.84));
    float dMoon = distance(dir, moonDir);
    float disc = smoothstep(0.044, 0.039, dMoon);
    float cut = smoothstep(0.042, 0.037, distance(dir, normalize(moonDir + vec3(0.02, 0.013, 0.0))));
    float crescent = clamp(disc - cut, 0.0, 1.0);
    float glow = exp(-dMoon * 10.0) * 0.58;
    col += vec3(0.82, 0.92, 1.0) * (crescent * 3.1 + glow);

    // Subtle cold night stars shining through thin cloud breaks
    vec2 starCell = floor(dir.xz / max(0.25, dir.y + 0.15) * 42.0);
    float starRnd = hash(starCell);
    float twinkle = 0.65 + 0.35 * sin(uTime * 2.1 + starRnd * 30.0);
    float starMask = step(0.986, starRnd) * smoothstep(0.15, 0.55, dir.y) * (1.0 - clouds);
    col += vec3(0.75, 0.85, 0.96) * starMask * twinkle * 0.85;
  }

  col = mix(uHorizon * 1.65, col, smoothstep(-0.04, 0.22, dir.y));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createAtmosphere(mistSprite: THREE.Texture, seed: number, rayAlpha?: THREE.Texture): AtmosphereRig {
  const rng = createRng(seed ^ 0x3c6ef372);
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // 1. Stormy Overcast Slavic Sky Dome
  const skyGeo = new THREE.SphereGeometry(110, 32, 20);
  geometries.push(skyGeo);
  const skyUniforms = {
    uTime: { value: 0 },
    uZenith: { value: new THREE.Color('#0e1514') },
    uHorizon: { value: new THREE.Color('#2d3c37') },
    uCloudTint: { value: new THREE.Color('#586b65') },
    uSunGlow: { value: new THREE.Color('#8ca69c') },
    uSunDir: { value: new THREE.Vector3(18, 19, 14) },
    uMoonVisible: { value: 0 },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  materials.push(skyMat);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // 2. Ground-Hugging Drifting Mist Ribbons curling around huts & bog
  const mistGeo = new THREE.PlaneGeometry(15, 4.8);
  geometries.push(mistGeo);
  const mistMat = new THREE.MeshBasicMaterial({
    map: mistSprite,
    color: 0xb6cbc2,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(mistMat);

  interface MistLayer {
    mesh: THREE.Mesh;
    baseX: number;
    baseZ: number;
    phase: number;
    speed: number;
  }
  const mistLayers: MistLayer[] = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(mistGeo, mistMat);
    const bx = rng.range(-19, 19);
    const bz = rng.range(-21, 9);
    m.position.set(bx, rng.range(0.45, 1.35), bz);
    m.rotation.y = rng.range(-0.6, 0.6);
    m.scale.set(rng.range(0.95, 1.8), rng.range(0.7, 1.25), 1);
    group.add(m);
    mistLayers.push({
      mesh: m,
      baseX: bx,
      baseZ: bz,
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.18, 0.42),
    });
  }

  // 3. Soft Feathered Volumetric Light Shafts angling through canopy (zero hard edges)
  const rayGeo = new THREE.PlaneGeometry(6.8, 22);
  geometries.push(rayGeo);
  const rayMat = new THREE.MeshBasicMaterial({
    color: 0x8ba69c,
    alphaMap: rayAlpha ?? mistSprite,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  materials.push(rayMat);

  const rayPositions: [number, number, number][] = [
    [-8, 9.8, -14],
    [3.5, 9.8, -11],
    [11, 9.8, -6],
  ];
  for (const [rx, ry, rz] of rayPositions) {
    const shaft = new THREE.Mesh(rayGeo, rayMat);
    shaft.position.set(rx, ry, rz);
    shaft.rotation.z = -0.34;
    shaft.rotation.y = 0.25;
    group.add(shaft);
  }

  // 4. GPU-Animated Floating Spores & Marsh Fireflies (zero CPU loop or buffer uploads!)
  const MOTE_COUNT = 96;
  const motePos = new Float32Array(MOTE_COUNT * 3);
  const motePhase = new Float32Array(MOTE_COUNT);
  for (let i = 0; i < MOTE_COUNT; i++) {
    motePos[i * 3] = rng.range(-19, 19);
    motePos[i * 3 + 1] = rng.range(0.35, 4.8);
    motePos[i * 3 + 2] = rng.range(-21, 12);
    motePhase[i] = rng.range(0, Math.PI * 2);
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute('aPhase', new THREE.BufferAttribute(motePhase, 1));
  geometries.push(moteGeo);

  const moteUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0xc2d0c8) },
    uFireflyColor: { value: new THREE.Color(0xf2b44c) },
    uMoonVisible: { value: 0 },
  };
  const moteMat = new THREE.ShaderMaterial({
    uniforms: moteUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      varying float vPhase;
      void main() {
        vPhase = aPhase;
        vec3 p = position;
        p.x += sin(uTime * 0.42 + aPhase) * 0.72;
        p.y += cos(uTime * 0.58 + aPhase * 1.3) * 0.28;
        p.z += cos(uTime * 0.36 + aPhase * 0.9) * 0.72;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(24.0 / max(1.0, -mv.z), 2.0, 6.5);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uFireflyColor;
      uniform float uMoonVisible;
      varying float vPhase;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float soft = smoothstep(0.5, 0.08, d);
        float pulse = 0.55 + 0.45 * sin(uTime * 2.2 + vPhase * 3.0);
        float isFirefly = step(4.3, vPhase);
        vec3 c = mix(uColor, uFireflyColor, isFirefly * (0.5 + 0.5 * uMoonVisible));
        gl_FragColor = vec4(c, soft * pulse * (isFirefly > 0.5 ? 0.72 : 0.42));
      }
    `,
  });
  materials.push(moteMat);
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  return {
    group,
    update(elapsed, params) {
      skyUniforms.uTime.value = elapsed;
      skyUniforms.uZenith.value.set(params.skyZenith);
      skyUniforms.uHorizon.value.set(params.skyHorizon);
      skyUniforms.uCloudTint.value.set(params.cloudTint);
      skyUniforms.uSunGlow.value.set(params.sunGlow);
      skyUniforms.uSunDir.value.set(...params.keyDirection);
      skyUniforms.uMoonVisible.value = params.moonVisible ? 1 : 0;

      moteUniforms.uTime.value = elapsed;
      moteUniforms.uColor.value.set(params.sunGlow).lerp(skyUniforms.uHorizon.value, 0.3);
      moteUniforms.uMoonVisible.value = params.moonVisible ? 1 : 0;

      mistMat.color.set(params.sunGlow).lerp(skyUniforms.uHorizon.value, 0.45);
      rayMat.color.set(params.rayColor);
      rayMat.opacity = params.rayOpacity;

      for (let i = 0; i < mistLayers.length; i++) {
        const l = mistLayers[i];
        l.mesh.position.x = l.baseX + Math.sin(elapsed * l.speed + l.phase) * 1.4;
      }
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
