// QA pauses only the requested world frame. Three also calls renderer.render
// for PMREM conversion and other offscreen work while preparing that frame.
// Suppressing those nested calls can permanently cache an untouched texture.
function createQaRenderGate(qa, mainScene, mainCamera) {
  return function decide(scene, camera) {
    const main = scene === mainScene && camera === mainCamera;
    const shouldRender = !main || !qa.drawPaused || !!qa.commandOnly;
    return { shouldRender, track: main && shouldRender };
  };
}

module.exports = { createQaRenderGate };
