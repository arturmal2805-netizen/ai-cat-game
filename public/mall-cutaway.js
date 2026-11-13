// Inspection cutaway for the actual frontage meshes. A shared scalar selects
// a room; the ordinary all/floor views retain every authored facade triangle.
// Keep the same static draws, geometry and texture budgets.
export function mallCutawayMaterial(material,selection){
 const before=material.onBeforeCompile,key=material.customProgramCacheKey(),main=/void\s+main\s*\(\s*\)\s*\{/;
 material.onBeforeCompile=function(shader,...args){
  before.call(this,shader,...args);shader.uniforms.uMallInspectedRoom=selection;
  const room=/attribute\s+float\s+aMallRoom\s*;/.test(shader.vertexShader)?'':'attribute float aMallRoom;\n';
  shader.vertexShader=room+'attribute float aMallCutaway;uniform float uMallInspectedRoom;varying float vMallCutaway;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace(main,match=>match+'\n vMallCutaway=aMallCutaway*(abs(aMallRoom-uMallInspectedRoom)<.5&&uMallInspectedRoom>.5?1.:0.);\n');
  shader.fragmentShader='varying float vMallCutaway;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace(main,match=>match+'\n if(vMallCutaway>.5)discard;\n');
 };
 material.customProgramCacheKey=()=>key+'-mall-front-cutaway-v1';material.needsUpdate=true;
}
