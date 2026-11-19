// V11: SPA-only optical profiles in metres/seconds. Existing geometry supplies
// physical depth; this registry never creates water or changes other venues.
export const SPA_WATER_DEFAULTS=Object.freeze({
 absorption:Object.freeze([.085,.028,.014]),scattering:.055,transparency:.56,
 roughness:.095,normalStrength:.75,waveSpeed:.65,waveAmplitude:.009,
 causticIntensity:.28,causticScale:.32,reflectionStrength:1,
 refractionStrength:.8,bubbleDensity:.6,foamIntensity:.04,
 shallow:'#65f2ed',clear:'#00d8e8',medium:'#009fc0',deep:'#086a91',
});
export const SPA_WATER_PROFILES=Object.freeze(Object.fromEntries(Object.entries({
 thermal:{waveSpeed:.48,waveAmplitude:.008,causticScale:.28},
 vip:{waveSpeed:.9,waveAmplitude:.012,normalStrength:.95,causticScale:.5,bubbleDensity:1,foamIntensity:.08},
 cafe:{waveSpeed:.4,waveAmplitude:.005,normalStrength:.55,causticScale:.48,bubbleDensity:.35},
 aroma:{waveSpeed:.3,waveAmplitude:.004,normalStrength:.45,causticScale:.55,foamIntensity:.015},
 waterfall:{waveSpeed:.75,waveAmplitude:.012,normalStrength:.9,causticScale:.4,foamIntensity:.15},
 cabana:{waveSpeed:.35,waveAmplitude:.004,normalStrength:.5,causticScale:.5,bubbleDensity:.2},
 sky:{waveSpeed:.4,waveAmplitude:.006,normalStrength:.65,causticScale:.35,transparency:.48},
 cascade:{waveSpeed:1,normalStrength:.9,waveAmplitude:.012,causticScale:.5,foamIntensity:.22},
}).map(([key,value])=>[key,Object.freeze(value)])));
const ranges={scattering:[0,.3],transparency:[.1,.9],roughness:[.025,.4],normalStrength:[.1,1.5],waveSpeed:[.05,2],waveAmplitude:[0,.04],causticIntensity:[0,.6],causticScale:[.1,1.5],reflectionStrength:[.1,1.5],refractionStrength:[0,1.5],bubbleDensity:[0,1],foamIntensity:[0,.4]};
export function spaWaterQuality(kind='thermal',overrides={}){
 if(!Object.hasOwn(SPA_WATER_PROFILES,kind))throw Error('Unknown existing SPA water profile: '+kind);
 const profile={...SPA_WATER_DEFAULTS,...SPA_WATER_PROFILES[kind],...overrides,kind};
 for(const[key,[min,max]]of Object.entries(ranges))if(!Number.isFinite(profile[key])||profile[key]<min||profile[key]>max)throw Error('Invalid SPA water '+key);
 if(!Array.isArray(profile.absorption)||profile.absorption.length!==3||profile.absorption.some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('Invalid SPA absorption');
 profile.absorption=Object.freeze([...profile.absorption]);return Object.freeze(profile);
}
export function spaWaterTransmission(profile,metres){
 if(!Number.isFinite(metres)||metres<0)throw Error('Optical depth must be finite nonnegative metres');
 return profile.absorption.map(k=>Math.exp(-k*metres));
}
