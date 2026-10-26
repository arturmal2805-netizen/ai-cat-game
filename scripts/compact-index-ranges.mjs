// Experimental QA only. Bridge short, wholly culled index gaps while retaining
// original index order. Added offscreen work is bounded by 3% of the selected
// indices. The renderer's unchanged frustum proof still excludes every gap.
export function compactIndexRanges(starts, counts, commands, bytes, maxGap=384) {
  if(commands<2)return commands;
  let selected=0;
  for(let i=0;i<commands;i++) selected+=counts[i];
  const budget=Math.floor(selected*.03/3)*3;
  let out=0,extra=0;
  for(let i=0;i<commands;i++) {
    const start=starts[i],count=counts[i];
    const gap=out ? (start-starts[out-1])/bytes-counts[out-1] : Infinity;
    if(gap>=0 && gap<=maxGap && extra+gap<=budget) {
      counts[out-1]+=gap+count;extra+=gap;
    } else {starts[out]=start;counts[out]=count;out++;}
  }
  return out;
}
