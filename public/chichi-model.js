import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { paintCoat } from "./cat-sculpt.js";
import { catAppearance, CAT_BUILDS } from "./cat-breeds.js";
import {
  sculptBreedDetails,
  curlEar,
  lynxTuft,
  ruffGeometry,
  bareSkin,
} from "./cat-breed-details.js";
import {
  CHICHI_COAT,
  CHICHI_EYES,
  CHICHI_ANATOMY,
  kittenSurface,
  kittenEar,
  kittenIris,
  kittenPupil,
  kittenLeg,
  groomFur,
} from "./chichi-sculpt.js";

function softCoat(color = CHICHI_COAT, face = false) {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.93,
    vertexColors: true,
    sheen: 0.7,
    sheenRoughness: 0.85,
    sheenColor: 0xbfc1c3,
    emissive: 0x303235,
    emissiveIntensity: 0.14,
  });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 kittenPoint;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nkittenPoint=position;",
      );
    shader.fragmentShader =
      "varying vec3 kittenPoint;\n" +
      shader.fragmentShader
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
      float thread=${face ? "atan(kittenPoint.x,kittenPoint.y+.16)*380.0+sin(kittenPoint.z*97.0+kittenPoint.y*11.0)*.8" : "kittenPoint.x*1900.0+sin(kittenPoint.y*77.0+kittenPoint.z*44.0)*3.0"};
      float threadFade=1.0-smoothstep(1.0,5.0,fwidth(thread));
      float nap=sin(thread)*threadFade;
      float undercoat=sin(kittenPoint.x*97.0+kittenPoint.y*113.0)*sin(kittenPoint.z*137.0-kittenPoint.y*89.0);
      diffuseColor.rgb*=.965+nap*.075+undercoat*.025;
    `,
        )
        .replace(
          "#include <normal_fragment_begin>",
          "#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(nap*.055,0.0,nap*.018));",
        );
  };
  m.customProgramCacheKey = () => "chichi-reference-short-fur-v2-" + face;
  return m;
}

// Same named rig as the neighbours, but an independently sculpted kitten.
// Geometry and per-vertex fur are shared by the live model and downloadable GLBs.
export function createReferenceChichi(mood, options = {}) {
  const crowd = options.color != null || !!options.breed,
    detailed = !crowd && options.detail !== "npc",
    cat = new THREE.Group();
  cat.name = options.name || "Chichi";
  const appearance = catAppearance(
      crowd
        ? { breed: "tabby", ...options }
        : {
            breed: "blue",
            color: CHICHI_COAT,
            eyeColor: CHICHI_EYES,
          },
    ),
    build = { ...CAT_BUILDS[crowd ? appearance.build : "balanced"] },
    coat = appearance.color ?? CHICHI_COAT,
    surfaceQuality = crowd ? 19 : detailed;
  function coatGeometry(geometry, region, sculpt = true) {
    if (!crowd) return geometry;
    if (sculpt) sculptBreedDetails(geometry, appearance, region);
    // Pattern coordinates are in the same anatomical space for skin and fur.
    if (
      sculpt &&
      appearance.fur === "long" &&
      ["body", "face"].includes(region)
    ) {
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          edge =
            region === "face"
              ? THREE.MathUtils.smoothstep(Math.abs(x), 0.32, 0.5)
              : 0.7;
        const tuft = 1 + edge * (0.06 + 0.03 * Math.sin(y * 45 + z * 19));
        p.setXYZ(i, x * tuft, y, z);
      }
      geometry.computeVertexNormals();
    }
    const g = geometry.clone();
    if (region === "face") g.scale(1 / 0.545, 1 / 0.443, 1 / 0.435);
    paintCoat(g, appearance, region);
    const position = g.attributes.position,
      colors = g.attributes.color,
      base = new THREE.Color(coat),
      light = new THREE.Color(0xf6eddd),
      accent = new THREE.Color(appearance.patchColor ?? coat),
      tint = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i),
        y = position.getY(i),
        z = position.getZ(i);
      const white =
        (region === "paw" &&
          y < -0.24 &&
          (appearance.whitePaws || appearance.pattern === "tuxedo")) ||
        (region === "face" &&
          appearance.pattern === "tuxedo" &&
          y < -0.25 &&
          z > 0.67 &&
          Math.abs(x) < 0.3);
      if (appearance.pattern === "van") {
        const cap =
            region === "face"
              ? THREE.MathUtils.smoothstep(y, 0.18, 0.43) *
                THREE.MathUtils.smoothstep(Math.abs(x), 0.16, 0.38)
              : region === "tail"
                ? 1
                : 0,
          stripe = region === "tail" ? 0.88 + 0.12 * Math.cos(y * 25) : 1;
        tint.copy(base).lerp(accent, cap);
        colors.setXYZ(
          i,
          (tint.r / base.r) * stripe,
          (tint.g / base.g) * stripe,
          (tint.b / base.b) * stripe,
        );
      } else if (white)
        colors.setXYZ(
          i,
          light.r / Math.max(0.001, base.r),
          light.g / Math.max(0.001, base.g),
          light.b / Math.max(0.001, base.b),
        );
      else if (
        appearance.pattern === "point" &&
        ((region === "face" && y < 0.25 && z > 0.45) ||
          region === "paw" ||
          region === "tail")
      ) {
        colors.setXYZ(
          i,
          colors.getX(i) * 0.38,
          colors.getY(i) * 0.38,
          colors.getZ(i) * 0.38,
        );
      }
    }
    geometry.setAttribute("color", g.attributes.color);
    g.dispose();
    return geometry;
  }
  const fur = softCoat(coat),
    faceMaterial = softCoat(
      new THREE.Color(coat).multiplyScalar(crowd ? 1 : 1.3),
      true,
    ),
    hairMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(coat).multiplyScalar(1.5),
      vertexColors: true,
      roughness: 0.88,
      sheen: 0.65,
      sheenColor: 0xbfc1c3,
      sheenRoughness: 0.8,
      emissive: 0x43484e,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
    }),
    earMaterial = softCoat(0xffffff),
    noseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x49484c,
      roughness: 0.67,
    }),
    mouthMaterial = new THREE.MeshStandardMaterial({
      color: 0x3f3437,
      roughness: 0.9,
    }),
    pupilMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x101517,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    }),
    irisMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.42,
      clearcoat: 1,
      clearcoatRoughness: 0.09,
    }),
    whiskerMaterial = new THREE.MeshStandardMaterial({
      color: 0xd5d2cf,
      roughness: 0.9,
    }),
    shineMaterial = new THREE.MeshBasicMaterial({
      color: 0xfffcf7,
      toneMapped: false,
    }),
    muzzleMaterial = new THREE.MeshStandardMaterial({
      color: crowd
        ? new THREE.Color(coat).lerp(new THREE.Color(0xbcc0c2), 0.18)
        : 0x83888c,
      roughness: 1,
    }),
    tongueMaterial = new THREE.MeshStandardMaterial({
      color: 0xcd929c,
      roughness: 0.8,
    });

  function mesh(parent, name, geometry, material) {
    if (material.vertexColors && !geometry.attributes.color)
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 3).fill(1),
          3,
        ),
      );
    const o = new THREE.Mesh(geometry, material);
    o.name = name;
    o.castShadow = true;
    parent.add(o);
    return o;
  }
  function ellipsoid(parent, name, material, position, scale) {
    const o = mesh(
      parent,
      name,
      new THREE.SphereGeometry(
        1,
        detailed ? 32 : crowd ? 10 : 16,
        detailed ? 24 : crowd ? 7 : 12,
      ),
      material,
    );
    o.position.set(...position);
    o.scale.set(...scale);
    return o;
  }
  function curve(parent, name, points, radius, material, segments = 20) {
    const path = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return mesh(
      parent,
      name,
      new THREE.TubeGeometry(
        path,
        detailed ? segments : 8,
        radius,
        detailed ? 7 : 4,
        false,
      ),
      material,
    );
  }
  function furOn(parent, name, surface, count, options) {
    if (crowd && appearance.fur === "bare") return null;
    const geometry = groomFur(
      surface,
      detailed
        ? count
        : Math.round(
            count *
              (crowd ? (appearance.fur === "long" ? 0.006 : 0.0035) : 0.075),
          ),
      {
        ...options,
        length: options.length * (crowd && appearance.fur === "long" ? 2.8 : 1),
        surfaceKey: crowd
          ? JSON.stringify([
              appearance.breed,
              appearance.build,
              coat,
              appearance.pattern,
              appearance.earCurl,
              appearance.squareMuzzle,
            ])
          : "",
      },
    );
    if (crowd && name !== "EarVelvet-1" && name !== "EarVelvet1")
      coatGeometry(
        geometry,
        options.region === "leg" ? "paw" : options.region || "body",
        false,
      );
    const o = mesh(parent, name, geometry, hairMaterial);
    o.castShadow = false;
    return o;
  }
  const body = mesh(
    cat,
    "Body",
    coatGeometry(kittenSurface("body", surfaceQuality), "body"),
    fur,
  );
  body.position.set(0, CHICHI_ANATOMY.bodyY, -0.095);
  body.scale.set(
    CHICHI_ANATOMY.bodyX,
    CHICHI_ANATOMY.bodyHeight,
    CHICHI_ANATOMY.bodyLength,
  );
  furOn(body, detailed ? "CoatFluff" : "CoatFibres", body.geometry, 32000, {
    seed: 51,
    length: 0.042,
    width: 0.0018,
  });
  const chest = ellipsoid(cat, "Chest", fur, [0, 0.9, 0.36], [0.24, 0.3, 0.2]);
  chest.visible = false;
  const head = new THREE.Group();
  head.name = "Head";
  head.position.set(0, CHICHI_ANATOMY.headY, CHICHI_ANATOMY.headZ);
  cat.add(head);
  const face = mesh(
    head,
    "Face",
    coatGeometry(kittenSurface("face", surfaceQuality), "face"),
    faceMaterial,
  );
  const cheekFur = furOn(
    head,
    detailed ? "CheekFluff" : "CheekFibres",
    face.geometry,
    62000,
    {
      seed: 1427,
      length: 0.026,
      width: 0.0022,
      region: "face",
    },
  );
  if (cheekFur) {
    cheekFur.material = hairMaterial.clone();
    if (!crowd) cheekFur.material.color.multiplyScalar(1.3);
  }
  if (crowd) {
    head.scale.set(
      build.face * (appearance.faceWidth || 1),
      build.face,
      build.face,
    );
    if (appearance.neckRuff) {
      const ruff = mesh(
        head,
        "NeckRuff",
        coatGeometry(ruffGeometry(), "ruff"),
        fur,
      );
      // Follow the chin and batch into the head: a distinct mane costs no
      // additional draw on the phone, including during turns and blinks.
      ruff.position.set(0, -0.33, -0.12);
      ruff.scale.set(0.32 * appearance.neckRuff, 0.33, 0.29);
    }
    if (appearance.pattern === "tuxedo") {
      chest.visible = true;
      chest.material = fur.clone();
      chest.material.color.set(0xf2ede2);
      chest.scale.set(0.2, 0.24, 0.075);
    }
    if (appearance.fur === "bare") {
      bareSkin(fur);
      bareSkin(faceMaterial, "face");
      bareSkin(earMaterial, "ear");
      noseMaterial.color.set(0x946f79);
    }
  }
  const ears = [],
    eyes = [],
    pupils = [],
    closedEyes = [],
    legs = [],
    legJoints = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.name = side < 0 ? "LeftEar" : "RightEar";
    ear.position.set(side * 0.335, 0.285, -0.08);
    head.add(ear);
    ears.push(ear);
    const outer = mesh(
      ear,
      "EarShell" + side,
      curlEar(
        kittenEar(side, {
          color:
            crowd && appearance.pattern === "point"
              ? new THREE.Color(coat).multiplyScalar(0.28).getHex()
              : crowd && appearance.pattern === "van"
                ? appearance.patchColor
                : coat,
          detailed: !crowd,
        }),
        crowd ? appearance.earCurl : 0,
      ),
      earMaterial,
    );
    const earFur = furOn(ear, "EarVelvet" + side, outer.geometry, 4800, {
      seed: side + 70,
      length: 0.018,
      width: 0.0008,
      region: "ear",
      colorRange: 1,
    });
    // Ear geometry already carries full coat/skin colours, so no second grey tint.
    if (earFur) {
      earFur.material = hairMaterial.clone();
      earFur.material.color.set(0xffffff);
    }
    if (crowd) ear.scale.setScalar(appearance.ears || 1);
    if (crowd && appearance.earTufts)
      mesh(ear, "LynxTuft" + side, lynxTuft(side, appearance.earTufts), fur);
    if (detailed)
      for (let wisp = 0; wisp < 5; wisp++)
        curve(
          ear,
          `InnerEarWisp${side}_${wisp}`,
          [
            [side * (0.03 + wisp * 0.019), 0.07, 0.06],
            [side * (0.02 + wisp * 0.015), 0.13 + wisp * 0.008, 0.065],
            [side * (0.005 + wisp * 0.012), 0.19 + wisp * 0.012, 0.047],
          ],
          0.00045,
          whiskerMaterial,
        );
    const blink = new THREE.Group();
    blink.name = "Eye" + side;
    blink.position.set(side * 0.22, 0.015, 0.325);
    blink.rotation.y = side * 0.115;
    head.add(blink);
    eyes.push(blink);
    const eye = new THREE.Group();
    eye.name = "EyeGlobe" + side;
    eye.scale.setScalar(0.91);
    blink.add(eye);
    ellipsoid(
      eye,
      "EyeRim" + side,
      mouthMaterial,
      [0, 0, 0.012],
      [0.151, 0.161, 0.052],
    );
    const iris = mesh(
      eye,
      "Iris" + side,
      kittenIris(
        detailed,
        side > 0
          ? appearance.otherEye || appearance.eyeColor
          : appearance.eyeColor,
      ),
      irisMaterial,
    );
    iris.scale.set(0.143, 0.151, 1);
    iris.position.z = 0.045;
    const pupil = mesh(
      eye,
      "Pupil" + side,
      kittenPupil(detailed),
      pupilMaterial,
    );
    pupil.position.set(0, 0, 0.045);
    pupil.scale.set(CHICHI_ANATOMY.pupilX, CHICHI_ANATOMY.pupilY, 1);
    pupils.push(pupil);
    ellipsoid(
      eye,
      "EyeShine" + side,
      shineMaterial,
      [-0.037, 0.059, 0.079],
      [0.025, 0.03, 0.006],
    );
    ellipsoid(
      eye,
      "EyeShineSmall" + side,
      shineMaterial,
      [0.043, -0.058, 0.075],
      [0.008, 0.011, 0.004],
    );
    // Fur-coloured lids tuck the edge of the globe into the broad cheeks.
    for (const [name, sign] of [
      ["UpperLid", 1],
      ["LowerLid", -1],
    ]) {
      const lid = curve(
        eye,
        name + side,
        [
          [-0.147, 0, 0.037],
          [-0.112, sign * 0.11, 0.052],
          [0, sign * 0.157, 0.048],
          [0.112, sign * 0.11, 0.052],
          [0.147, 0, 0.037],
        ],
        0.007,
        fur,
      );
      lid.geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          new Float32Array(lid.geometry.attributes.position.count * 3).fill(
            name === "UpperLid" ? 0.72 : 1,
          ),
          3,
        ),
      );
      furOn(eye, name + "Velvet" + side, lid.geometry, 1200, {
        seed: 180 + side + (sign + 1) * 5,
        length: 0.009,
        width: 0.0007,
        region: "lid",
      });
    }
    const closed = new THREE.Group();
    closed.name = "ClosedEye" + side;
    closed.position.set(side * 0.22, 0.015, 0.325);
    closed.rotation.y = side * 0.115;
    head.add(closed);
    const lid = ellipsoid(
      closed,
      "SleepingLid" + side,
      fur,
      [0, 0, 0.02],
      [0.138, 0.143, 0.052],
    );
    const lidSurface = lid.geometry.clone();
    lid.updateMatrix();
    lidSurface.applyMatrix4(lid.matrix);
    furOn(closed, "SleepingLidVelvet" + side, lidSurface, 800, {
      seed: 260 + side,
      length: 0.007,
      width: 0.0008,
      region: "lid",
    });
    lidSurface.dispose();
    curve(
      closed,
      "SleepingLash" + side,
      [
        [-0.124, 0.005, 0.051],
        [0, -0.022, 0.073],
        [0.124, 0.005, 0.051],
      ],
      0.0045,
      mouthMaterial,
    );
    closedEyes.push(closed);
    for (let line = 0; line < (detailed ? 5 : 3); line++) {
      const rootX = side * (0.16 + line * 0.012),
        rootY = -0.17 - line * 0.014,
        rootZ = 0.444 - line * 0.003;
      const points = [
        [rootX, rootY, rootZ],
        [side * (0.37 + line * 0.012), rootY + (line - 2) * 0.023, 0.455],
        [
          side * (0.68 + line * 0.013),
          rootY + (line - 2) * 0.058,
          0.4 - line * 0.016,
        ],
      ];
      const whisker = curve(
        head,
        `Whisker${side}_${line}`,
        points,
        detailed ? 0.0017 : 0.0024,
        whiskerMaterial,
        24,
      );
      // Real tapered whiskers, with tips narrower than their embedded roots.
      const p = whisker.geometry.attributes.position,
        path = new THREE.CatmullRomCurve3(
          points.map((v) => new THREE.Vector3(...v)),
        ),
        radial = detailed ? 7 : 4,
        steps = detailed ? 24 : 8;
      for (let i = 0; i < p.count; i++) {
        const t = Math.floor(i / (radial + 1)) / steps,
          c = path.getPointAt(t),
          s = 1 - t * 0.9;
        p.setXYZ(
          i,
          c.x + (p.getX(i) - c.x) * s,
          c.y + (p.getY(i) - c.y) * s,
          c.z + (p.getZ(i) - c.z) * s,
        );
      }
      whisker.geometry.computeVertexNormals();
    }
    if (detailed)
      for (let line = 0; line < 3; line++)
        curve(
          head,
          `BrowWisp${side}_${line}`,
          [
            [side * (0.16 + line * 0.035), 0.17 + line * 0.008, 0.33],
            [side * (0.23 + line * 0.04), 0.24 + line * 0.025, 0.32],
            [side * (0.34 + line * 0.03), 0.27 + line * 0.034, 0.26],
          ],
          0.0009,
          whiskerMaterial,
        );
  }
  const ns = new THREE.Shape();
  ns.moveTo(-0.064, 0.018);
  ns.bezierCurveTo(-0.055, 0.043, 0.055, 0.043, 0.064, 0.018);
  ns.bezierCurveTo(0.058, -0.009, 0.014, -0.04, 0, -0.052);
  ns.bezierCurveTo(-0.014, -0.04, -0.058, -0.009, -0.064, 0.018);
  const nose = mesh(
    head,
    "Nose",
    new THREE.ExtrudeGeometry(ns, {
      depth: 0.018,
      bevelEnabled: true,
      bevelSize: 0.009,
      bevelThickness: 0.01,
      bevelSegments: 4,
      steps: 1,
      curveSegments: 14,
    }),
    noseMaterial,
  );
  nose.position.set(0, -0.132, 0.475);
  for (const side of [-1, 1])
    ellipsoid(
      head,
      "Nostril" + side,
      mouthMaterial,
      [side * 0.041, -0.132, 0.503],
      [0.012, 0.005, 0.0035],
    );
  curve(
    head,
    "Philtrum",
    [
      [0, -0.18, 0.497],
      [0, -0.207, 0.493],
      [0, -0.224, 0.48],
    ],
    0.0037,
    mouthMaterial,
  );
  for (const side of [-1, 1])
    curve(
      head,
      "Smile" + side,
      [
        [0, -0.224, 0.48],
        [side * 0.044, -0.237, 0.476],
        [side * 0.1, -0.217, 0.458],
      ],
      0.0032,
      mouthMaterial,
    );
  const jaw = new THREE.Group();
  jaw.name = "Jaw";
  jaw.position.set(0, CHICHI_ANATOMY.jawY, 0.35);
  head.add(jaw);
  ellipsoid(
    jaw,
    "Chin",
    muzzleMaterial,
    [0, -0.02, 0.025],
    [0.16, 0.061, 0.092],
  );
  const mouth = ellipsoid(
    head,
    "Mouth",
    mouthMaterial,
    [0, -0.232, 0.447],
    [0.075, 0.001, 0.012],
  );
  const tongue = ellipsoid(
    jaw,
    "Tongue",
    tongueMaterial,
    [0, 0.018, 0.112],
    [0.045, 0.015, 0.035],
  );
  for (const side of [-1, 1])
    for (const front of [-1, 1]) {
      const leg = new THREE.Group();
      leg.name = `Leg${side}_${front}`;
      leg.position.set(
        side * (front > 0 ? 0.23 : 0.285),
        CHICHI_ANATOMY.legY,
        front * (front > 0 ? 0.36 : 0.43),
      );
      if (crowd) {
        leg.scale.set(
          Math.sqrt(build.width),
          build.height,
          Math.sqrt(build.width),
        );
        leg.position.x *= Math.sqrt(build.width);
        leg.position.z *= build.length;
      }
      cat.add(leg);
      legs.push(leg);
      const shape = coatGeometry(
        kittenLeg(front, crowd ? 16 : detailed),
        "paw",
      );
      const shin = mesh(leg, "Shin", shape, fur);
      furOn(leg, `LegVelvet${side}_${front}`, shape, 3500, {
        seed: 100 + side * 5 + front,
        length: 0.015,
        width: 0.0009,
        region: "leg",
      });
      // Fine grooves follow the paw itself, without conspicuous drawn white toes.
      for (const toe of [-1, 1])
        curve(
          leg,
          "Toe" + toe,
          [
            [toe * 0.046, -0.401, 0.235],
            [toe * 0.05, -0.373, 0.23],
            [toe * 0.049, -0.346, 0.213],
          ],
          0.0016,
          mouthMaterial,
        );
    }
  const tail = new THREE.Group();
  tail.name = "Tail";
  tail.position.set(0, 0.77, -0.59);
  cat.add(tail);
  const tailTip = new THREE.Group();
  tailTip.name = "TailTip";
  tail.add(tailTip);
  const tailCurve = new THREE.CatmullRomCurve3(
      [
        [0, 0, 0],
        [-0.025, 0.28, -0.16],
        [-0.06, 0.75, -0.21],
        [-0.09, 1.15, -0.2],
        [-0.17, 1.3, -0.13],
      ].map((p) => new THREE.Vector3(...p)),
    ),
    steps = detailed ? 56 : crowd ? 12 : 20,
    radial = detailed ? 18 : crowd ? 6 : 10,
    tailGeometry = new THREE.TubeGeometry(
      tailCurve,
      steps,
      0.135,
      radial,
      false,
    ),
    tp = tailGeometry.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const t = Math.floor(i / (radial + 1)) / steps,
      c = tailCurve.getPointAt(t),
      taper =
        t > 0.86
          ? Math.sqrt(Math.max(0.00001, 1 - ((t - 0.86) / 0.14) ** 2))
          : 1;
    tp.setXYZ(
      i,
      c.x + (tp.getX(i) - c.x) * taper,
      c.y + (tp.getY(i) - c.y) * taper,
      c.z + (tp.getZ(i) - c.z) * taper,
    );
  }
  tailGeometry.computeVertexNormals();
  tailGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      new Float32Array(tp.count * 3).fill(0.98),
      3,
    ),
  );
  coatGeometry(tailGeometry, "tail");
  mesh(tailTip, "TailCoat", tailGeometry, fur);
  if (crowd && appearance.tailLength)
    tail.scale.setScalar(appearance.tailLength);
  if (crowd && appearance.fur === "long")
    tailTip.scale.set(1.25 * (appearance.tailPlume || 1), 1.05, 1.25);
  furOn(tailTip, "TailVelvet", tailGeometry, 6500, {
    seed: 57,
    length: 0.02,
    width: 0.001,
    region: "tail",
  });
  cat.userData = {
    mood,
    detailed,
    appearance,
    build,
    reference: !crowd,
    referenceFamily: true,
    anatomy: crowd
      ? {
          ...CHICHI_ANATOMY,
          bodyHeight:
            CHICHI_ANATOMY.bodyHeight *
            (appearance.build === "giant" ? 1.22 : 1),
          legY: CHICHI_ANATOMY.legY * build.height,
          bodyY:
            CHICHI_ANATOMY.bodyY - CHICHI_ANATOMY.legY * (1 - build.height),
          headY:
            CHICHI_ANATOMY.headY -
            CHICHI_ANATOMY.legY * (1 - build.height) -
            (build.height - 1) * 0.22,
        }
      : CHICHI_ANATOMY,
    head,
    body,
    chest,
    tail,
    tailTip,
    ears,
    eyes,
    pupils,
    closedEyes,
    jaw,
    mouth,
    tongue,
    legs,
    lastTime: null,
  };
  // Merge static surface parts per material, retaining independently animated rig nodes.
  const batch = (parent, exclude = []) => {
    const groups = new Map();
    if (crowd) {
      const parts = parent.children.filter(
        (o) => o.isMesh && !exclude.includes(o),
      );
      const target = parent.name.startsWith("EyeGlobe")
        ? irisMaterial
        : parts[0]?.material;
      if (target && parts.length > 1) {
        for (const part of parts) {
          const g = part.geometry,
            source = g.attributes.color,
            colors = new Float32Array(g.attributes.position.count * 3);
          const tint = part.material.color;
          for (let i = 0; i < colors.length / 3; i++)
            for (let axis = 0; axis < 3; axis++) {
              const key = ["r", "g", "b"][axis],
                v = source ? source.getComponent(i, axis) : 1;
              colors[i * 3 + axis] =
                (v * tint[key]) / Math.max(0.0001, target.color[key]);
            }
          g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
          part.material = target;
        }
      }
    }
    for (const child of parent.children)
      if (child.isMesh && !exclude.includes(child)) {
        const group = groups.get(child.material) || [];
        group.push(child);
        groups.set(child.material, group);
      }
    for (const parts of groups.values())
      if (parts.length > 1) {
        const geometries = parts.map((o) => {
          o.updateMatrix();
          const g = crowd
            ? o.geometry.clone()
            : o.geometry.index
              ? o.geometry.toNonIndexed()
              : o.geometry.clone();
          if (crowd && !g.index)
            g.setIndex(
              Array.from({ length: g.attributes.position.count }, (_, i) => i),
            );
          g.deleteAttribute("uv");
          if (crowd && !(g.attributes.normal.array instanceof Float32Array)) {
            const normal = g.attributes.normal,
              values = new Float32Array(normal.count * 3);
            for (let i = 0; i < normal.count; i++)
              for (let k = 0; k < 3; k++)
                values[i * 3 + k] = normal.getComponent(i, k);
            g.setAttribute(
              "normal",
              new THREE.Float32BufferAttribute(values, 3),
            );
          }
          g.applyMatrix4(o.matrix);
          return g;
        });
        // All geometries in one material group have the same attributes.
        const combined = mergeGeometries(geometries);
        geometries.forEach((g) => g.dispose());
        if (!combined)
          throw new Error("Incompatible kitten surface attributes");
        parts[0].geometry.dispose();
        parts[0].geometry = combined;
        parts[0].position.set(0, 0, 0);
        parts[0].scale.set(1, 1, 1);
        parts[0].rotation.set(0, 0, 0);
        for (const part of parts.slice(1)) part.visible = false;
      }
  };
  batch(head, [mouth, ...closedEyes]);
  for (const eye of eyes) batch(eye.children[0], pupils);
  for (const ear of ears) batch(ear);
  for (const leg of legs) batch(leg);
  if (crowd) {
    for (const closed of closedEyes) batch(closed);
    batch(body);
    batch(tailTip);
  }
  // Continuous weighted surfaces. Skin, fur and toe grooves share the same
  // bones, including in exported glTF files.
  for (const leg of legs) {
    const shoulder = new THREE.Bone(),
      knee = new THREE.Bone(),
      ankle = new THREE.Bone();
    shoulder.name = leg.name + "Shoulder";
    knee.name = leg.name + "Knee";
    ankle.name = leg.name + "Ankle";
    shoulder.position.y = 0.12;
    knee.position.y = -0.26;
    ankle.position.y = -0.2;
    shoulder.add(knee);
    knee.add(ankle);
    leg.add(shoulder);
    legJoints.push({ shoulder, knee, ankle });
  }
  cat.updateMatrixWorld(true);
  for (const [i, leg] of legs.entries()) {
    const { shoulder, knee, ankle } = legJoints[i],
      skeleton = new THREE.Skeleton([shoulder, knee, ankle]);
    for (const part of [...leg.children].filter((o) => o.isMesh)) {
      const g = part.geometry,
        p = g.attributes.position,
        indices = [],
        weights = [];
      for (let v = 0; v < p.count; v++) {
        const y = p.getY(v),
          k = 1 - THREE.MathUtils.smoothstep(y, -0.24, -0.06),
          a = 1 - THREE.MathUtils.smoothstep(y, -0.37, -0.29),
          w0 = Math.round((1 - k) * (1 - a) * 255),
          w1 = Math.min(255 - w0, Math.round(k * (1 - a) * 255));
        indices.push(0, 1, 2, 0);
        weights.push(w0, w1, 255 - w0 - w1, 0);
      }
      g.setAttribute("skinIndex", new THREE.Uint8BufferAttribute(indices, 4));
      g.setAttribute(
        "skinWeight",
        new THREE.Uint8BufferAttribute(weights, 4, true),
      );
      const skin = new THREE.SkinnedMesh(g, part.material);
      skin.name = part.name;
      skin.position.copy(part.position);
      skin.quaternion.copy(part.quaternion);
      skin.scale.copy(part.scale);
      skin.castShadow = part.castShadow;
      skin.receiveShadow = part.receiveShadow;
      skin.visible = part.visible;
      leg.remove(part);
      leg.add(skin);
      skin.bind(skeleton);
      skin.frustumCulled = crowd;
      if (crowd) {
        skin.computeBoundingSphere();
        skin.boundingSphere.radius += 0.25;
      }
    }
  }
  cat.userData.legJoints = legJoints;
  // Keep the full sculpt and all strand geometry. Compact GPU normals rather
  // than decimating the hero model to meet the mobile/export memory budget.
  cat.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry,
      n = g.attributes.normal;
    if (!n || n.array instanceof Int16Array) return;
    const packed = new Int16Array(n.count * 3);
    for (let i = 0; i < n.count; i++) {
      packed[i * 3] = Math.round(
        THREE.MathUtils.clamp(n.getX(i), -1, 1) * 32767,
      );
      packed[i * 3 + 1] = Math.round(
        THREE.MathUtils.clamp(n.getY(i), -1, 1) * 32767,
      );
      packed[i * 3 + 2] = Math.round(
        THREE.MathUtils.clamp(n.getZ(i), -1, 1) * 32767,
      );
    }
    g.setAttribute("normal", new THREE.Int16BufferAttribute(packed, 3, true));
  });
  if (crowd) {
    // Half-float colour/position storage retains the sculpt and every strand;
    // it halves their GPU bandwidth at well below a pixel of world-space error.
    const done = new Set();
    cat.traverse((o) => {
      if (!o.isMesh || done.has(o.geometry)) return;
      done.add(o.geometry);
      for (const name of ["position", "color"]) {
        const attr = o.geometry.attributes[name];
        if (!attr) continue;
        const values = new Uint16Array(attr.count * attr.itemSize);
        for (let i = 0; i < attr.count; i++)
          for (let axis = 0; axis < attr.itemSize; axis++)
            values[i * attr.itemSize + axis] = THREE.DataUtils.toHalfFloat(
              attr.getComponent(i, axis),
            );
        o.geometry.setAttribute(
          name,
          new THREE.Float16BufferAttribute(values, attr.itemSize),
        );
      }
    });
  }
  return cat;
}
