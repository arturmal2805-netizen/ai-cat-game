// Only the ten new installations: retain the shared reflection/wave textures
// and physical flow UVs, but avoid a dense regular grating across broad rapids.
export function polishShowcaseWater(material){
 if(material.userData.showcaseOptics)return material;
 material.fragmentShader=material.fragmentShader
  .replace('p*.10+flow','p*.032+flow')
  .replace('p.yx*.157-flow*.71','p.yx*.053-flow*.71')
  .replace('vec2 slope=(fieldA.rg+fieldB.gr-1.0)*.19;','vec2 slope=(fieldA.rg+fieldB.gr-1.0)*.07;')
  .replace('color+=lightTint*caustic*(.3+shallow*.2);','color+=lightTint*caustic*(.035+shallow*.035);')
  .replace('float rim=smoothstep(.66,.99,across)*(.09+fieldA.a*.12);','float rim=smoothstep(.62,.99,across)*(.15+fieldA.a*.23);')
  .replace('float travel=(vWaterUv.y*uFlowScale.y-uTime*uFlowSpeed)*.8+fieldA.r*.22;','float travel=(vWaterUv.y*uFlowScale.y-uTime*uFlowSpeed)*.13+fieldA.r*1.6+fieldB.g*.7;')
  .replace('color+=mix(vec3(.10,.22,.25),vec3(.24,.12,.20),pink)*(fieldA.b*.7+fieldB.b*.4);','color+=vec3(.003,.012,.02)*(fieldA.b*.7+fieldB.b*.4);');
 material.userData.showcaseOptics=true;material.needsUpdate=true;return material;
}
