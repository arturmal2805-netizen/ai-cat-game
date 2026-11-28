import assert from "node:assert/strict";
export async function probeSquishGpu(page) {
  const result = await page.evaluate(() => {
    const q = __lagoonQA,
      T = q.THREE;
    const toy = q
      .warehouse()
      .interior.userData.toys.find((t) => t.userData.material === "cloud");
    const u = toy.userData,
      binding = u.gpuBindings[0],
      hair = u.meshes.find((m) => m.userData.squishGpuCage),
      s = u.solver;
    q.drawFrame();
    const gl = q.renderer.getContext(),
      resources = [];
    const shader = (type, source) => {
      const x = gl.createShader(type);
      resources.push(["shader", x]);
      gl.shaderSource(x, source);
      gl.compileShader(x);
      if (!gl.getShaderParameter(x, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(x));
      return x;
    };
    let program, vao, tf, input, output;
    try {
      program = gl.createProgram();
      gl.attachShader(
        program,
        shader(
          gl.VERTEX_SHADER,
          `#version 300 es
precision highp float;
${binding.glsl.replaceAll("texture2D(", "texture(")}
layout(location=0) in vec3 point;layout(location=1) in vec3 inputNormal;
out vec3 capturedPosition;out vec3 capturedNormal;
void main(){mat3 J;capturedPosition=point+squishDisplacement(point,J);capturedNormal=squishNormal(J,inputNormal);gl_Position=vec4(0.,0.,0.,1.);}`,
        ),
      );
      gl.attachShader(
        program,
        shader(
          gl.FRAGMENT_SHADER,
          "#version 300 es\nprecision highp float;out vec4 colour;void main(){colour=vec4(1.);}",
        ),
      );
      gl.transformFeedbackVaryings(
        program,
        ["capturedPosition", "capturedNormal"],
        gl.INTERLEAVED_ATTRIBS,
      );
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program));
      const a = hair.geometry.attributes.position,
        n = hair.geometry.attributes.normal;
      const count = 24,
        data = new Float32Array(count * 6),
        expected = [];
      for (let i = 0; i < count; i++) {
        const index = Math.floor(((i + 0.37) / count) * a.count),
          p = [a.getX(index), a.getY(index), a.getZ(index)],
          normal = new T.Vector3(n.getX(index), n.getY(index), n.getZ(index));
        data.set(p, i * 6);
        data.set(normal.toArray(), i * 6 + 3);
        const columns = [];
        for (let k = 0; k < 3; k++) {
          const pa = p.slice(),
            pb = p.slice();
          pa[k] -= 0.0001;
          pb[k] += 0.0001;
          const x = s.sample(...pa, new Float64Array(3)),
            y = s.sample(...pb, new Float64Array(3));
          columns.push(new T.Vector3(...y.map((v, j) => (v - x[j]) / 0.0002)));
        }
        const [x, y, z] = columns;
        const corrected = new T.Vector3()
          .crossVectors(y, z)
          .multiplyScalar(normal.x)
          .add(new T.Vector3().crossVectors(z, x).multiplyScalar(normal.y))
          .add(new T.Vector3().crossVectors(x, y).multiplyScalar(normal.z))
          .normalize();
        expected.push({
          position: Array.from(s.sample(...p, new Float64Array(3))),
          normal: corrected.toArray(),
        });
      }
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      input = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, input);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (let i = 0; i < 2; i++) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 24, i * 12);
      }
      output = gl.createBuffer();
      gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, output);
      gl.bufferData(
        gl.TRANSFORM_FEEDBACK_BUFFER,
        data.byteLength,
        gl.STREAM_READ,
      );
      tf = gl.createTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, output);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      const tex = q.renderer.properties.get(binding.texture).__webglTexture;
      if (!tex)
        throw Error(
          "Actual cloud cage texture was not uploaded by the native renderer",
        );
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(program, "uSquishCage"), 0);
      gl.uniform2f(
        gl.getUniformLocation(program, "uSquishCageTexture"),
        binding.texture.image.width,
        binding.texture.image.height,
      );
      gl.uniform3fv(
        gl.getUniformLocation(program, "uSquishResolution"),
        s.resolution,
      );
      gl.uniform3fv(gl.getUniformLocation(program, "uSquishSize"), s.size);
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);
      const actual = new Float32Array(count * 6);
      gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, actual);
      let positionError = 0,
        normalError = 0;
      for (let i = 0; i < count; i++) {
        positionError = Math.max(
          positionError,
          Math.hypot(
            ...expected[i].position.map((v, k) => v - actual[i * 6 + k]),
          ),
        );
        normalError = Math.max(
          normalError,
          Math.hypot(
            ...expected[i].normal.map((v, k) => v - actual[i * 6 + k + 3]),
          ),
        );
      }
      const error = gl.getError();
      return {
        count,
        positionError,
        normalError,
        glError: error,
        bindings: binding.diagnostics,
        solver: s.diagnostics(),
        method:
          "Actual native WebGL2 transform feedback using the production cage GLSL and uploaded texture",
      };
    } finally {
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
      gl.useProgram(null);
      if (tf) gl.deleteTransformFeedback(tf);
      if (vao) gl.deleteVertexArray(vao);
      if (input) gl.deleteBuffer(input);
      if (output) gl.deleteBuffer(output);
      if (program) gl.deleteProgram(program);
      for (const [, x] of resources) gl.deleteShader(x);
      q.renderer.resetState();
    }
  });
  assert.equal(result.glError, 0);
  assert(result.positionError < 0.00005, JSON.stringify(result));
  assert(result.normalError < 0.002, JSON.stringify(result));
  return result;
}
