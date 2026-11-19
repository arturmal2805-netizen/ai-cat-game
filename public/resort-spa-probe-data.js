// PNG rows already contain GL bottom-first data. Copy bytes, never flip/tint.
export function unpackSpaProbeSheet({data,width,height},{size,layers,columns,rows}){
 if(!Number.isInteger(size)||size<1||!Number.isInteger(layers)||layers<1||
    !Number.isInteger(columns)||columns<1||!Number.isInteger(rows)||rows<1||
    layers>columns*rows||width!==size*columns||height!==size*rows||data.length!==width*height*4)
  throw Error('SPA reflection sheet dimensions differ');
 const output=new Uint8Array(size*size*layers*4),stride=size*4;
 for(let layer=0;layer<layers;layer++)for(let y=0;y<size;y++){
  const from=((Math.floor(layer/columns)*size+y)*width+(layer%columns)*size)*4;
  output.set(data.subarray(from,from+stride),(layer*size+y)*stride);
 }
 return output;
}
export async function verifySpaProbeBytes(bytes,expected,subtle=globalThis.crypto?.subtle){
 if(!subtle)throw Error('SPA reflection verification unavailable');
 const actual=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 if(actual!==expected)throw Error('SPA reflection checksum differs');
 return true;
}
