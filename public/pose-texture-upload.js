import * as THREE from "three";

// The pinned renderer uploads DataTexture updateRanges one row at a time.
// Joint rows are contiguous RGBA Float32 data: upload adjacent dirty rows as
// one rectangle, with a view containing ONLY those bytes. Keep the renderer's
// texture ownership, tracked bindings and pixel-store state; never query GL.
export function uploadPoseTextureRows(renderer, texture) {
  const state = renderer?.state,
    gl = renderer?.getContext?.(),
    image = texture.image,
    ranges = texture.updateRanges;
  if (!state?.bindTexture || !state.pixelStorei || !renderer.initTexture ||
      !renderer.properties || !gl?.texSubImage2D ||
      !texture.isDataTexture || texture.type !== THREE.FloatType ||
      texture.format !== THREE.RGBAFormat || texture.flipY ||
      texture.premultiplyAlpha || texture.generateMipmaps ||
      texture.colorSpace !== THREE.NoColorSpace ||
      !(image?.data instanceof Float32Array) ||
      image.data.length !== image.width * image.height * 4 || !ranges.length)
    return false;
  const stride = image.width * 4;
  let end = 0;
  for (const range of ranges) {
    if (!Number.isInteger(range.start) || !Number.isInteger(range.count) ||
        range.start < end || range.count <= 0 || range.start % stride ||
        range.count % stride || range.start + range.count > image.data.length)
      return false;
    end = range.start + range.count;
  }
  const properties = renderer.properties.get(texture);
  try {
    if (!properties.__webglTexture || properties.__version !== texture.version) {
      // First allocation / context restoration / an explicit external update:
      // initialize the complete CPU image once via Three, including zero rows.
      texture.clearUpdateRanges();
      renderer.initTexture(texture);
      return true;
    }
    state.bindTexture(gl.TEXTURE_2D, properties.__webglTexture);
    state.pixelStorei(gl.UNPACK_ALIGNMENT, texture.unpackAlignment);
    state.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    state.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    state.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    state.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    state.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    state.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
    for (let i = 0; i < ranges.length;) {
      const start = ranges[i].start;
      let end = start + ranges[i++].count;
      while (i < ranges.length && ranges[i].start === end)
        end += ranges[i++].count;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, start / stride,
        image.width, (end - start) / stride, gl.RGBA, gl.FLOAT,
        image.data.subarray(start, end));
    }
    texture.clearUpdateRanges();
    return true;
  } catch {
    // A context/driver failure must retain the native upload fallback. Dirty
    // CPU bytes stay authoritative, including a partially submitted rectangle.
    return false;
  }
}
