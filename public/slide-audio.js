// One lazily unlocked context and one shared noise buffer. No downloads,
// autoplay, idle waterfall voices or per-frame audio allocations.
export function createSlideAudio(element, audioWindow = globalThis) {
  let context=null,noise=null,voices=0,last=-Infinity,disposed=false;
  function unlock() {
    if(disposed)return;
    const Audio=audioWindow.AudioContext||audioWindow.webkitAudioContext;
    if(!Audio)return;
    try { context ||= new Audio(); context.resume()?.catch?.(()=>{}); } catch {}
  }
  element.addEventListener("pointerdown",unlock,{passive:true});
  return {
    splash(strength=1) {
      if(disposed||context?.state!=="running"||voices>=3||context.currentTime-last<.1)return false;
      if(!noise) {
        noise=context.createBuffer(1,Math.ceil(context.sampleRate*.45),context.sampleRate);
        const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
      }
      const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),t=context.currentTime;
      source.buffer=noise;filter.type="lowpass";filter.frequency.value=1400;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(Math.min(.07,.025*strength),t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.42);
      source.connect(filter);filter.connect(gain);gain.connect(context.destination);voices++;last=t;
      source.onended=()=>{voices--;source.disconnect();filter.disconnect();gain.disconnect();};source.start(t);source.stop(t+.45);return true;
    },
    dispose() {disposed=true;element.removeEventListener("pointerdown",unlock);context?.close()?.catch?.(()=>{});noise=null;},
  };
}
