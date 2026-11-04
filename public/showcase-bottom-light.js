// Local to the eight water adventures. Reuse the original underwater clock,
// two field samples and native mesh path; never copy the scene for refraction.
export function polishShowcaseBottom(material) {
  if (material.userData.showcaseBottomLight) return material;
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey(), river=!!material.userData.showcaseRiverBed;
  material.onBeforeCompile = function (shader, ...args) {
    previous.call(this, shader, ...args);
    shader.vertexShader = 'varying float vShowcaseImmersion;\n' + shader.vertexShader
      .replace('vWaterLightPoint=waterPoint.xz;', 'vWaterLightPoint=waterPoint.xz;vShowcaseImmersion='+(river?'.23':'max(0.,uWaterLevel-waterPoint.y)')+';');
    shader.fragmentShader = 'varying float vShowcaseImmersion;\n' + shader.fragmentShader
      .replace('p*.115+vec2(time*.009,-time*.006)', 'p*.071+vec2(time*.007,-time*.005)')
      .replace('p.yx*.147+vec2(-time*.007,time*.011)+(a.rg-.5)*.045', 'p.yx*.109+vec2(-time*.006,time*.009)+(a.rg-.5)*.12')
      .replace('return min(1.5,a.b*.7+b.b*.55+a.b*b.b);', 'float ridge=max(a.b,b.b*.85);return smoothstep(.24,.85,ridge)*(.6+.4*a.a);')
      .replace('float waterCaustic=waterLight(vWaterLightPoint,uWaterLightTime);', 'float waterCaustic=waterLight(vWaterLightPoint,uWaterLightTime)*exp2(-min(vShowcaseImmersion,8.)*.45);')
      .replace('uUnderwaterTint*(.88+waterCaustic*.24)', 'uUnderwaterTint*(.91+waterCaustic*.32)')
      .replace('vec3(.035,.07,.06)*waterCaustic', 'vec3(.025,.045,.055)*waterCaustic*waterCaustic');
  };
  material.customProgramCacheKey = () => key + '-showcase-bottom-v2'+(river?'-sheet':'');
  material.userData.showcaseBottomLight = true;
  return material;
}
