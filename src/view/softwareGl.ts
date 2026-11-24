import type * as THREE from 'three';

export function detectSoftwareGl(): boolean {
  try {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('forceGpu') === '1') {
      return false;
    }
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function afterDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  registerTimer: (id: number) => void,
): void {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync !== 'function') {
    registerTimer(window.setTimeout(cb, 80));
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
    if (status === gl.UNSIGNALED) {
      registerTimer(window.setTimeout(poll, 5));
    } else {
      if (sync) gl.deleteSync(sync);
      registerTimer(window.setTimeout(cb, 80));
    }
  };
  registerTimer(window.setTimeout(poll, 5));
}
