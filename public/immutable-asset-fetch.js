// Content-addressed public art/model URLs already change when their bytes change.
// Reuse their browser HTTP-cache entries after expiry instead of revalidating
// megabytes during a scene visit. No application/API/save response is cached here.
export function fetchImmutableAsset(url,options={}){
 let immutable=false;
 try{
  const base=globalThis.document?.baseURI||import.meta.url,p=new URL(url,base);
  immutable=(!options.method||options.method==='GET')&&p.origin===new URL(base).origin&&/\/(?:art|models)\/(?:[^/?#]+\/)*[^/?#]+-[a-f0-9]{12,64}\.(?:png|jpe?g|webp|bin)(?:\.gz)?$/.test(p.pathname);
 }catch{}
 return fetch(url,immutable&&options.cache===undefined?{...options,cache:'force-cache'}:options);
}
