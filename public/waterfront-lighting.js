import * as T from "three";
// These fixtures illuminate only the new materials. They do not enter the
// world's global Three light list or add shader variants to protected venues.
export function waterfrontLocalLighting(material, origin) {
  const clock = { value: 0 },
    night = { value: 0.1 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wfOrigin = { value: new T.Vector3(origin.x, 0, origin.z) };
    shader.uniforms.wfNight = night;
    shader.vertexShader =
      "varying vec3 vWaterfrontWorld;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        "vWaterfrontWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>",
      );
    shader.fragmentShader =
      "varying vec3 vWaterfrontWorld;uniform vec3 wfOrigin;uniform float wfNight;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `vec3 wfP=vWaterfrontWorld-wfOrigin;float wfGlow=0.;for(int i=0;i<5;i++){vec3 lamp=vec3(float(i-2)*50.,22.,-5.);float d=length(wfP-lamp);wfGlow+=pow(max(0.,1.-d/49.),2.);}
 float border=exp(-abs(wfP.z-(60.+50.*cos(wfP.x/330.*1.5708)))/12.)*.22;
 outgoingLight+=diffuseColor.rgb*vec3(1.,.68,.38)*(wfGlow+border)*wfNight*(1.-metalnessFactor*.6);
 #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => "waterfront-bounded-fixture-light-v1";
  return {
    update(t, n) {
      clock.value = t;
      night.value = 0.12 + n * 0.85;
    },
  };
}
export function waterfrontMarble() {
  const n = 256,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const a = (x / n) * Math.PI * 2,
        b = (y / n) * Math.PI * 2,
        vein = Math.pow(
          Math.max(
            0,
            Math.sin(
              a * 2 + Math.sin(b) * 0.8 + Math.sin(a * 5 + b * 2) * 0.12,
            ),
          ),
          45,
        ),
        fine = Math.sin(x * 4.31 + y * 1.71) * 0.9,
        k = (y * n + x) * 4;
      data[k] = 244 - vein * 27 + fine;
      data[k + 1] = 239 - vein * 29 + fine;
      data[k + 2] = 231 - vein * 20 + fine;
      data[k + 3] = 255;
    }
  const map = new T.DataTexture(data, n, n);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.magFilter = T.LinearFilter;
  map.minFilter = T.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}
