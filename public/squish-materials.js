// Warehouse-local tuning, in metres/seconds/kg. Artistic material profiles,
// not laboratory measurements. No global engine or save-format dependency.
const defaults={mass:12,density:800,elasticity:35,compliance:2e-5,damping:3,viscosity:0,plasticity:0,adhesion:0,friction:.65,restitution:.35,volumePreservation:.99,stretchLimit:1.8,compressionLimit:.25,twistResistance:.7,tearResistance:2.5,fractureThreshold:Infinity,recoverySpeed:4,surfaceTension:.5,interactionRadius:.7,maximumDeformation:1.4,visualShaderProfile:'jelly',soundProfile:'jelly'};
const material=(id,values)=>Object.freeze({...defaults,materialId:id,materialType:id,...values});
export const SQUISH_MATERIALS=Object.freeze({
 jelly:material('jelly',{elasticity:48,damping:2.1,recoverySpeed:5,restitution:.68}),
 butter:material('butter',{elasticity:13,damping:12,plasticity:.55,fractureThreshold:.22,recoverySpeed:.4,volumePreservation:.94,visualShaderProfile:'butter',soundProfile:'butter'}),
 slime:material('slime',{elasticity:6,damping:15,viscosity:.7,plasticity:.3,adhesion:.85,stretchLimit:3.8,tearResistance:3.5,recoverySpeed:.32,restitution:.02,twistResistance:.15,visualShaderProfile:'slime',soundProfile:'slime'}),
 cloud:material('cloud',{elasticity:10,damping:18,compliance:8e-5,volumePreservation:.55,recoverySpeed:.7,restitution:.01,visualShaderProfile:'cloud',soundProfile:'cloud'}),
 foam:material('foam',{elasticity:8,damping:20,compliance:9e-5,plasticity:.8,volumePreservation:.55,recoverySpeed:.16,restitution:.01,visualShaderProfile:'foam',soundProfile:'cloud'}),
 crunchy:material('crunchy',{elasticity:25,damping:10,plasticity:.12,fractureThreshold:.28,recoverySpeed:1.6,restitution:.12,visualShaderProfile:'crunchy',soundProfile:'crunchy'}),
 mochi:material('mochi',{elasticity:26,damping:6,stretchLimit:2.5,twistResistance:.4,recoverySpeed:2.2,restitution:.22,visualShaderProfile:'mochi',soundProfile:'mochi'}),
 giant:material('giant',{mass:70,elasticity:30,damping:5,interactionRadius:1.3,maximumDeformation:2.3,recoverySpeed:2.5,restitution:.3,visualShaderProfile:'cloud',soundProfile:'jelly'}),
});
export const squishMaterial=id=>SQUISH_MATERIALS[id]||SQUISH_MATERIALS.jelly;
