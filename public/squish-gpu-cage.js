import * as T from "three";
export const CAGE_GLSL = `
uniform sampler2D uSquishCage;
uniform vec2 uSquishCageTexture;
uniform vec3 uSquishResolution;
uniform vec3 uSquishSize;
vec3 squishDisplacement(vec3 p,out mat3 J){
 vec3 raw=(p/uSquishSize+vec3(.5,0.,.5))*(uSquishResolution-1.);
 vec3 f=clamp(raw,vec3(0.),uSquishResolution-1.000001);
 vec3 cell=floor(f),t=f-cell;
 vec3 derivative=(uSquishResolution-1.)/uSquishSize;
 derivative*=step(vec3(0.),raw)*step(raw,uSquishResolution-1.);
 vec3 d=vec3(0.);J=mat3(1.);
 for(int y=0;y<2;y++)for(int z=0;z<2;z++)for(int x=0;x<2;x++){
  vec3 b=vec3(float(x),float(y),float(z));
  vec3 w=mix(1.-t,t,b),sgn=b*2.-1.;
  vec3 c=cell+b;
  float i=(c.y*uSquishResolution.z+c.z)*uSquishResolution.x+c.x;
  vec2 uv=(vec2(mod(i,uSquishCageTexture.x),floor(i/uSquishCageTexture.x))+.5)/uSquishCageTexture;
  vec3 v=texture2D(uSquishCage,uv).xyz;
  d+=v*w.x*w.y*w.z;
  J[0]+=v*sgn.x*w.y*w.z*derivative.x;
  J[1]+=v*sgn.y*w.x*w.z*derivative.y;
  J[2]+=v*sgn.z*w.x*w.y*derivative.z;
 }
 return d;
}
vec3 squishNormal(mat3 J,vec3 n){
 vec3 q=mat3(cross(J[1],J[2]),cross(J[2],J[0]),cross(J[0],J[1]))*n;
 return dot(q,q)>1.e-12?normalize(q):n;
}
`;
// Same physical cage and full original groom. Only its 343 displacements upload;
// no repeated CPU deformation/normals/upload of the 8,000 fibre vertex buffer.
export function bindGpuCage(mesh, solver) {
  const width = 16,
    height = Math.ceil(solver.count / width),
    data = new Float32Array(width * height * 4),
    texture = new T.DataTexture(data, width, height, T.RGBAFormat, T.FloatType),
    uniforms = {
      uSquishCage: { value: texture },
      uSquishCageTexture: { value: new T.Vector2(width, height) },
      uSquishResolution: { value: new T.Vector3(...solver.resolution) },
      uSquishSize: { value: new T.Vector3(...solver.size) },
    },
    originalCompile = mesh.material.onBeforeCompile,
    key = mesh.material.customProgramCacheKey();
  texture.needsUpdate = true;
  mesh.material.onBeforeCompile = (shader) => {
    originalCompile(shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      CAGE_GLSL +
      "\n" +
      shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nmat3 squishJ;vec3 squishD=squishDisplacement(position,squishJ);objectNormal=squishNormal(squishJ,objectNormal);",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed+=squishD;",
        );
  };
  mesh.material.customProgramCacheKey = () => key + "-gpu-cage-v1";
  mesh.userData.squishGpuCage = true;
  mesh.geometry.computeBoundingBox();
  mesh.geometry.boundingBox.expandByScalar(
    solver.profile.maximumDeformation + 0.15,
  );
  mesh.geometry.computeBoundingSphere();
  mesh.geometry.boundingSphere.radius +=
    solver.profile.maximumDeformation + 0.15;
  let revision = -1,
    uploads = 0,
    bytes = 0;
  function update() {
    if (revision === solver.revision) return;
    revision = solver.revision;
    if (solver.count > width * height)
      throw new RangeError("Cloud cage texture capacity exceeded");
    uniforms.uSquishResolution.value.set(...solver.resolution);
    for (let i = 0; i < solver.count; i++)
      for (let k = 0; k < 3; k++)
        data[i * 4 + k] =
          solver.position[i * 3 + k] - solver.original[i * 3 + k];
    texture.needsUpdate = true;
    uploads++;
    bytes += data.byteLength;
  }
  update();
  return {
    update,
    texture,
    uniforms,
    glsl: CAGE_GLSL,
    get diagnostics() {
      return {
        uploads,
        bytes,
        vertices: mesh.geometry.attributes.position.count,
        capacity: width * height,
        sourceImmutable: true,
      };
    },
    dispose() {
      texture.dispose();
    },
  };
}
// Analytic inverse-transpose reference for real GL parity tests.
export function cageNormal(solver, point, normal) {
  const eps = 1e-4,
    columns = [];
  for (let k = 0; k < 3; k++) {
    const a = point.slice(),
      b = point.slice();
    a[k] -= eps;
    b[k] += eps;
    const pa = solver.sample(...a, new Float64Array(3)),
      pb = solver.sample(...b, new Float64Array(3));
    columns.push(
      new T.Vector3(
        (pb[0] - pa[0]) / (2 * eps),
        (pb[1] - pa[1]) / (2 * eps),
        (pb[2] - pa[2]) / (2 * eps),
      ),
    );
  }
  const [a, b, c] = columns;
  return new T.Vector3()
    .crossVectors(b, c)
    .multiplyScalar(normal[0])
    .add(new T.Vector3().crossVectors(c, a).multiplyScalar(normal[1]))
    .add(new T.Vector3().crossVectors(a, b).multiplyScalar(normal[2]))
    .normalize();
}
