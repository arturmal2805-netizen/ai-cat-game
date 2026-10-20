// QA only: drain actual full-resolution frames, never a production GPU wait.
export async function checkGroundRaster(page) {
  return page.evaluate(() => {
    const q = __lagoonQA,
      gl = q.renderer.getContext(),
      sources = new Map();
    q.scene.traverse((o) => {
      if (o.isMesh && o.name === "Meadow flower" && !sources.has(o.geometry))
        sources.set(o.geometry, o.geometry.index);
    });
    const native = [],
      indexed = [],
      pixels = new Map();
    const setMode = (enabled) => {
      for (const [geometry, index] of sources)
        geometry.setIndex(enabled ? index : null);
    };
    try {
      for (const enabled of [false, true, true, false]) {
        setMode(enabled);
        q.drawFrame();
        gl.finish(); // prime this unchanged geometry's VAO
        for (let i = 0; i < 3; i++) {
          const start = performance.now();
          q.drawFrame();
          gl.finish();
          (enabled ? indexed : native).push(performance.now() - start);
        }
        if (!pixels.has(enabled)) {
          const a = new Uint8Array(
            gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
          );
          gl.readPixels(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            a,
          );
          pixels.set(enabled, a);
        }
      }
      let changed = 0;
      const a = pixels.get(false),
        b = pixels.get(true);
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
      if (changed)
        throw Error(
          "Exact flower indexing changed framebuffer bytes: " + changed,
        );
      const summary = (samples) => {
        const sorted = [...samples].sort((a, b) => a - b);
        return {
          samples,
          median: (sorted[2] + sorted[3]) / 2,
          min: sorted[0],
          max: sorted.at(-1),
        };
      };
      return {
        changed,
        native: summary(native),
        indexed: summary(indexed),
        buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        dpr: q.renderer.getPixelRatio(),
      };
    } finally {
      setMode(true);
    }
  });
}
