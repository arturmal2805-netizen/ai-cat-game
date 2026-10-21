// Copy the native PCF depth attachment entirely on the GPU. The generic texture
// copier queries CPU pixel-unpack state even for depth-to-depth copies; those
// queries can synchronously drain an otherwise asynchronous frame queue.
export function copyDepthTarget(renderer, source, destination) {
  const gl = renderer.getContext(), state = renderer.state;
  const from = renderer.properties.get(source).__webglFramebuffer,
    to = renderer.properties.get(destination).__webglFramebuffer;
  if (!from || !to || Array.isArray(from) || Array.isArray(to) ||
      source.samples || destination.samples ||
      source.width !== destination.width || source.height !== destination.height)
    throw Error("Unsupported depth copy target");
  const current = renderer.getRenderTarget();
  try {
    state.bindFramebuffer(gl.READ_FRAMEBUFFER, from);
    state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, to);
    gl.blitFramebuffer(0, 0, source.width, source.height,
      0, 0, destination.width, destination.height, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
  } finally {
    // Keep Three's framebuffer cache coherent, including its FRAMEBUFFER alias
    // of DRAW_FRAMEBUFFER. Native shadow draws must resume on the original FBO.
    state.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    renderer.setRenderTarget(current);
  }
}
