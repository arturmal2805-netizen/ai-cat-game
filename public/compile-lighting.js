// Compile-only scene view. Preserve the live environment, fog and original
// lights while avoiding another walk through every world mesh per material.
// Membership is a preparation snapshot; light values/transforms remain live.
export function createCompileLighting(scene) {
  const lights=[];
  scene.traverseVisible(object=>{if(object.isLight)lights.push(object);});
  const view=Object.create(scene);
  view.children=lights;
  view.traverseVisible=visit=>{
    if(!scene.visible)return;
    visit(view);
    // Flatten light descendants once: native recursive traversal here would
    // count a nested light twice. Keep attachment/visibility checks live.
    for(const light of lights){
      let parent=light;
      while(parent && parent!==scene && parent.visible)parent=parent.parent;
      if(parent===scene)visit(light);
    }
  };
  return view;
}
