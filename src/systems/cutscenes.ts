export type CutsceneId = 'CS01' | 'CS02' | 'CS03';

export interface CutsceneKeyframe {
  duration: number;
  camPos: [number, number, number];
  lookAt: [number, number, number];
  captionKey: 'cutscene1' | 'cutscene2' | 'cutscene3';
}

export interface ActiveCutscene {
  id: CutsceneId;
  elapsed: number;
  totalDuration: number;
  frames: CutsceneKeyframe[];
}

const CUTSCENES: Record<CutsceneId, CutsceneKeyframe[]> = {
  CS01: [
    { duration: 2.6, camPos: [5.2, 3.1, 6.2], lookAt: [0.0, 1.5, -3.5], captionKey: 'cutscene1' },
    { duration: 2.6, camPos: [-2.8, 2.2, 7.6], lookAt: [0.0, 1.5, 4.0], captionKey: 'cutscene1' },
  ],
  CS02: [
    { duration: 2.8, camPos: [2.6, 2.4, -3.2], lookAt: [0, 2.1, -7.5], captionKey: 'cutscene2' },
    { duration: 2.6, camPos: [-2.9, 2.2, -5.0], lookAt: [5.4, 2.1, -13.5], captionKey: 'cutscene2' },
  ],
  CS03: [
    { duration: 3.0, camPos: [1.8, 2.5, -8.2], lookAt: [5.4, 2.0, -13.5], captionKey: 'cutscene3' },
    { duration: 2.8, camPos: [-1.5, 3.0, -7.2], lookAt: [-6.8, 1.4, -15.5], captionKey: 'cutscene3' },
  ],
};

export function startCutscene(id: CutsceneId): ActiveCutscene {
  const frames = CUTSCENES[id];
  let total = 0;
  for (const f of frames) total += f.duration;
  return { id, elapsed: 0, totalDuration: total, frames };
}

export function sampleCutscene(
  cs: ActiveCutscene,
  dt: number,
): {
  done: boolean;
  camPos: [number, number, number];
  lookAt: [number, number, number];
  captionKey: 'cutscene1' | 'cutscene2' | 'cutscene3';
} {
  cs.elapsed += dt;
  if (cs.elapsed >= cs.totalDuration) {
    const last = cs.frames[cs.frames.length - 1];
    return { done: true, camPos: last.camPos, lookAt: last.lookAt, captionKey: last.captionKey };
  }

  let acc = 0;
  for (let i = 0; i < cs.frames.length; i++) {
    const f = cs.frames[i];
    if (cs.elapsed <= acc + f.duration) {
      const next = cs.frames[Math.min(cs.frames.length - 1, i + 1)];
      const alpha = Math.max(0, Math.min(1, (cs.elapsed - acc) / f.duration));
      const s = alpha * alpha * (3 - 2 * alpha);
      return {
        done: false,
        camPos: [
          f.camPos[0] + (next.camPos[0] - f.camPos[0]) * s,
          f.camPos[1] + (next.camPos[1] - f.camPos[1]) * s,
          f.camPos[2] + (next.camPos[2] - f.camPos[2]) * s,
        ],
        lookAt: [
          f.lookAt[0] + (next.lookAt[0] - f.lookAt[0]) * s,
          f.lookAt[1] + (next.lookAt[1] - f.lookAt[1]) * s,
          f.lookAt[2] + (next.lookAt[2] - f.lookAt[2]) * s,
        ],
        captionKey: f.captionKey,
      };
    }
    acc += f.duration;
  }

  const last = cs.frames[cs.frames.length - 1];
  return { done: true, camPos: last.camPos, lookAt: last.lookAt, captionKey: last.captionKey };
}
