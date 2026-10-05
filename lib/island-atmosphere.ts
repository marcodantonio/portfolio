import * as THREE from "three";

/** A bounded, owned sky and filtered environment for the same world materials. */
export function createIslandAtmosphere(renderer: THREE.WebGLRenderer, compact: boolean) {
  const geometry = new THREE.SphereGeometry(900, 32, 18);
  const material = new THREE.ShaderMaterial({
    // Fog is blended in framebuffer space after tone mapping. This authored
    // unlit gradient must reach the same horizon color in both day and night.
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: {
      uNight: { value: 0 },
      uSun: { value: new THREE.Vector3(-.42, .67, .61).normalize() },
      uZenith: { value: new THREE.Color("#1688ed") },
      uHorizon: { value: new THREE.Color("#b8dfe8") },
    },
    vertexShader: `varying vec3 vSkyDirection;
      void main() {
        vSkyDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform float uNight;
      uniform vec3 uSun, uZenith, uHorizon;
      varying vec3 vSkyDirection;
      void main() {
        vec3 direction = normalize(vSkyDirection);
        float altitude = max(0., direction.y);
        vec3 sky = mix(uHorizon, uZenith, pow(altitude, .48));
        float solar = max(0., dot(direction, uSun));
        float halo = pow(solar, 64.) * .14;
        float disc = smoothstep(.9992, .9997, solar);
        sky += vec3(1., .65, .31) * halo * (1. - uNight);
        sky = mix(sky, mix(vec3(1., .91, .69), vec3(.75, .85, 1.), uNight), disc);
        // The lower dome matches the fog horizon; darkening it exposes the
        // finite ocean plane as a sharp horizontal seam in the overview.
        gl_FragColor = vec4(sky, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = "Continuous tropical sky";
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  const environmentScene = new THREE.Scene();
  const environmentSky = new THREE.Mesh(geometry, material);
  environmentScene.add(environmentSky);
  const generator = new THREE.PMREMGenerator(renderer);
  const targets = new Map<boolean, THREE.WebGLRenderTarget>();
  let disposed = false;
  function setNight(night: boolean) {
    material.uniforms.uNight.value = Number(night);
    material.uniforms.uZenith.value.set(night ? "#14294e" : "#1688ed");
    material.uniforms.uHorizon.value.set(night ? "#163e58" : "#b8dfe8");
    let target = targets.get(night);
    if (!target) {
      target = generator.fromScene(environmentScene, .045, .1, 1000, { size: compact ? 64 : 128 });
      target.texture.name = night ? "Filtered moonlit environment" : "Filtered tropical daylight";
      targets.set(night, target);
    }
    return target.texture;
  }
  try { setNight(false); }
  catch (error) { targets.forEach((target) => target.dispose()); generator.dispose(); geometry.dispose(); material.dispose(); throw error; }
  return {
    sky,
    setNight,
    dispose() {
      if (disposed) return;
      disposed = true;
      targets.forEach((target) => target.dispose()); targets.clear();
      generator.dispose(); geometry.dispose(); material.dispose();
      sky.removeFromParent(); environmentScene.clear();
    },
  };
}
