import { useRef, useState } from 'react';
import type { TranslationMap } from '../core/i18n';
import type { InputHub } from '../core/input';

export function TouchControls(props: { input: InputHub; t: TranslationMap; hasPrompt: boolean }) {
  const { input, t, hasPrompt } = props;
  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const updateStick = (clientX: number, clientY: number) => {
    const el = stickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxR) {
      dx = (dx / d) * maxR;
      dy = (dy / d) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    input.setVirtualStick(dx / maxR, dy / maxR);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    input.setVirtualStick(0, 0);
  };

  const orbitPointerId = useRef<number | null>(null);
  const lastOrbitPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <>
      {/* Background Touch Orbit Area (stays below HUD buttons at z-10) */}
      <div
        aria-hidden="true"
        style={{ touchAction: 'none' }}
        className="pointer-events-auto fixed inset-x-0 top-16 bottom-36 z-10"
        onPointerDown={(e) => {
          orbitPointerId.current = e.pointerId;
          lastOrbitPos.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (orbitPointerId.current !== e.pointerId) return;
          const dx = e.clientX - lastOrbitPos.current.x;
          const dy = e.clientY - lastOrbitPos.current.y;
          lastOrbitPos.current = { x: e.clientX, y: e.clientY };
          input.addOrbitDelta(dx * 1.35, dy * 1.35);
        }}
        onPointerUp={(e) => {
          if (orbitPointerId.current === e.pointerId) orbitPointerId.current = null;
        }}
        onPointerCancel={() => {
          orbitPointerId.current = null;
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 pb-5 select-none">
        {/* Left Virtual Thumbstick */}
        <div
          ref={stickBaseRef}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            activePointerId.current = e.pointerId;
            updateStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activePointerId.current === e.pointerId) {
              updateStick(e.clientX, e.clientY);
            }
          }}
          onPointerUp={(e) => {
            if (activePointerId.current === e.pointerId) resetStick();
          }}
          onPointerCancel={resetStick}
          style={{ touchAction: 'none' }}
          className="pointer-events-auto relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#d97b29]/45 bg-[#0e1012]/70"
        >
          <div
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
            className="h-11 w-11 rounded-full border border-[#f28c28] bg-[#d97b29]/65"
          />
        </div>

        {/* Right Action Cluster */}
        <div className="pointer-events-auto grid grid-cols-3 gap-2" style={{ touchAction: 'none' }}>
          <button
            type="button"
            onPointerDown={() => input.triggerVirtualAction('switch_blade', true)}
            onPointerUp={() => input.triggerVirtualAction('switch_blade', false)}
            className="flex h-12 w-14 items-center justify-center border border-[#ece8df]/30 bg-[#0e1012]/80 text-[10px] font-bold tracking-wider text-[#9ab0bc]"
          >
            {t.btnBlade}
          </button>
          <button
            type="button"
            onPointerDown={() => input.triggerVirtualAction('sense', true)}
            onPointerUp={() => input.triggerVirtualAction('sense', false)}
            className={`flex h-12 w-14 items-center justify-center border text-[10px] font-bold tracking-wider ${
              hasPrompt
                ? 'border-[#f28c28] bg-[#d97b29] text-[#0e1012]'
                : 'border-[#d97b29]/50 bg-[#0e1012]/80 text-[#f28c28]'
            }`}
          >
            {t.btnSense}
          </button>
          <button
            type="button"
            onPointerDown={() => input.triggerVirtualAction('cast_sign', true)}
            onPointerUp={() => input.triggerVirtualAction('cast_sign', false)}
            className="flex h-12 w-14 items-center justify-center border border-[#f28c28]/70 bg-[#2a1d12]/85 text-[10px] font-bold tracking-wider text-[#f28c28]"
          >
            {t.btnSign}
          </button>

          <button
            type="button"
            onPointerDown={() => input.triggerVirtualAction('dash', true)}
            onPointerUp={() => input.triggerVirtualAction('dash', false)}
            className="flex h-13 w-14 items-center justify-center border border-[#ece8df]/35 bg-[#121618]/85 text-[10px] font-bold tracking-wider text-[#ece8df]"
          >
            {t.btnDodge}
          </button>
          <button
            type="button"
            onPointerDown={() => input.triggerVirtualAction('jump', true)}
            onPointerUp={() => input.triggerVirtualAction('jump', false)}
            className="flex h-13 w-14 items-center justify-center border border-[#8ba69c]/60 bg-[#121818]/85 text-[10px] font-bold tracking-wider text-[#b8dce8]"
          >
            {t.btnJump}
          </button>
          <button
            type="button"
            onPointerDown={() => input.triggerVirtualAction('attack_light', true)}
            onPointerUp={() => input.triggerVirtualAction('attack_light', false)}
            className="flex h-13 w-14 items-center justify-center border-2 border-[#d97b29] bg-[#8f2326]/90 text-[11px] font-bold tracking-wider text-[#ece8df]"
          >
            {t.btnAttack}
          </button>
        </div>
      </div>
    </>
  );
}
