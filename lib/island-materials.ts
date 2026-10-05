import * as THREE from "three";
import { WATER_LEVEL } from "./island-map";

/** Finished dance-floor timber, separate from weathered posts and bridge wood.
 * Grain coordinates are authored per plank in metres BEFORE world placement.
 * Real clearcoat/roughness responds to the owned sky and lantern lights; this
 * is not a planar reflection of the scene or a baked image of the reference.
 */
export function createIslandParquetMaterial(parameters: THREE.MeshPhysicalMaterialParameters = {}) {
  const material = new THREE.MeshPhysicalMaterial({ roughness: .32, metalness: 0,
    clearcoat: .42, clearcoatRoughness: .26, ...parameters });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `
      #include <common>
      attribute vec2 parquetGrain;
      varying vec2 vParquetGrain;
    `).replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vParquetGrain = parquetGrain;
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `
      #include <common>
      varying vec2 vParquetGrain;
      float parquetHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float parquetNoise(vec2 p) {
        vec2 c=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(parquetHash(c),parquetHash(c+vec2(1.,0.)),f.x),
          mix(parquetHash(c+vec2(0.,1.)),parquetHash(c+vec2(1.)),f.x),f.y);
      }
    `).replace("#include <color_fragment>", `
      #include <color_fragment>
      float parquetCloud=parquetNoise(vParquetGrain*vec2(.38,2.2));
      float parquetWarp=(parquetCloud-.5)*.025;
      vec2 parquetSample=vec2(vParquetGrain.x*.8,(vParquetGrain.y+parquetWarp)*65.);
      float parquetFootprint=max(length(dFdx(parquetSample)),length(dFdy(parquetSample)));
      float parquetFilter=1.-smoothstep(.3,1.4,parquetFootprint);
      float parquetFibre=parquetNoise(parquetSample);
      diffuseColor.rgb*=.965+parquetCloud*.06+(parquetFibre-.5)*.07*parquetFilter;
    `).replace("#include <roughnessmap_fragment>", `
      #include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+(parquetCloud-.5)*.07
        +(parquetFibre-.5)*.045*parquetFilter,.24,.44);
    `).replace("#include <normal_fragment_begin>", `
      #include <normal_fragment_begin>
      float parquetHeight=(parquetFibre-.5)*.0008;
      vec2 parquetGradient=vec2(dFdx(parquetHeight),dFdy(parquetHeight))*parquetFilter;
      vec3 parquetQ0=-dFdx(vViewPosition), parquetQ1=-dFdy(vViewPosition);
      vec3 parquetR1=cross(parquetQ1,normal), parquetR2=cross(normal,parquetQ0);
      float parquetDet=dot(parquetQ0,parquetR1);
      if(abs(parquetDet)>.00000001) {
        vec3 parquetSlope=sign(parquetDet)*(parquetGradient.x*parquetR1+parquetGradient.y*parquetR2)
          /max(abs(parquetDet),.00000001);
        parquetSlope*=min(1.,.08/max(length(parquetSlope),.000001));
        vec3 parquetNormal=normal-parquetSlope;
        normal=parquetNormal*inversesqrt(max(dot(parquetNormal,parquetNormal),.00000001));
      }
    `);
  };
  material.customProgramCacheKey = () => "island-finished-parquet-v1";
  return material;
}

/**
 * Warm crafted timber from a batched vec2 grain attribute: X along the fibres,
 * Y across them, in metres. Constant per-primitive offsets may vary the field
 * without changing its local direction. No texture or time-dependent uniform.
 */
export function createIslandTimberMaterial(parameters: THREE.MeshStandardMaterialParameters = {},
  grainAttribute: "bridgeGrain" | "timberGrain" = "bridgeGrain") {
  const material = new THREE.MeshStandardMaterial({ roughness: .91, metalness: 0, ...parameters });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `
      #include <common>
      attribute vec2 ${grainAttribute};
      varying vec2 vTimberGrain;
    `).replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vTimberGrain = ${grainAttribute};
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `
      #include <common>
      varying vec2 vTimberGrain;
      float timberHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float timberNoise(vec2 p) {
        vec2 c = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(timberHash(c), timberHash(c+vec2(1.,0.)), f.x),
          mix(timberHash(c+vec2(0.,1.)), timberHash(c+vec2(1.)), f.x), f.y);
      }
      vec3 timberField(vec2 p) {
        // Sparse small knots bend nearby fibres, rather than stamping a circle
        // on every board. The envelope is zero well before the cell boundary.
        vec2 tileSize = vec2(9.5, 1.3), tile = floor(p / tileSize);
        float seed = timberHash(tile + vec2(17.3, 29.1));
        vec2 knotCentre = tileSize * (.25 + .5 * vec2(timberHash(tile + vec2(3.1, 8.7)),
          timberHash(tile + vec2(41.6, 2.3))));
        vec2 delta = (p - tile * tileSize - knotCentre) / vec2(.29, .13);
        float radiusSquared = dot(delta, delta);
        float envelope = exp(-radiusSquared * 1.35) * smoothstep(.93, .985, seed);
        float cloud = timberNoise(p * vec2(.23, .85));
        float bend = timberNoise(p * vec2(.62, 1.7)) - .5;
        float transverse = p.y + bend * .026 + envelope * delta.y * .055;
        float fibre = timberNoise(vec2(p.x * .72 + envelope * delta.x * .16, transverse * 40.0));
        float knot = envelope * (.65 + .35 * sin(sqrt(max(radiusSquared, .000001)) * 13.0 + cloud * 1.5));
        return vec3(fibre, knot, cloud);
      }
    `).replace("#include <color_fragment>", `
      #include <color_fragment>
      vec3 timber = timberField(vTimberGrain);
      float timberFootprint = max(fwidth(vTimberGrain.x * .72), fwidth(vTimberGrain.y * 40.0));
      float timberFilter = 1.0 - smoothstep(.28, 1.1, timberFootprint);
      float timberVein = 1.0 - smoothstep(.24, .69, timber.x);
      diffuseColor.rgb *= .965 + timber.z * .05 - timberVein * .032 * timberFilter - timber.y * .06 * timberFilter;
    `).replace("#include <roughnessmap_fragment>", `
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + (timber.z - .5) * .045
        + timberFilter * (timberVein * .018 - timber.y * .022), .66, .98);
    `).replace("#include <normal_fragment_begin>", `
      #include <normal_fragment_begin>
      // Millimetre-scale relief from the local field, evaluated in view-space
      // surface derivatives. All derivatives precede the determinant guard;
      // grazing/degenerate fragments keep their original normal, never NaN.
      float timberHeight = (timber.x - .5) * .00135 - timber.y * .00045;
      vec2 timberHeightGradient = vec2(dFdx(timberHeight), dFdy(timberHeight)) * timberFilter;
      vec3 timberQ0 = -dFdx(vViewPosition), timberQ1 = -dFdy(vViewPosition);
      vec3 timberR1 = cross(timberQ1, normal), timberR2 = cross(normal, timberQ0);
      float timberDet = dot(timberQ0, timberR1);
      if (abs(timberDet) > .00000001) {
        vec3 timberGradient = sign(timberDet) *
          (timberHeightGradient.x * timberR1 + timberHeightGradient.y * timberR2) / max(abs(timberDet), .00000001);
        timberGradient *= min(1.0, .12 / max(length(timberGradient), .000001));
        vec3 timberNormal = normal - timberGradient;
        normal = timberNormal * inversesqrt(max(dot(timberNormal, timberNormal), .00000001));
      }
    `);
  };
  material.customProgramCacheKey = () => `island-crafted-timber-v3-${grainAttribute}`;
  return material;
}

/** Warm grey mineral masses, weathered vertical joints and bounded local relief.
 * The geometry/silhouette, shared coast and collision remain entirely unchanged.
 */
export function createIslandRockMaterial(parameters: THREE.MeshStandardMaterialParameters = {}) {
  const material = new THREE.MeshStandardMaterial({ roughness: .88, metalness: 0, ...parameters });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMineralWaterLevel = { value: WATER_LEVEL };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `
      #include <common>
      varying vec3 vRockWorldPosition;
      varying vec3 vRockViewPosition;
      varying vec3 vRockWorldNormal;
    `).replace("#include <defaultnormal_vertex>", `
      #include <defaultnormal_vertex>
      vRockWorldNormal = inverseTransformDirection(transformedNormal, viewMatrix);
    `).replace("#include <project_vertex>", `
      #include <project_vertex>
      // Respect final displacement/instance/batch transforms, without requiring
      // a new attribute or changing the procedural geometry's merge contract.
      vec4 mineralWorldPosition = vec4(transformed, 1.0);
      #ifdef USE_BATCHING
        mineralWorldPosition = batchingMatrix * mineralWorldPosition;
      #endif
      #ifdef USE_INSTANCING
        mineralWorldPosition = instanceMatrix * mineralWorldPosition;
      #endif
      vRockWorldPosition = (modelMatrix * mineralWorldPosition).xyz;
      vRockViewPosition = mvPosition.xyz;
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `
      #include <common>
      uniform float uMineralWaterLevel;
      varying vec3 vRockWorldPosition;
      varying vec3 vRockViewPosition;
      varying vec3 vRockWorldNormal;
      float mineralHash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }
      float mineralNoise(vec3 p) {
        vec3 c = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(mineralHash(c), mineralHash(c+vec3(1.,0.,0.)), f.x),
          mix(mineralHash(c+vec3(0.,1.,0.)), mineralHash(c+vec3(1.,1.,0.)), f.x), f.y),
          mix(mix(mineralHash(c+vec3(0.,0.,1.)), mineralHash(c+vec3(1.,0.,1.)), f.x),
          mix(mineralHash(c+vec3(0.,1.,1.)), mineralHash(c+vec3(1.)), f.x), f.y), f.z);
      }
      float filteredMineralNoise(vec3 p) {
        float footprint = max(length(dFdx(p)), length(dFdy(p)));
        return mix(.5, mineralNoise(p), 1. - smoothstep(.32, 1.35, footprint));
      }
    `).replace("#include <color_fragment>", `
      #include <color_fragment>
      float mineralCloud = filteredMineralNoise(vRockWorldPosition * .105) * .7
        + filteredMineralNoise(vRockWorldPosition * .28 + 23.) * .3;
      float mineralDeposit = filteredMineralNoise(vRockWorldPosition * vec3(.21, .068, .21) + 9.);
      float mineralGrain = filteredMineralNoise(vRockWorldPosition * 1.42);
      vec3 mineralNormal = vRockWorldNormal * inversesqrt(max(dot(vRockWorldNormal, vRockWorldNormal), .00000001));
      float mineralVertical = 1. - smoothstep(.36, .8, abs(mineralNormal.y));
      // Elongated, gently wandering joints are independent of the authored
      // boulder boundaries. They read as fractured limestone rather than a
      // sine-striped stack or equally polished pale spheres.
      float mineralWarp = filteredMineralNoise(vRockWorldPosition * vec3(.11, .076, .11) + 31.) - .5;
      float mineralFaultField = filteredMineralNoise(vRockWorldPosition * vec3(.31, .055, .31)
        + vec3(mineralWarp * .63, 0., mineralWarp * -.47));
      float mineralFaultWidth = max(.003, fwidth(mineralFaultField));
      float mineralResolved = 1. - smoothstep(.035, .19, mineralFaultWidth);
      float mineralFault = abs(mineralFaultField - .485);
      float mineralJoint = (1. - smoothstep(.012, .048 + mineralFaultWidth, mineralFault))
        * mineralVertical * mineralResolved;
      float mineralRecess = (1. - smoothstep(.048, .135 + mineralFaultWidth, mineralFault))
        * mineralVertical * mineralResolved;
      float mineralWet = 1. - smoothstep(uMineralWaterLevel + .1, uMineralWaterLevel + 2.4,
        vRockWorldPosition.y + (mineralCloud - .5) * .48);
      // Distant landscape batches also contain green summit vegetation. Keep
      // its authored green pigment instead of treating leaves as grey limestone.
      float mineralMask = 1. - smoothstep(1.04, 1.27, diffuseColor.g / max(diffuseColor.r, .001));
      vec3 mineralTint = mix(vec3(.70, .735, .75), vec3(.94, .865, .735), mineralCloud);
      mineralTint *= .965 + (mineralGrain - .5) * .065;
      mineralTint *= 1. - mineralJoint * .32 - mineralRecess * .14
        - smoothstep(.55, .8, mineralDeposit) * mineralVertical * .10;
      mineralTint *= mix(vec3(1.), vec3(.66, .76, .75), mineralWet);
      diffuseColor.rgb *= mix(vec3(1.), mineralTint, mineralMask);
    `).replace("#include <roughnessmap_fragment>", `
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + mineralMask * ((mineralGrain - .5) * .06
        + mineralJoint * .055 - mineralWet * .12), .72, .98);
    `).replace("#include <normal_fragment_begin>", `
      #include <normal_fragment_begin>
      // Local concavity is inferred from the actual authored view-space
      // geometry/normal derivatives. It darkens recesses, not entire island
      // silhouettes, and is not screen-space AO or another rendering pass.
      vec3 mineralQ0 = dFdx(vRockViewPosition), mineralQ1 = dFdy(vRockViewPosition);
      vec3 mineralN0 = dFdx(normal), mineralN1 = dFdy(normal);
      float mineralSurfaceSize = dot(mineralQ0, mineralQ0) + dot(mineralQ1, mineralQ1);
      float mineralCurvature = (dot(mineralN0, mineralQ0) + dot(mineralN1, mineralQ1))
        / max(mineralSurfaceSize, .00000001);
      float mineralConcavity = clamp(-mineralCurvature * .75, 0., .25) * mineralMask;
      diffuseColor.rgb *= 1. - mineralConcavity;
      float mineralRelief = (mineralGrain - .5) * .012 - mineralJoint * .046 - mineralRecess * .018;
      vec2 mineralHeightGradient = vec2(dFdx(mineralRelief), dFdy(mineralRelief)) * mineralMask;
      vec3 mineralR1 = cross(mineralQ1, normal), mineralR2 = cross(normal, mineralQ0);
      float mineralDet = dot(mineralQ0, mineralR1);
      // Keep grazing/degenerate fragments finite, and the carved relief gentle
      // enough for the rounded cartoon forms. Never normalize a zero vector.
      if (abs(mineralDet) > .00000001) {
        vec3 mineralGradient = sign(mineralDet) * (mineralHeightGradient.x * mineralR1
          + mineralHeightGradient.y * mineralR2) / max(abs(mineralDet), .00000001);
        mineralGradient *= min(1., .22 / max(length(mineralGradient), .000001));
        vec3 mineralPerturbed = normal - mineralGradient;
        normal = mineralPerturbed * inversesqrt(max(dot(mineralPerturbed, mineralPerturbed), .00000001));
      }
    `);
  };
  material.customProgramCacheKey = () => "island-fractured-mineral-v2";
  return material;
}
