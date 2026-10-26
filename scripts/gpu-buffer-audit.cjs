// QA only. Track actual allocated WebGL buffer bytes, including retirement.
module.exports = function auditGpuBuffers(renderer) {
  const gl = renderer.getContext(),
    compiles = [];
  const bound = new Map(),
    sizes = new Map();
  let bytes = 0,
    peak = 0;
  const bind = gl.bindBuffer.bind(gl),
    data = gl.bufferData.bind(gl),
    drop = gl.deleteBuffer.bind(gl);
  gl.bindBuffer = (target, buffer) => {
    bound.set(target, buffer);
    return bind(target, buffer);
  };
  gl.bufferData = (target, value, usage, offset, length) => {
    const result = data(
      target,
      value,
      usage,
      ...(offset === undefined ? [] : [offset, length]),
    );
    const buffer = bound.get(target);
    if (buffer) {
      const size =
        typeof value === "number"
          ? value
          : !value
            ? 0
            : length !== undefined
              ? length * (value.BYTES_PER_ELEMENT || 1)
              : value.byteLength -
                (offset || 0) * (value.BYTES_PER_ELEMENT || 1);
      bytes += size - (sizes.get(buffer) || 0);
      sizes.set(buffer, size);
      peak = Math.max(peak, bytes);
    }
    return result;
  };
  gl.deleteBuffer = (buffer) => {
    bytes -= sizes.get(buffer) || 0;
    sizes.delete(buffer);
    return drop(buffer);
  };
  let current = null, commandFrame=-1, commandCalls=0, commands=0, staticCommands=0;
  const direct = renderer.renderBufferDirect,
    log = gl.getProgramInfoLog.bind(gl);
  renderer.renderBufferDirect = function (...args) {
    const frame=renderer.info.render.frame;
    if(frame!==commandFrame){commandFrame=frame;commandCalls=commands=staticCommands=0;}
    const object=args[4], n=object?.isBatchedMesh?object._multiDrawCount:1;
    commandCalls++;commands+=n;
    if(object?.userData.staticSubmission)staticCommands+=n;
    current = {
      object: args[4]?.name || args[4]?.type,
      material: args[3]?.type,
      shadow: args[1] === null,
    };
    try {
      return direct.apply(this, args);
    } finally {
      current = null;
    }
  };
  gl.getProgramInfoLog = (program) => {
    const t = performance.now(),
      result = log(program);
    compiles.push({ at: t, ms: performance.now() - t, draw: current });
    if (compiles.length > 1024) compiles.shift();
    return result;
  };
  return {
    snapshot: () => ({
      bytes,
      peak,
      buffers: sizes.size,
      commandFrame,commandCalls,commands,staticCommands,
      compiles: compiles.slice(),
    }),
  };
};
